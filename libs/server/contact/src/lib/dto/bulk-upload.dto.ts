import { z } from 'zod';
import { MAX_BULK_SIZE } from '../constants/contact.constants.js';

/** 단일 연락처 항목 스키마 */
const BulkContactItemSchema = z.object({
  email: z.string().email().optional(),
  userId: z.string().min(1).optional(),
  attributes: z.record(z.unknown()).optional().default({}),
});

/** Bulk Upload 요청 스키마 */
export const BulkUploadSchema = z.object({
  contacts: z
    .array(BulkContactItemSchema)
    .min(1, '최소 1건의 연락처가 필요합니다.')
    .max(
      MAX_BULK_SIZE,
      `한 번에 업로드할 수 있는 연락처 수는 최대 ${MAX_BULK_SIZE}건입니다.`
    ),
});

export type BulkUploadDto = z.infer<typeof BulkUploadSchema>;
export type BulkContactItem = z.infer<typeof BulkContactItemSchema>;
