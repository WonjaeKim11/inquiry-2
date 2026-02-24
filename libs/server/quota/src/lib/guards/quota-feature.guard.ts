import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

/**
 * 쿼터 기능 활성화 가드 (스텁).
 * 현재는 항상 true를 반환한다.
 * FSD-029 (Enterprise Feature Flag) 구현 시 교체 예정.
 */
@Injectable()
export class QuotaFeatureGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    // TODO: FSD-029 구현 시 라이선스/플랜 기반 체크로 교체
    return true;
  }
}
