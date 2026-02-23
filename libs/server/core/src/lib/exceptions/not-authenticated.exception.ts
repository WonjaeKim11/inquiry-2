import { ApiErrorException } from './api-error.exception';

/**
 * 인증되지 않은 요청에 대한 예외 (HTTP 401).
 * 유효한 인증 토큰이 없거나 만료된 경우 사용한다.
 */
export class NotAuthenticatedException extends ApiErrorException {
  constructor(message = 'Authentication required') {
    super('NotAuthenticatedError', message, 401);
  }
}
