import { createId, isCuid } from '@paralleldrive/cuid2';

/**
 * CUID2 ID 생성.
 * 분산 환경에서 충돌 없는 고유 식별자를 생성한다.
 * @returns 새로 생성된 CUID2 문자열
 */
export function generateCuid2(): string {
  return createId();
}

/**
 * CUID2 형식 검증.
 * 주어진 문자열이 유효한 CUID2 형식인지 확인한다.
 * @param id - 검증할 문자열
 * @returns 유효한 CUID2이면 true, 아니면 false
 */
export function isValidCuid2(id: string): boolean {
  return isCuid(id);
}
