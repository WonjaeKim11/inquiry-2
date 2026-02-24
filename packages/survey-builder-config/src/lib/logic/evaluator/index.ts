/**
 * Evaluator 모듈 공개 API.
 *
 * 피연산자 resolve, 조건 평가, 액션 수행, Block 로직 평가 함수를 export한다.
 */

export {
  resolveDynamicField,
  resolveLeftOperand,
  resolveRightOperand,
} from './operand-resolver';
export { evaluateSingleCondition } from './condition-evaluator';
export { evaluateConditionGroup } from './group-evaluator';
export { performActions } from './action-performer';
export { evaluateBlockLogic } from './logic-evaluator';
export type { BlockLogicResult } from './logic-evaluator';
