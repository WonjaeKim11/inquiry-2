import { z } from 'zod';
import {
  PROJECT_NAME_MIN_LENGTH,
  PROJECT_NAME_MAX_LENGTH,
  PROJECT_MODES,
  WIDGET_PLACEMENTS,
  DARK_OVERLAYS,
} from '../enums/project.enums.js';

/**
 * 프로젝트 생성 DTO (Zod 스키마).
 * name과 organizationId는 필수이며, 나머지는 선택적 설정이다.
 */
export const CreateProjectSchema = z.object({
  /** 프로젝트 이름 (trim 처리, 1~64자) */
  name: z
    .string()
    .trim()
    .min(PROJECT_NAME_MIN_LENGTH, {
      message: `프로젝트 이름은 최소 ${PROJECT_NAME_MIN_LENGTH}자 이상이어야 합니다.`,
    })
    .max(PROJECT_NAME_MAX_LENGTH, {
      message: `프로젝트 이름은 최대 ${PROJECT_NAME_MAX_LENGTH}자까지 가능합니다.`,
    }),
  /** 소속 조직 ID */
  organizationId: z.string().min(1, { message: '조직 ID는 필수입니다.' }),
  /** 재접촉 대기 일수 (기본값 7) */
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
});

export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;
