/**
 * ID 검증 결과.
 */
export interface IdValidationResult {
  /** 검증 통과 여부 */
  valid: boolean;
  /** 오류 메시지 (검증 실패 시) */
  error?: string;
}

/**
 * 공통 ID 유효성을 검증한다.
 * 검증 순서: 빈 문자열 -> 중복(대소문자 무시) -> 금지 ID -> 공백 -> 문자 패턴.
 *
 * @param id - 검증할 ID
 * @param type - ID 유형 (오류 메시지에 사용)
 * @param existingIds - 기존 ID 목록 (중복 검사)
 * @param forbiddenIds - 금지 ID 목록
 * @returns 검증 결과
 */
export function validateId(
  id: string,
  type: 'Hidden field' | 'Variable' | 'Element',
  existingIds: string[],
  forbiddenIds: readonly string[] = []
): IdValidationResult {
  // 빈 문자열 검사
  if (!id || id.trim() === '') {
    return { valid: false, error: `${type} ID is required.` };
  }

  // 중복 검사 (대소문자 무시)
  if (existingIds.some((e) => e.toLowerCase() === id.toLowerCase())) {
    return { valid: false, error: `${type} ID already exists.` };
  }

  // 금지 ID 검사
  if (forbiddenIds.includes(id as never)) {
    return { valid: false, error: `${type} ID is not allowed.` };
  }

  // 공백 포함 검사
  if (/\s/.test(id)) {
    return { valid: false, error: `${type} ID cannot contain spaces.` };
  }

  // 문자 패턴 검사 (영문, 숫자, 하이픈, 언더스코어만 허용)
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    return {
      valid: false,
      error: 'Only letters, numbers, hyphens, and underscores are allowed.',
    };
  }

  return { valid: true };
}
