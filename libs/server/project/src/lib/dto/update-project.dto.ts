import { z } from 'zod';
import {
  projectStylingSchema,
  surveyLogoSchema,
} from '@inquiry/survey-builder-config';
import {
  PROJECT_NAME_MIN_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  PROJECT_MODES,
  WIDGET_PLACEMENTS,
  DARK_OVERLAYS,
} from '../enums/project.enums.js';

/**
 * 프로젝트 수정 DTO (Zod 스키마).
 * 모든 필드가 선택적이며, 제공된 필드만 업데이트한다 (부분 업데이트).
 */
export const UpdateProjectSchema = z.object({
  /** 프로젝트 이름 (trim 처리, 1~64자) */
  name: z
    .string()
    .trim()
    .min(PROJECT_NAME_MIN_LENGTH, {
      message: `프로젝트 이름은 최소 ${PROJECT_NAME_MIN_LENGTH}자 이상이어야 합니다.`,
    })
    .max(PROJECT_NAME_MAX_LENGTH, {
      message: `프로젝트 이름은 최대 ${PROJECT_NAME_MAX_LENGTH}자까지 가능합니다.`,
    })
    .optional(),
  /** 재접촉 대기 일수 */
  recontactDays: z.number().int().min(0).optional(),
  /** 위젯 배치 위치 */
  placement: z.enum(WIDGET_PLACEMENTS).optional(),
  /** 프로젝트 모드 */
  mode: z.enum(PROJECT_MODES).optional(),
  /** 인앱 서베이 브랜딩 표시 여부 */
  inAppSurveyBranding: z.boolean().optional(),
  /** 링크 서베이 브랜딩 표시 여부 */
  linkSurveyBranding: z.boolean().optional(),
  /** 외부 클릭 시 닫기 여부 */
  clickOutsideClose: z.boolean().optional(),
  /** 다크 오버레이 설정 */
  darkOverlay: z.enum(DARK_OVERLAYS).optional(),
  /** 스타일링 설정 — projectStylingSchema 기반 검증, passthrough로 레거시 필드 호환 */
  styling: projectStylingSchema.passthrough().optional(),
  /** 로고 설정 — surveyLogoSchema 기반 검증, passthrough로 레거시 필드 호환 */
  logo: surveyLogoSchema.passthrough().nullable().optional(),
  /** 추가 설정 (JSON) */
  config: z.record(z.unknown()).nullable().optional(),
  /** 커스텀 헤드 스크립트 (Self-hosted 전용) */
  customHeadScript: z.string().nullable().optional(),
});

export type UpdateProjectDto = z.infer<typeof UpdateProjectSchema>;
