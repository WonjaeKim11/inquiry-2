import { z } from 'zod';

/** 세그먼트 생성 요청 스키마 */
export const CreateSegmentSchema = z.object({
  /** 세그먼트 제목 (1~100자, 환경 내 고유) */
  title: z
    .string()
    .trim()
    .min(1, '세그먼트 제목은 필수입니다.')
    .max(100, '세그먼트 제목은 최대 100자입니다.'),
  /** 설명 (선택, 최대 500자) */
  description: z.string().max(500).optional(),
  /** 비공개 여부 (기본: true) */
  isPrivate: z.boolean().optional().default(true),
  /** 필터 트리 (JSON 배열) */
  filters: z.array(z.unknown()).optional().default([]),
  /** 환경 ID */
  environmentId: z.string().min(1, '환경 ID는 필수입니다.'),
});

export type CreateSegmentDto = z.infer<typeof CreateSegmentSchema>;
