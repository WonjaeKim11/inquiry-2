/**
 * 선택지 셔플 유틸리티.
 *
 * Fisher-Yates 알고리즘을 사용하여 배열을 무작위로 섞는다.
 * 설문의 선택지 순서 무작위화에 사용되며, 'none', 'all', 'exceptLast' 옵션을 지원한다.
 * 'exceptLast'는 "기타" 등 마지막 항목을 고정하고 나머지만 셔플할 때 사용한다.
 */

/**
 * Fisher-Yates 알고리즘으로 배열을 셔플한다.
 * 원본 배열은 변경하지 않고 새 배열을 반환한다.
 * @param array - 셔플할 원본 배열
 * @returns 셔플된 새 배열
 */
function fisherYatesShuffle<T>(array: T[]): T[] {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j] as T;
    shuffled[j] = temp as T;
  }

  return shuffled;
}

/**
 * 셔플 옵션에 따라 선택지를 셔플한다.
 *
 * - 'none': 원본 순서 유지 (얕은 복사본 반환)
 * - 'all': 전체 항목 셔플
 * - 'exceptLast': 마지막 항목을 고정하고 나머지만 셔플
 *   ("기타", "해당 없음" 등의 옵션을 마지막에 유지할 때 유용)
 *
 * 항목이 1개 이하이면 셔플하지 않고 복사본을 반환한다.
 *
 * @param choices - 셔플할 선택지 배열
 * @param option - 셔플 옵션: 'none' | 'all' | 'exceptLast'
 * @returns 셔플된 새 배열
 */
export function shuffleChoices<T>(
  choices: T[],
  option: 'none' | 'all' | 'exceptLast'
): T[] {
  // 셔플 없음 또는 항목이 1개 이하이면 복사본만 반환
  if (option === 'none' || choices.length <= 1) {
    return [...choices];
  }

  // 전체 셔플
  if (option === 'all') {
    return fisherYatesShuffle(choices);
  }

  // exceptLast: 마지막 항목 고정, 나머지 셔플
  const last = choices[choices.length - 1] as T;
  const rest = fisherYatesShuffle(choices.slice(0, -1));
  return [...rest, last];
}
