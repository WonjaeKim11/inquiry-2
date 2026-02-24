import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ZodValidationPipe } from '@inquiry/server-core';
import { QuotaService } from './services/quota.service.js';
import { QuotaEvaluationService } from './services/quota-evaluation.service.js';
import { CreateQuotaSchema } from './dto/create-quota.dto.js';
import type { CreateQuotaDto } from './dto/create-quota.dto.js';
import { UpdateQuotaSchema } from './dto/update-quota.dto.js';
import type { UpdateQuotaDto } from './dto/update-quota.dto.js';
import { QuotaFeatureGuard } from './guards/quota-feature.guard.js';

/** JWT에서 추출한 인증된 사용자 정보 */
interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * 쿼터 컨트롤러.
 * 쿼터 CRUD + 평가 API를 제공한다.
 * 모든 엔드포인트는 JWT 인증 + 쿼터 기능 가드가 필수이다.
 */
@Controller()
@UseGuards(AuthGuard('jwt'), QuotaFeatureGuard)
export class QuotaController {
  constructor(
    private readonly quotaService: QuotaService,
    private readonly evaluationService: QuotaEvaluationService
  ) {}

  /**
   * POST /api/surveys/:surveyId/quotas
   * 쿼터를 생성한다.
   */
  @Post('surveys/:surveyId/quotas')
  @UsePipes(new ZodValidationPipe(CreateQuotaSchema))
  @HttpCode(HttpStatus.CREATED)
  createQuota(
    @Param('surveyId') surveyId: string,
    @Body() dto: CreateQuotaDto,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.quotaService.createQuota(user.id, surveyId, dto);
  }

  /**
   * GET /api/surveys/:surveyId/quotas
   * 설문별 쿼터 목록을 조회한다.
   */
  @Get('surveys/:surveyId/quotas')
  listQuotas(@Param('surveyId') surveyId: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.quotaService.listQuotas(user.id, surveyId);
  }

  /**
   * PATCH /api/quotas/:quotaId
   * 쿼터를 수정한다.
   */
  @Patch('quotas/:quotaId')
  @UsePipes(new ZodValidationPipe(UpdateQuotaSchema))
  updateQuota(
    @Param('quotaId') quotaId: string,
    @Body() dto: UpdateQuotaDto,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.quotaService.updateQuota(user.id, quotaId, dto);
  }

  /**
   * DELETE /api/quotas/:quotaId
   * 쿼터를 삭제한다.
   */
  @Delete('quotas/:quotaId')
  deleteQuota(@Param('quotaId') quotaId: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.quotaService.deleteQuota(user.id, quotaId);
  }

  /**
   * POST /api/surveys/:surveyId/evaluate-quotas
   * 쿼터 평가를 수행한다 (디버그/테스트용).
   */
  @Post('surveys/:surveyId/evaluate-quotas')
  @HttpCode(HttpStatus.OK)
  evaluateQuotas(
    @Param('surveyId') surveyId: string,
    @Body()
    body: {
      responseId: string;
      responseData: Record<string, unknown>;
      variableData?: Record<string, string | number>;
      hiddenFieldData?: Record<string, string>;
      isFinished: boolean;
    }
  ) {
    return this.evaluationService.evaluate({
      surveyId,
      responseId: body.responseId,
      responseData: body.responseData,
      variableData: body.variableData,
      hiddenFieldData: body.hiddenFieldData,
      isFinished: body.isFinished,
    });
  }
}
