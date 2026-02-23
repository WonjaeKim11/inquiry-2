import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { LicenseService } from './license.service';

/** 라이선스 필요 기능 메타데이터 키 */
export const REQUIRE_LICENSE_KEY = 'require_license';

/**
 * @RequireLicense() 데코레이터.
 * 특정 기능에 대한 라이선스 검증이 필요함을 표시한다.
 * @example @RequireLicense('audit_log')
 */
export const RequireLicense = (feature: string) =>
  SetMetadata(REQUIRE_LICENSE_KEY, feature);

/**
 * 라이선스 검증 가드.
 * @RequireLicense() 데코레이터에 지정된 기능의 라이선스를 확인한다.
 */
@Injectable()
export class LicenseGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly licenseService: LicenseService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<string | undefined>(
      REQUIRE_LICENSE_KEY,
      [context.getHandler(), context.getClass()]
    );

    // @RequireLicense() 데코레이터가 없으면 접근 허용
    if (!feature) {
      return true;
    }

    const hasFeature = await this.licenseService.hasFeature(feature);
    if (!hasFeature) {
      const plan = await this.licenseService.getCurrentPlan();
      throw new ForbiddenException(
        `이 기능은 현재 플랜(${plan})에서 사용할 수 없습니다. 업그레이드가 필요합니다.`
      );
    }

    return true;
  }
}
