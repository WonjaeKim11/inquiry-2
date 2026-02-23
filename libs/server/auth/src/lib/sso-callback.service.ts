import { Injectable, Logger } from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { AuditLogService } from '@inquiry/server-audit-log';
import type { IdentityProvider } from '@prisma/client';

/** SSO 콜백에서 전달되는 사용자 정보 */
export interface SsoCallbackInput {
  /** SSO에서 인증된 사용자 이메일 */
  email: string;
  /** 사용자 표시 이름 */
  name: string;
  /** SSO 제공자 타입 */
  provider: IdentityProvider;
  /** SSO 제공자 내 계정 고유 ID */
  providerAccountId: string;
}

/**
 * SSO 콜백 공통 처리 서비스.
 * Azure AD, OpenID Connect 등 SSO 프로바이더의 콜백에서
 * 사용자를 매칭하거나 생성하는 공통 로직을 담당한다.
 *
 * 매칭 순서:
 * 1. 동일 provider + providerAccountId로 기존 Account 조회
 * 2. 동일 이메일의 기존 User에 Account 연결
 * 3. 신규 User + Account 생성
 */
@Injectable()
export class SsoCallbackService {
  private readonly logger = new Logger(SsoCallbackService.name);

  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly auditLogService: AuditLogService
  ) {}

  /**
   * SSO 콜백에서 사용자를 매칭/생성한다.
   * @param input - SSO 콜백으로 전달된 사용자 정보
   * @returns 매칭/생성된 사용자 정보
   */
  async handleCallback(input: SsoCallbackInput): Promise<{
    id: string;
    email: string;
    name: string;
    image: string | null;
  }> {
    const providerName = input.provider.toLowerCase();

    // 시나리오 1: 기존 SSO 계정으로 조회
    const existingAccount = await this.prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: providerName,
          providerAccountId: input.providerAccountId,
        },
      },
      include: { user: true },
    });

    if (existingAccount) {
      this.logger.debug(
        `기존 SSO 계정으로 로그인: ${input.email} (${providerName})`
      );
      return {
        id: existingAccount.user.id,
        email: existingAccount.user.email,
        name: existingAccount.user.name,
        image: existingAccount.user.image,
      };
    }

    // 시나리오 2: 동일 이메일의 기존 사용자에 Account 연결
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      await this.prisma.account.create({
        data: {
          userId: existingUser.id,
          provider: providerName,
          providerAccountId: input.providerAccountId,
        },
      });

      this.logger.debug(
        `기존 사용자에 SSO 계정 연결: ${input.email} (${providerName})`
      );

      // 감사 로그
      this.auditLogService.logEvent({
        action: 'user.sso-linked',
        userId: existingUser.id,
        targetType: 'user',
        targetId: existingUser.id,
        metadata: { provider: providerName },
      });

      return {
        id: existingUser.id,
        email: existingUser.email,
        name: existingUser.name,
        image: existingUser.image,
      };
    }

    // 시나리오 3: 신규 사용자 생성
    const newUser = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name || input.email.split('@')[0],
        emailVerified: new Date(), // SSO 인증 이메일은 검증된 것으로 간주
        identityProvider: input.provider,
        identityProviderAccountId: input.providerAccountId,
        accounts: {
          create: {
            provider: providerName,
            providerAccountId: input.providerAccountId,
          },
        },
      },
    });

    this.logger.debug(`SSO 신규 사용자 생성: ${input.email} (${providerName})`);

    // 감사 로그
    this.auditLogService.logEvent({
      action: 'user.sso-signup',
      userId: newUser.id,
      targetType: 'user',
      targetId: newUser.id,
      metadata: { provider: providerName },
    });

    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      image: newUser.image,
    };
  }
}
