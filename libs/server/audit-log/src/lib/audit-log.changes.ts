/**
 * 변경 사항(diff) 생성 유틸리티.
 * 두 객체를 비교하여 변경된 필드만 추출한다.
 */

import type { AuditChanges } from './audit-log.types';

/**
 * 두 객체의 변경 diff를 생성.
 * before/after 객체를 비교하여 실제로 변경된 필드만 포함하는
 * AuditChanges 객체를 반환한다.
 * @param before - 변경 전 상태 (없으면 생성 이벤트)
 * @param after - 변경 후 상태 (없으면 삭제 이벤트)
 * @returns 변경 사항이 있으면 AuditChanges, 없으면 undefined
 */
export function buildChanges(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined
): AuditChanges | undefined {
  // 양쪽 모두 없으면 변경 사항 없음
  if (!before && !after) return undefined;
  // 생성 이벤트: before가 없으면 after만 반환
  if (!before) return { after };
  // 삭제 이벤트: after가 없으면 before만 반환
  if (!after) return { before };

  const changedBefore: Record<string, unknown> = {};
  const changedAfter: Record<string, unknown> = {};
  let hasChanges = false;

  // 양쪽 키를 모두 합쳐서 비교 (추가/삭제/변경 모두 감지)
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of allKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changedBefore[key] = before[key];
      changedAfter[key] = after[key];
      hasChanges = true;
    }
  }

  return hasChanges
    ? { before: changedBefore, after: changedAfter }
    : undefined;
}
