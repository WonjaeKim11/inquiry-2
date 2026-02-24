/**
 * 피연산자 값 추출(resolve) 모듈.
 *
 * DynamicField 참조로부터 LogicEvaluationContext 내의 실제 값을 조회한다.
 * 상태 확인 연산자의 경우 elementStatuses에서 값을 가져온다.
 */

import type {
  DynamicField,
  RightOperand,
  LogicEvaluationContext,
} from '../types/index';

/**
 * DynamicField에서 실제 값을 추출한다.
 * element/question -> responses, variable -> variables, hiddenField -> hiddenFields에서 조회.
 * question은 element와 동일하게 처리한다 (하위 호환).
 *
 * @param field - 값을 조회할 동적 필드 참조
 * @param context - 로직 평가 컨텍스트
 * @returns 필드에 해당하는 실제 값 (없으면 undefined)
 */
export function resolveDynamicField(
  field: DynamicField,
  context: LogicEvaluationContext
): unknown {
  switch (field.type) {
    case 'element':
    case 'question':
      return context.responses[field.id];
    case 'variable':
      return context.variables[field.id];
    case 'hiddenField':
      return context.hiddenFields[field.id];
    default:
      return undefined;
  }
}

/**
 * 좌측 피연산자의 값을 추출한다.
 * 상태 확인 연산자의 경우 elementStatuses에서 조회한다.
 *
 * @param field - 좌측 피연산자 동적 필드 참조
 * @param context - 로직 평가 컨텍스트
 * @param isStatusOperator - 상태 확인 연산자 여부
 * @returns 좌측 피연산자의 실제 값
 */
export function resolveLeftOperand(
  field: DynamicField,
  context: LogicEvaluationContext,
  isStatusOperator: boolean
): unknown {
  if (
    isStatusOperator &&
    (field.type === 'element' || field.type === 'question')
  ) {
    return context.elementStatuses[field.id];
  }
  return resolveDynamicField(field, context);
}

/**
 * 우측 피연산자의 값을 추출한다.
 * static이면 value를, dynamic이면 DynamicField를 resolve한다.
 *
 * @param operand - 우측 피연산자 (static 또는 dynamic)
 * @param context - 로직 평가 컨텍스트
 * @returns 우측 피연산자의 실제 값 (operand가 없으면 undefined)
 */
export function resolveRightOperand(
  operand: RightOperand | undefined,
  context: LogicEvaluationContext
): unknown {
  if (!operand) return undefined;
  if (operand.type === 'static') return operand.value;
  return resolveDynamicField(operand.field, context);
}
