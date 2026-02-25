import type { FilterOperator, FilterType } from './types';

/** 값이 필요 없는 연산자 집합 (isSet, isNotSet, isToday, isYesterday) */
export const VALUE_LESS_OPERATORS: ReadonlySet<FilterOperator> = new Set([
  'isSet',
  'isNotSet',
  'isToday',
  'isYesterday',
]);

/** 문자열 타입에 사용 가능한 연산자 */
export const STRING_OPERATORS: readonly FilterOperator[] = [
  'equals',
  'doesNotEqual',
  'contains',
  'doesNotContain',
  'startsWith',
  'endsWith',
  'isSet',
  'isNotSet',
];

/** 숫자 타입에 사용 가능한 연산자 */
export const NUMBER_OPERATORS: readonly FilterOperator[] = [
  'equals',
  'doesNotEqual',
  'lessThan',
  'lessEqual',
  'greaterThan',
  'greaterEqual',
  'isSet',
  'isNotSet',
];

/** 날짜 타입에 사용 가능한 연산자 */
export const DATE_OPERATORS: readonly FilterOperator[] = [
  'isBefore',
  'isAfter',
  'isExactly',
  'isWithinLast',
  'isNotWithinLast',
  'isToday',
  'isYesterday',
  'isSet',
  'isNotSet',
];

/**
 * 데이터 타입에 따른 사용 가능한 연산자 배열을 반환한다.
 * @param filterType - 필터 데이터 타입
 * @returns 해당 타입에 사용 가능한 연산자 목록
 */
export function getOperatorsForType(
  filterType: FilterType
): readonly FilterOperator[] {
  switch (filterType) {
    case 'string':
      return STRING_OPERATORS;
    case 'number':
      return NUMBER_OPERATORS;
    case 'date':
      return DATE_OPERATORS;
    default:
      return STRING_OPERATORS;
  }
}
