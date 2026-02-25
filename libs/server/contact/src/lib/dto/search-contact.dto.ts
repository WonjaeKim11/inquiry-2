import { z } from 'zod';

/** 연락처 목록 조회 요청 스키마 */
export const SearchContactSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().optional(),
});

export type SearchContactDto = z.infer<typeof SearchContactSchema>;
