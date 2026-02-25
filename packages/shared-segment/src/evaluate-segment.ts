import type { FilterItem } from './types';
import {
  subtractTimeUnit,
  startOfDay,
  endOfDay,
  isSameDay,
} from './date-utils';

/**
 * 연락처 속성을 기반으로 필터 트리를 평가한다.
 * 모든 리프 조건을 재귀적으로 평가하여 AND/OR 결합한다.
 *
 * @param filters - 필터 트리
 * @param attributes - 연락처 속성 key-value 맵
 * @param segmentChecker - 세그먼트 포함 여부를 확인하는 콜백 (순환참조 방지를 위해 외부 주입)
 * @returns 필터 통과 여부
 */
export function evaluateFilters(
  filters: FilterItem[],
  attributes: Record<string, unknown>,
  segmentChecker?: (segmentId: string) => boolean
): boolean {
  if (filters.length === 0) return true;

  // 첫 번째 필터는 무조건 true로 시작, 이후부터 connector로 결합
  let result = evaluateSingle(filters[0], attributes, segmentChecker);

  for (let i = 1; i < filters.length; i++) {
    const filter = filters[i];
    const value = evaluateSingle(filter, attributes, segmentChecker);

    if (filter.connector === 'and') {
      result = result && value;
    } else {
      result = result || value;
    }
  }

  return result;
}

/**
 * 단일 필터 항목을 평가한다.
 * 그룹이면 children을 재귀 평가하고, 리프면 연산자별 비교를 수행한다.
 */
function evaluateSingle(
  filter: FilterItem,
  attributes: Record<string, unknown>,
  segmentChecker?: (segmentId: string) => boolean
): boolean {
  // 그룹: children 재귀 평가
  if (filter.children && filter.children.length > 0) {
    return evaluateFilters(filter.children, attributes, segmentChecker);
  }

  if (!filter.operator) return true;

  switch (filter.resource) {
    case 'attribute':
      return evaluateAttribute(filter, attributes);
    case 'segment':
      return evaluateSegment(filter, segmentChecker);
    case 'device':
      return evaluateDevice(filter, attributes);
    case 'person':
      // person 리소스는 향후 행동 데이터와 통합 시 구현
      return true;
    default:
      return true;
  }
}

/** 속성 기반 필터 평가 */
function evaluateAttribute(
  filter: FilterItem,
  attributes: Record<string, unknown>
): boolean {
  const { operator, attributeKey, filterType, value, timeUnit } = filter;
  if (!operator || !attributeKey) return true;

  const attrValue = attributes[attributeKey];

  // isSet / isNotSet
  if (operator === 'isSet')
    return attrValue !== undefined && attrValue !== null && attrValue !== '';
  if (operator === 'isNotSet')
    return attrValue === undefined || attrValue === null || attrValue === '';

  if (attrValue === undefined || attrValue === null) return false;

  switch (filterType) {
    case 'string':
      return evaluateString(operator, String(attrValue), String(value ?? ''));
    case 'number':
      return evaluateNumber(operator, Number(attrValue), Number(value ?? 0));
    case 'date':
      return evaluateDate(
        operator,
        new Date(String(attrValue)),
        value,
        timeUnit
      );
    default:
      return evaluateString(operator, String(attrValue), String(value ?? ''));
  }
}

/** 문자열 연산자 평가 */
function evaluateString(
  operator: string,
  actual: string,
  expected: string
): boolean {
  const a = actual.toLowerCase();
  const e = expected.toLowerCase();

  switch (operator) {
    case 'equals':
      return a === e;
    case 'doesNotEqual':
      return a !== e;
    case 'contains':
      return a.includes(e);
    case 'doesNotContain':
      return !a.includes(e);
    case 'startsWith':
      return a.startsWith(e);
    case 'endsWith':
      return a.endsWith(e);
    default:
      return false;
  }
}

/** 숫자 연산자 평가 */
function evaluateNumber(
  operator: string,
  actual: number,
  expected: number
): boolean {
  switch (operator) {
    case 'equals':
      return actual === expected;
    case 'doesNotEqual':
      return actual !== expected;
    case 'lessThan':
      return actual < expected;
    case 'lessEqual':
      return actual <= expected;
    case 'greaterThan':
      return actual > expected;
    case 'greaterEqual':
      return actual >= expected;
    default:
      return false;
  }
}

/** 날짜 연산자 평가 */
function evaluateDate(
  operator: string,
  actual: Date,
  value: string | number | undefined,
  timeUnit?: string
): boolean {
  const now = new Date();

  switch (operator) {
    case 'isBefore':
      return actual < new Date(String(value));
    case 'isAfter':
      return actual > new Date(String(value));
    case 'isExactly':
      return isSameDay(actual, new Date(String(value)));
    case 'isToday':
      return isSameDay(actual, now);
    case 'isYesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return isSameDay(actual, yesterday);
    }
    case 'isWithinLast': {
      const amount = Number(value ?? 1);
      const unit = (timeUnit as 'day' | 'week' | 'month' | 'year') || 'day';
      const threshold = startOfDay(subtractTimeUnit(now, amount, unit));
      return actual >= threshold && actual <= endOfDay(now);
    }
    case 'isNotWithinLast': {
      const amount = Number(value ?? 1);
      const unit = (timeUnit as 'day' | 'week' | 'month' | 'year') || 'day';
      const threshold = startOfDay(subtractTimeUnit(now, amount, unit));
      return actual < threshold;
    }
    default:
      return false;
  }
}

/** 세그먼트 포함/제외 평가 */
function evaluateSegment(
  filter: FilterItem,
  segmentChecker?: (segmentId: string) => boolean
): boolean {
  if (!filter.segmentId || !segmentChecker) return true;

  const isInSegment = segmentChecker(filter.segmentId);

  switch (filter.operator) {
    case 'userIsIn':
      return isInSegment;
    case 'userIsNotIn':
      return !isInSegment;
    default:
      return true;
  }
}

/** 디바이스 유형 평가 */
function evaluateDevice(
  filter: FilterItem,
  attributes: Record<string, unknown>
): boolean {
  if (filter.operator !== 'isDevice' || !filter.deviceType) return true;

  const deviceAttr = attributes['device'] ?? attributes['deviceType'];
  if (!deviceAttr) return false;

  return String(deviceAttr).toLowerCase() === filter.deviceType;
}
