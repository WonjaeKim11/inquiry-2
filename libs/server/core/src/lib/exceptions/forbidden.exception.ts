import { ApiErrorException } from './api-error.exception';

/**
 * 권한 부족에 대한 예외 (HTTP 403).
 * 인증은 되었으나 요청한 리소스에 대한 접근 권한이 없는 경우 사용한다.
 */
export class ForbiddenException extends ApiErrorException {
  constructor(message = 'Insufficient permissions') {
    super('ForbiddenError', message, 403);
  }
}
