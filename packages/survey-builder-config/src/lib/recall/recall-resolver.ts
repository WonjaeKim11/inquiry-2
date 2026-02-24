import type { RecallContext } from './types/recall.types';
import { RECALL_PATTERN } from './recall-parser';
import { formatDateValue, formatArrayValue } from './recall-formatter';

/**
 * 응답 값을 표시용 문자열로 변환한다.
 * 날짜 형식이면 서수 포매팅, 배열이면 쉼표 연결.
 *
 * @param value - 변환할 원본 값
 * @returns 표시용 문자열
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';

  // 배열인 경우 (다중 선택 등)
  if (Array.isArray(value)) {
    return formatArrayValue(value.map(String));
  }

  const strValue = String(value);

  // ISO 날짜 형식 검사 (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(strValue)) {
    return formatDateValue(strValue);
  }

  return strValue;
}

/**
 * 텍스트 내 모든 recall 태그를 실제 값으로 치환한다.
 *
 * 치환 우선순위:
 * 1. 변수 (variables) -- 가장 높은 우선순위
 * 2. 응답 데이터 (responseData) -- element/question 응답
 * 3. 히든 필드 (hiddenFieldValues)
 * 4. fallback 텍스트 -- 모든 소스에서 값을 찾지 못한 경우
 *
 * @param text - recall 태그를 포함한 텍스트
 * @param context - 변수, 응답, 히든 필드 데이터
 * @returns 치환 완료된 텍스트
 */
export function resolveRecalls(text: string, context: RecallContext): string {
  if (!text) return '';

  const regex = new RegExp(RECALL_PATTERN.source, RECALL_PATTERN.flags);

  return text.replace(regex, (_match: string, id: string, fallback: string) => {
    // 1순위: 변수에서 조회
    const variable = context.variables.find((v) => v.id === id);
    if (
      variable !== undefined &&
      variable.value !== undefined &&
      variable.value !== ''
    ) {
      return formatValue(variable.value);
    }

    // 2순위: 응답 데이터에서 조회
    const response = context.responseData[id];
    if (response !== undefined && response !== null && response !== '') {
      return formatValue(response);
    }

    // 3순위: 히든 필드에서 조회
    const hidden = context.hiddenFieldValues[id];
    if (hidden !== undefined && hidden !== '') {
      return String(hidden);
    }

    // 4순위: fallback 사용
    return fallback || '';
  });
}
