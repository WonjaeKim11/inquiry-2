import type { RecallItem } from './types/recall.types';
import { stripHtmlTags } from './recall-safety';

/**
 * 저장 형식(#recall:id/fallback:val#)을 에디터 표시용(@라벨명)으로 변환한다.
 *
 * @param text - recall 태그가 포함된 저장 형식 텍스트
 * @param items - recall 대상 아이템 목록 (id -> label 매핑)
 * @returns 에디터 표시용 텍스트
 */
export function recallToEditor(text: string, items: RecallItem[]): string {
  if (!text) return '';

  const regex = /#recall:([a-zA-Z0-9_-]+)\/fallback:(.*?)#/g;

  return text.replace(regex, (_match: string, id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) {
      return `@${item.label}`;
    }
    // 매칭되는 아이템이 없으면 원본 유지
    return _match;
  });
}

/**
 * 에디터 표시용(@라벨명)을 저장 형식(#recall:id/fallback:val#)으로 변환한다.
 * HTML 태그는 XSS 방지를 위해 제거한다 (NFR-013-06).
 *
 * @param text - 에디터 표시용 텍스트
 * @param items - recall 대상 아이템 목록 (label -> id 매핑)
 * @returns 저장 형식 텍스트 (HTML 태그 제거됨)
 */
export function editorToRecall(text: string, items: RecallItem[]): string {
  if (!text) return '';

  // HTML 태그 제거 (XSS 방지)
  let result = stripHtmlTags(text);

  // @라벨명을 #recall:id/fallback:# 형태로 변환
  // 라벨을 길이 내림차순 정렬하여 긴 라벨 우선 매칭 (부분 매칭 방지)
  const sortedItems = [...items].sort(
    (a, b) => b.label.length - a.label.length
  );

  for (const item of sortedItems) {
    const escapedLabel = item.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const labelRegex = new RegExp(`@${escapedLabel}`, 'g');
    result = result.replace(labelRegex, `#recall:${item.id}/fallback:#`);
  }

  return result;
}
