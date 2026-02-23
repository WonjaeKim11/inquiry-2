/** 라이선스 플랜 타입 */
export type LicensePlan = 'free' | 'pro' | 'business' | 'enterprise';

/** 라이선스 상태 */
export type LicenseStatus = 'active' | 'expired' | 'grace_period' | 'unknown';

/** 라이선스 정보 */
export interface LicenseInfo {
  plan: LicensePlan;
  status: LicenseStatus;
  /** 만료 일시 (ISO 8601) */
  expiresAt: string | null;
  /** 기능 플래그 목록 */
  features: string[];
  /** 용량 한도 */
  limits: LicenseLimits;
}

/** 플랜별 용량 한도 */
export interface LicenseLimits {
  maxSurveys: number;
  maxResponsesPerSurvey: number;
  maxStorageMb: number;
  maxMembers: number;
  maxApiKeys: number;
}

/** 기능 게이팅 타입 */
export type GatingType = 'hard' | 'soft' | 'capacity';

/** 기능 게이팅 결과 */
export interface GatingResult {
  allowed: boolean;
  gatingType: GatingType;
  /** 차단 사유 (allowed=false인 경우) */
  reason?: string;
  /** 현재 사용량 (capacity 게이팅인 경우) */
  currentUsage?: number;
  /** 최대 한도 (capacity 게이팅인 경우) */
  maxLimit?: number;
}
