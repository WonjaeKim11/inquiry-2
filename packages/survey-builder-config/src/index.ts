export { surveyBuilder } from './lib/survey-builder';
export type { SurveyBuilderSchema } from './lib/survey-builder';

export { blockEntity } from './lib/entities/block.entity';
export { openTextEntity } from './lib/entities/open-text.entity';

export {
  headlineAttribute,
  requiredAttribute,
  descriptionAttribute,
  placeholderAttribute,
} from './lib/attributes/index';

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
