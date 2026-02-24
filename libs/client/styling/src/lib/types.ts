/** 클라이언트 전용 스타일링 타입 + 공유 타입 re-export */

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
} from '@inquiry/survey-builder-config';

/** 스타일링 폼 모드 */
export type StylingFormMode = 'project' | 'survey';

/** 스타일링 폼 Props */
export interface StylingFormProps {
  /** 현재 스타일링 값 */
  styling: Record<string, unknown>;
  /** 값 변경 콜백 */
  onChange: (styling: Record<string, unknown>) => void;
  /** 폼 모드 (프로젝트/설문) */
  mode: StylingFormMode;
  /** 설문 유형 (link/app) — 배경 섹션 표시 여부에 사용 */
  surveyType?: 'link' | 'app';
}

/** Color picker props */
export interface ColorPickerProps {
  /** 현재 색상 값 */
  value?: { light?: string; dark?: string };
  /** 색상 변경 콜백 */
  onChange: (value: { light: string; dark?: string }) => void;
  /** 다크 모드 색상 입력 활성화 */
  darkModeEnabled?: boolean;
  /** 필드 라벨 */
  label?: string;
}

/** Styling section props */
export interface StylingSectionProps {
  /** 섹션 제목 */
  title: string;
  /** 기본 열림 상태 */
  defaultOpen?: boolean;
  /** 자식 요소 */
  children: React.ReactNode;
}
