import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiErrorException } from '../exceptions/api-error.exception';

/**
 * API 전용 예외 필터.
 * 컨트롤러 레벨에서 @UseFilters()로 적용한다 (글로벌 등록 X).
 * 응답 형식: { error: { code, message, details? } }
 *
 * GlobalExceptionFilter와 달리 API 컨텍스트에 특화된 응답 구조를 제공한다.
 * ApiErrorException 계열은 code 필드를 그대로 사용하고,
 * 일반 HttpException은 상태 코드로부터 기본 code를 유도한다.
 */
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // ApiErrorException: 도메인 예외 → code/message/details를 그대로 사용
    if (exception instanceof ApiErrorException) {
      const status = exception.getStatus();
      return response.status(status).json({
        error: {
          code: exception.code,
          message: exception.message,
          ...(exception.details && { details: exception.details }),
        },
      });
    }

    // 일반 HttpException: NestJS 내장 예외 → 상태 코드로부터 code 유도
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as Record<string, unknown>)['message'] ||
            'An error occurred';

      return response.status(status).json({
        error: {
          code: this.getDefaultCode(status),
          message:
            typeof message === 'string' ? message : JSON.stringify(message),
        },
      });
    }

    // 예상치 못한 에러: 로그에 기록하고 500 반환
    this.logger.error('Unhandled exception in API', exception);
    return response.status(500).json({
      error: {
        code: 'InternalServerError',
        message: 'An unexpected error occurred',
      },
    });
  }

  /** HTTP 상태 코드에 대응하는 기본 에러 코드 반환 */
  private getDefaultCode(status: number): string {
    const codes: Record<number, string> = {
      400: 'BadRequestError',
      401: 'NotAuthenticatedError',
      403: 'ForbiddenError',
      404: 'ResourceNotFoundError',
      409: 'ConflictError',
      422: 'InvalidInputError',
      429: 'TooManyRequestsError',
    };
    return codes[status] || 'UnknownError';
  }
}
