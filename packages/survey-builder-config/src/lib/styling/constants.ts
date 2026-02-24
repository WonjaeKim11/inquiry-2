import type { BaseStyling } from './types';

/**
 * 시스템 기본값 상수.
 * 명세서 부록 9.3 기반으로 모든 속성의 기본값을 정의한다.
 */
export const STYLING_DEFAULTS: Required<
  Omit<BaseStyling, 'background' | 'logo' | 'cardArrangement'>
> &
  Pick<BaseStyling, 'background' | 'logo' | 'cardArrangement'> = {
  // General Colors
  brandColor: { light: '#0f172a' },
  questionColor: { light: '#0f172a' },
  inputColor: { light: '#ffffff' },
  highlightBgColor: { light: '#f1f5f9' },
  selectedHighlightBgColor: { light: '#e2e8f0' },
  fontFamily: 'inherit',

  // Headlines
  headlineFontSize: 24,
  headlineFontWeight: '600',
  headlineColor: { light: '#0f172a' },
  descriptionFontSize: 16,
  descriptionFontWeight: '400',
  descriptionColor: { light: '#475569' },
  topLabelFontSize: 14,
  topLabelColor: { light: '#64748b' },
  topLabelFontWeight: '500',

  // Buttons
  buttonBgColor: { light: '#0f172a' },
  buttonTextColor: { light: '#ffffff' },
  buttonBorderRadius: 8,
  buttonHeight: 'auto',
  buttonFontSize: 14,
  buttonFontWeight: '500',
  buttonPaddingX: 24,
  buttonPaddingY: 10,

  // Inputs
  inputBgColor: { light: '#ffffff' },
  inputBorderColor: { light: '#e2e8f0' },
  inputBorderRadius: 8,
  inputHeight: 40,
  inputTextColor: { light: '#0f172a' },
  inputFontSize: 14,
  placeholderOpacity: 0.5,
  inputPaddingX: 12,
  inputPaddingY: 8,
  inputShadow: 'none',

  // Options
  optionBgColor: { light: '#ffffff' },
  optionLabelColor: { light: '#0f172a' },
  optionBorderRadius: 8,
  optionPaddingX: 16,
  optionPaddingY: 12,
  optionFontSize: 14,

  // Progress Bar
  progressTrackHeight: 4,
  progressTrackBgColor: { light: '#e2e8f0' },
  progressIndicatorColor: { light: '#0f172a' },

  // Card & Layout
  cardBgColor: { light: '#ffffff' },
  cardBorderColor: { light: '#e5e7eb' },
  highlightBorderColor: { light: '#0f172a' },
  roundness: 8,
  cardArrangement: { linkSurvey: 'simple', appSurvey: 'simple' },
  hideProgressBar: false,
  hideLogo: false,
  logo: undefined,

  // Background
  background: undefined,

  // Dark Mode
  darkMode: false,
};

/** 사용 가능한 애니메이션 배경 목록 */
export const ANIMATION_BACKGROUNDS = [
  'starfield',
  'snowfall',
  'confetti',
  'particles',
  'gradient-wave',
] as const;
export type AnimationBackground = (typeof ANIMATION_BACKGROUNDS)[number];
