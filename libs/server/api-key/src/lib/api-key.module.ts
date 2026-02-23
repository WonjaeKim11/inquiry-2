import { Module } from '@nestjs/common';
import { ApiKeyService } from './api-key.service';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyAuthGuard } from './guards/api-key-auth.guard';
import { RequirePermissionGuard } from './guards/require-permission.guard';

/**
 * API Key 모듈.
 * 조직 스코프의 API Key 관리와 인증/인가 기능을 제공한다.
 */
@Module({
  controllers: [ApiKeyController],
  providers: [ApiKeyService, ApiKeyAuthGuard, RequirePermissionGuard],
  exports: [ApiKeyService, ApiKeyAuthGuard, RequirePermissionGuard],
})
export class ApiKeyModule {}
