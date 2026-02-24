export { surveyBuilder } from './lib/survey-builder';
export type { SurveyBuilderSchema } from './lib/survey-builder';
export { ELEMENT_ENTITY_NAMES } from './lib/survey-builder';

// Entities
export {
  blockEntity,
  openTextEntity,
  multipleChoiceSingleEntity,
  multipleChoiceMultiEntity,
  npsEntity,
  ctaEntity,
  ratingEntity,
  consentEntity,
  pictureSelectionEntity,
  dateEntity,
  fileUploadEntity,
  calEntity,
  matrixEntity,
  addressEntity,
  rankingEntity,
  contactInfoEntity,
} from './lib/entities/index';

// Attributes (전체 re-export)
export {
  // common
  headlineAttribute,
  subheaderAttribute,
  requiredAttribute,
  imageUrlAttribute,
  videoUrlAttribute,
  isDraftAttribute,
  // text
  placeholderAttribute,
  longAnswerAttribute,
  inputTypeAttribute,
  insightsEnabledAttribute,
  charLimitEnabledAttribute,
  minLengthAttribute,
  maxLengthAttribute,
  // choice
  choicesAttribute,
  pictureChoicesAttribute,
  shuffleOptionAttribute,
  displayTypeAttribute,
  otherOptionPlaceholderAttribute,
  allowMultiAttribute,
  // scale
  scaleAttribute,
  rangeAttribute,
  lowerLabelAttribute,
  upperLabelAttribute,
  isColorCodingEnabledAttribute,
  // cta
  dismissibleAttribute,
  buttonUrlAttribute,
  buttonLabelAttribute,
  // consent
  labelAttribute,
  // date
  dateFormatAttribute,
  htmlAttribute,
  // file
  allowMultipleFilesAttribute,
  maxSizeInMBAttribute,
  allowedFileExtensionsAttribute,
  // cal
  calUserNameAttribute,
  calHostAttribute,
  // matrix
  rowsAttribute,
  columnsAttribute,
  // sub-field
  addressFieldsAttribute,
  contactInfoFieldsAttribute,
  // validation
  validationConfigAttribute,
  // logic
  logicItemsAttribute,
  logicFallbackAttribute,
} from './lib/attributes/index';

// Types (기존 설문 구조 타입)
export type {
  WelcomeCard,
  SurveyEnding,
  HiddenFields,
  SurveyVariable,
  I18nString,
} from './lib/types';
export {
  WelcomeCardSchema,
  SurveyEndingSchema,
  HiddenFieldsSchema,
  SurveyVariableSchema,
} from './lib/types';

// Types (질문 유형 카탈로그 타입)
export type {
  LocalizedString,
  Choice,
  PictureChoice,
  MatrixChoice,
  SubField,
  AddressFieldId,
  ContactInfoFieldId,
} from './lib/types/index';
export {
  localizedStringRequiredSchema,
  localizedStringOptionalSchema,
  choiceSchema,
  pictureChoiceSchema,
  matrixChoiceSchema,
  subFieldSchema,
  ADDRESS_FIELD_IDS,
  CONTACT_INFO_FIELD_IDS,
} from './lib/types/index';

// Constants
export { FORBIDDEN_IDS } from './lib/constants/index';
export type { ForbiddenId } from './lib/constants/index';
export { ALLOWED_FILE_EXTENSIONS } from './lib/constants/index';
export type { AllowedFileExtension } from './lib/constants/index';
export { VALIDATION_RULE_MAP } from './lib/constants/index';

// Validation 모듈
export {
  VALIDATION_RULE_TYPES,
  evaluateValidation,
  evaluateRule,
  getApplicableRules,
  isRuleApplicable,
} from './lib/validation/index';
export type {
  ValidationRuleType,
  ValidationRule,
  ValidationConfig,
  ValidationError,
  ValidationResult,
} from './lib/validation/index';

// Shuffle 모듈
export { shuffleChoices } from './lib/shuffle/index';

// Logic 모듈
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
} from './lib/logic/index';

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
  OPERATORS_WITHOUT_RIGHT_OPERAND,
  MAX_NESTING_DEPTH,
  MAX_BLOCK_REVISIT,
  MAX_LOGIC_ITEMS_PER_BLOCK,
  MAX_CONDITIONS_PER_GROUP,
  MAX_ACTIONS_PER_ITEM,
} from './lib/logic/index';

// Logic 엔진 (Operators + Evaluator)
export {
  evaluateConditionOperator,
  executeCalculateOperator,
  resolveDynamicField,
  resolveLeftOperand,
  resolveRightOperand,
  evaluateSingleCondition,
  evaluateConditionGroup,
  performActions,
  evaluateBlockLogic,
} from './lib/logic/index';
export type { BlockLogicResult } from './lib/logic/index';

// Logic 검증 + 유틸리티
export {
  validateSurveyLogic,
  validateSingleCondition,
  validateConditionGroup,
  validateBlockLogic,
  detectCyclicLogic,
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
} from './lib/logic/index';
export type {
  SurveyLogicValidationResult,
  ConditionValidationError,
  BlockLogicValidationError,
  CycleDetectionResult,
} from './lib/logic/index';
