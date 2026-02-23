/**
 * 검증 유틸리티.
 *
 * Entity 유형별로 적용 가능한 ValidationRule 목록을 관리한다.
 * 빌더 UI에서 질문 유형에 따라 사용 가능한 검증 규칙을 필터링할 때 사용된다.
 */
import type { ValidationRuleType } from './validation-rule-type';

/**
 * Entity 유형별 적용 가능한 검증 규칙 매핑.
 *
 * - openText: 텍스트 + 숫자 규칙 (숫자형 입력도 지원)
 * - multipleChoiceMulti: 복수 선택 규칙
 * - pictureSelection: 복수 선택 규칙
 * - date: 날짜 범위 규칙
 * - fileUpload: 파일 확장자 규칙
 * - matrix: 행렬 행 응답 규칙
 * - ranking: 순위 지정 규칙
 * - address: 텍스트 규칙 (서브 필드별)
 * - contactInfo: 텍스트 규칙 (서브 필드별)
 */
const VALIDATION_RULE_MAP: Record<string, string[]> = {
  openText: [
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
    'minValue',
    'maxValue',
    'isGreaterThan',
    'isLessThan',
  ],
  multipleChoiceMulti: ['minSelections', 'maxSelections'],
  pictureSelection: ['minSelections', 'maxSelections'],
  date: ['isLaterThan', 'isEarlierThan', 'isBetween', 'isNotBetween'],
  fileUpload: ['fileExtensionIs', 'fileExtensionIsNot'],
  matrix: ['minRowsAnswered', 'answerAllRows'],
  ranking: ['minRanked', 'rankAll'],
  address: [
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
  ],
  contactInfo: [
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
  ],
};

/**
 * 특정 Entity 유형에 적용 가능한 Validation Rule 목록을 반환한다.
 *
 * @param entityType - Entity 유형 (예: 'openText', 'matrix')
 * @returns 적용 가능한 ValidationRuleType 배열 (매핑에 없으면 빈 배열)
 */
export function getApplicableRules(entityType: string): ValidationRuleType[] {
  return (VALIDATION_RULE_MAP[entityType] ?? []) as ValidationRuleType[];
}

/**
 * 특정 Rule이 해당 Entity 유형에 적용 가능한지 확인한다.
 *
 * @param entityType - Entity 유형 (예: 'openText', 'matrix')
 * @param ruleType - 확인할 검증 규칙 유형
 * @returns 적용 가능 여부
 */
export function isRuleApplicable(
  entityType: string,
  ruleType: ValidationRuleType
): boolean {
  const applicable = VALIDATION_RULE_MAP[entityType];
  return applicable ? applicable.includes(ruleType) : false;
}
