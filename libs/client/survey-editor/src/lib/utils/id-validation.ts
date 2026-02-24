import {
  validateId,
  validateHiddenFieldId as validateHiddenFieldIdBase,
} from '@inquiry/survey-builder-config';
import type { IdValidationResult } from '@inquiry/survey-builder-config';

/**
 * Element ID를 검증한다.
 * survey-builder-config의 validateId를 래핑하여 기존 ID 중복 검사를 추가한다.
 * currentEntityId를 제외한 기존 ID 목록과의 중복을 검사하여,
 * 자기 자신의 ID를 변경하지 않는 경우 중복 오류가 발생하지 않도록 한다.
 *
 * @param id - 검증할 Element ID
 * @param existingIds - 현재 존재하는 모든 Element ID 목록
 * @param currentEntityId - 현재 편집 중인 Entity의 ID (자기 자신 제외용)
 * @returns 검증 결과 (valid: boolean, error?: string)
 */
export function validateElementId(
  id: string,
  existingIds: string[],
  currentEntityId?: string
): IdValidationResult {
  // currentEntityId를 제외한 중복 검사 대상 ID 목록 구성
  const duplicateCheckIds = currentEntityId
    ? existingIds.filter((eid) => eid !== currentEntityId)
    : existingIds;

  // validateId는 패턴 검사, 금지 ID 검사, 중복 검사를 모두 수행한다
  return validateId(id, 'Element', duplicateCheckIds);
}

/**
 * Hidden Field ID를 에디터 컨텍스트에서 검증한다.
 * 기존 히든 필드 ID, Element ID, 변수 ID와의 충돌을 모두 검사한다.
 *
 * @param id - 검증할 Hidden Field ID
 * @param existingFieldIds - 현재 존재하는 히든 필드 ID 목록
 * @param existingElementIds - 현재 존재하는 Element ID 목록
 * @param existingVariableIds - 현재 존재하는 변수 ID 목록
 * @returns 검증 결과 (valid: boolean, error?: string)
 */
export function validateHiddenFieldIdForEditor(
  id: string,
  existingFieldIds: string[],
  existingElementIds: string[],
  existingVariableIds: string[]
): IdValidationResult {
  // Element ID + Variable ID를 합산하여 기본 검증 (패턴, 금지 ID, 충돌 검사)
  const baseResult = validateHiddenFieldIdBase(
    id,
    existingElementIds,
    existingVariableIds
  );
  if (!baseResult.valid) {
    return baseResult;
  }

  // 히든 필드 내부 중복 검사
  if (existingFieldIds.includes(id)) {
    return { valid: false, error: '이미 사용 중인 Hidden Field ID입니다' };
  }

  return { valid: true };
}
