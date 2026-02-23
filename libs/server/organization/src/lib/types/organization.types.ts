/**
 * 조직 관련 TypeScript 타입 정의.
 * Billing JSON 필드와 Whitelabel JSON 필드의 구조를 정의한다.
 */

/** 요금제 유형: free(무료), startup(스타트업), custom(커스텀) */
export type BillingPlan = 'free' | 'startup' | 'custom';

/** 결제 주기: monthly(월간), yearly(연간) */
export type BillingPeriod = 'monthly' | 'yearly';

/** 요금제별 사용량 제한. null은 무제한을 의미한다. */
export interface BillingLimits {
  /** 프로젝트 최대 개수 (null = 무제한) */
  projects: number | null;
  /** 월간 응답 최대 수 (null = 무제한) */
  monthlyResponses: number | null;
  /** 월간 식별 사용자 최대 수 (null = 무제한) */
  monthlyMIU: number | null;
}

/** Organization billing JSON 필드의 전체 구조 */
export interface OrganizationBilling {
  /** 현재 요금제 */
  plan: BillingPlan;
  /** 결제 주기 */
  period: BillingPeriod;
  /** 결제 기간 시작일 (ISO DateTime 문자열 또는 null) */
  periodStart: string | null;
  /** 요금제별 사용량 제한 */
  limits: BillingLimits;
  /** Stripe 고객 ID (결제 연동 시 사용) */
  stripeCustomerId: string | null;
}

/** Organization whitelabel JSON 필드의 구조 */
export interface OrganizationWhitelabel {
  /** 조직 커스텀 로고 URL */
  logoUrl?: string | null;
  /** 조직 커스텀 파비콘 URL */
  faviconUrl?: string | null;
}

/** 페이지네이션된 조직 목록 응답 */
export interface PaginatedOrganizations {
  data: OrganizationResponse[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/** API 응답에서 반환되는 Organization 형태 */
export interface OrganizationResponse {
  id: string;
  name: string;
  billing: OrganizationBilling;
  whitelabel: OrganizationWhitelabel;
  isAIEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
