import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { ServerPrismaService } from '@inquiry/server-prisma';
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

/**
 * 인증 핵심 비즈니스 로직.
 * 회원가입, 로그인, 토큰 발급/갱신, OAuth 처리를 담당한다.
 */
@Injectable()
export class ServerAuthService {
  private readonly BCRYPT_ROUNDS = 12;
  private readonly ACCESS_TOKEN_EXPIRES = '15m';
  private readonly REFRESH_TOKEN_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000; // 7일

  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  /** 이메일+비밀번호 회원가입. 이미 존재하는 이메일이면 ConflictException */
  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('이미 사용 중인 이메일입니다.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
      },
    });

    return this.generateTokens(user.id, user.email);
  }

  /** 이메일+비밀번호 검증. 일치하면 사용자 반환, 아니면 null */
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) return null;

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return null;

    return { id: user.id, email: user.email, name: user.name, image: user.image };
  }

  /** 로그인: 검증된 사용자에 대해 토큰 페어를 발급 */
  async login(user: { id: string; email: string }) {
    return this.generateTokens(user.id, user.email);
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

    // 완전 신규: User + Account 동시 생성
    const newUser = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        image: input.image,
        emailVerified: true, // OAuth 이메일은 검증된 것으로 간주
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
    const payload = { sub: userId, email };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.ACCESS_TOKEN_EXPIRES,
    });

    // 랜덤 문자열 기반 refresh token (DB 저장)
    const refreshToken = randomBytes(64).toString('hex');

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId,
        expiresAt: new Date(Date.now() + this.REFRESH_TOKEN_EXPIRES_MS),
      },
    });

    return { accessToken, refreshToken };
  }
}
