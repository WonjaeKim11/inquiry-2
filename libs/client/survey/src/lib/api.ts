import { apiFetch } from '@inquiry/client-core';
import type {
  SurveyListItem,
  SurveyDetail,
  CreateSurveyInput,
  UpdateSurveyInput,
  SurveyTemplate,
} from './types';

/**
 * 환경별 설문 목록을 조회한다.
 * @param envId - 대상 환경 ID
 * @param query - 선택적 쿼리 파라미터 (status, page, limit 등)
 */
export async function fetchSurveys(
  envId: string,
  query?: Record<string, string>
): Promise<{ data: SurveyListItem[]; ok: boolean }> {
  const params = query ? `?${new URLSearchParams(query).toString()}` : '';
  const res = await apiFetch(`/environments/${envId}/surveys${params}`);
  if (!res.ok) {
    return { data: [], ok: false };
  }
  const json = await res.json();
  const data = Array.isArray(json) ? json : json.data ?? [];
  return { data, ok: true };
}

/**
 * 단일 설문을 상세 조회한다.
 * @param surveyId - 대상 설문 ID
 */
export async function fetchSurvey(
  surveyId: string
): Promise<{ data: SurveyDetail | null; ok: boolean }> {
  const res = await apiFetch(`/surveys/${surveyId}`);
  if (!res.ok) {
    return { data: null, ok: false };
  }
  const data = await res.json();
  return { data, ok: true };
}

/**
 * 새 설문을 생성한다.
 * @param envId - 대상 환경 ID
 * @param input - 설문 생성 입력 (name, type)
 */
export async function createSurvey(
  envId: string,
  input: CreateSurveyInput
): Promise<{ data: SurveyDetail | null; ok: boolean; message?: string }> {
  const res = await apiFetch(`/environments/${envId}/surveys`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok) {
    return { data: null, ok: false, message: json.message };
  }
  return { data: json, ok: true };
}

/**
 * 템플릿으로부터 설문을 생성한다.
 * @param envId - 대상 환경 ID
 * @param templateId - 템플릿 ID
 * @param input - 설문 이름/유형
 */
export async function createSurveyFromTemplate(
  envId: string,
  templateId: string,
  input: CreateSurveyInput
): Promise<{ data: SurveyDetail | null; ok: boolean; message?: string }> {
  const res = await apiFetch(`/environments/${envId}/surveys/from-template`, {
    method: 'POST',
    body: JSON.stringify({ ...input, templateId }),
  });
  const json = await res.json();
  if (!res.ok) {
    return { data: null, ok: false, message: json.message };
  }
  return { data: json, ok: true };
}

/**
 * 설문을 수정한다.
 * @param surveyId - 대상 설문 ID
 * @param input - 수정할 필드
 */
export async function updateSurvey(
  surveyId: string,
  input: UpdateSurveyInput
): Promise<{ data: SurveyDetail | null; ok: boolean; message?: string }> {
  const res = await apiFetch(`/surveys/${surveyId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!res.ok) {
    return { data: null, ok: false, message: json.message };
  }
  return { data: json, ok: true };
}

/**
 * 설문을 삭제한다.
 * @param surveyId - 대상 설문 ID
 */
export async function deleteSurvey(
  surveyId: string
): Promise<{ ok: boolean; message?: string }> {
  const res = await apiFetch(`/surveys/${surveyId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const json = await res.json();
    return { ok: false, message: json.message };
  }
  return { ok: true };
}

/**
 * 설문을 발행(DRAFT → IN_PROGRESS)한다.
 * @param surveyId - 대상 설문 ID
 */
export async function publishSurvey(
  surveyId: string
): Promise<{ ok: boolean; message?: string }> {
  const res = await apiFetch(`/surveys/${surveyId}/publish`, {
    method: 'POST',
  });
  if (!res.ok) {
    const json = await res.json();
    return { ok: false, message: json.message };
  }
  return { ok: true };
}

/**
 * 설문을 일시정지(IN_PROGRESS → PAUSED)한다.
 * @param surveyId - 대상 설문 ID
 */
export async function pauseSurvey(
  surveyId: string
): Promise<{ ok: boolean; message?: string }> {
  const res = await apiFetch(`/surveys/${surveyId}/pause`, {
    method: 'POST',
  });
  if (!res.ok) {
    const json = await res.json();
    return { ok: false, message: json.message };
  }
  return { ok: true };
}

/**
 * 설문을 재개(PAUSED → IN_PROGRESS)한다.
 * @param surveyId - 대상 설문 ID
 */
export async function resumeSurvey(
  surveyId: string
): Promise<{ ok: boolean; message?: string }> {
  const res = await apiFetch(`/surveys/${surveyId}/resume`, {
    method: 'POST',
  });
  if (!res.ok) {
    const json = await res.json();
    return { ok: false, message: json.message };
  }
  return { ok: true };
}

/**
 * 설문을 완료(IN_PROGRESS/PAUSED → COMPLETED)한다.
 * @param surveyId - 대상 설문 ID
 */
export async function completeSurvey(
  surveyId: string
): Promise<{ ok: boolean; message?: string }> {
  const res = await apiFetch(`/surveys/${surveyId}/complete`, {
    method: 'POST',
  });
  if (!res.ok) {
    const json = await res.json();
    return { ok: false, message: json.message };
  }
  return { ok: true };
}

/**
 * 설문 템플릿 목록을 조회한다.
 */
export async function fetchTemplates(): Promise<{
  data: SurveyTemplate[];
  ok: boolean;
}> {
  const res = await apiFetch('/survey-templates');
  if (!res.ok) {
    return { data: [], ok: false };
  }
  const json = await res.json();
  const data = Array.isArray(json) ? json : json.data ?? [];
  return { data, ok: true };
}
