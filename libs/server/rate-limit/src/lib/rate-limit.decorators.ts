import { applyDecorators, SetMetadata } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

/**
 * Rate Limit 커스텀 데코레이터 모음.
 * 각 엔드포인트 특성에 맞는 제한을 적용한다.
 */

/** 회원가입: 시간당 30회 */
export function SignupRateLimit() {
  return applyDecorators(
    Throttle({ default: { ttl: 3600000, limit: 30 } }),
    SetMetadata('throttler:name', 'signup')
  );
}

/** 로그인: 15분당 10회 */
export function LoginRateLimit() {
  return applyDecorators(
    Throttle({ default: { ttl: 900000, limit: 10 } }),
    SetMetadata('throttler:name', 'login')
  );
}

/** 이메일 검증: 시간당 10회 */
export function EmailVerifyRateLimit() {
  return applyDecorators(
    Throttle({ default: { ttl: 3600000, limit: 10 } }),
    SetMetadata('throttler:name', 'email-verify')
  );
}

/** 비밀번호 재설정: 시간당 5회 */
export function PasswordResetRateLimit() {
  return applyDecorators(
    Throttle({ default: { ttl: 3600000, limit: 5 } }),
    SetMetadata('throttler:name', 'password-reset')
  );
}
