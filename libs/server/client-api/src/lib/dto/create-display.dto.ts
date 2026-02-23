import { z } from 'zod';

/** Display 생성 요청 스키마 */
export const CreateDisplaySchema = z.object({
  /** 노출 대상 설문 ID */
  surveyId: z.string().min(1, { message: 'Survey ID is required' }),
});

export type CreateDisplayDto = z.infer<typeof CreateDisplaySchema>;
