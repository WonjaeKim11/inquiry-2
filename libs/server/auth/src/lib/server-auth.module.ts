import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ServerAuthController } from './server-auth.controller';
import { ServerAuthService } from './server-auth.service';
import { TwoFactorService } from './two-factor.service';
import { SsoCallbackService } from './sso-callback.service';
import { TurnstileService } from './services/turnstile.service';
import { BrevoService } from './services/brevo.service';
import { ApiKeyService } from './services/api-key.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';
import { OrgRoleGuard } from './guards/roles.guard';

/**
 * 인증 모듈.
 * Passport 전략(Local, JWT, Google, GitHub)과 JWT 모듈을 등록한다.
 * EmailModule, AuditLogModule, CryptoModule은 @Global()이므로 별도 import 불필요.
 * TurnstileService, BrevoService, ApiKeyService는 인증 모듈 내부 서비스로 등록.
 * TwoFactorService: 2FA TOTP/Backup Code 관리.
 * SsoCallbackService: SSO 프로바이더 콜백 공통 처리.
 */
@Module({
  imports: [PassportModule, JwtModule.register({})],
  controllers: [ServerAuthController],
  providers: [
    ServerAuthService,
    TwoFactorService,
    SsoCallbackService,
    TurnstileService,
    BrevoService,
    ApiKeyService,
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
    GithubStrategy,
    ApiKeyAuthGuard,
    OrgRoleGuard,
  ],
  exports: [
    ServerAuthService,
    TwoFactorService,
    SsoCallbackService,
    ApiKeyService,
    ApiKeyAuthGuard,
    OrgRoleGuard,
  ],
})
export class ServerAuthModule {}
