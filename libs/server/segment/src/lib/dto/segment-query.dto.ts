import { z } from 'zod';

/** 세그먼트 목록 조회 쿼리 스키마 */
export const SegmentQuerySchema = z.object({
  environmentId: z.string().min(1, '환경 ID는 필수입니다.'),
});

export type SegmentQueryDto = z.infer<typeof SegmentQuerySchema>;
