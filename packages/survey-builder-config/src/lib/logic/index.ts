// Types
export type {
  ConditionOperator,
  CalculateOperator,
  DynamicField,
  RightOperandStatic,
  RightOperandDynamic,
  RightOperand,
  SingleCondition,
  ConditionGroup,
  CalculateAction,
  RequireAnswerAction,
  JumpToBlockAction,
  Action,
  LogicItem,
  ActionResult,
  LogicEvaluationContext,
} from './types/index';

export {
  isSingleCondition,
  conditionOperatorSchema,
  dynamicFieldSchema,
  rightOperandStaticSchema,
  rightOperandDynamicSchema,
  rightOperandSchema,
  singleConditionSchema,
  conditionGroupSchema,
  calculateOperatorSchema,
  calculateActionSchema,
  requireAnswerActionSchema,
  jumpToBlockActionSchema,
  actionSchema,
  logicItemSchema,
} from './types/index';

// Constants
export {
  OPERATORS_WITHOUT_RIGHT_OPERAND,
  MAX_NESTING_DEPTH,
  MAX_BLOCK_REVISIT,
  MAX_LOGIC_ITEMS_PER_BLOCK,
  MAX_CONDITIONS_PER_GROUP,
  MAX_ACTIONS_PER_ITEM,
} from './constants/index';

// Operators
export {
  evaluateConditionOperator,
  executeCalculateOperator,
} from './operators/index';

// Evaluator
export {
  resolveDynamicField,
  resolveLeftOperand,
  resolveRightOperand,
  evaluateSingleCondition,
  evaluateConditionGroup,
  performActions,
  evaluateBlockLogic,
} from './evaluator/index';
export type { BlockLogicResult } from './evaluator/index';

// Validators
export {
  validateSurveyLogic,
  validateSingleCondition,
  validateConditionGroup,
  validateBlockLogic,
  detectCyclicLogic,
} from './validators/index';
export type {
  SurveyLogicValidationResult,
  ConditionValidationError,
  BlockLogicValidationError,
  CycleDetectionResult,
} from './validators/index';

// Utils
export {
  addLogicItem,
  duplicateLogicItem,
  removeLogicItem,
  reorderLogicItems,
  addCondition,
  removeCondition,
  duplicateCondition,
  updateCondition,
  createConditionGroup,
  toggleConnector,
  nestAsGroup,
  addAction,
  removeAction,
  updateAction,
  changeObjective,
} from './utils/index';
