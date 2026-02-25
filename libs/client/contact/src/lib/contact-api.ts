import { apiFetch } from '@inquiry/client-core';

/** 연락처 속성을 포함한 연락처 타입 */
export interface ContactItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  environmentId: string;
  attributes: Record<string, unknown>;
}

/** 페이지네이션 결과 */
export interface PaginatedContacts {
  data: ContactItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

/** 속성 키 타입 */
export interface AttributeKey {
  id: string;
  key: string;
  name: string | null;
  description: string | null;
  type: 'DEFAULT' | 'CUSTOM';
  dataType: 'STRING' | 'NUMBER' | 'DATE';
  isUnique: boolean;
  environmentId: string;
  createdAt: string;
  updatedAt: string;
}

/** CSV Import 결과 */
export interface CsvImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

/**
 * 연락처 목록 조회.
 * @param envId - 환경 ID
 * @param query - 페이지, 페이지 크기, 검색어 등 선택적 쿼리 파라미터
 * @returns 페이지네이션된 연락처 목록
 */
export async function fetchContacts(
  envId: string,
  query?: { page?: number; pageSize?: number; search?: string }
): Promise<{ data: PaginatedContacts | null; ok: boolean }> {
  const params = new URLSearchParams();
  if (query?.page) params.set('page', String(query.page));
  if (query?.pageSize) params.set('pageSize', String(query.pageSize));
  if (query?.search) params.set('search', query.search);

  const paramStr = params.toString();
  const url = `/environments/${envId}/contacts${
    paramStr ? `?${paramStr}` : ''
  }`;
  const res = await apiFetch(url);

  if (!res.ok) return { data: null, ok: false };
  const json = await res.json();
  return { data: json, ok: true };
}

/**
 * 연락처 삭제.
 * @param envId - 환경 ID
 * @param contactId - 삭제할 연락처 ID
 * @returns 삭제 성공 여부 및 에러 메시지
 */
export async function deleteContact(
  envId: string,
  contactId: string
): Promise<{ ok: boolean; message?: string }> {
  const res = await apiFetch(`/environments/${envId}/contacts/${contactId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    return { ok: false, message: json.message };
  }
  return { ok: true };
}

/**
 * CSV Import.
 * FormData로 파일과 중복 처리 전략을 전송한다.
 * @param envId - 환경 ID
 * @param file - 업로드할 CSV 파일
 * @param duplicateStrategy - 중복 처리 전략 (skip | update | overwrite)
 * @returns Import 결과 통계
 */
export async function importCsvContacts(
  envId: string,
  file: File,
  duplicateStrategy: 'skip' | 'update' | 'overwrite'
): Promise<{ data: CsvImportResult | null; ok: boolean; message?: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('duplicateStrategy', duplicateStrategy);

  const res = await apiFetch(`/environments/${envId}/contacts/import`, {
    method: 'POST',
    body: formData,
    headers: {}, // FormData는 Content-Type을 자동 설정
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { data: null, ok: false, message: json.message };
  }
  return { data: json, ok: true };
}

/**
 * 속성 키 목록 조회.
 * @param envId - 환경 ID
 * @returns 속성 키 배열
 */
export async function fetchAttributeKeys(
  envId: string
): Promise<{ data: AttributeKey[]; ok: boolean }> {
  const res = await apiFetch(`/environments/${envId}/contact-attribute-keys`);
  if (!res.ok) return { data: [], ok: false };
  const json = await res.json();
  return { data: Array.isArray(json) ? json : [], ok: true };
}

/**
 * 속성 키 생성.
 * @param envId - 환경 ID
 * @param input - 생성할 속성 키 정보 (key, name, description, dataType)
 * @returns 생성된 속성 키
 */
export async function createAttributeKey(
  envId: string,
  input: { key: string; name?: string; description?: string; dataType?: string }
): Promise<{ data: AttributeKey | null; ok: boolean; message?: string }> {
  const res = await apiFetch(`/environments/${envId}/contact-attribute-keys`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { data: null, ok: false, message: json.message };
  return { data: json, ok: true };
}

/**
 * 속성 키 수정.
 * @param envId - 환경 ID
 * @param keyId - 수정할 속성 키 ID
 * @param input - 수정할 필드 (name, description)
 * @returns 수정된 속성 키
 */
export async function updateAttributeKey(
  envId: string,
  keyId: string,
  input: { name?: string; description?: string }
): Promise<{ data: AttributeKey | null; ok: boolean; message?: string }> {
  const res = await apiFetch(
    `/environments/${envId}/contact-attribute-keys/${keyId}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { data: null, ok: false, message: json.message };
  return { data: json, ok: true };
}

/**
 * 속성 키 삭제.
 * @param envId - 환경 ID
 * @param keyId - 삭제할 속성 키 ID
 * @returns 삭제 성공 여부
 */
export async function deleteAttributeKey(
  envId: string,
  keyId: string
): Promise<{ ok: boolean; message?: string }> {
  const res = await apiFetch(
    `/environments/${envId}/contact-attribute-keys/${keyId}`,
    { method: 'DELETE' }
  );
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    return { ok: false, message: json.message };
  }
  return { ok: true };
}
