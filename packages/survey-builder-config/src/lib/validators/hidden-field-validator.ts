import { validateId } from './id-validator';
import type { IdValidationResult } from './id-validator';

/**
 * 히든 필드 ID 패턴 (영문, 숫자, 하이픈, 언더스코어만 허용).
 */
const HIDDEN_FIELD_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

/**
 * 히든 필드에 사용할 수 없는 예약 ID 목록.
 * 서버 시스템에서 사용하는 ID와의 충돌을 방지한다.
 */
export const HIDDEN_FIELD_FORBIDDEN_IDS = [
  'suid',
  'odp',
  'userId',
  'recipientId',
  'recipientEmail',
  'recipientFirstName',
  'recipientLastName',
  'surveyId',
  'source',
] as const;

/**
 * 히든 필드 ID를 검증한다.
 * 패턴: ^[a-zA-Z0-9_-]+$ + 금지 ID 검사 (NFR-013-03).
 *
 * @param id - 검증할 히든 필드 ID
 * @param existingIds - 기존 ID 목록 (element + hiddenField + variable 통합)
 * @param forbiddenIds - 금지 ID 목록 (기본: HIDDEN_FIELD_FORBIDDEN_IDS)
 * @returns 검증 결과
 */
export function validateHiddenFieldId(
  id: string,
  existingIds: string[] = [],
  forbiddenIds: readonly string[] = HIDDEN_FIELD_FORBIDDEN_IDS
): IdValidationResult {
  return validateId(id, 'Hidden field', existingIds, forbiddenIds);
}

/**
 * 히든 필드 전체 구조를 검증한다.
 * 각 필드 ID의 패턴/금지 ID/중복을 검사.
 *
 * @param hiddenFields - 히든 필드 설정
 * @param existingElementIds - 기존 element ID 목록
 * @param existingVariableIds - 기존 변수 ID 목록
 * @returns 검증 결과 (모든 오류 포함)
 */
export function validateHiddenFields(
  hiddenFields: { enabled: boolean; fieldIds: string[] },
  existingElementIds: string[] = [],
  existingVariableIds: string[] = []
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 비활성화 상태면 검증 건너뛰기
  if (!hiddenFields.enabled) {
    return { valid: true, errors: [] };
  }

  const seenIds = new Set<string>();
  // element ID + variable ID를 합산하여 전체 ID 풀 구성
  const allExistingIds = [...existingElementIds, ...existingVariableIds];

  for (const fieldId of hiddenFields.fieldIds) {
    // 빈 문자열 검사
    if (!fieldId || fieldId.trim() === '') {
      errors.push('Hidden field ID is required.');
      continue;
    }

    // 패턴 검사
    if (!HIDDEN_FIELD_ID_PATTERN.test(fieldId)) {
      errors.push(
        `Hidden field ID "${fieldId}": only letters, numbers, hyphens, and underscores are allowed.`
      );
      continue;
    }

    // 히든 필드 내 중복 검사
    if (seenIds.has(fieldId.toLowerCase())) {
      errors.push(`Hidden field ID "${fieldId}" is duplicated.`);
    }
    seenIds.add(fieldId.toLowerCase());

    // 금지 ID 검사
    if (HIDDEN_FIELD_FORBIDDEN_IDS.includes(fieldId as never)) {
      errors.push(`Hidden field ID "${fieldId}" is not allowed (reserved).`);
    }

    // element/variable ID와의 충돌 검사
    if (
      allExistingIds.some((id) => id.toLowerCase() === fieldId.toLowerCase())
    ) {
      errors.push(
        `Hidden field ID "${fieldId}" already exists in questions or variables.`
      );
    }
  }

  return { valid: errors.length === 0, errors };
}
