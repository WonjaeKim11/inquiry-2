// Types & Schemas
export type {
  StylingColor,
  CardArrangement,
  CardArrangementOption,
  SurveyLogo,
  SurveyBackground,
  BackgroundType,
  BaseStyling,
  ProjectStyling,
  SurveyStyling,
} from './types';
export {
  stylingColorSchema,
  cardArrangementSchema,
  surveyLogoSchema,
  surveyBackgroundSchema,
  baseStylingSchema,
  projectStylingSchema,
  surveyStylingSchema,
  CARD_ARRANGEMENT_OPTIONS,
  BACKGROUND_TYPES,
} from './types';

// Constants
export { STYLING_DEFAULTS, ANIMATION_BACKGROUNDS } from './constants';
export type { AnimationBackground } from './constants';

// Color Utilities
export {
  isValidCssColor,
  parseHexColor,
  rgbToHex,
  mixColors,
  isLightColor,
  suggestColors,
} from './color-utils';
export type { SuggestedColors } from './color-utils';

// Legacy Migration
export { migrateLegacyStyling } from './legacy-migration';

// Style Resolver
export { resolveStyling, deepMergeNonNull } from './resolve-styling';
export type { ResolveStylingParams } from './resolve-styling';
