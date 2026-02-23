/**
 * 24가지 ValidationRule 유형 정의.
 *
 * 각 유형은 카테고리별로 분류되어 있으며, 설문 응답 검증 시
 * evaluateRule 디스패처를 통해 해당 평가 함수와 매핑된다.
 *
 * 카테고리:
 * - 텍스트 (10가지): 문자열 길이, 패턴, 형식 검증
 * - 숫자 (4가지): 수치 범위 비교
 * - 날짜 (4가지): 날짜 범위 비교
 * - 선택 (2가지): 복수 선택 개수 제한
 * - 순위 (2가지): 순위 지정 개수 제한
 * - 행렬 (2가지): 행렬 응답 행 수 제한
 * - 파일 (2가지): 파일 확장자 검증
 */
export const VALIDATION_RULE_TYPES = [
  // 텍스트 (10가지)
  'minLength',
  'maxLength',
  'pattern',
  'email',
  'url',
  'phone',
  'equals',
  'doesNotEqual',
  'contains',
  'doesNotContain',
  // 숫자 (4가지)
  'minValue',
  'maxValue',
  'isGreaterThan',
  'isLessThan',
  // 날짜 (4가지)
  'isLaterThan',
  'isEarlierThan',
  'isBetween',
  'isNotBetween',
  // 선택 (2가지)
  'minSelections',
  'maxSelections',
  // 순위 (2가지)
  'minRanked',
  'rankAll',
  // 행렬 (2가지)
  'minRowsAnswered',
  'answerAllRows',
  // 파일 (2가지)
  'fileExtensionIs',
  'fileExtensionIsNot',
] as const;

/** 24가지 검증 규칙 유형의 유니온 타입 */
export type ValidationRuleType = (typeof VALIDATION_RULE_TYPES)[number];
