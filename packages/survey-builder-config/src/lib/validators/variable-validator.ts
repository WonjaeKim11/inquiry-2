import type { IdValidationResult } from './id-validator';

/**
 * 변수 이름 패턴 (소문자, 숫자, 언더스코어만 허용).
 */
const VARIABLE_NAME_PATTERN = /^[a-z0-9_]+$/;

/**
 * 변수 이름을 검증한다.
 * 패턴: ^[a-z0-9_]+$ (소문자, 숫자, 언더스코어만 허용).
 * 유일성: 기존 이름 목록과 중복 검사 (NFR-013-02).
 *
 * @param name - 검증할 변수 이름
 * @param existingNames - 기존 변수 이름 목록
 * @returns 검증 결과
 */
export function validateVariableName(
  name: string,
  existingNames: string[] = []
): IdValidationResult {
  // 빈 문자열 검사
  if (!name || name.trim() === '') {
    return { valid: false, error: 'Variable name is required.' };
  }

  // 패턴 검사
  if (!VARIABLE_NAME_PATTERN.test(name)) {
    return {
      valid: false,
      error: 'Variable name only allows lowercase, numbers, and underscores.',
    };
  }

  // 유일성 검사 (대소문자 무시)
  if (existingNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
    return { valid: false, error: 'This variable name is already in use.' };
  }

  return { valid: true };
}

/**
 * 변수 ID를 검증한다.
 * 유일성: 기존 ID 목록과 중복 검사 (NFR-013-01).
 *
 * @param id - 검증할 변수 ID
 * @param existingIds - 기존 변수 ID 목록
 * @returns 검증 결과
 */
export function validateVariableId(
  id: string,
  existingIds: string[] = []
): IdValidationResult {
  // 빈 문자열 검사
  if (!id || id.trim() === '') {
    return { valid: false, error: 'Variable ID is required.' };
  }

  // 유일성 검사
  if (existingIds.some((e) => e === id)) {
    return { valid: false, error: 'Variable ID is duplicated.' };
  }

  return { valid: true };
}

/**
 * 변수 배열 전체를 검증한다.
 * 각 변수의 ID 유일성과 이름 패턴/유일성을 검증.
 *
 * @param variables - 검증할 변수 배열
 * @returns 검증 결과 (모든 오류 포함)
 */
export function validateVariables(
  variables: Array<{
    id: string;
    name: string;
    type: string;
    value: string | number;
  }>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  for (const variable of variables) {
    // ID 중복 검사
    if (seenIds.has(variable.id)) {
      errors.push(`Variable ID "${variable.id}" is duplicated.`);
    }
    seenIds.add(variable.id);

    // 이름 빈 문자열 검사
    if (!variable.name || variable.name.trim() === '') {
      errors.push(`Variable with ID "${variable.id}" has empty name.`);
      continue;
    }

    // 이름 패턴 검사
    if (!VARIABLE_NAME_PATTERN.test(variable.name)) {
      errors.push(
        `Variable name "${variable.name}" only allows lowercase, numbers, and underscores.`
      );
    }

    // 이름 중복 검사
    const lowerName = variable.name.toLowerCase();
    if (seenNames.has(lowerName)) {
      errors.push(`Variable name "${variable.name}" is already in use.`);
    }
    seenNames.add(lowerName);

    // 타입-값 일치 검사
    if (variable.type === 'number' && typeof variable.value !== 'number') {
      const parsed = Number(variable.value);
      if (isNaN(parsed)) {
        errors.push(
          `Variable "${variable.name}" type is number but value is not a valid number.`
        );
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
