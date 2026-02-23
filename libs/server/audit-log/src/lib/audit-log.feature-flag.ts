/**
 * 감사 로그 기능 플래그 서비스.
 * Memory Cache 기반으로 라이선스 기능 활성화 여부를 캐싱하여
 * 매 호출마다 라이선스 서버에 질의하지 않도록 한다.
 */

import { Injectable, Logger } from '@nestjs/common';
import { LicenseService } from '@inquiry/server-license';

/** 감사 로그 관련 기능 플래그 식별자 */
export const AUDIT_FEATURES = {
  /** PII Redaction 활성화 - 개인식별정보 마스킹 처리 */
  PII_REDACTION: 'audit.pii_redaction',
  /** Pino 로그 출력 활성화 - 감사 이벤트를 Pino 로그로 출력 */
  LOG_OUTPUT: 'audit.log_output',
  /** DB 저장 활성화 - 감사 이벤트를 데이터베이스에 저장 */
  DB_STORAGE: 'audit.db_storage',
} as const;

@Injectable()
export class AuditFeatureFlagService {
  private readonly logger = new Logger(AuditFeatureFlagService.name);
  /** 캐시 저장소: 기능명 → { 활성화 여부, 만료 시각 } */
  private cache = new Map<string, { value: boolean; expiresAt: number }>();
  /** 캐시 유효 시간 (1분) - 라이선스 변경이 최대 1분 내에 반영됨 */
  private static readonly CACHE_TTL_MS = 60_000;

  constructor(private readonly licenseService: LicenseService) {}

  /**
   * 기능 활성화 여부 확인 (캐시 적용).
   * 캐시가 유효하면 캐시된 값을 반환하고,
   * 만료되었거나 없으면 LicenseService에 질의 후 캐시를 갱신한다.
   * @param feature - 확인할 기능 식별자 (AUDIT_FEATURES 참조)
   * @returns 기능 활성화 여부
   */
  async isEnabled(feature: string): Promise<boolean> {
    // 캐시 히트: 유효 기간 내 캐시된 값 반환
    const cached = this.cache.get(feature);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    try {
      const enabled = await this.licenseService.hasFeature(feature);
      this.cache.set(feature, {
        value: enabled,
        expiresAt: Date.now() + AuditFeatureFlagService.CACHE_TTL_MS,
      });
      return enabled;
    } catch (error) {
      this.logger.warn(`Feature flag 확인 실패: ${feature}`, error);
      // 실패 시 기본값: DB 저장은 항상 허용 (데이터 유실 방지), 나머지는 비활성
      return feature === AUDIT_FEATURES.DB_STORAGE;
    }
  }
}
