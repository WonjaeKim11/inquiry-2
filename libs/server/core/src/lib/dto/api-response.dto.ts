/** 표준 API 성공 응답 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

/** 표준 API 에러 응답 */
export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
}
