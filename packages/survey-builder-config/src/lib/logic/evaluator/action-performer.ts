/**
 * 액션 수행 모듈.
 *
 * 조건 매칭 후 수행할 액션 배열을 처리한다.
 * jumpToBlock은 첫 번째 것만 적용하고, calculate/requireAnswer는 누적한다.
 */

import type {
  Action,
  ActionResult,
  LogicEvaluationContext,
  DynamicField,
  CalculateAction,
} from '../types/index';
import { executeCalculateOperator } from '../operators/index';
import { resolveDynamicField } from './operand-resolver';

/**
 * 액션 배열을 수행하고 결과를 반환한다.
 * jumpToBlock은 첫 번째 것만 적용, calculate/requireAnswer는 누적.
 *
 * @param actions - 수행할 액션 배열
 * @param context - 로직 평가 컨텍스트
 * @returns 액션 수행 결과
 */
export function performActions(
  actions: Action[],
  context: LogicEvaluationContext
): ActionResult {
  const result: ActionResult = {
    jumpTarget: undefined,
    requiredElementIds: [],
    calculations: [],
  };

  for (const action of actions) {
    switch (action.objective) {
      case 'jumpToBlock':
        // 첫 번째 jumpToBlock만 적용
        if (!result.jumpTarget) {
          result.jumpTarget = action.targetBlockId;
        }
        break;

      case 'requireAnswer':
        result.requiredElementIds.push(action.targetElementId);
        break;

      case 'calculate':
        performCalculate(action, context, result);
        break;
    }
  }

  return result;
}

/**
 * calculate 액션을 수행한다.
 * target의 현재 값과 operand 값을 resolve하여 연산자에 위임한다.
 *
 * @param action - 계산 액션
 * @param context - 로직 평가 컨텍스트
 * @param result - 결과 누적 객체 (calculations에 push)
 */
function performCalculate(
  action: CalculateAction,
  context: LogicEvaluationContext,
  result: ActionResult
): void {
  const currentValue = resolveDynamicField(action.target, context);

  // value가 DynamicField 객체이면 resolve, 아니면 정적 값 사용
  let operandValue: unknown;
  if (
    typeof action.value === 'object' &&
    action.value !== null &&
    'type' in action.value &&
    'id' in action.value
  ) {
    operandValue = resolveDynamicField(action.value as DynamicField, context);
  } else {
    operandValue = action.value;
  }

  const calcResult = executeCalculateOperator(
    action.operator,
    currentValue,
    operandValue
  );

  result.calculations.push({
    targetField: { type: action.target.type, id: action.target.id },
    operator: action.operator,
    result: calcResult,
  });
}
