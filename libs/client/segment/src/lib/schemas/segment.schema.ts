import { z } from 'zod';

/** 세그먼트 폼 검증 스키마 (클라이언트용) */
export const SegmentFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'segment.form.title_required')
    .max(100, 'segment.form.title_max'),
  description: z.string().max(500).optional(),
  isPrivate: z.boolean().optional().default(true),
});

export type SegmentFormValues = z.infer<typeof SegmentFormSchema>;
