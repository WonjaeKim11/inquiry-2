// 컴포넌트
export { ColorPicker } from './lib/components/color-picker';
export { StylingSection } from './lib/components/styling-section';
export { GeneralColorsSection } from './lib/components/general-colors-section';
export { HeadlinesSection } from './lib/components/headlines-section';
export { ButtonsSection } from './lib/components/buttons-section';
export { InputsSection } from './lib/components/inputs-section';
export { OptionsSection } from './lib/components/options-section';
export { ProgressBarSection } from './lib/components/progress-bar-section';
export { CardLayoutSection } from './lib/components/card-layout-section';
export { BackgroundSection } from './lib/components/background-section';
export { StylingForm } from './lib/components/styling-form';

// 훅
export { useStylingForm } from './lib/hooks/use-styling-form';

// 타입
export type {
  StylingFormMode,
  StylingFormProps,
  ColorPickerProps,
  StylingSectionProps,
} from './lib/types';

// 공유 타입 re-export
export type {
  StylingColor,
  BaseStyling,
  ProjectStyling,
  SurveyStyling,
  CardArrangement,
  CardArrangementOption,
  SurveyLogo,
  SurveyBackground,
  BackgroundType,
  SuggestedColors,
} from './lib/types';
