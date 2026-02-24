import { RECALL_PATTERN } from './recall-parser';

/**
 * 라벨 내 중첩 recall 태그를 "___" 플레이스홀더로 대체한다.
 * 에디터 UI에서 recall 라벨 안에 또 다른 recall이 포함된 경우
 * 무한 재귀를 방지하기 위해 사용 (NFR-013-05).
 *
 * @param label - recall 라벨 텍스트
 * @returns 중첩 recall이 "___"로 대체된 텍스트
 */
export function sanitizeNestedRecall(label: string): string {
  if (!label) return label;
  const regex = new RegExp(RECALL_PATTERN.source, RECALL_PATTERN.flags);
  return label.replace(regex, '___');
}

/**
 * HTML 태그를 제거한다.
 * XSS 방지를 위해 사용자 입력에서 HTML 태그를 제거.
 *
 * @param text - HTML 태그가 포함될 수 있는 텍스트
 * @returns HTML 태그가 제거된 텍스트
 */
export function stripHtmlTags(text: string): string {
  if (!text) return text;
  return text.replace(/<[^>]*>/g, '');
}

/**
 * 텍스트 내 빈 fallback을 가진 recall 태그를 탐지한다.
 * 빈 fallback은 값이 없을 때 빈 텍스트가 표시되므로 경고 대상.
 *
 * @param text - recall 태그를 포함할 수 있는 텍스트
 * @returns 빈 fallback을 가진 recall ID 배열
 */
export function validateFallbacks(text: string): string[] {
  if (!text) return [];
  const emptyFallbackIds: string[] = [];
  const regex = new RegExp(RECALL_PATTERN.source, RECALL_PATTERN.flags);
  let match = regex.exec(text);
  while (match !== null) {
    if (!match[2] || match[2].trim() === '') {
      emptyFallbackIds.push(match[1]);
    }
    match = regex.exec(text);
  }
  return emptyFallbackIds;
}
