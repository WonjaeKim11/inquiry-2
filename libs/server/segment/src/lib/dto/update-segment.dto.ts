import { z } from 'zod';

/** 세그먼트 수정 요청 스키마 (부분 업데이트) */
export const UpdateSegmentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, '세그먼트 제목은 필수입니다.')
    .max(100, '세그먼트 제목은 최대 100자입니다.')
    .optional(),
  description: z.string().max(500).nullable().optional(),
  isPrivate: z.boolean().optional(),
  filters: z.array(z.unknown()).optional(),
});

export type UpdateSegmentDto = z.infer<typeof UpdateSegmentSchema>;
