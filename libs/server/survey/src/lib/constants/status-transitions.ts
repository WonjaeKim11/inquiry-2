import { SurveyStatus } from '@prisma/client';

/**
 * 설문 상태 전이 규칙.
 * 각 상태에서 허용되는 전이 대상 상태 목록을 정의한다.
 * DRAFT → IN_PROGRESS (발행)
 * IN_PROGRESS → PAUSED (일시정지) | COMPLETED (완료)
 * PAUSED → IN_PROGRESS (재개)
 * COMPLETED → (종료 상태, 전이 불가)
 */
export const SURVEY_STATUS_TRANSITIONS: Record<SurveyStatus, SurveyStatus[]> = {
  DRAFT: ['IN_PROGRESS'],
  IN_PROGRESS: ['PAUSED', 'COMPLETED'],
  PAUSED: ['IN_PROGRESS'],
  COMPLETED: [],
};
