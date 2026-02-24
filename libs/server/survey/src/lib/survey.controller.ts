import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UsePipes,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ZodValidationPipe } from '@inquiry/server-core';
import { SurveyService } from './services/survey.service.js';
import { SurveyTemplateService } from './services/survey-template.service.js';
import { SurveyValidationService } from './services/survey-validation.service.js';
import { CreateSurveySchema } from './dto/create-survey.dto.js';
import type { CreateSurveyDto } from './dto/create-survey.dto.js';
import { UpdateSurveySchema } from './dto/update-survey.dto.js';
import type { UpdateSurveyDto } from './dto/update-survey.dto.js';
import { SurveyQuerySchema } from './dto/survey-query.dto.js';
import type { SurveyQueryDto } from './dto/survey-query.dto.js';

/** JWT에서 추출한 인증된 사용자 정보 */
interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * 설문 컨트롤러.
 * 설문 CRUD + 상태 전이 + 템플릿 API를 제공한다.
 * 모든 엔드포인트는 JWT 인증이 필수이다.
 */
@Controller()
@UseGuards(AuthGuard('jwt'))
export class SurveyController {
  constructor(
    private readonly surveyService: SurveyService,
    private readonly templateService: SurveyTemplateService,
    private readonly validationService: SurveyValidationService
  ) {}

  /**
   * GET /api/environments/:envId/surveys
   * 환경별 설문 목록을 조회한다. 페이지네이션과 필터링을 지원한다.
   */
  @Get('environments/:envId/surveys')
  listSurveys(
    @Param('envId') envId: string,
    @Query(new ZodValidationPipe(SurveyQuerySchema)) query: SurveyQueryDto,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.surveyService.listSurveys(user.id, envId, query);
  }

  /**
   * POST /api/environments/:envId/surveys
   * 새 설문을 생성한다.
   */
  @Post('environments/:envId/surveys')
  @UsePipes(new ZodValidationPipe(CreateSurveySchema))
  @HttpCode(HttpStatus.CREATED)
  createSurvey(
    @Param('envId') envId: string,
    @Body() dto: CreateSurveyDto,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.surveyService.createSurvey(user.id, envId, dto, req.ip);
  }

  /**
   * POST /api/environments/:envId/surveys/from-template
   * 템플릿 기반으로 설문을 생성한다.
   */
  @Post('environments/:envId/surveys/from-template')
  @HttpCode(HttpStatus.CREATED)
  async createFromTemplate(
    @Param('envId') envId: string,
    @Body() body: { templateId: string; name: string },
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    const template = this.templateService.getTemplateById(body.templateId);
    if (!template) {
      throw new NotFoundException(
        `템플릿을 찾을 수 없습니다: ${body.templateId}`
      );
    }
    return this.surveyService.createFromTemplate(
      user.id,
      envId,
      template,
      body.name,
      req.ip
    );
  }

  /**
   * GET /api/surveys/templates
   * 사용 가능한 설문 템플릿 목록을 반환한다.
   */
  @Get('surveys/templates')
  getTemplates(@Query('category') category?: string) {
    return this.templateService.getTemplates(category);
  }

  /**
   * GET /api/surveys/:surveyId
   * 설문 상세 정보를 조회한다.
   */
  @Get('surveys/:surveyId')
  getSurvey(@Param('surveyId') surveyId: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.surveyService.getSurvey(user.id, surveyId);
  }

  /**
   * PATCH /api/surveys/:surveyId
   * 설문을 부분 업데이트한다 (자동 저장).
   */
  @Patch('surveys/:surveyId')
  @UsePipes(new ZodValidationPipe(UpdateSurveySchema))
  updateSurvey(
    @Param('surveyId') surveyId: string,
    @Body() dto: UpdateSurveyDto,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    return this.surveyService.updateSurvey(user.id, surveyId, dto, req.ip);
  }

  /**
   * DELETE /api/surveys/:surveyId
   * 설문을 삭제한다.
   */
  @Delete('surveys/:surveyId')
  deleteSurvey(@Param('surveyId') surveyId: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.surveyService.deleteSurvey(user.id, surveyId, req.ip);
  }

  /**
   * POST /api/surveys/:surveyId/publish
   * 설문을 발행한다 (DRAFT → IN_PROGRESS).
   */
  @Post('surveys/:surveyId/publish')
  @HttpCode(HttpStatus.OK)
  publishSurvey(@Param('surveyId') surveyId: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.surveyService.publishSurvey(user.id, surveyId, req.ip);
  }

  /**
   * POST /api/surveys/:surveyId/pause
   * 설문을 일시정지한다 (IN_PROGRESS → PAUSED).
   */
  @Post('surveys/:surveyId/pause')
  @HttpCode(HttpStatus.OK)
  pauseSurvey(@Param('surveyId') surveyId: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.surveyService.pauseSurvey(user.id, surveyId, req.ip);
  }

  /**
   * POST /api/surveys/:surveyId/resume
   * 설문을 재개한다 (PAUSED → IN_PROGRESS).
   */
  @Post('surveys/:surveyId/resume')
  @HttpCode(HttpStatus.OK)
  resumeSurvey(@Param('surveyId') surveyId: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.surveyService.resumeSurvey(user.id, surveyId, req.ip);
  }

  /**
   * POST /api/surveys/:surveyId/complete
   * 설문을 완료한다 (IN_PROGRESS → COMPLETED).
   */
  @Post('surveys/:surveyId/complete')
  @HttpCode(HttpStatus.OK)
  completeSurvey(@Param('surveyId') surveyId: string, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    return this.surveyService.completeSurvey(user.id, surveyId, req.ip);
  }

  /**
   * POST /api/surveys/:surveyId/validate-logic
   * 설문의 조건부 로직을 검증한다.
   */
  @Post('surveys/:surveyId/validate-logic')
  @HttpCode(HttpStatus.OK)
  async validateLogic(
    @Param('surveyId') surveyId: string,
    @Req() req: Request
  ) {
    const user = req.user as AuthenticatedUser;
    const survey = await this.surveyService.getSurvey(user.id, surveyId);
    await this.validationService.validateForPublish(survey);
    return { valid: true, message: '로직 검증을 통과했습니다.' };
  }
}
