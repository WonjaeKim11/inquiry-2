import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { AuditLogService } from '@inquiry/server-audit-log';
import {
  validateQuotaName,
  MAX_QUOTAS_PER_SURVEY,
} from '@inquiry/survey-builder-config';
import type { CreateQuotaDto } from '../dto/create-quota.dto.js';
import type { UpdateQuotaDto } from '../dto/update-quota.dto.js';

/** SurveyEnding의 최소 타입 */
interface SurveyEndingItem {
  id: string;
  [key: string]: unknown;
}

/**
 * 쿼터 CRUD 서비스.
 * 이름 중복 검사, endingCardId 유효성 검증, 감사 로그를 포함한다.
 */
@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly auditLogService: AuditLogService
  ) {}

  /**
   * 쿼터를 생성한다.
   * - 설문 접근 권한 검증
   * - 최대 쿼터 수 검사
   * - 이름 중복 검사
   * - endingCardId 유효성 검증 (endSurvey 액션 시)
   *
   * @param userId - 요청자 ID
   * @param surveyId - 대상 설문 ID
   * @param dto - 생성 DTO
   * @returns 생성된 쿼터
   */
  async createQuota(userId: string, surveyId: string, dto: CreateQuotaDto) {
    const survey = await this.validateSurveyAccess(userId, surveyId);

    // 최대 쿼터 수 검사
    const quotaCount = await this.prisma.quota.count({ where: { surveyId } });
    if (quotaCount >= MAX_QUOTAS_PER_SURVEY) {
      throw new BadRequestException(
        `설문당 최대 ${MAX_QUOTAS_PER_SURVEY}개의 쿼터를 설정할 수 있습니다.`
      );
    }

    // 이름 검증
    const nameResult = validateQuotaName(dto.name);
    if (!nameResult.valid) {
      throw new BadRequestException(nameResult.error);
    }

    // 이름 중복 검사
    const existing = await this.prisma.quota.findUnique({
      where: { surveyId_name: { surveyId, name: dto.name.trim() } },
    });
    if (existing) {
      throw new ConflictException('이미 같은 이름의 쿼터가 존재합니다.');
    }

    // endingCardId 유효성 검증
    if (dto.action === 'endSurvey') {
      this.validateEndingCardId(dto.endingCardId ?? null, survey.endings);
    }

    const quota = await this.prisma.quota.create({
      data: {
        surveyId,
        name: dto.name.trim(),
        limit: dto.limit,
        logic: (dto.logic ?? {}) as object,
        action: dto.action,
        endingCardId: dto.endingCardId ?? null,
        countPartialSubmissions: dto.countPartialSubmissions ?? false,
      },
    });

    // 감사 로그
    this.auditLogService.log({
      userId,
      action: 'quota.created',
      entity: 'quota',
      entityId: quota.id,
      metadata: { surveyId, quotaName: dto.name },
    });

    this.logger.log(`Quota created: ${quota.id} for survey ${surveyId}`);
    return quota;
  }

  /**
   * 설문별 쿼터 목록을 조회한다.
   *
   * @param userId - 요청자 ID
   * @param surveyId - 대상 설문 ID
   * @returns 쿼터 목록 (이름순)
   */
  async listQuotas(userId: string, surveyId: string) {
    await this.validateSurveyAccess(userId, surveyId);

    return this.prisma.quota.findMany({
      where: { surveyId },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * 쿼터를 수정한다.
   *
   * @param userId - 요청자 ID
   * @param quotaId - 대상 쿼터 ID
   * @param dto - 수정 DTO
   * @returns 수정된 쿼터
   */
  async updateQuota(userId: string, quotaId: string, dto: UpdateQuotaDto) {
    const quota = await this.findQuotaOrFail(quotaId);
    const survey = await this.validateSurveyAccess(userId, quota.surveyId);

    // 이름 변경 시 검증
    if (dto.name !== undefined) {
      const nameResult = validateQuotaName(dto.name);
      if (!nameResult.valid) {
        throw new BadRequestException(nameResult.error);
      }

      // 이름 중복 검사 (자기 자신 제외)
      const existing = await this.prisma.quota.findUnique({
        where: {
          surveyId_name: { surveyId: quota.surveyId, name: dto.name.trim() },
        },
      });
      if (existing && existing.id !== quotaId) {
        throw new ConflictException('이미 같은 이름의 쿼터가 존재합니다.');
      }
    }

    // endingCardId 유효성 검증
    const effectiveAction = dto.action ?? quota.action;
    const effectiveEndingCardId =
      dto.endingCardId !== undefined ? dto.endingCardId : quota.endingCardId;
    if (effectiveAction === 'endSurvey') {
      this.validateEndingCardId(effectiveEndingCardId, survey.endings);
    }

    const updated = await this.prisma.quota.update({
      where: { id: quotaId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.limit !== undefined && { limit: dto.limit }),
        ...(dto.logic !== undefined && { logic: (dto.logic ?? {}) as object }),
        ...(dto.action !== undefined && { action: dto.action }),
        ...(dto.endingCardId !== undefined && {
          endingCardId: dto.endingCardId,
        }),
        ...(dto.countPartialSubmissions !== undefined && {
          countPartialSubmissions: dto.countPartialSubmissions,
        }),
      },
    });

    // 감사 로그
    this.auditLogService.log({
      userId,
      action: 'quota.updated',
      entity: 'quota',
      entityId: quotaId,
      metadata: { surveyId: quota.surveyId },
    });

    this.logger.log(`Quota updated: ${quotaId}`);
    return updated;
  }

  /**
   * 쿼터를 삭제한다.
   *
   * @param userId - 요청자 ID
   * @param quotaId - 대상 쿼터 ID
   */
  async deleteQuota(userId: string, quotaId: string) {
    const quota = await this.findQuotaOrFail(quotaId);
    await this.validateSurveyAccess(userId, quota.surveyId);

    await this.prisma.quota.delete({ where: { id: quotaId } });

    // 감사 로그
    this.auditLogService.log({
      userId,
      action: 'quota.deleted',
      entity: 'quota',
      entityId: quotaId,
      metadata: { surveyId: quota.surveyId, quotaName: quota.name },
    });

    this.logger.log(`Quota deleted: ${quotaId}`);
    return { success: true };
  }

  /**
   * 쿼터를 ID로 조회한다. 없으면 NotFoundException.
   */
  private async findQuotaOrFail(quotaId: string) {
    const quota = await this.prisma.quota.findUnique({
      where: { id: quotaId },
    });
    if (!quota) {
      throw new NotFoundException('쿼터를 찾을 수 없습니다.');
    }
    return quota;
  }

  /**
   * 설문 접근 권한을 검증한다.
   * userId가 설문의 환경에 접근 가능한지 확인한다.
   */
  private async validateSurveyAccess(userId: string, surveyId: string) {
    const survey = await this.prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        environment: {
          include: {
            project: {
              include: {
                organization: {
                  include: {
                    memberships: {
                      where: { userId },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!survey) {
      throw new NotFoundException('설문을 찾을 수 없습니다.');
    }

    const memberships = survey.environment.project.organization.memberships;
    if (memberships.length === 0) {
      throw new NotFoundException('설문을 찾을 수 없습니다.');
    }

    return survey;
  }

  /**
   * endingCardId가 설문의 endings에 존재하는지 검증한다.
   */
  private validateEndingCardId(
    endingCardId: string | null,
    endings: unknown
  ): void {
    if (!endingCardId) {
      throw new BadRequestException(
        '설문 종료 액션에는 종료 카드가 필요합니다.'
      );
    }

    const endingsList = Array.isArray(endings)
      ? (endings as SurveyEndingItem[])
      : [];
    const exists = endingsList.some((e) => e.id === endingCardId);
    if (!exists) {
      throw new BadRequestException(
        `종료 카드 "${endingCardId}"를 찾을 수 없습니다.`
      );
    }
  }
}
