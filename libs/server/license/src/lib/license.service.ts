import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@inquiry/server-redis';
import type { LicenseInfo, LicensePlan, LicenseStatus } from './license.types';

/** 기본 무료 플랜 라이선스 정보 */
const FREE_LICENSE: LicenseInfo = {
  plan: 'free',
  status: 'active',
  expiresAt: null,
  features: ['survey.basic', 'response.collect', 'member.invite'],
  limits: {
    maxSurveys: 3,
    maxResponsesPerSurvey: 100,
    maxStorageMb: 100,
    maxMembers: 3,
    maxApiKeys: 1,
  },
};

/**
 * 라이선스 관리 서비스.
 * 캐시 계층: Memory(1분) → Redis(24시간) → Grace Period(3일)
 * LICENSE_KEY 미설정 시 무료 플랜으로 동작.
 */
@Injectable()
export class LicenseService implements OnModuleInit {
  private readonly logger = new Logger(LicenseService.name);

  /** 메모리 캐시 */
  private memoryCache: { info: LicenseInfo; expiresAt: number } | null = null;
  /** 메모리 캐시 TTL (1분) */
  private static readonly MEMORY_TTL_MS = 60_000;
  /** Redis 캐시 TTL (24시간) */
  private static readonly REDIS_TTL_SEC = 86_400;
  /** Redis 캐시 키 */
  private static readonly REDIS_KEY = 'license:info';
  /** Grace Period 기간 (3일) */
  private static readonly GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService
  ) {}

  onModuleInit() {
    const licenseKey = this.configService.get<string>('LICENSE_KEY');
    if (!licenseKey) {
      this.logger.log(
        'LICENSE_KEY가 설정되지 않았습니다. 무료 플랜으로 동작합니다.'
      );
    }
  }

  /** 현재 라이선스 정보 조회 (캐시 계층 적용) */
  async getLicenseInfo(): Promise<LicenseInfo> {
    // 1. 메모리 캐시 확인
    if (this.memoryCache && this.memoryCache.expiresAt > Date.now()) {
      return this.memoryCache.info;
    }

    // 2. Redis 캐시 확인
    const cached = await this.redis.get(LicenseService.REDIS_KEY);
    if (cached) {
      try {
        const info = JSON.parse(cached) as LicenseInfo;
        this.setMemoryCache(info);
        return info;
      } catch {
        this.logger.warn('Redis 라이선스 캐시 파싱 실패');
      }
    }

    // 3. 라이선스 키로 검증 (현재는 로컬 검증만 구현)
    const licenseKey = this.configService.get<string>('LICENSE_KEY');
    if (!licenseKey) {
      this.setCache(FREE_LICENSE);
      return FREE_LICENSE;
    }

    // 라이선스 키 파싱 (향후 외부 API 연동으로 대체)
    const info = this.parseLicenseKey(licenseKey);
    this.setCache(info);
    return info;
  }

  /** 특정 기능 사용 가능 여부 확인 */
  async hasFeature(feature: string): Promise<boolean> {
    const license = await this.getLicenseInfo();
    return license.features.includes(feature);
  }

  /** 현재 플랜 조회 */
  async getCurrentPlan(): Promise<LicensePlan> {
    const license = await this.getLicenseInfo();
    return license.plan;
  }

  /** 라이선스 상태 조회 */
  async getStatus(): Promise<LicenseStatus> {
    const license = await this.getLicenseInfo();
    return license.status;
  }

  /** 메모리 + Redis 캐시에 저장 */
  private async setCache(info: LicenseInfo): Promise<void> {
    this.setMemoryCache(info);
    await this.redis.set(
      LicenseService.REDIS_KEY,
      JSON.stringify(info),
      LicenseService.REDIS_TTL_SEC
    );
  }

  /** 메모리 캐시에 저장 */
  private setMemoryCache(info: LicenseInfo): void {
    this.memoryCache = {
      info,
      expiresAt: Date.now() + LicenseService.MEMORY_TTL_MS,
    };
  }

  /**
   * 라이선스 키 파싱 (로컬 검증).
   * 형식: plan:features:expiresAt
   * 향후 서명 검증 또는 외부 API 호출로 대체 예정.
   */
  private parseLicenseKey(key: string): LicenseInfo {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded) as Partial<LicenseInfo>;

      // Grace Period 확인
      let status: LicenseStatus = 'active';
      if (parsed.expiresAt) {
        const expiresAt = new Date(parsed.expiresAt).getTime();
        const now = Date.now();
        if (expiresAt < now) {
          if (expiresAt + LicenseService.GRACE_PERIOD_MS > now) {
            status = 'grace_period';
            this.logger.warn('라이선스가 만료되었지만 유예 기간 중입니다.');
          } else {
            status = 'expired';
            this.logger.warn('라이선스가 만료되었습니다. 무료 플랜으로 전환.');
            return { ...FREE_LICENSE, status: 'expired' };
          }
        }
      }

      return {
        plan: parsed.plan || 'free',
        status,
        expiresAt: parsed.expiresAt || null,
        features: parsed.features || FREE_LICENSE.features,
        limits: { ...FREE_LICENSE.limits, ...parsed.limits },
      };
    } catch {
      this.logger.error('라이선스 키 파싱 실패. 무료 플랜으로 동작합니다.');
      return FREE_LICENSE;
    }
  }
}
