import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { AuditLogService } from '@inquiry/server-audit-log';
import type { CreateLanguageDto } from '../dto/create-language.dto.js';
import type { UpdateLanguageDto } from '../dto/update-language.dto.js';

/**
 * 언어 서비스.
 * 프로젝트의 다국어 설정 CRUD 비즈니스 로직을 담당한다.
 */
@Injectable()
export class LanguageService {
  private readonly logger = new Logger(LanguageService.name);

  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly auditLogService: AuditLogService
  ) {}

  /**
   * 프로젝트에 새 언어를 등록한다.
   * (projectId, code) 고유성 검증을 수행한다.
   *
   * @param userId - 요청자 사용자 ID
   * @param projectId - 프로젝트 ID
   * @param dto - 언어 생성 데이터
   * @param ipAddress - 요청자 IP (감사 로그용)
   */
  async createLanguage(
    userId: string,
    projectId: string,
    dto: CreateLanguageDto,
    ipAddress?: string
  ) {
    // 프로젝트 존재 확인 및 조직 멤버십 검증
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });

    if (!project) {
      throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
    }

    await this.validateOrgMembership(userId, project.organizationId);

    // 동일 프로젝트 내 언어 코드 중복 검사
    const existing = await this.prisma.language.findUnique({
      where: {
        projectId_code: {
          projectId,
          code: dto.code,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('동일한 언어 코드가 이미 등록되어 있습니다.');
    }

    const language = await this.prisma.language.create({
      data: {
        code: dto.code,
        alias: dto.alias,
        projectId,
      },
    });

    // 감사 로그 기록 (fire-and-forget)
    this.auditLogService.logEvent({
      action: 'language.created',
      userId,
      targetType: 'language',
      targetId: language.id,
      organizationId: project.organizationId,
      ipAddress,
      metadata: {
        languageCode: language.code,
        alias: language.alias,
        projectId,
      },
    });

    this.logger.debug(
      `언어 등록 완료: ${language.code} (project: ${projectId})`
    );

    return language;
  }

  /**
   * 프로젝트에 등록된 언어 목록을 조회한다.
   *
   * @param userId - 요청자 사용자 ID
   * @param projectId - 프로젝트 ID
   */
  async getLanguagesByProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });

    if (!project) {
      throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
    }

    await this.validateOrgMembership(userId, project.organizationId);

    return this.prisma.language.findMany({
      where: { projectId },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * 언어 정보를 부분 업데이트한다.
   *
   * @param userId - 요청자 사용자 ID
   * @param languageId - 언어 ID
   * @param dto - 업데이트할 데이터
   * @param ipAddress - 요청자 IP (감사 로그용)
   */
  async updateLanguage(
    userId: string,
    languageId: string,
    dto: UpdateLanguageDto,
    ipAddress?: string
  ) {
    const existing = await this.prisma.language.findUnique({
      where: { id: languageId },
      include: {
        project: { select: { organizationId: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('언어를 찾을 수 없습니다.');
    }

    await this.validateOrgMembership(userId, existing.project.organizationId);

    // 코드 변경 시 중복 검사
    if (dto.code !== undefined && dto.code !== existing.code) {
      const duplicate = await this.prisma.language.findUnique({
        where: {
          projectId_code: {
            projectId: existing.projectId,
            code: dto.code,
          },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictException(
          '동일한 언어 코드가 이미 등록되어 있습니다.'
        );
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.code !== undefined) updateData['code'] = dto.code;
    if (dto.alias !== undefined) updateData['alias'] = dto.alias;

    const updated = await this.prisma.language.update({
      where: { id: languageId },
      data: updateData,
    });

    this.logger.debug(`언어 수정 완료: ${languageId}`);

    return updated;
  }

  /**
   * 언어를 삭제한다.
   *
   * @param userId - 요청자 사용자 ID
   * @param languageId - 언어 ID
   * @param ipAddress - 요청자 IP (감사 로그용)
   */
  async deleteLanguage(
    userId: string,
    languageId: string,
    ipAddress?: string
  ): Promise<{ id: string }> {
    const existing = await this.prisma.language.findUnique({
      where: { id: languageId },
      include: {
        project: { select: { organizationId: true } },
      },
    });

    if (!existing) {
      throw new NotFoundException('언어를 찾을 수 없습니다.');
    }

    await this.validateOrgMembership(userId, existing.project.organizationId);

    await this.prisma.language.delete({
      where: { id: languageId },
    });

    // Survey.languages 연쇄 정리: 삭제된 Language를 참조하는 SurveyLanguage 항목 제거
    const surveys = await this.prisma.survey.findMany({
      where: { projectId: existing.projectId },
      select: { id: true, languages: true },
    });

    for (const survey of surveys) {
      const langs = (survey.languages ?? []) as Array<{
        languageId: string;
        default: boolean;
        enabled: boolean;
      }>;
      if (!Array.isArray(langs) || langs.length === 0) continue;

      const filtered = langs.filter((l) => l.languageId !== languageId);
      if (filtered.length !== langs.length) {
        await this.prisma.survey.update({
          where: { id: survey.id },
          data: { languages: filtered as any },
        });
        this.logger.debug(
          `설문 ${survey.id}에서 삭제된 언어(${languageId}) 참조 제거 완료`
        );
      }
    }

    // 감사 로그 기록 (fire-and-forget)
    this.auditLogService.logEvent({
      action: 'language.deleted',
      userId,
      targetType: 'language',
      targetId: languageId,
      organizationId: existing.project.organizationId,
      ipAddress,
      metadata: {
        languageCode: existing.code,
        projectId: existing.projectId,
      },
    });

    this.logger.debug(`언어 삭제 완료: ${languageId}`);

    return { id: languageId };
  }

  /**
   * 사용자가 해당 조직의 멤버인지 확인한다.
   */
  private async validateOrgMembership(
    userId: string,
    organizationId: string
  ): Promise<void> {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId, organizationId },
      },
      select: { role: true },
    });

    if (!membership) {
      throw new ForbiddenException('이 조직의 멤버가 아닙니다.');
    }
  }
}
