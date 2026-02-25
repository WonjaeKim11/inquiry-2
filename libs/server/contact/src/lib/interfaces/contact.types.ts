/** 중복 처리 전략 */
export enum DuplicateStrategy {
  SKIP = 'skip',
  UPDATE = 'update',
  OVERWRITE = 'overwrite',
}

/** CSV Import 결과 */
export interface CsvImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

/** 레코드 처리 결과 */
export interface ProcessResult {
  action: 'created' | 'updated' | 'skipped' | 'error';
  contactId?: string;
  error?: string;
}

/** 속성을 포함한 연락처 */
export interface ContactWithAttributes {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  environmentId: string;
  attributes: Record<string, unknown>;
}

/** 페이지네이션 결과 */
export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
}
