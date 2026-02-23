import {
  Controller,
  Get,
  Post,
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
import { ManagementSurveyService } from '../services/management-survey.service';
import {
  CreateSurveySchema,
  type CreateSurveyDto,
} from '../dto/create-survey.dto';
import {
  UpdateSurveySchema,
  type UpdateSurveyDto,
} from '../dto/update-survey.dto';

/**
 * Management API Survey CRUD 컨트롤러.
 * API Key 인증 + 환경별 권한 기반으로 설문 조사를 관리한다.
 * environmentId는 쿼리 파라미터로 전달한다.
 */
@Controller('surveys')
@UseFilters(new ApiExceptionFilter())
@UseGuards(ApiKeyAuthGuard, RequirePermissionGuard, ApiRateLimitGuard)
@ApiRateLimit()
export class ManagementSurveyController {
  constructor(private readonly surveyService: ManagementSurveyService) {}

  /**
   * GET /v1/management/surveys?environmentId=xxx
   * 환경별 설문 목록을 조회한다.
   */
  @Get()
  @RequirePermission('READ')
  list(@Query('environmentId') environmentId: string) {
    return this.surveyService.list(environmentId);
  }

  /**
   * POST /v1/management/surveys?environmentId=xxx
   * 새 설문을 생성한다.
   */
  @Post()
  @RequirePermission('WRITE')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Query('environmentId') environmentId: string,
    @Body(new ZodValidationPipe(CreateSurveySchema)) dto: CreateSurveyDto
  ) {
    return this.surveyService.create(environmentId, dto);
  }

  /**
   * GET /v1/management/surveys/:id?environmentId=xxx
   * 설문 단건을 조회한다. 응답/노출 ID 목록을 포함.
   */
  @Get(':id')
  @RequirePermission('READ')
  findById(
    @Query('environmentId') environmentId: string,
    @Param('id') id: string
  ) {
    return this.surveyService.findById(environmentId, id);
  }

  /**
   * PUT /v1/management/surveys/:id?environmentId=xxx
   * 설문을 수정한다. 전달된 필드만 업데이트.
   */
  @Put(':id')
  @RequirePermission('WRITE')
  update(
    @Query('environmentId') environmentId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateSurveySchema)) dto: UpdateSurveyDto
  ) {
    return this.surveyService.update(environmentId, id, dto);
  }

  /**
   * DELETE /v1/management/surveys/:id?environmentId=xxx
   * 설문을 삭제한다. MANAGE 권한 필요.
   */
  @Delete(':id')
  @RequirePermission('MANAGE')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Query('environmentId') environmentId: string,
    @Param('id') id: string
  ) {
    return this.surveyService.remove(environmentId, id);
  }
}
