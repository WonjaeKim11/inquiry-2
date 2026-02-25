import { z } from 'zod';

/** SDK Identify 요청 스키마 */
export const SdkIdentifySchema = z.object({
  userId: z.string().min(1, 'userId는 필수입니다.'),
  attributes: z.record(z.unknown()).optional().default({}),
});

export type SdkIdentifyDto = z.infer<typeof SdkIdentifySchema>;
