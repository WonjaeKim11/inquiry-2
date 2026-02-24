/**
 * 조건 그룹 재귀 평가 모듈.
 *
 * AND/OR 커넥터에 따라 조건 그룹을 재귀적으로 평가한다.
 * MAX_NESTING_DEPTH를 초과하면 false를 반환하여 무한 재귀를 방지한다.
 * 빈 그룹은 vacuous truth(true)로 평가한다.
 */

import type {
  ConditionGroup,
  SingleCondition,
  LogicEvaluationContext,
} from '../types/index';
import { isSingleCondition } from '../types/index';
import { MAX_NESTING_DEPTH } from '../constants/index';
import { evaluateSingleCondition } from './condition-evaluator';

/**
 * 조건 그룹을 재귀적으로 평가한다.
 * AND: 모든 조건이 true여야 true
 * OR: 하나라도 true이면 true
 * 빈 그룹은 true로 평가 (vacuous truth).
 * MAX_NESTING_DEPTH 초과 시 false 반환.
 *
 * @param group - 평가할 조건 그룹
 * @param context - 로직 평가 컨텍스트
 * @param depth - 현재 중첩 깊이 (기본값 0)
 * @returns 그룹 평가 결과
 */
export function evaluateConditionGroup(
  group: ConditionGroup,
  context: LogicEvaluationContext,
  depth = 0
): boolean {
  try {
    if (depth >= MAX_NESTING_DEPTH) return false;
    if (group.conditions.length === 0) return true;

    if (group.connector === 'and') {
      return group.conditions.every((item) =>
        evaluateConditionItem(item, context, depth + 1)
      );
    }
    // connector === 'or'
    return group.conditions.some((item) =>
      evaluateConditionItem(item, context, depth + 1)
    );
  } catch {
    return false;
  }
}

/**
 * 단일 조건 또는 조건 그룹을 판별하여 평가한다.
 * isSingleCondition 타입 가드를 사용하여 분기한다.
 *
 * @param item - 평가할 조건 아이템 (단일 조건 또는 조건 그룹)
 * @param context - 로직 평가 컨텍스트
 * @param depth - 현재 중첩 깊이
 * @returns 조건 평가 결과
 */
function evaluateConditionItem(
  item: SingleCondition | ConditionGroup,
  context: LogicEvaluationContext,
  depth: number
): boolean {
  if (isSingleCondition(item)) {
    return evaluateSingleCondition(item, context);
  }
  return evaluateConditionGroup(item, context, depth);
}
