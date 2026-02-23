import { Injectable, Logger } from '@nestjs/common';
import { LicenseService } from './license.service';
import type { GatingResult, GatingType } from './license.types';

/**
 * 기능 게이팅 서비스.
 * 하드/소프트/용량 세 가지 게이팅 타입을 지원한다.
 *
 * - hard: 기능 자체를 완전히 차단 (예: 로직 분기)
 * - soft: 경고를 표시하지만 사용은 허용 (예: 브랜딩 제거)
 * - capacity: 수량 기반 제한 (예: 설문 3개 초과)
 */
@Injectable()
export class FeatureGatingService {
  private readonly logger = new Logger(FeatureGatingService.name);

  constructor(private readonly licenseService: LicenseService) {}

  /** 하드 게이팅: 기능 사용 가능 여부 확인 */
  async checkHardGate(feature: string): Promise<GatingResult> {
    const hasFeature = await this.licenseService.hasFeature(feature);
    return {
      allowed: hasFeature,
      gatingType: 'hard' as GatingType,
      ...(!hasFeature && {
        reason: `기능 '${feature}'은(는) 현재 플랜에서 사용할 수 없습니다.`,
      }),
    };
  }

  /** 소프트 게이팅: 사용 가능하지만 경고 표시 */
  async checkSoftGate(feature: string): Promise<GatingResult> {
    const hasFeature = await this.licenseService.hasFeature(feature);
    if (!hasFeature) {
      this.logger.warn(
        `소프트 게이팅: '${feature}' 기능이 현재 플랜에 포함되지 않습니다.`
      );
    }
    return {
      allowed: true, // 소프트 게이팅은 항상 허용
      gatingType: 'soft' as GatingType,
      ...(!hasFeature && {
        reason: `기능 '${feature}'을(를) 사용 중이지만, 현재 플랜에 포함되지 않습니다. 업그레이드를 권장합니다.`,
      }),
    };
  }

  /** 용량 게이팅: 수량 기반 제한 확인 */
  async checkCapacityGate(
    limitKey: keyof Awaited<
      ReturnType<LicenseService['getLicenseInfo']>
    >['limits'],
    currentUsage: number
  ): Promise<GatingResult> {
    const license = await this.licenseService.getLicenseInfo();
    const maxLimit = license.limits[limitKey];
    const allowed = currentUsage < maxLimit;

    if (!allowed) {
      this.logger.warn(
        `용량 게이팅: ${limitKey} 한도 초과 (${currentUsage}/${maxLimit})`
      );
    }

    return {
      allowed,
      gatingType: 'capacity' as GatingType,
      currentUsage,
      maxLimit,
      ...(!allowed && {
        reason: `${limitKey} 한도(${maxLimit})에 도달했습니다. 현재: ${currentUsage}`,
      }),
    };
  }
}
