/**
 * 파일 검증 규칙 (2가지).
 *
 * 파일 업로드 질문에서 파일 확장자를 검증한다.
 * 입력값은 파일명 문자열이며, 확장자를 추출하여 허용/거부 목록과 비교한다.
 */
import type { ValidationResult } from '../validation.types';

/**
 * 파일명에서 확장자를 추출한다.
 * 점(.)이 없으면 빈 문자열을 반환한다.
 * @param filename - 파일명
 * @returns 소문자 확장자 (점 제외, 예: 'pdf')
 */
function extractExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1 || lastDot === filename.length - 1) return '';
  return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * params.extensions를 정규화된 소문자 확장자 배열로 변환한다.
 * @param params - { extensions: string[] } 확장자 목록
 * @returns 소문자 확장자 배열
 */
function normalizeExtensions(params?: Record<string, unknown>): string[] {
  const extensions = params?.extensions;
  if (!Array.isArray(extensions)) return [];
  return extensions
    .map((ext) => String(ext).toLowerCase().replace(/^\./, ''))
    .filter(Boolean);
}

/**
 * 허용 확장자 검증.
 * 파일 확장자가 허용 목록에 포함되는지 확인한다.
 * @param value - 검증할 값 (파일명 문자열)
 * @param params - { extensions: string[] } 허용 확장자 목록
 * @returns 검증 결과
 */
export function evaluateFileExtensionIs(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const filename = String(value ?? '');
  const extension = extractExtension(filename);
  const allowed = normalizeExtensions(params);

  if (allowed.length === 0 || allowed.includes(extension)) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'fileExtensionIs',
        messageKey: 'validation.error.fileExtensionIs',
        params: { extensions: allowed },
      },
    ],
  };
}

/**
 * 거부 확장자 검증.
 * 파일 확장자가 거부 목록에 포함되지 않는지 확인한다.
 * @param value - 검증할 값 (파일명 문자열)
 * @param params - { extensions: string[] } 거부 확장자 목록
 * @returns 검증 결과
 */
export function evaluateFileExtensionIsNot(
  value: unknown,
  params?: Record<string, unknown>
): ValidationResult {
  const filename = String(value ?? '');
  const extension = extractExtension(filename);
  const denied = normalizeExtensions(params);

  if (denied.length === 0 || !denied.includes(extension)) {
    return { valid: true, errors: [] };
  }

  return {
    valid: false,
    errors: [
      {
        ruleType: 'fileExtensionIsNot',
        messageKey: 'validation.error.fileExtensionIsNot',
        params: { extensions: denied },
      },
    ],
  };
}
