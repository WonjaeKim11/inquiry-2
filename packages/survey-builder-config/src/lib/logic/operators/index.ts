/**
 * 연산자 디스패처 모듈.
 *
 * 31개 조건 연산자(CONDITION_EVALUATORS)와 7개 계산 연산자(CALCULATE_EXECUTORS)를
 * Record 패턴으로 매핑하고, 디스패처 함수를 통해 실행한다.
 * 알 수 없는 연산자 또는 런타임 에러 시 안전한 기본값을 반환한다 (NFR-012-01).
 */

import type {
  ConditionOperator,
  CalculateOperator,
} from '../types/operator.types';

import {
  evaluateEquals,
  evaluateDoesNotEqual,
  evaluateContains,
  evaluateDoesNotContain,
  evaluateStartsWith,
  evaluateDoesNotStartWith,
  evaluateEndsWith,
  evaluateDoesNotEndWith,
  evaluateIsEmpty,
  evaluateIsNotEmpty,
  evaluateIsSet,
  evaluateIsNotSet,
} from './string-operators';

import {
  evaluateIsGreaterThan,
  evaluateIsLessThan,
  evaluateIsGreaterThanOrEqual,
  evaluateIsLessThanOrEqual,
} from './number-operators';

import {
  evaluateEqualsOneOf,
  evaluateIncludesAllOf,
  evaluateIncludesOneOf,
  evaluateDoesNotIncludeOneOf,
  evaluateDoesNotIncludeAllOf,
} from './multi-select-operators';

import {
  evaluateIsSubmitted,
  evaluateIsSkipped,
  evaluateIsClicked,
  evaluateIsNotClicked,
  evaluateIsAccepted,
  evaluateIsBooked,
  evaluateIsPartiallySubmitted,
  evaluateIsCompletelySubmitted,
} from './status-operators';

import { evaluateIsBefore, evaluateIsAfter } from './date-operators';

import {
  executeAssign,
  executeConcat,
  executeAdd,
  executeSubtract,
  executeMultiply,
  executeDivide,
  executeIsAnyOf,
} from './calculate-operators';

/** 조건 연산자별 평가 함수 매핑 (31개) */
const CONDITION_EVALUATORS: Record<
  string,
  (left: unknown, right: unknown) => boolean
> = {
  // 문자열 (12)
  equals: evaluateEquals,
  doesNotEqual: evaluateDoesNotEqual,
  contains: evaluateContains,
  doesNotContain: evaluateDoesNotContain,
  startsWith: evaluateStartsWith,
  doesNotStartWith: evaluateDoesNotStartWith,
  endsWith: evaluateEndsWith,
  doesNotEndWith: evaluateDoesNotEndWith,
  isEmpty: evaluateIsEmpty as (left: unknown, right: unknown) => boolean,
  isNotEmpty: evaluateIsNotEmpty as (left: unknown, right: unknown) => boolean,
  isSet: evaluateIsSet as (left: unknown, right: unknown) => boolean,
  isNotSet: evaluateIsNotSet as (left: unknown, right: unknown) => boolean,
  // 숫자 (4)
  isGreaterThan: evaluateIsGreaterThan,
  isLessThan: evaluateIsLessThan,
  isGreaterThanOrEqual: evaluateIsGreaterThanOrEqual,
  isLessThanOrEqual: evaluateIsLessThanOrEqual,
  // 다중 선택 (5)
  equalsOneOf: evaluateEqualsOneOf,
  includesAllOf: evaluateIncludesAllOf,
  includesOneOf: evaluateIncludesOneOf,
  doesNotIncludeOneOf: evaluateDoesNotIncludeOneOf,
  doesNotIncludeAllOf: evaluateDoesNotIncludeAllOf,
  // 상태 (8)
  isSubmitted: evaluateIsSubmitted as (
    left: unknown,
    right: unknown
  ) => boolean,
  isSkipped: evaluateIsSkipped as (left: unknown, right: unknown) => boolean,
  isClicked: evaluateIsClicked as (left: unknown, right: unknown) => boolean,
  isNotClicked: evaluateIsNotClicked as (
    left: unknown,
    right: unknown
  ) => boolean,
  isAccepted: evaluateIsAccepted as (left: unknown, right: unknown) => boolean,
  isBooked: evaluateIsBooked as (left: unknown, right: unknown) => boolean,
  isPartiallySubmitted: evaluateIsPartiallySubmitted as (
    left: unknown,
    right: unknown
  ) => boolean,
  isCompletelySubmitted: evaluateIsCompletelySubmitted as (
    left: unknown,
    right: unknown
  ) => boolean,
  // 날짜 (2)
  isBefore: evaluateIsBefore,
  isAfter: evaluateIsAfter,
};

/** 계산 연산자별 실행 함수 매핑 (7개) */
const CALCULATE_EXECUTORS: Record<
  string,
  (current: unknown, operand: unknown) => string | number
> = {
  assign: executeAssign,
  concat: executeConcat,
  add: executeAdd,
  subtract: executeSubtract,
  multiply: executeMultiply,
  divide: executeDivide,
  isAnyOf: executeIsAnyOf,
};

/**
 * 조건 연산자를 평가한다.
 * 알 수 없는 연산자 또는 에러 시 false를 반환한다.
 *
 * @param operator - 평가할 조건 연산자
 * @param left - 좌측 피연산자 값
 * @param right - 우측 피연산자 값
 * @returns 조건 평가 결과
 */
export function evaluateConditionOperator(
  operator: ConditionOperator,
  left: unknown,
  right: unknown
): boolean {
  try {
    const evaluator = CONDITION_EVALUATORS[operator];
    if (!evaluator) return false;
    return evaluator(left, right);
  } catch {
    return false;
  }
}

/**
 * 계산 연산자를 실행한다.
 * 알 수 없는 연산자 시 현재 값을 그대로 반환한다.
 *
 * @param operator - 실행할 계산 연산자
 * @param current - 현재 값
 * @param operand - 연산 피연산자
 * @returns 계산 결과
 */
export function executeCalculateOperator(
  operator: CalculateOperator,
  current: unknown,
  operand: unknown
): string | number {
  try {
    const executor = CALCULATE_EXECUTORS[operator];
    if (!executor)
      return typeof current === 'number' ? current : String(current ?? '');
    return executor(current, operand);
  } catch {
    return typeof current === 'number' ? current : String(current ?? '');
  }
}

// 개별 연산자 함수 re-export
export {
  evaluateEquals,
  evaluateDoesNotEqual,
  evaluateContains,
  evaluateDoesNotContain,
  evaluateStartsWith,
  evaluateDoesNotStartWith,
  evaluateEndsWith,
  evaluateDoesNotEndWith,
  evaluateIsEmpty,
  evaluateIsNotEmpty,
  evaluateIsSet,
  evaluateIsNotSet,
} from './string-operators';

export {
  evaluateIsGreaterThan,
  evaluateIsLessThan,
  evaluateIsGreaterThanOrEqual,
  evaluateIsLessThanOrEqual,
} from './number-operators';

export {
  evaluateEqualsOneOf,
  evaluateIncludesAllOf,
  evaluateIncludesOneOf,
  evaluateDoesNotIncludeOneOf,
  evaluateDoesNotIncludeAllOf,
} from './multi-select-operators';

export {
  evaluateIsSubmitted,
  evaluateIsSkipped,
  evaluateIsClicked,
  evaluateIsNotClicked,
  evaluateIsAccepted,
  evaluateIsBooked,
  evaluateIsPartiallySubmitted,
  evaluateIsCompletelySubmitted,
} from './status-operators';

export { evaluateIsBefore, evaluateIsAfter } from './date-operators';

export {
  executeAssign,
  executeConcat,
  executeAdd,
  executeSubtract,
  executeMultiply,
  executeDivide,
  executeIsAnyOf,
} from './calculate-operators';
