import {
  Controller,
  Get,
  Put,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
  UseFilters,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiExceptionFilter, ZodValidationPipe } from '@inquiry/server-core';
import {
  ApiKeyAuthGuard,
  RequirePermissionGuard,
  RequirePermission,
} from '@inquiry/server-api-key';
import { ApiRateLimitGuard, ApiRateLimit } from '@inquiry/server-rate-limit';
import { ManagementResponseService } from '../services/management-response.service';
import {
  UpdateManagementResponseSchema,
  type UpdateManagementResponseDto,
} from '../dto/update-management-response.dto';

/**
 * Management API Response CRUD 컨트롤러.
 * API Key 인증 + 환경별 권한 기반으로 설문 응답을 관리한다.
 * environmentId는 쿼리 파라미터로 전달한다.
 */
@Controller('responses')
@UseFilters(new ApiExceptionFilter())
@UseGuards(ApiKeyAuthGuard, RequirePermissionGuard, ApiRateLimitGuard)
@ApiRateLimit()
export class ManagementResponseController {
  constructor(private readonly responseService: ManagementResponseService) {}

  /**
   * GET /v1/management/responses?environmentId=xxx
   * 환경별 응답 목록을 조회한다.
   */
  @Get()
  @RequirePermission('READ')
  list(@Query('environmentId') environmentId: string) {
    return this.responseService.list(environmentId);
  }

  /**
   * GET /v1/management/responses/:id?environmentId=xxx
   * 응답 단건을 조회한다.
   */
  @Get(':id')
  @RequirePermission('READ')
  findById(
    @Query('environmentId') environmentId: string,
    @Param('id') id: string
  ) {
    return this.responseService.findById(environmentId, id);
  }

  /**
   * PUT /v1/management/responses/:id?environmentId=xxx
   * 응답을 수정한다. 전달된 필드만 업데이트.
   */
  @Put(':id')
  @RequirePermission('WRITE')
  update(
    @Query('environmentId') environmentId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateManagementResponseSchema))
    dto: UpdateManagementResponseDto
  ) {
    return this.responseService.update(environmentId, id, dto);
  }

  /**
   * DELETE /v1/management/responses/:id?environmentId=xxx
   * 응답을 삭제한다. MANAGE 권한 필요.
   */
  @Delete(':id')
  @RequirePermission('MANAGE')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Query('environmentId') environmentId: string,
    @Param('id') id: string
  ) {
    return this.responseService.remove(environmentId, id);
  }
}
