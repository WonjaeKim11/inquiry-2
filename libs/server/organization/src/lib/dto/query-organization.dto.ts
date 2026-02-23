import { z } from 'zod';
import {
  DEFAULT_ORG_PAGE_SIZE,
  MAX_ORG_PAGE_SIZE,
} from '../constants/billing.constants.js';

/**
 * 조직 목록 조회 Query 파라미터 스키마.
 * page: 페이지 번호 (기본값 1)
 * pageSize: 페이지 크기 (기본값 10, 최대 100)
 */
export const QueryOrganizationSchema = z.object({
  /** 페이지 번호 (1부터 시작) */
  page: z.coerce.number().int().min(1).default(1),
  /** 페이지 크기 */
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_ORG_PAGE_SIZE)
    .default(DEFAULT_ORG_PAGE_SIZE),
});

export type QueryOrganizationDto = z.infer<typeof QueryOrganizationSchema>;
