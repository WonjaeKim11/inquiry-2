import { Module } from '@nestjs/common';
import { SegmentController } from './controllers/segment.controller.js';
import { SegmentService } from './services/segment.service.js';
import { FilterQueryService } from './services/filter-query.service.js';
import { FilterTreeValidator } from './validators/filter-tree.validator.js';
import { SegmentAccessGuard } from './guards/segment-access.guard.js';

/**
 * 세그먼트 관리 모듈.
 * 세그먼트 CRUD, 복제, 필터 검증/쿼리 변환 기능을 제공한다.
 * ServerPrismaModule, AuditLogModule, LicenseModule은 @Global()이므로 별도 import 불필요.
 */
@Module({
  controllers: [SegmentController],
  providers: [
    SegmentService,
    FilterQueryService,
    FilterTreeValidator,
    SegmentAccessGuard,
  ],
  exports: [SegmentService, FilterQueryService, FilterTreeValidator],
})
export class SegmentModule {}
