import { Controller, Get, Param, UseGuards, UseFilters } from '@nestjs/common';
import { ApiExceptionFilter } from '@inquiry/server-core';
import { ApiRateLimitGuard, ApiRateLimit } from '@inquiry/server-rate-limit';
import { EnvironmentIdGuard } from '../guards/environment-id.guard';
import { ClientEnvironmentService } from '../services/client-environment.service';

/**
 * 환경 상태 조회 API.
 * 클라이언트 SDK가 초기화 시 환경 설정과 활성 설문을 가져온다.
 */
@Controller(':environmentId/environment')
@UseFilters(new ApiExceptionFilter())
@UseGuards(EnvironmentIdGuard, ApiRateLimitGuard)
@ApiRateLimit()
export class ClientEnvironmentController {
  constructor(private readonly environmentService: ClientEnvironmentService) {}

  /** GET /v1/client/:environmentId/environment — 환경 상태 + 활성 설문 */
  @Get()
  async getState(@Param('environmentId') environmentId: string) {
    return this.environmentService.getEnvironmentState(environmentId);
  }
}
