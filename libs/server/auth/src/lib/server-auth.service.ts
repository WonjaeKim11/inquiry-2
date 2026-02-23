import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { EmailService } from '@inquiry/server-email';
import { AuditLogService } from '@inquiry/server-audit-log';
import { TurnstileService } from './services/turnstile.service';
import { BrevoService } from './services/brevo.service';
import { SignupDto } from './dto/signup.dto';

/** OAuth 사용자 검증에 필요한 프로바이더 정보 */
interface OAuthUserInput {
  provider: string;
  providerAccountId: string;
  email: string;
  name?: string;
  image?: string;
  accessToken?: string;
  refreshToken?: string;
}

/** 토큰 페어 (Access + Refresh) */
interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/** validateUser 반환 타입: 에러 코드 또는 사용자 정보 */
type ValidateUserResult =
  | {
      success: true;
      user: { id: string; email: string; name: string; image: string | null };
    }
  | { success: false; errorCode: string; message: string };

/**
 * 인증 핵심 비즈니스 로직.
 * 회원가입, 로그인, 토큰 발급/갱신, OAuth 처리, 이메일 검증, 비밀번호 재설정을 담당한다.
 */
@Injectable()
export class ServerAuthService implements OnModuleInit {
  private readonly logger = new Logger(ServerAuthService.name);
  private readonly BCRYPT_ROUNDS = 12;
  private readonly ACCESS_TOKEN_EXPIRES = '15m';
  private readonly REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7일

  /** Timing Attack 방지용 더미 해시. 사용자 미존재 시에도 동일한 비교 시간을 보장 */
  private CONTROL_HASH = '';

  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly auditLogService: AuditLogService,
    private readonly turnstileService: TurnstileService,
    private readonly brevoService: BrevoService
  ) {}

  /** 모듈 초기화 시 Timing Attack 방지용 CONTROL_HASH 생성 */
  async onModuleInit() {
    this.CONTROL_HASH = await bcrypt.hash(
      'timing-attack-prevention-dummy',
      this.BCRYPT_ROUNDS
    );
  }

  /**
   * 이메일+비밀번호 회원가입.
   * User Enumeration 방지: 이메일 중복 시에도 동일한 성공 응답을 반환한다.
   * 회원가입 후 토큰을 발급하지 않고, 이메일 검증을 요구한다.
   */
  async signup(
    dto: SignupDto,
    ipAddress?: string
  ): Promise<{ success: boolean; message: string }> {
    // Turnstile CAPTCHA 검증
    await this.turnstileService.verify(dto.turnstileToken);

    const hashedPassword = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password: hashedPassword,
          name: dto.name,
          locale: dto.userLocale || 'en-US',
          identityProvider: 'EMAIL',
        },
      });

      // 초대 토큰 처리: 유효한 초대가 있으면 Membership 생성 후 Invite 삭제
      if (dto.inviteToken) {
        await this.processInviteToken(dto.inviteToken, user.id, user.email);
      }

      // Multi-Org: 초대가 없으면 자동으로 개인 조직 생성
      const multiOrgEnabled =
        this.configService.get<string>('MULTI_ORG_ENABLED', 'true') === 'true';
      if (multiOrgEnabled && !dto.inviteToken) {
        await this.createPersonalOrganization(user.id, user.name);
      }

      // 이메일 검증 메일 발송 (비활성화 가능)
      const emailVerificationDisabled =
        this.configService.get<string>(
          'EMAIL_VERIFICATION_DISABLED',
          'false'
        ) === 'true';
      if (!emailVerificationDisabled) {
        const token = this.generateEmailVerificationToken(user.id, user.email);
        await this.emailService.sendVerificationEmail(
          user.email,
          user.name,
          token
        );
      } else {
        // 이메일 검증 비활성화 시 즉시 검증 처리
        await this.prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date() },
        });
      }

      // 감사 로그 (logEvent: Zod 검증 + PII Redaction + Feature Flag 적용)
      // NOTE: Brevo createContact는 이메일 검증 완료(verifyEmail) 시에만 호출한다.
      this.auditLogService.logEvent({
        action: 'user.signup',
        userId: user.id,
        targetType: 'user',
        targetId: user.id,
        ipAddress,
      });

      return {
        success: true,
        message: '회원가입이 완료되었습니다. 이메일을 확인해주세요.',
      };
    } catch (error: unknown) {
      // User Enumeration 방지: Prisma unique 위반 시에도 동일 성공 응답 반환
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        this.logger.debug(
          '회원가입 시도 - 이미 존재하는 이메일 (동일 응답 반환)'
        );
        return {
          success: true,
          message: '회원가입이 완료되었습니다. 이메일을 확인해주세요.',
        };
      }
      throw error;
    }
  }

  /**
   * 이메일+비밀번호 검증 (보안 강화 버전).
   * Timing Attack 방지, User Enumeration 방지, 이메일 검증/계정 활성 확인.
   */
  async validateUser(
    email: string,
    password: string
  ): Promise<ValidateUserResult> {
    // bcrypt DoS 방지: 128자 초과 시 즉시 거부
    if (password.length > 128) {
      return {
        success: false,
        errorCode: 'invalid-credentials',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      };
    }

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Timing Attack 방지: 사용자 미존재 시에도 bcrypt.compare 수행
      await bcrypt.compare(password, this.CONTROL_HASH);
      return {
        success: false,
        errorCode: 'invalid-credentials',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      };
    }

    if (!user.password) {
      // SSO 전용 사용자: 비밀번호 없음
      await bcrypt.compare(password, this.CONTROL_HASH);
      return {
        success: false,
        errorCode: 'invalid-credentials',
        message:
          '소셜 로그인으로 가입된 계정입니다. 소셜 로그인을 이용해주세요.',
      };
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return {
        success: false,
        errorCode: 'invalid-credentials',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      };
    }

    // 계정 활성 상태 확인
    if (!user.isActive) {
      return {
        success: false,
        errorCode: 'account-inactive',
        message: '비활성화된 계정입니다. 관리자에게 문의해주세요.',
      };
    }

    // 이메일 검증 확인 (설정으로 비활성화 가능)
    const emailVerificationDisabled =
      this.configService.get<string>('EMAIL_VERIFICATION_DISABLED', 'false') ===
      'true';
    if (!emailVerificationDisabled && !user.emailVerified) {
      return {
        success: false,
        errorCode: 'email-verification-required',
        message: '이메일 인증이 필요합니다. 메일함을 확인해주세요.',
      };
    }

    // lastLoginAt 업데이트 (fire-and-forget)
    this.prisma.user
      .update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      })
      .catch(() => {
        /* non-critical */
      });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
    };
  }

  /** 로그인: 검증된 사용자에 대해 토큰 페어를 발급하고 감사 로그 기록 */
  async login(user: { id: string; email: string }, ipAddress?: string) {
    // 감사 로그 (logEvent: Zod 검증 + PII Redaction + Feature Flag 적용)
    this.auditLogService.logEvent({
      action: 'user.login',
      userId: user.id,
      targetType: 'user',
      targetId: user.id,
      ipAddress,
    });

    return this.generateTokens(user.id, user.email);
  }

  /**
   * 이메일 검증 처리.
   * JWT 토큰에서 userId, email을 추출하여 emailVerified를 현재 시간으로 업데이트.
   */
  async verifyEmail(
    token: string,
    ipAddress?: string
  ): Promise<{ success: boolean; message: string }> {
    let payload: { sub: string; email: string; purpose: string };
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new BadRequestException('유효하지 않거나 만료된 인증 토큰입니다.');
    }

    if (payload.purpose !== 'email-verification') {
      throw new BadRequestException('유효하지 않은 토큰입니다.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.');
    }
    if (!user.isActive) {
      throw new BadRequestException('비활성화된 계정입니다.');
    }
    if (user.emailVerified) {
      return { success: true, message: '이미 인증된 이메일입니다.' };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    // Brevo 고객 생성 (이메일 검증 완료 후)
    this.brevoService.createContact(user.email, user.name);

    // 감사 로그 (logEvent: Zod 검증 + PII Redaction + Feature Flag 적용)
    this.auditLogService.logEvent({
      action: 'user.email-verified',
      userId: user.id,
      targetType: 'user',
      targetId: user.id,
      ipAddress,
    });

    return { success: true, message: '이메일 인증이 완료되었습니다.' };
  }

  /**
   * 비밀번호 재설정 요청.
   * User Enumeration 방지: 사용자 미존재 시에도 동일 성공 응답을 반환한다.
   */
  async forgotPassword(
    email: string,
    ipAddress?: string
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user && user.password && user.isActive) {
      const token = this.generatePasswordResetToken(user.id, user.email);
      await this.emailService.sendPasswordResetEmail(
        user.email,
        user.name,
        token
      );

      // 감사 로그 (logEvent: Zod 검증 + PII Redaction + Feature Flag 적용)
      this.auditLogService.logEvent({
        action: 'password.reset-requested',
        userId: user.id,
        targetType: 'user',
        targetId: user.id,
        ipAddress,
      });
    }

    // User Enumeration 방지: 항상 동일 응답
    return {
      success: true,
      message: '비밀번호 재설정 링크가 이메일로 발송되었습니다.',
    };
  }

  /**
   * 비밀번호 재설정 실행.
   * JWT 토큰으로 사용자를 식별하고 새 비밀번호로 업데이트한다.
   */
  async resetPassword(
    token: string,
    newPassword: string,
    ipAddress?: string
  ): Promise<{ success: boolean; message: string }> {
    let payload: { sub: string; email: string; purpose: string };
    try {
      payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new BadRequestException('유효하지 않거나 만료된 토큰입니다.');
    }

    if (payload.purpose !== 'password-reset') {
      throw new BadRequestException('유효하지 않은 토큰입니다.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new BadRequestException('사용자를 찾을 수 없습니다.');
    }
    if (!user.isActive) {
      throw new BadRequestException('비활성화된 계정입니다.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // 알림 이메일 발송
    await this.emailService.sendPasswordChangedNotification(
      user.email,
      user.name
    );

    // 감사 로그 (logEvent: Zod 검증 + PII Redaction + Feature Flag 적용)
    this.auditLogService.logEvent({
      action: 'password.reset-completed',
      userId: user.id,
      targetType: 'user',
      targetId: user.id,
      ipAddress,
    });

    return { success: true, message: '비밀번호가 성공적으로 변경되었습니다.' };
  }

  /**
   * OAuth 사용자 처리.
   * 기존 Account가 있으면 토큰 갱신, 없으면 User+Account 생성.
   */
  async validateOAuthUser(input: OAuthUserInput) {
    const existingAccount = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: input.provider,
          providerAccountId: input.providerAccountId,
        },
      },
      include: { user: true },
    });

    if (existingAccount) {
      // 기존 OAuth 연결: 토큰만 갱신
      await this.prisma.account.update({
        where: { id: existingAccount.id },
        data: {
          accessToken: input.accessToken,
          refreshToken: input.refreshToken,
        },
      });
      return {
        id: existingAccount.user.id,
        email: existingAccount.user.email,
        name: existingAccount.user.name,
        image: existingAccount.user.image,
      };
    }

    // 동일 이메일의 기존 유저가 있으면 Account만 연결
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      await this.prisma.account.create({
        data: {
          userId: existingUser.id,
          provider: input.provider,
          providerAccountId: input.providerAccountId,
          accessToken: input.accessToken,
          refreshToken: input.refreshToken,
        },
      });
      return {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        image: existingUser.image,
      };
    }

    // 완전 신규: User + Account 동시 생성 (OAuth 이메일은 검증된 것으로 간주)
    const identityProvider =
      input.provider.toUpperCase() === 'GOOGLE' ? 'GOOGLE' : 'GITHUB';
    const newUser = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name || input.email.split('@')[0],
        image: input.image,
        emailVerified: new Date(),
        identityProvider: identityProvider as 'GOOGLE' | 'GITHUB',
        identityProviderAccountId: input.providerAccountId,
        accounts: {
          create: {
            provider: input.provider,
            providerAccountId: input.providerAccountId,
            accessToken: input.accessToken,
            refreshToken: input.refreshToken,
          },
        },
      },
    });

    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      image: newUser.image,
    };
  }

  /**
   * Refresh Token으로 Access Token 갱신 (토큰 rotation).
   * 기존 토큰은 폐기하고 새 토큰 페어를 발급한다.
   */
  async refreshTokens(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('유효하지 않은 리프레시 토큰입니다.');
    }

    // 비활성 계정 차단
    if (!stored.user.isActive) {
      throw new UnauthorizedException('비활성화된 계정입니다.');
    }

    // 기존 토큰 폐기 (rotation)
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    });

    return this.generateTokens(stored.user.id, stored.user.email);
  }

  /** 로그아웃: 해당 refresh token을 폐기 */
  async logout(refreshToken: string) {
    await this.prisma.refreshToken
      .update({
        where: { token: refreshToken },
        data: { revoked: true },
      })
      .catch(() => {
        // 이미 삭제/폐기된 토큰이면 무시
      });
  }

  /**
   * Access Token + Refresh Token 페어 발급.
   * Refresh Token은 DB에 저장하여 관리한다.
   */
  async generateTokens(userId: string, email: string): Promise<TokenPair> {
    const sessionMaxDuration = parseInt(
      this.configService.get<string>('SESSION_MAX_DURATION', '86400'),
      10
    );

    // isActive를 JWT payload에 포함하여 클라이언트 세션에서 활성 상태를 확인할 수 있도록 한다
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    });
    const payload = { sub: userId, email, isActive: user?.isActive ?? true };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.ACCESS_TOKEN_EXPIRES,
    });

    // 랜덤 문자열 기반 refresh token (DB 저장)
    const refreshToken = randomBytes(64).toString('hex');
    const refreshExpiresMs = Math.min(
      this.REFRESH_TOKEN_EXPIRES_MS,
      sessionMaxDuration * 1000
    );

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + refreshExpiresMs),
      },
    });

    return { accessToken, refreshToken };
  }

  /** 이메일 검증용 JWT 토큰 생성 (24시간 유효) */
  private generateEmailVerificationToken(
    userId: string,
    email: string
  ): string {
    return this.jwtService.sign(
      { sub: userId, email, purpose: 'email-verification' },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: '24h',
      }
    );
  }

  /** 비밀번호 재설정용 JWT 토큰 생성 (1시간 유효) */
  private generatePasswordResetToken(userId: string, email: string): string {
    return this.jwtService.sign(
      { sub: userId, email, purpose: 'password-reset' },
      {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: '1h',
      }
    );
  }

  /** 초대 토큰 처리: Membership 생성 + Invite 삭제 */
  private async processInviteToken(
    inviteToken: string,
    userId: string,
    userEmail: string
  ): Promise<void> {
    try {
      const invite = await this.prisma.invite.findUnique({
        where: { token: inviteToken },
      });

      if (!invite || invite.expiresAt < new Date()) {
        this.logger.warn(`유효하지 않은 초대 토큰: ${inviteToken}`);
        return;
      }

      if (invite.email.toLowerCase() !== userEmail.toLowerCase()) {
        this.logger.warn(`초대 이메일 불일치: ${invite.email} vs ${userEmail}`);
        return;
      }

      await this.prisma.$transaction([
        this.prisma.membership.create({
          data: {
            userId,
            organizationId: invite.organizationId,
            role: invite.role,
          },
        }),
        this.prisma.invite.delete({ where: { id: invite.id } }),
      ]);
    } catch (error) {
      this.logger.error('초대 토큰 처리 실패', error);
    }
  }

  /**
   * 개인 조직 자동 생성.
   * 회원가입 시 호출되며, free 플랜의 기본 Billing 값을 포함한다.
   */
  private async createPersonalOrganization(
    userId: string,
    userName: string
  ): Promise<void> {
    try {
      /** free 플랜 기본 Billing 값 */
      const defaultBilling = {
        plan: 'free',
        period: 'monthly',
        periodStart: null,
        limits: {
          projects: 3,
          monthlyResponses: 1500,
          monthlyMIU: 2000,
        },
        stripeCustomerId: null,
      };

      await this.prisma.organization.create({
        data: {
          name: `${userName}의 조직`,
          billing: defaultBilling,
          whitelabel: {},
          isAIEnabled: false,
          memberships: {
            create: {
              userId,
              role: 'OWNER',
            },
          },
        },
      });
    } catch (error) {
      this.logger.error('개인 조직 생성 실패', error);
    }
  }
}
