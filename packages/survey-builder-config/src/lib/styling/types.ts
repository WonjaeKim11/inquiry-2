import { z } from 'zod';

// ---- StylingColor ----
// light 필수, dark 선택
export const stylingColorSchema = z.object({
  light: z.string().min(1),
  dark: z.string().optional(),
});
export type StylingColor = z.infer<typeof stylingColorSchema>;

// ---- CardArrangement ----
export const CARD_ARRANGEMENT_OPTIONS = [
  'casual',
  'straight',
  'simple',
] as const;
export type CardArrangementOption = (typeof CARD_ARRANGEMENT_OPTIONS)[number];

export const cardArrangementSchema = z.object({
  linkSurvey: z.enum(CARD_ARRANGEMENT_OPTIONS).optional(),
  appSurvey: z.enum(CARD_ARRANGEMENT_OPTIONS).optional(),
});
export type CardArrangement = z.infer<typeof cardArrangementSchema>;

// ---- SurveyLogo ----
export const surveyLogoSchema = z.object({
  url: z.string().optional(),
  bgColor: z.string().optional(),
});
export type SurveyLogo = z.infer<typeof surveyLogoSchema>;

// ---- SurveyBackground ----
export const BACKGROUND_TYPES = [
  'color',
  'image',
  'upload',
  'animation',
] as const;
export type BackgroundType = (typeof BACKGROUND_TYPES)[number];

export const surveyBackgroundSchema = z.object({
  bgType: z.enum(BACKGROUND_TYPES).optional(),
  bg: z.string().optional(),
  brightness: z.number().min(0).optional(),
});
export type SurveyBackground = z.infer<typeof surveyBackgroundSchema>;

// ---- BaseStyling (40+ 속성) ----
// fontSize, fontWeight 등은 number | string 허용
const numberOrString = z.union([z.number(), z.string()]);
const fontWeight = z.union([z.string(), z.number()]);

export const baseStylingSchema = z.object({
  // === General Colors (6개) ===
  brandColor: stylingColorSchema.optional(),
  questionColor: stylingColorSchema.optional(),
  inputColor: stylingColorSchema.optional(),
  highlightBgColor: stylingColorSchema.optional(),
  selectedHighlightBgColor: stylingColorSchema.optional(),
  fontFamily: z.string().optional(),

  // === Headlines & Descriptions (9개) ===
  headlineFontSize: numberOrString.optional(),
  headlineFontWeight: fontWeight.optional(),
  headlineColor: stylingColorSchema.optional(),
  descriptionFontSize: numberOrString.optional(),
  descriptionFontWeight: fontWeight.optional(),
  descriptionColor: stylingColorSchema.optional(),
  topLabelFontSize: numberOrString.optional(),
  topLabelColor: stylingColorSchema.optional(),
  topLabelFontWeight: fontWeight.optional(),

  // === Buttons (8개) ===
  buttonBgColor: stylingColorSchema.optional(),
  buttonTextColor: stylingColorSchema.optional(),
  buttonBorderRadius: numberOrString.optional(),
  buttonHeight: numberOrString.optional(), // "auto" 허용
  buttonFontSize: numberOrString.optional(),
  buttonFontWeight: fontWeight.optional(),
  buttonPaddingX: numberOrString.optional(),
  buttonPaddingY: numberOrString.optional(),

  // === Inputs (10개) ===
  inputBgColor: stylingColorSchema.optional(),
  inputBorderColor: stylingColorSchema.optional(),
  inputBorderRadius: numberOrString.optional(),
  inputHeight: numberOrString.optional(),
  inputTextColor: stylingColorSchema.optional(),
  inputFontSize: numberOrString.optional(),
  placeholderOpacity: z.number().min(0).max(1).optional(),
  inputPaddingX: numberOrString.optional(),
  inputPaddingY: numberOrString.optional(),
  inputShadow: z.string().optional(),

  // === Options (6개) ===
  optionBgColor: stylingColorSchema.optional(),
  optionLabelColor: stylingColorSchema.optional(),
  optionBorderRadius: numberOrString.optional(),
  optionPaddingX: numberOrString.optional(),
  optionPaddingY: numberOrString.optional(),
  optionFontSize: numberOrString.optional(),

  // === Progress Bar (3개) ===
  progressTrackHeight: numberOrString.optional(),
  progressTrackBgColor: stylingColorSchema.optional(),
  progressIndicatorColor: stylingColorSchema.optional(),

  // === Card & Layout ===
  cardBgColor: stylingColorSchema.optional(),
  cardBorderColor: stylingColorSchema.optional(),
  highlightBorderColor: stylingColorSchema.optional(),
  roundness: numberOrString.optional(),
  cardArrangement: cardArrangementSchema.optional(),
  hideProgressBar: z.boolean().optional(),
  hideLogo: z.boolean().optional(),
  logo: surveyLogoSchema.optional(),

  // === Background (Link Survey 전용) ===
  background: surveyBackgroundSchema.optional(),

  // === Dark Mode ===
  darkMode: z.boolean().optional(),
});
export type BaseStyling = z.infer<typeof baseStylingSchema>;

// ---- ProjectStyling ----
export const projectStylingSchema = baseStylingSchema.extend({
  allowStyleOverride: z.boolean().optional(),
});
export type ProjectStyling = z.infer<typeof projectStylingSchema>;

// ---- SurveyStyling ----
export const surveyStylingSchema = baseStylingSchema.extend({
  overrideTheme: z.boolean().optional(),
});
export type SurveyStyling = z.infer<typeof surveyStylingSchema>;
