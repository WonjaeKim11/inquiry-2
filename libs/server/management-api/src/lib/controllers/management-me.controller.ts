import { Controller, Get, UseGuards, UseFilters } from '@nestjs/common';
import { ApiExceptionFilter } from '@inquiry/server-core';
import { ApiKeyAuthGuard, ApiKeyAuth } from '@inquiry/server-api-key';
import type { ApiKeyAuthObject } from '@inquiry/server-api-key';
import { ApiRateLimitGuard, ApiRateLimit } from '@inquiry/server-rate-limit';
import { ManagementMeService } from '../services/management-me.service';

/**
 * Management API /me 컨트롤러.
 * API Key 인증 정보를 조회하는 엔드포인트를 제공한다.
 *
 * /me는 environmentId가 불필요한 전역 엔드포인트이므로
 * RequirePermissionGuard를 사용하지 않고 ApiKeyAuthGuard만으로 인증을 검증한다.
 */
@Controller('me')
@UseFilters(new ApiExceptionFilter())
@UseGuards(ApiKeyAuthGuard, ApiRateLimitGuard)
@ApiRateLimit()
export class ManagementMeController {
  constructor(private readonly meService: ManagementMeService) {}

  /**
   * GET /v1/management/me
   * 현재 API Key 인증 정보와 사용 가능한 환경 권한 목록을 반환한다.
   */
  @Get()
  getMe(@ApiKeyAuth() auth: ApiKeyAuthObject) {
    return this.meService.getMe(auth);
  }
}
