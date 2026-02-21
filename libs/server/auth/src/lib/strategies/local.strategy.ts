import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { ServerAuthService } from '../server-auth.service';

/**
 * 이메일+비밀번호 로컬 인증 전략.
 * usernameField를 'email'로 매핑하여 email 기반 인증을 수행한다.
 * validateUser가 에러 코드를 포함한 결과를 반환하므로 적절히 처리한다.
 */
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: ServerAuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string) {
    const result = await this.authService.validateUser(email, password);
    if (!result.success) {
      throw new UnauthorizedException({
        message: result.message,
        errorCode: result.errorCode,
      });
    }
    return result.user;
  }
}
