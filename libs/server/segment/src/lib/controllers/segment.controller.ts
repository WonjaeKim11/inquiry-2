import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  UseFilters,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiExceptionFilter, ZodValidationPipe } from '@inquiry/server-core';
import { LicenseGuard, RequireLicense } from '@inquiry/server-license';
import { SegmentService } from '../services/segment.service.js';
import {
  SegmentAccessGuard,
  SegmentMinRole,
} from '../guards/segment-access.guard.js';
import {
  CreateSegmentSchema,
  type CreateSegmentDto,
} from '../dto/create-segment.dto.js';
import {
  UpdateSegmentSchema,
  type UpdateSegmentDto,
} from '../dto/update-segment.dto.js';
import type { Request } from 'express';

/**
 * 세그먼트 관리 API 컨트롤러.
 * CRUD + 복제 + 필터 초기화를 제공한다.
 */
@Controller('environments/:envId/segments')
@UseFilters(new ApiExceptionFilter())
@UseGuards(AuthGuard('jwt'), LicenseGuard, SegmentAccessGuard)
@RequireLicense('contacts')
export class SegmentController {
  constructor(private readonly segmentService: SegmentService) {}

  /**
   * POST /environments/:envId/segments
   * 세그먼트 생성
   */
  @Post()
  @SegmentMinRole('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('envId') envId: string,
    @Body(new ZodValidationPipe(CreateSegmentSchema)) dto: CreateSegmentDto,
    @Req() req: Request
  ) {
    const user = req.user as { id: string };
    return this.segmentService.create(
      { ...dto, environmentId: envId },
      user.id,
      req.ip
    );
  }

  /**
   * GET /environments/:envId/segments
   * 환경별 세그먼트 목록 조회
   */
  @Get()
  @SegmentMinRole('MEMBER')
  findAll(@Param('envId') envId: string) {
    return this.segmentService.findAll(envId);
  }

  /**
   * GET /environments/:envId/segments/:segmentId
   * 세그먼트 단건 조회
   */
  @Get(':segmentId')
  @SegmentMinRole('MEMBER')
  findById(@Param('segmentId') segmentId: string) {
    return this.segmentService.findById(segmentId);
  }

  /**
   * PUT /environments/:envId/segments/:segmentId
   * 세그먼트 수정
   */
  @Put(':segmentId')
  @SegmentMinRole('ADMIN')
  update(
    @Param('segmentId') segmentId: string,
    @Body(new ZodValidationPipe(UpdateSegmentSchema)) dto: UpdateSegmentDto,
    @Req() req: Request
  ) {
    const user = req.user as { id: string };
    return this.segmentService.update(segmentId, dto, user.id, req.ip);
  }

  /**
   * DELETE /environments/:envId/segments/:segmentId
   * 세그먼트 삭제 (연결된 설문 있으면 차단)
   */
  @Delete(':segmentId')
  @SegmentMinRole('ADMIN')
  @HttpCode(HttpStatus.OK)
  delete(@Param('segmentId') segmentId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.segmentService.delete(segmentId, user.id, req.ip);
  }

  /**
   * POST /environments/:envId/segments/:segmentId/clone
   * 세그먼트 복제
   */
  @Post(':segmentId/clone')
  @SegmentMinRole('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  clone(@Param('segmentId') segmentId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.segmentService.clone(segmentId, user.id, req.ip);
  }

  /**
   * POST /environments/:envId/segments/:segmentId/reset
   * 세그먼트 필터 초기화
   */
  @Post(':segmentId/reset')
  @SegmentMinRole('ADMIN')
  @HttpCode(HttpStatus.OK)
  reset(@Param('segmentId') segmentId: string, @Req() req: Request) {
    const user = req.user as { id: string };
    return this.segmentService.reset(segmentId, user.id, req.ip);
  }
}
