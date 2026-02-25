import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { AuditLogService } from '@inquiry/server-audit-log';
import { SurveyValidationService } from './survey-validation.service.js';
import { SURVEY_STATUS_TRANSITIONS } from '../constants/status-transitions.js';
import type { SurveyStatus } from '@prisma/client';
import type { CreateSurveyDto } from '../dto/create-survey.dto.js';
import type { UpdateSurveyDto } from '../dto/update-survey.dto.js';
import type { SurveyQueryDto } from '../dto/survey-query.dto.js';

/**
 * 설문 CRUD + 상태 전이 서비스.
 * 환경 접근 권한 검증, 상태 전이, 감사 로그를 포함한다.
 */
@Injectable()
export class SurveyService {
  private readonly logger = new Logger(SurveyService.name);

  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly validationService: SurveyValidationService
  ) {}

  /**
   * 환경별 설문 목록을 조회한다.
   * 페이지네이션, 상태/유형 필터링, 응답 수를 포함한다.
   *
   * @param userId - 요청자 사용자 ID
   * @param environmentId - 대상 환경 ID
   * @param query - 페이지네이션 + 필터 쿼리
   */
  async listSurveys(
    userId: string,
    environmentId: string,
    query: SurveyQueryDto
  ) {
    await this.validateEnvironmentAccess(userId, environmentId);

    const { page, limit, status, type } = query;
    const skip = (page - 1) * limit;

    const where = {
      environmentId,
      ...(status && { status }),
      ...(type && { type }),
    };

    const [surveys, total] = await Promise.all([
      this.prisma.survey.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { responses: true } },
        },
      }),
      this.prisma.survey.count({ where }),
    ]);

    return {
      data: surveys,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 새 설문을 생성한다.
   * 기본 상태는 DRAFT이다.
   *
   * @param userId - 생성자 사용자 ID
   * @param environmentId - 대상 환경 ID
   * @param dto - 설문 생성 데이터
   * @param ipAddress - 요청자 IP (감사 로그용)
   */
  async createSurvey(
    userId: string,
    environmentId: string,
    dto: CreateSurveyDto,
    ipAddress?: string
  ) {
    await this.validateEnvironmentAccess(userId, environmentId);

    const survey = await this.prisma.survey.create({
      data: {
        environmentId,
        creatorId: userId,
        name: dto.name,
        ...(dto.type !== undefined && { type: dto.type as any }),
        ...(dto.schema !== undefined && { schema: dto.schema as any }),
        ...(dto.welcomeCard !== undefined && {
          welcomeCard: dto.welcomeCard as any,
        }),
        ...(dto.endings !== undefined && { endings: dto.endings as any }),
        ...(dto.hiddenFields !== undefined && {
          hiddenFields: dto.hiddenFields as any,
        }),
        ...(dto.variables !== undefined && {
          variables: dto.variables as any,
        }),
        ...(dto.followUps !== undefined && {
          followUps: dto.followUps as any,
        }),
        ...(dto.triggers !== undefined && {
          triggers: dto.triggers as any,
        }),
        ...(dto.displayOption !== undefined && {
          displayOption: dto.displayOption as any,
        }),
        ...(dto.displayLimit !== undefined && {
          displayLimit: dto.displayLimit,
        }),
        ...(dto.displayPercentage !== undefined && {
          displayPercentage: dto.displayPercentage,
        }),
        ...(dto.delay !== undefined && { delay: dto.delay }),
        ...(dto.autoClose !== undefined && { autoClose: dto.autoClose }),
        ...(dto.autoComplete !== undefined && {
          autoComplete: dto.autoComplete,
        }),
        ...(dto.recontactDays !== undefined && {
          recontactDays: dto.recontactDays,
        }),
        ...(dto.pin !== undefined && { pin: dto.pin }),
        ...(dto.styling !== undefined && { styling: dto.styling as any }),
        ...(dto.projectOverwrites !== undefined && {
          projectOverwrites: dto.projectOverwrites as any,
        }),
        ...(dto.surveyMetadata !== undefined && {
          surveyMetadata: dto.surveyMetadata as any,
        }),
        ...(dto.languages !== undefined && {
          languages: dto.languages as any,
        }),
        ...(dto.isVerifyEmailEnabled !== undefined && {
          isVerifyEmailEnabled: dto.isVerifyEmailEnabled,
        }),
        ...(dto.isSingleResponsePerEmailEnabled !== undefined && {
          isSingleResponsePerEmailEnabled: dto.isSingleResponsePerEmailEnabled,
        }),
        ...(dto.isBackButtonHidden !== undefined && {
          isBackButtonHidden: dto.isBackButtonHidden,
        }),
        ...(dto.isIpCollectionEnabled !== undefined && {
          isIpCollectionEnabled: dto.isIpCollectionEnabled,
        }),
        // 세그먼트 연결 (설문 대상 필터링)
        ...(dto.segmentId !== undefined && { segmentId: dto.segmentId }),
      },
    });

    // 감사 로그 기록 (fire-and-forget)
    this.auditLogService.logEvent({
      action: 'survey.created',
      userId,
      targetType: 'survey',
      targetId: survey.id,
      ipAddress,
      metadata: { surveyName: survey.name, environmentId },
    });

    this.logger.debug(`설문 생성 완료: ${survey.id} (env: ${environmentId})`);

    return survey;
  }

  /**
   * 템플릿 기반으로 설문을 생성한다.
   *
   * @param userId - 생성자 사용자 ID
   * @param environmentId - 대상 환경 ID
   * @param templateData - 템플릿 데이터 (schema + settings)
   * @param name - 설문 이름
   * @param ipAddress - 요청자 IP
   */
  async createFromTemplate(
    userId: string,
    environmentId: string,
    templateData: {
      schema: Record<string, unknown>;
      settings: {
        type: string;
        welcomeCard: Record<string, unknown>;
        endings: Record<string, unknown>[];
      };
    },
    name: string,
    ipAddress?: string
  ) {
    await this.validateEnvironmentAccess(userId, environmentId);

    const survey = await this.prisma.survey.create({
      data: {
        environmentId,
        creatorId: userId,
        name,
        type: templateData.settings.type as any,
        schema: templateData.schema as any,
        welcomeCard: templateData.settings.welcomeCard as any,
        endings: templateData.settings.endings as any,
      },
    });

    this.auditLogService.logEvent({
      action: 'survey.created',
      userId,
      targetType: 'survey',
      targetId: survey.id,
      ipAddress,
      metadata: {
        surveyName: survey.name,
        environmentId,
        fromTemplate: true,
      },
    });

    this.logger.debug(
      `템플릿 기반 설문 생성 완료: ${survey.id} (env: ${environmentId})`
    );

    return survey;
  }

  /**
   * 설문 상세 정보를 조회한다.
   *
   * @param userId - 요청자 사용자 ID
   * @param surveyId - 설문 ID
   */
  async getSurvey(userId: string, surveyId: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        _count: { select: { responses: true, displays: true } },
      },
    });

    if (!survey) {
      throw new NotFoundException('설문을 찾을 수 없습니다.');
    }

    await this.validateEnvironmentAccess(userId, survey.environmentId);

    return survey;
  }

  /**
   * 설문을 부분 업데이트한다 (자동 저장).
   * 상태 변경은 별도 엔드포인트를 사용한다.
   *
   * @param userId - 요청자 사용자 ID
   * @param surveyId - 설문 ID
   * @param dto - 업데이트할 필드들
   * @param ipAddress - 요청자 IP
   */
  async updateSurvey(
    userId: string,
    surveyId: string,
    dto: UpdateSurveyDto,
    ipAddress?: string
  ) {
    const existing = await this.prisma.survey.findUnique({
      where: { id: surveyId },
    });

    if (!existing) {
      throw new NotFoundException('설문을 찾을 수 없습니다.');
    }

    await this.validateEnvironmentAccess(userId, existing.environmentId);

    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) updateData['name'] = dto.name;
    if (dto.type !== undefined) updateData['type'] = dto.type;
    if (dto.schema !== undefined) updateData['schema'] = dto.schema;
    if (dto.welcomeCard !== undefined)
      updateData['welcomeCard'] = dto.welcomeCard;
    if (dto.endings !== undefined) updateData['endings'] = dto.endings;
    if (dto.hiddenFields !== undefined)
      updateData['hiddenFields'] = dto.hiddenFields;
    if (dto.variables !== undefined) updateData['variables'] = dto.variables;
    if (dto.followUps !== undefined) updateData['followUps'] = dto.followUps;
    if (dto.triggers !== undefined) updateData['triggers'] = dto.triggers;
    if (dto.displayOption !== undefined)
      updateData['displayOption'] = dto.displayOption;
    if (dto.displayLimit !== undefined)
      updateData['displayLimit'] = dto.displayLimit;
    if (dto.displayPercentage !== undefined)
      updateData['displayPercentage'] = dto.displayPercentage;
    if (dto.delay !== undefined) updateData['delay'] = dto.delay;
    if (dto.autoClose !== undefined) updateData['autoClose'] = dto.autoClose;
    if (dto.autoComplete !== undefined)
      updateData['autoComplete'] = dto.autoComplete;
    if (dto.recontactDays !== undefined)
      updateData['recontactDays'] = dto.recontactDays;
    if (dto.pin !== undefined) updateData['pin'] = dto.pin;
    if (dto.styling !== undefined) updateData['styling'] = dto.styling;
    if (dto.projectOverwrites !== undefined)
      updateData['projectOverwrites'] = dto.projectOverwrites;
    if (dto.surveyMetadata !== undefined)
      updateData['surveyMetadata'] = dto.surveyMetadata;
    if (dto.languages !== undefined) updateData['languages'] = dto.languages;
    if (dto.showLanguageSwitch !== undefined)
      updateData['showLanguageSwitch'] = dto.showLanguageSwitch;
    if (dto.isVerifyEmailEnabled !== undefined)
      updateData['isVerifyEmailEnabled'] = dto.isVerifyEmailEnabled;
    if (dto.isSingleResponsePerEmailEnabled !== undefined)
      updateData['isSingleResponsePerEmailEnabled'] =
        dto.isSingleResponsePerEmailEnabled;
    if (dto.isBackButtonHidden !== undefined)
      updateData['isBackButtonHidden'] = dto.isBackButtonHidden;
    if (dto.isIpCollectionEnabled !== undefined)
      updateData['isIpCollectionEnabled'] = dto.isIpCollectionEnabled;
    // 세그먼트 연결/해제 (null이면 세그먼트 해제)
    if (dto.segmentId !== undefined) updateData['segmentId'] = dto.segmentId;

    const updated = await this.prisma.survey.update({
      where: { id: surveyId },
      data: updateData,
    });

    this.auditLogService.logEvent({
      action: 'survey.updated',
      userId,
      targetType: 'survey',
      targetId: surveyId,
      ipAddress,
      metadata: { updatedFields: Object.keys(updateData) },
    });

    this.logger.debug(`설문 수정 완료: ${surveyId}`);

    return updated;
  }

  /**
   * 설문을 삭제한다.
   *
   * @param userId - 요청자 사용자 ID
   * @param surveyId - 설문 ID
   * @param ipAddress - 요청자 IP
   */
  async deleteSurvey(
    userId: string,
    surveyId: string,
    ipAddress?: string
  ): Promise<{ id: string }> {
    const existing = await this.prisma.survey.findUnique({
      where: { id: surveyId },
    });

    if (!existing) {
      throw new NotFoundException('설문을 찾을 수 없습니다.');
    }

    await this.validateEnvironmentAccess(userId, existing.environmentId);

    await this.prisma.survey.delete({ where: { id: surveyId } });

    this.auditLogService.logEvent({
      action: 'survey.deleted',
      userId,
      targetType: 'survey',
      targetId: surveyId,
      ipAddress,
      metadata: { surveyName: existing.name },
    });

    this.logger.debug(`설문 삭제 완료: ${surveyId}`);

    return { id: surveyId };
  }

  /**
   * 설문을 발행한다 (DRAFT → IN_PROGRESS).
   * 발행 전 스키마 + 비즈니스 규칙 검증을 수행한다.
   *
   * @param userId - 요청자 사용자 ID
   * @param surveyId - 설문 ID
   * @param ipAddress - 요청자 IP
   */
  async publishSurvey(userId: string, surveyId: string, ipAddress?: string) {
    const survey = await this.findSurveyOrThrow(surveyId);
    await this.validateEnvironmentAccess(userId, survey.environmentId);
    this.validateTransition(survey.status, 'IN_PROGRESS');

    // 발행 전 검증
    await this.validationService.validateForPublish(survey);

    const updated = await this.prisma.survey.update({
      where: { id: surveyId },
      data: { status: 'IN_PROGRESS' },
    });

    this.auditLogService.logEvent({
      action: 'survey.published',
      userId,
      targetType: 'survey',
      targetId: surveyId,
      ipAddress,
      metadata: { surveyName: survey.name },
    });

    this.logger.debug(`설문 발행 완료: ${surveyId}`);

    return updated;
  }

  /**
   * 설문을 일시정지한다 (IN_PROGRESS → PAUSED).
   */
  async pauseSurvey(userId: string, surveyId: string, ipAddress?: string) {
    const survey = await this.findSurveyOrThrow(surveyId);
    await this.validateEnvironmentAccess(userId, survey.environmentId);
    this.validateTransition(survey.status, 'PAUSED');

    const updated = await this.prisma.survey.update({
      where: { id: surveyId },
      data: { status: 'PAUSED' },
    });

    this.auditLogService.logEvent({
      action: 'survey.paused',
      userId,
      targetType: 'survey',
      targetId: surveyId,
      ipAddress,
    });

    return updated;
  }

  /**
   * 설문을 재개한다 (PAUSED → IN_PROGRESS).
   */
  async resumeSurvey(userId: string, surveyId: string, ipAddress?: string) {
    const survey = await this.findSurveyOrThrow(surveyId);
    await this.validateEnvironmentAccess(userId, survey.environmentId);
    this.validateTransition(survey.status, 'IN_PROGRESS');

    const updated = await this.prisma.survey.update({
      where: { id: surveyId },
      data: { status: 'IN_PROGRESS' },
    });

    this.auditLogService.logEvent({
      action: 'survey.resumed',
      userId,
      targetType: 'survey',
      targetId: surveyId,
      ipAddress,
    });

    return updated;
  }

  /**
   * 설문을 완료한다 (IN_PROGRESS → COMPLETED).
   */
  async completeSurvey(userId: string, surveyId: string, ipAddress?: string) {
    const survey = await this.findSurveyOrThrow(surveyId);
    await this.validateEnvironmentAccess(userId, survey.environmentId);
    this.validateTransition(survey.status, 'COMPLETED');

    const updated = await this.prisma.survey.update({
      where: { id: surveyId },
      data: { status: 'COMPLETED' },
    });

    this.auditLogService.logEvent({
      action: 'survey.completed',
      userId,
      targetType: 'survey',
      targetId: surveyId,
      ipAddress,
    });

    return updated;
  }

  /**
   * 설문을 ID로 조회하거나 NotFoundException을 던진다.
   */
  private async findSurveyOrThrow(surveyId: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
    });

    if (!survey) {
      throw new NotFoundException('설문을 찾을 수 없습니다.');
    }

    return survey;
  }

  /**
   * 상태 전이가 허용되는지 검증한다.
   * @throws BadRequestException - 허용되지 않는 전이일 때
   */
  private validateTransition(
    currentStatus: SurveyStatus,
    targetStatus: SurveyStatus
  ): void {
    const allowed = SURVEY_STATUS_TRANSITIONS[currentStatus];
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `"${currentStatus}" 상태에서 "${targetStatus}"로의 전이는 허용되지 않습니다.`
      );
    }
  }

  /**
   * 사용자가 해당 환경에 접근할 권한이 있는지 검증한다.
   * environment → project → organization → membership 조인으로 확인한다.
   * @throws ForbiddenException - 접근 권한이 없을 때
   * @throws NotFoundException - 환경이 존재하지 않을 때
   */
  private async validateEnvironmentAccess(
    userId: string,
    environmentId: string
  ): Promise<void> {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      select: {
        project: {
          select: {
            organizationId: true,
          },
        },
      },
    });

    if (!environment) {
      throw new NotFoundException('환경을 찾을 수 없습니다.');
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: environment.project.organizationId,
        },
      },
      select: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException('이 환경에 대한 접근 권한이 없습니다.');
    }
  }
}
