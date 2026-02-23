/**
 * 텍스트 검증 규칙 (10가지).
 *
 * 문자열 값에 대한 길이, 패턴, 형식(이메일/URL/전화번호),
 * 일치/불일치, 포함/미포함 검증을 수행한다.
 */
import type { ValidationResult } from '../validation.types';

/**
 * 최소 길이 검증.
 * @param value - 검증할 값 (문자열로 변환됨)
 * @param params - { min: number } 최소 길이
 * @returns 검증 결과
 */
export function evaluateMinLength(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const str = String(value ?? '');
  const min = Number(params?.min ?? 0);

  if (str.length >= min) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'minLength',
        messageKey: 'validation.error.minLength',
        params: { min },
      },
    ],
  };
}

/**
 * 최대 길이 검증.
 * @param value - 검증할 값 (문자열로 변환됨)
 * @param params - { max: number } 최대 길이
 * @returns 검증 결과
 */
export function evaluateMaxLength(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const str = String(value ?? '');
  const max = Number(params?.max ?? Infinity);

  if (str.length <= max) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'maxLength',
        messageKey: 'validation.error.maxLength',
        params: { max },
      },
    ],
  };
}

/**
 * 정규식 패턴 검증.
 * @param value - 검증할 값 (문자열로 변환됨)
 * @param params - { pattern: string } 정규식 패턴 문자열
 * @returns 검증 결과
 */
export function evaluatePattern(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const str = String(value ?? '');
  const pattern = String(params?.pattern ?? '');

  try {
    const regex = new RegExp(pattern);
    if (regex.test(str)) {
      return { valid: true, errors: [] };
    }
  } catch {
    /* 유효하지 않은 정규식은 실패로 처리 */
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'pattern',
        messageKey: 'validation.error.pattern',
        params: { pattern },
      },
    ],
  };
}

/**
 * 이메일 형식 검증.
 * RFC 5322 간소화 패턴을 사용한다.
 * @param value - 검증할 값 (문자열로 변환됨)
 * @returns 검증 결과
 */
export function evaluateEmail(
  value: unknown,
  _params?: Record<string, unknown>
): ValidationResult {
  const str = String(value ?? '');
  // RFC 5322 간소화 이메일 패턴
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (emailRegex.test(str)) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'email',
        messageKey: 'validation.error.email',
      },
    ],
  };
}

/**
 * URL 형식 검증.
 * http/https 프로토콜을 포함한 URL 패턴을 검사한다.
 * @param value - 검증할 값 (문자열로 변환됨)
 * @returns 검증 결과
 */
export function evaluateUrl(
  value: unknown,
  _params?: Record<string, unknown>
): ValidationResult {
  const str = String(value ?? '');
  // http/https URL 패턴
  const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/;

  if (urlRegex.test(str)) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'url',
        messageKey: 'validation.error.url',
      },
    ],
  };
}

/**
 * 전화번호 형식 검증.
 * 국제 전화번호 형식(+, 숫자, 하이픈, 공백, 괄호)을 허용한다.
 * @param value - 검증할 값 (문자열로 변환됨)
 * @returns 검증 결과
 */
export function evaluatePhone(
  value: unknown,
  _params?: Record<string, unknown>
): ValidationResult {
  const str = String(value ?? '');
  // 국제 전화번호 패턴 (숫자, +, -, 공백, 괄호 허용)
  const phoneRegex = /^\+?[\d\s\-()]{7,20}$/;

  if (phoneRegex.test(str)) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'phone',
        messageKey: 'validation.error.phone',
      },
    ],
  };
}

/**
 * 정확한 일치 검증.
 * @param value - 검증할 값 (문자열로 변환됨)
 * @param params - { expected: string } 기대값
 * @returns 검증 결과
 */
export function evaluateEquals(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const str = String(value ?? '');
  const expected = String(params?.expected ?? '');

  if (str === expected) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'equals',
        messageKey: 'validation.error.equals',
        params: { expected },
      },
    ],
  };
}

/**
 * 불일치 검증.
 * @param value - 검증할 값 (문자열로 변환됨)
 * @param params - { expected: string } 불일치 기대값
 * @returns 검증 결과
 */
export function evaluateDoesNotEqual(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const str = String(value ?? '');
  const expected = String(params?.expected ?? '');

  if (str !== expected) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'doesNotEqual',
        messageKey: 'validation.error.doesNotEqual',
        params: { expected },
      },
    ],
  };
}

/**
 * 문자열 포함 검증.
 * @param value - 검증할 값 (문자열로 변환됨)
 * @param params - { substring: string } 포함해야 할 문자열
 * @returns 검증 결과
 */
export function evaluateContains(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const str = String(value ?? '');
  const substring = String(params?.substring ?? '');

  if (str.includes(substring)) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'contains',
        messageKey: 'validation.error.contains',
        params: { substring },
      },
    ],
  };
}

/**
 * 문자열 미포함 검증.
 * @param value - 검증할 값 (문자열로 변환됨)
 * @param params - { substring: string } 포함하지 않아야 할 문자열
 * @returns 검증 결과
 */
export function evaluateDoesNotContain(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const str = String(value ?? '');
  const substring = String(params?.substring ?? '');

  if (!str.includes(substring)) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'doesNotContain',
        messageKey: 'validation.error.doesNotContain',
        params: { substring },
      },
    ],
  };
}
