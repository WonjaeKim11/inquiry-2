import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyService } from '../api-key.service';
import { NotAuthenticatedException } from '@inquiry/server-core';

/**
 * API Key 인증 가드.
 * x-api-key 헤더에서 키를 추출하고, 검증 후 request.apiKeyAuth에 ApiKeyAuthObject를 주입한다.
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyAuthGuard.name);

  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string | undefined;

    if (!apiKey) {
      throw new NotAuthenticatedException('API key is required');
    }

    const result = await this.apiKeyService.validate(apiKey);
    if (!result) {
      throw new NotAuthenticatedException('Invalid or expired API key');
    }

    // request 객체에 API Key 인증 정보 주입
    (request as Record<string, unknown>)['apiKeyAuth'] = result;

    return true;
  }
}
