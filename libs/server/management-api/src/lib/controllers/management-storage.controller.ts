import {
  Controller,
  Post,
  Query,
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
import { ManagementStorageService } from '../services/management-storage.service';
import {
  UploadManagementFileSchema,
  type UploadManagementFileDto,
} from '../dto/upload-management-file.dto';

/**
 * Management API Storage 컨트롤러.
 * API Key 인증 + 환경별 권한 기반으로 파일 업로드를 처리한다.
 * environmentId는 쿼리 파라미터로 전달한다.
 */
@Controller('storage')
@UseFilters(new ApiExceptionFilter())
@UseGuards(ApiKeyAuthGuard, RequirePermissionGuard, ApiRateLimitGuard)
@ApiRateLimit()
export class ManagementStorageController {
  constructor(private readonly storageService: ManagementStorageService) {}

  /**
   * POST /v1/management/storage?environmentId=xxx
   * base64 인코딩된 파일을 업로드한다.
   */
  @Post()
  @RequirePermission('WRITE')
  @HttpCode(HttpStatus.CREATED)
  upload(
    @Query('environmentId') environmentId: string,
    @Body(new ZodValidationPipe(UploadManagementFileSchema))
    dto: UploadManagementFileDto
  ) {
    return this.storageService.uploadFile(environmentId, dto);
  }
}
