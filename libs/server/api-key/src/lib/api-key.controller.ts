import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseFilters,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeySchema } from './dto/create-api-key.dto';
import {
  ZodValidationPipe,
  ApiExceptionFilter,
  ResourceNotFoundException,
} from '@inquiry/server-core';
import type { CreateApiKeyDto } from './dto/create-api-key.dto';

/**
 * API Key 관리 컨트롤러.
 * JWT 인증이 필요한 Admin 엔드포인트.
 * 경로: /api/organizations/:orgId/api-keys
 */
@Controller('organizations/:orgId/api-keys')
@UseGuards(AuthGuard('jwt'))
@UseFilters(new ApiExceptionFilter())
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  /** API 키 생성 */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('orgId') orgId: string,
    @Body(new ZodValidationPipe(CreateApiKeySchema)) dto: CreateApiKeyDto
  ) {
    return this.apiKeyService.create({
      label: dto.label,
      organizationId: orgId,
      environmentPermissions: dto.environmentPermissions,
      expiresAt: dto.expiresAt,
    });
  }

  /** 조직의 API 키 목록 조회 */
  @Get()
  async list(@Param('orgId') orgId: string) {
    return this.apiKeyService.listByOrganization(orgId);
  }

  /** API 키 삭제 */
  @Delete(':apiKeyId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @Param('orgId') orgId: string,
    @Param('apiKeyId') apiKeyId: string
  ) {
    try {
      await this.apiKeyService.revoke(apiKeyId, orgId);
    } catch {
      throw new ResourceNotFoundException('ApiKey', apiKeyId);
    }
  }
}
