/**
 * root 배열의 Block ID 목록을 순서에 따라 "Block {N}" 라벨로 매핑한다.
 * Builder Store의 root 배열은 Block Entity ID의 정렬된 목록이며,
 * 각 블록에 순서번호를 매겨 사이드바나 에디터 UI에서 표시한다.
 *
 * @param rootIds - Builder Store의 root 배열 (Block entity IDs)
 * @returns Block ID를 키로, "Block {N}" 라벨을 값으로 하는 매핑 객체
 *
 * @example
 * ```ts
 * const labels = getBlockLabels(['block_abc', 'block_def']);
 * // { block_abc: 'Block 1', block_def: 'Block 2' }
 * ```
 */
export function getBlockLabels(rootIds: string[]): Record<string, string> {
  const labels: Record<string, string> = {};
  rootIds.forEach((id, index) => {
    labels[id] = `Block ${index + 1}`;
  });
  return labels;
}
