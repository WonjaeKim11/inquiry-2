import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Request } from 'express';

/**
 * API 전용 Rate Limit Guard.
 * namespace 기반으로 Rate Limiting을 적용한다.
 * - Management API: `mgmt:{apiKeyId}`
 * - Client API: `client:{environmentId}`
 * - 폴백: IP 기반
 */
@Injectable()
export class ApiRateLimitGuard extends ThrottlerGuard {
  /** namespace 기반 추적 키 생성 */
  protected override async getTracker(
    req: Record<string, unknown>
  ): Promise<string> {
    const request = req as unknown as Request;

    // Management API: API Key ID 기반
    const apiKeyAuth = (request as Record<string, unknown>)['apiKeyAuth'] as
      | { apiKeyId: string }
      | undefined;
    if (apiKeyAuth?.apiKeyId) {
      return `mgmt:${apiKeyAuth.apiKeyId}`;
    }

    // Client API: Environment ID 기반
    const environmentId = (request.params as Record<string, string>)?.[
      'environmentId'
    ];
    if (environmentId) {
      return `client:${environmentId}`;
    }

    // 폴백: IP 기반
    const headers = request.headers;
    const forwarded = headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || 'unknown';
  }

  /** 스킵 여부 결정: 기본적으로 모든 요청에 적용 */
  protected override async shouldSkip(
    _context: ExecutionContext
  ): Promise<boolean> {
    return false;
  }
}
