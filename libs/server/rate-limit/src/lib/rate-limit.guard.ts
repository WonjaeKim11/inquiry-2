import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * IP 기반 Rate Limiting Guard.
 * 리버스 프록시 환경에서 X-Forwarded-For 헤더를 우선 참조한다.
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  /** 프록시 뒤의 실제 클라이언트 IP를 추출 */
  protected override async getTracker(
    req: Record<string, unknown>
  ): Promise<string> {
    const headers = (req as Record<string, unknown>)['headers'] as
      | Record<string, unknown>
      | undefined;
    const forwarded = headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    const ip = (req as Record<string, unknown>)['ip'];
    return (typeof ip === 'string' ? ip : undefined) || 'unknown';
  }

  /** 스킵 여부 결정: 기본적으로 모든 요청에 적용 */
  protected override async shouldSkip(
    _context: ExecutionContext
  ): Promise<boolean> {
    return false;
  }
}
