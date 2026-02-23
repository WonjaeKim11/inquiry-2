import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/** 표준 에러 응답 형식 */
interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
}

/**
 * 글로벌 예외 필터.
 * 모든 예외를 표준화된 JSON 형식으로 변환하여 반환한다.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private sentry: { captureException: (error: unknown) => void } | null = null;

  /** Sentry 서비스를 설정 (선택적) */
  setSentry(sentry: { captureException: (error: unknown) => void }) {
    this.sentry = sentry;
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '서버 내부 오류가 발생했습니다.';
    let error = 'Internal Server Error';
    let details: Record<string, unknown> | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp['message'] as string) || message;
        error = (resp['error'] as string) || error;
        if (resp['details']) {
          details = resp['details'] as Record<string, unknown>;
        }
      }

      error = this.getErrorName(statusCode);
    } else {
      // 예상치 못한 에러: Sentry에 보고하고 로그 기록
      this.logger.error('처리되지 않은 예외', exception);
      if (this.sentry) {
        this.sentry.captureException(exception);
      }
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      error,
      message,
      ...(details && { details }),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(errorResponse);
  }

  /** HTTP 상태 코드에 대응하는 에러 이름 반환 */
  private getErrorName(statusCode: number): string {
    const errorNames: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      422: 'Unprocessable Entity',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
    };
    return errorNames[statusCode] || 'Unknown Error';
  }
}
