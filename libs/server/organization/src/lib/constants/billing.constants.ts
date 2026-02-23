/**
 * 요금제(Billing) 관련 상수 정의.
 * Plan별 기본 Limits, 기본 Billing 값, 페이지네이션 기본값을 관리한다.
 */

import type {
  BillingLimits,
  BillingPlan,
  OrganizationBilling,
} from '../types/organization.types.js';

/** Plan별 기본 사용량 제한 */
export const PLAN_LIMITS: Record<BillingPlan, BillingLimits> = {
  free: {
    projects: 3,
    monthlyResponses: 1500,
    monthlyMIU: 2000,
  },
  startup: {
    projects: 3,
    monthlyResponses: 5000,
    monthlyMIU: 7500,
  },
  /** Custom 플랜은 모든 제한이 무제한 */
  custom: {
    projects: null,
    monthlyResponses: null,
    monthlyMIU: null,
  },
} as const;

/** 신규 조직 생성 시 적용되는 기본 Billing 값 */
export const DEFAULT_BILLING: OrganizationBilling = {
  plan: 'free',
  period: 'monthly',
  periodStart: null,
  limits: { ...PLAN_LIMITS.free },
  stripeCustomerId: null,
} as const;

/** 조직 목록 조회 시 기본 페이지 크기 */
export const DEFAULT_ORG_PAGE_SIZE = 10;

/** 조직 목록 조회 시 최대 페이지 크기 */
export const MAX_ORG_PAGE_SIZE = 100;

/** 조직 이름 최소 길이 */
export const ORG_NAME_MIN_LENGTH = 1;

/** 조직 이름 최대 길이 */
export const ORG_NAME_MAX_LENGTH = 100;
