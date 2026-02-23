import { Controller, Get } from '@nestjs/common';

/**
 * v2 API 헬스 체크 컨트롤러 (스텁).
 * v2 API가 향후 확장될 때까지 기본 헬스 엔드포인트만 제공한다.
 * 경로: /api/v2/health
 */
@Controller('health')
export class V2HealthController {
  /** v2 API 상태 확인 */
  @Get()
  check() {
    return {
      status: 'ok',
      version: 'v2-beta',
      message: 'v2 API is under development',
    };
  }
}
