import type { ConditionGroup } from '../logic/types/index';
import { validateConditionGroup } from '../logic/validators/index';
import {
  MAX_QUOTAS_PER_SURVEY,
  QUOTA_NAME_MAX_LENGTH,
  QUOTA_NAME_PATTERN,
} from './constants';
import type { QuotaDefinition } from './types';

/** 쿼터 이름 검증 결과 */
export interface QuotaNameValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * 쿼터 이름을 검증한다.
 * - 빈 문자열 불가
 * - 최대 100자
 * - 유효 패턴 준수
 *
 * @param name - 검증할 쿼터 이름
 * @returns 검증 결과
 */
export function validateQuotaName(name: string): QuotaNameValidationResult {
  const trimmed = name.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Quota name is required.' };
  }

  if (trimmed.length > QUOTA_NAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Quota name must be ${QUOTA_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (!QUOTA_NAME_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: 'Quota name contains invalid characters.',
    };
  }

  return { valid: true };
}

/**
 * 쿼터 조건을 검증한다.
 * 빈 객체이면 "모든 응답 카운트"로 간주하여 유효.
 * ConditionGroup이면 로직 검증을 수행한다.
 *
 * @param logic - 검증할 조건 (ConditionGroup 또는 빈 객체)
 * @returns 오류 메시지 배열 (비어 있으면 유효)
 */
export function validateQuotaConditions(
  logic: ConditionGroup | Record<string, never>
): string[] {
  // 빈 객체이면 조건 없음 — 모든 응답 카운트
  if (!('connector' in logic)) {
    return [];
  }

  const group = logic as ConditionGroup;
  const errors = validateConditionGroup(group);

  return errors.map((e) => e.message);
}

/** 쿼터 통합 검증 결과 */
export interface QuotaValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * 설문의 전체 쿼터 목록을 검증한다.
 * - 최대 갯수 초과 검사
 * - 이름 중복 검사
 * - 각 쿼터 이름/조건 검증
 * - endSurvey 액션 시 endingCardId 필수 검증
 *
 * @param quotas - 검증할 쿼터 목록
 * @param endingCardIds - 유효한 종료 카드 ID 목록
 * @returns 통합 검증 결과
 */
export function validateQuotas(
  quotas: QuotaDefinition[],
  endingCardIds: string[]
): QuotaValidationResult {
  const errors: string[] = [];

  // 최대 갯수 초과 검사
  if (quotas.length > MAX_QUOTAS_PER_SURVEY) {
    errors.push(`Maximum ${MAX_QUOTAS_PER_SURVEY} quotas per survey.`);
  }

  // 이름 중복 검사
  const nameSet = new Set<string>();
  for (const quota of quotas) {
    const lowerName = quota.name.trim().toLowerCase();
    if (nameSet.has(lowerName)) {
      errors.push(`Duplicate quota name: "${quota.name}".`);
    }
    nameSet.add(lowerName);
  }

  // 개별 쿼터 검증
  for (const quota of quotas) {
    // 이름 검증
    const nameResult = validateQuotaName(quota.name);
    if (!nameResult.valid && nameResult.error) {
      errors.push(`Quota "${quota.name}": ${nameResult.error}`);
    }

    // limit 검증
    if (!Number.isInteger(quota.limit) || quota.limit < 1) {
      errors.push(`Quota "${quota.name}": limit must be a positive integer.`);
    }

    // endSurvey 액션 시 endingCardId 필수
    if (quota.action === 'endSurvey') {
      if (!quota.endingCardId) {
        errors.push(
          `Quota "${quota.name}": ending card is required for "End Survey" action.`
        );
      } else if (!endingCardIds.includes(quota.endingCardId)) {
        errors.push(
          `Quota "${quota.name}": ending card "${quota.endingCardId}" does not exist.`
        );
      }
    }

    // 조건 검증
    const conditionErrors = validateQuotaConditions(quota.logic);
    for (const err of conditionErrors) {
      errors.push(`Quota "${quota.name}": ${err}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
