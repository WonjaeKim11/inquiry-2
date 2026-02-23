/** 서버 API 표준 에러 응답 인터페이스 */
export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
  details?: Record<string, string[]>;
  timestamp?: string;
  path?: string;
}

/**
 * 서버 응답에서 표준 에러 객체를 파싱한다.
 * 표준 에러 형식이 아닌 경우 기본값을 반환한다.
 */
export function parseApiError(response: Response, data: unknown): ApiError {
  if (
    typeof data === 'object' &&
    data !== null &&
    'statusCode' in data &&
    'message' in data
  ) {
    return data as ApiError;
  }

  return {
    statusCode: response.status,
    error: response.statusText || 'Unknown Error',
    message:
      typeof data === 'object' && data !== null && 'message' in data
        ? String((data as Record<string, unknown>)['message'])
        : '알 수 없는 오류가 발생했습니다.',
  };
}

/**
 * 에러 상세 정보에서 특정 필드의 에러 메시지를 추출한다.
 *
 * @param details - 에러 상세 객체 (필드명 → 에러 메시지 배열)
 * @param field - 조회할 필드명
 * @returns 첫 번째 에러 메시지 또는 undefined
 */
export function getFieldError(
  details: Record<string, string[]> | undefined,
  field: string
): string | undefined {
  if (!details || !details[field]) return undefined;
  return details[field][0];
}
