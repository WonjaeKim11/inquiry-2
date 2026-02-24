import type { RecallInfo } from './types/recall.types';

/** Recall 패턴 정규식 */
export const RECALL_PATTERN = /#recall:([a-zA-Z0-9_-]+)\/fallback:(.*?)#/g;

/**
 * 텍스트에서 첫 번째 recall ID를 반환한다.
 * @param text - recall 태그를 포함할 수 있는 텍스트
 * @returns 첫 번째 recall ID 또는 null
 */
export function getFirstRecallId(text: string): string | null {
  if (!text) return null;
  const regex = new RegExp(RECALL_PATTERN.source, RECALL_PATTERN.flags);
  const match = regex.exec(text);
  return match ? match[1] : null;
}

/**
 * 텍스트에서 모든 recall ID를 추출한다.
 * @param text - recall 태그를 포함할 수 있는 텍스트
 * @returns recall ID 배열
 */
export function getAllRecallIds(text: string): string[] {
  if (!text) return [];
  const ids: string[] = [];
  const regex = new RegExp(RECALL_PATTERN.source, RECALL_PATTERN.flags);
  let match = regex.exec(text);
  while (match !== null) {
    ids.push(match[1]);
    match = regex.exec(text);
  }
  return ids;
}

/**
 * 특정 ID에 대한 fallback 값을 반환한다.
 * @param text - recall 태그를 포함할 수 있는 텍스트
 * @param id - 조회할 recall ID
 * @returns fallback 값 또는 null
 */
export function getFallbackValue(text: string, id: string): string | null {
  if (!text || !id) return null;
  const regex = new RegExp(RECALL_PATTERN.source, RECALL_PATTERN.flags);
  let match = regex.exec(text);
  while (match !== null) {
    if (match[1] === id) return match[2];
    match = regex.exec(text);
  }
  return null;
}

/**
 * 텍스트에서 모든 recall 정보를 추출한다.
 * @param text - recall 태그를 포함할 수 있는 텍스트
 * @returns RecallInfo 배열
 */
export function getAllRecallInfo(text: string): RecallInfo[] {
  if (!text) return [];
  const results: RecallInfo[] = [];
  const regex = new RegExp(RECALL_PATTERN.source, RECALL_PATTERN.flags);
  let match = regex.exec(text);
  while (match !== null) {
    results.push({ id: match[1], fallback: match[2] });
    match = regex.exec(text);
  }
  return results;
}
