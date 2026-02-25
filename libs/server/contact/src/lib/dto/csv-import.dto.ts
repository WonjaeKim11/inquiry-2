import { z } from 'zod';

/** CSV Import 중복 전략 검증 스키마 */
export const CsvImportSchema = z.object({
  duplicateStrategy: z.enum(['skip', 'update', 'overwrite']).default('skip'),
});

export type CsvImportDto = z.infer<typeof CsvImportSchema>;
