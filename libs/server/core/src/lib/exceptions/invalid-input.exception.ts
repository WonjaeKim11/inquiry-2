import { ApiErrorException } from './api-error.exception';

/**
 * 유효하지 않은 입력에 대한 예외 (HTTP 422).
 * 요청 형식은 올바르지만 비즈니스 규칙 검증에 실패한 경우 사용한다.
 */
export class InvalidInputException extends ApiErrorException {
  constructor(
    message = 'Invalid input',
    /** 필드별 검증 실패 상세 정보 */
    details?: Record<string, unknown>
  ) {
    super('InvalidInputError', message, 422, details);
  }
}
