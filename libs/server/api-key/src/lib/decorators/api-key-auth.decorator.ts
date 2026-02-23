import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiKeyAuthObject } from '../interfaces/api-key-auth.interface';

/**
 * API Key 인증 정보를 파라미터로 주입하는 데코레이터.
 * ApiKeyAuthGuard가 선행되어야 한다.
 */
export const ApiKeyAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ApiKeyAuthObject => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request as Record<string, unknown>)[
      'apiKeyAuth'
    ] as ApiKeyAuthObject;
  }
);
