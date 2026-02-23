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
