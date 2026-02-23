import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  UseFilters,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiExceptionFilter, ZodValidationPipe } from '@inquiry/server-core';
import { ApiRateLimitGuard, ApiRateLimit } from '@inquiry/server-rate-limit';
import { EnvironmentIdGuard } from '../guards/environment-id.guard';
import { ClientStorageService } from '../services/client-storage.service';
import { UploadFileSchema, type UploadFileDto } from '../dto/upload-file.dto';

/**
 * 파일 업로드 API.
 * 클라이언트에서 설문 응답에 첨부할 파일을 업로드한다.
 */
@Controller(':environmentId/storage')
@UseFilters(new ApiExceptionFilter())
@UseGuards(EnvironmentIdGuard, ApiRateLimitGuard)
@ApiRateLimit()
export class ClientStorageController {
  constructor(private readonly storageService: ClientStorageService) {}

  /** POST /v1/client/:environmentId/storage — 파일 업로드 */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @Param('environmentId') environmentId: string,
    @Body(new ZodValidationPipe(UploadFileSchema)) dto: UploadFileDto
  ) {
    return this.storageService.uploadFile(environmentId, dto);
  }
}
