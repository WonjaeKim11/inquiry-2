import { Module, Global } from '@nestjs/common';
import { LicenseService } from './license.service';
import { LicenseGuard } from './license.guard';
import { FeatureGatingService } from './feature-gating.service';

/**
 * 라이선스/기능 플래그 글로벌 모듈.
 * LicenseService, LicenseGuard, FeatureGatingService를 전역으로 제공한다.
 */
@Global()
@Module({
  providers: [LicenseService, LicenseGuard, FeatureGatingService],
  exports: [LicenseService, LicenseGuard, FeatureGatingService],
})
export class LicenseModule {}
