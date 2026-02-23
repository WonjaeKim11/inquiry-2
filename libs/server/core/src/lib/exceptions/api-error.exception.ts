import { HttpException } from '@nestjs/common';

/**
 * API 에러 기반 클래스.
 * code 필드로 머신-리더블 에러 식별자를 제공한다.
 * 모든 도메인별 예외는 이 클래스를 상속하여 일관된 에러 응답 구조를 보장한다.
 */
export class ApiErrorException extends HttpException {
  constructor(
    /** 머신-리더블 에러 코드 (예: 'NotAuthenticatedError') */
    public readonly code: string,
    message: string,
    statusCode: number,
    /** 에러에 대한 추가 상세 정보 */
    public readonly details?: Record<string, unknown>
  ) {
    super({ code, message, details }, statusCode);
  }
}
