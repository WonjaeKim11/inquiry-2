import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiKeyService } from '../services/api-key.service';

/**
 * API 키 인증 가드.
 * x-api-key 헤더에서 키를 추출하고, bcrypt 해시와 비교하여 인증한다.
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string | undefined;

    if (!apiKey) {
      throw new UnauthorizedException('API 키가 필요합니다.');
    }

    const result = await this.apiKeyService.validate(apiKey);
    if (!result) {
      throw new UnauthorizedException('유효하지 않은 API 키입니다.');
    }

    // request 객체에 API 키 정보 추가
    (request as Record<string, unknown>)['apiKeyId'] = result.id;
    (request as Record<string, unknown>)['environmentId'] =
      result.environmentId;

    return true;
  }
}
