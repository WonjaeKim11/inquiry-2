import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ServerAuthController } from './server-auth.controller';
import { ServerAuthService } from './server-auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';

/**
 * 인증 모듈.
 * Passport 전략(Local, JWT, Google, GitHub)과 JWT 모듈을 등록한다.
 * ServerPrismaModule은 @Global로 등록되어 있으므로 별도 import 불필요.
 */
@Module({
  imports: [
    PassportModule,
    JwtModule.register({}), // 동적 시크릿은 서비스에서 설정
  ],
  controllers: [ServerAuthController],
  providers: [ServerAuthService, LocalStrategy, JwtStrategy, GoogleStrategy, GithubStrategy],
  exports: [ServerAuthService],
})
export class ServerAuthModule {}
