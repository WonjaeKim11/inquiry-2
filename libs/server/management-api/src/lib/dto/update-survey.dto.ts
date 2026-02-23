import { z } from 'zod';
import { CreateSurveySchema } from './create-survey.dto';

/**
 * Management API 설문 수정 요청 스키마.
 * 모든 필드가 선택이며, 변경할 필드만 전달한다.
 */
export const UpdateSurveySchema = CreateSurveySchema.partial();

export type UpdateSurveyDto = z.infer<typeof UpdateSurveySchema>;
