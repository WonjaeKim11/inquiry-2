import { z } from 'zod';
import { CreateSurveySchema } from './create-survey.dto.js';

/**
 * 설문 수정 DTO (Zod 스키마).
 * CreateSurveySchema의 모든 필드를 optional로 확장한다.
 * 전달된 필드만 업데이트된다 (부분 업데이트).
 * 상태 변경은 별도 엔드포인트(/publish, /pause 등)를 사용한다.
 */
export const UpdateSurveySchema = CreateSurveySchema.partial();

export type UpdateSurveyDto = z.infer<typeof UpdateSurveySchema>;
