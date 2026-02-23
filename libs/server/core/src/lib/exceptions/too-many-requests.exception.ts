import { ApiErrorException } from './api-error.exception';

/**
 * 요청 횟수 초과에 대한 예외 (HTTP 429).
 * Rate limiting에 걸렸을 때 사용한다.
 */
export class TooManyRequestsException extends ApiErrorException {
  constructor(
    message = 'Too many requests',
    /** 재시도 가능한 시간(초) */
    retryAfter?: number
  ) {
    super(
      'TooManyRequestsError',
      message,
      429,
      retryAfter ? { retryAfter } : undefined
    );
  }
}
