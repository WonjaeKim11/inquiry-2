import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { Request } from 'express';
import { ServerAuthService } from '../server-auth.service';

/**
 * 이메일+비밀번호 로컬 인증 전략.
 * usernameField를 'email'로 매핑하여 email 기반 인증을 수행한다.
 * passReqToCallback을 활성화하여 요청 본문에서 2FA 코드를 함께 전달한다.
 * validateUser가 에러 코드를 포함한 결과를 반환하므로 적절히 처리한다.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: ServerAuthService) {
    super({ usernameField: 'email', passReqToCallback: true });
  }

  async validate(req: Request, email: string, password: string) {
    // 요청 본문에서 2FA 관련 필드 추출
    const body = req.body as {
      totpCode?: string;
      backupCode?: string;
    };

    const result = await this.authService.validateUser(
      email,
      password,
      body.totpCode,
      body.backupCode
    );
    if (!result.success) {
      throw new UnauthorizedException({
        message: result.message,
        errorCode: result.errorCode,
      });
    }
    return result.user;
  }
}
