import {
  Controller,
  Get,
  Post,
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
import { ManagementContactService } from '../services/management-contact.service';
import {
  CreateContactSchema,
  type CreateContactDto,
} from '../dto/create-contact.dto';

/**
 * Management API Contact CRUD 컨트롤러.
 * API Key 인증 + 환경별 권한 기반으로 연락처를 관리한다.
 * environmentId는 쿼리 파라미터로 전달한다.
 */
@Controller('contacts')
@UseFilters(new ApiExceptionFilter())
@UseGuards(ApiKeyAuthGuard, RequirePermissionGuard, ApiRateLimitGuard)
@ApiRateLimit()
export class ManagementContactController {
  constructor(private readonly contactService: ManagementContactService) {}

  /**
   * GET /v1/management/contacts?environmentId=xxx
   * 환경별 연락처 목록을 조회한다.
   */
  @Get()
  @RequirePermission('READ')
  list(@Query('environmentId') environmentId: string) {
    return this.contactService.list(environmentId);
  }

  /**
   * POST /v1/management/contacts?environmentId=xxx
   * 새 연락처를 생성한다.
   */
  @Post()
  @RequirePermission('WRITE')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Query('environmentId') environmentId: string,
    @Body(new ZodValidationPipe(CreateContactSchema)) dto: CreateContactDto
  ) {
    return this.contactService.create(environmentId, dto);
  }

  /**
   * GET /v1/management/contacts/:id?environmentId=xxx
   * 연락처 단건을 조회한다. 응답 요약 정보를 포함.
   */
  @Get(':id')
  @RequirePermission('READ')
  findById(
    @Query('environmentId') environmentId: string,
    @Param('id') id: string
  ) {
    return this.contactService.findById(environmentId, id);
  }

  /**
   * DELETE /v1/management/contacts/:id?environmentId=xxx
   * 연락처를 삭제한다. MANAGE 권한 필요.
   */
  @Delete(':id')
  @RequirePermission('MANAGE')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Query('environmentId') environmentId: string,
    @Param('id') id: string
  ) {
    return this.contactService.remove(environmentId, id);
  }
}
