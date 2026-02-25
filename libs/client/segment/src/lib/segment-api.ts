import { apiFetch } from '@inquiry/client-core';

/** 세그먼트 항목 타입 */
export interface SegmentItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  description: string | null;
  isPrivate: boolean;
  filters: unknown[];
  environmentId: string;
  _count: {
    surveys: number;
  };
}

/**
 * 환경별 세그먼트 목록 조회.
 * @param envId - 환경 ID
 * @returns 세그먼트 배열
 */
export async function fetchSegments(
  envId: string
): Promise<{ data: SegmentItem[]; ok: boolean }> {
  const res = await apiFetch(`/environments/${envId}/segments`);
  if (!res.ok) return { data: [], ok: false };
  const json = await res.json();
  return { data: Array.isArray(json) ? json : [], ok: true };
}

/**
 * 세그먼트 단건 조회.
 * @param envId - 환경 ID
 * @param segmentId - 세그먼트 ID
 * @returns 세그먼트 상세
 */
export async function fetchSegment(
  envId: string,
  segmentId: string
): Promise<{ data: SegmentItem | null; ok: boolean }> {
  const res = await apiFetch(`/environments/${envId}/segments/${segmentId}`);
  if (!res.ok) return { data: null, ok: false };
  const json = await res.json();
  return { data: json, ok: true };
}

/**
 * 세그먼트 생성.
 * @param envId - 환경 ID
 * @param input - 생성 데이터
 * @returns 생성된 세그먼트
 */
export async function createSegment(
  envId: string,
  input: {
    title: string;
    description?: string;
    isPrivate?: boolean;
    filters?: unknown[];
  }
): Promise<{ data: SegmentItem | null; ok: boolean; message?: string }> {
  const res = await apiFetch(`/environments/${envId}/segments`, {
    method: 'POST',
    body: JSON.stringify({ ...input, environmentId: envId }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { data: null, ok: false, message: json.message };
  return { data: json, ok: true };
}

/**
 * 세그먼트 수정.
 * @param envId - 환경 ID
 * @param segmentId - 세그먼트 ID
 * @param input - 수정 데이터
 * @returns 수정된 세그먼트
 */
export async function updateSegment(
  envId: string,
  segmentId: string,
  input: {
    title?: string;
    description?: string | null;
    isPrivate?: boolean;
    filters?: unknown[];
  }
): Promise<{ data: SegmentItem | null; ok: boolean; message?: string }> {
  const res = await apiFetch(`/environments/${envId}/segments/${segmentId}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { data: null, ok: false, message: json.message };
  return { data: json, ok: true };
}

/**
 * 세그먼트 삭제.
 * @param envId - 환경 ID
 * @param segmentId - 세그먼트 ID
 * @returns 삭제 성공 여부
 */
export async function deleteSegment(
  envId: string,
  segmentId: string
): Promise<{ ok: boolean; message?: string }> {
  const res = await apiFetch(`/environments/${envId}/segments/${segmentId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    return { ok: false, message: json.message };
  }
  return { ok: true };
}

/**
 * 세그먼트 복제.
 * @param envId - 환경 ID
 * @param segmentId - 복제할 세그먼트 ID
 * @returns 복제된 세그먼트
 */
export async function cloneSegment(
  envId: string,
  segmentId: string
): Promise<{ data: SegmentItem | null; ok: boolean; message?: string }> {
  const res = await apiFetch(
    `/environments/${envId}/segments/${segmentId}/clone`,
    {
      method: 'POST',
    }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { data: null, ok: false, message: json.message };
  return { data: json, ok: true };
}

/**
 * 세그먼트 필터 초기화.
 * @param envId - 환경 ID
 * @param segmentId - 세그먼트 ID
 * @returns 초기화된 세그먼트
 */
export async function resetSegment(
  envId: string,
  segmentId: string
): Promise<{ data: SegmentItem | null; ok: boolean; message?: string }> {
  const res = await apiFetch(
    `/environments/${envId}/segments/${segmentId}/reset`,
    {
      method: 'POST',
    }
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { data: null, ok: false, message: json.message };
  return { data: json, ok: true };
}
