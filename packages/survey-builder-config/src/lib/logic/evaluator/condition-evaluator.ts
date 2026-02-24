/**
 * 단일 조건 평가 모듈.
 *
 * SingleCondition의 좌/우 피연산자를 resolve한 후
 * 해당 operator의 평가 함수에 위임한다.
 * 에러 발생 시 false를 반환한다 (NFR-012-01).
 */

import type { SingleCondition, LogicEvaluationContext } from '../types/index';
import { OPERATORS_WITHOUT_RIGHT_OPERAND } from '../constants/index';
import { resolveLeftOperand, resolveRightOperand } from './operand-resolver';
import { evaluateConditionOperator } from '../operators/index';

/**
 * 단일 조건을 평가한다.
 * 좌/우 피연산자를 resolve한 후 operator에 위임한다.
 *
 * @param condition - 평가할 단일 조건
 * @param context - 로직 평가 컨텍스트
 * @returns 조건 평가 결과 (에러 시 false)
 */
export function evaluateSingleCondition(
  condition: SingleCondition,
  context: LogicEvaluationContext
): boolean {
  try {
    const isStatusOp = (
      OPERATORS_WITHOUT_RIGHT_OPERAND as readonly string[]
    ).includes(condition.operator);
    const leftValue = resolveLeftOperand(
      condition.leftOperand,
      context,
      isStatusOp
    );
    const rightValue = resolveRightOperand(condition.rightOperand, context);
    return evaluateConditionOperator(condition.operator, leftValue, rightValue);
  } catch {
    return false;
  }
}
