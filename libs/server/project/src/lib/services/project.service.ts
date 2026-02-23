import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { AuditLogService } from '@inquiry/server-audit-log';
import type { CreateProjectDto } from '../dto/create-project.dto.js';
import type { UpdateProjectDto } from '../dto/update-project.dto.js';

/**
 * 프로젝트 서비스.
 * 프로젝트 CRUD 비즈니스 로직을 담당한다.
 * 프로젝트 생성 시 production/development 2개 Environment를 트랜잭션으로 자동 생성한다.
 */
@Injectable()
export class ProjectService {
  private readonly logger = new Logger(ProjectService.name);

  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService
  ) {}

  /**
   * 새 프로젝트를 생성한다.
   * 트랜잭션으로 Project + production/development Environment 2개를 동시에 생성한다.
   * 조직 멤버십 검증 후 OWNER 또는 ADMIN 역할을 확인한다.
   *
   * @param userId - 생성자 사용자 ID
   * @param dto - 프로젝트 생성 데이터
   * @param ipAddress - 요청자 IP (감사 로그용)
   */
  async createProject(
    userId: string,
    dto: CreateProjectDto,
    ipAddress?: string
  ) {
    // 조직 멤버십 및 역할 확인 (OWNER 또는 ADMIN만 가능)
    await this.validateOrgRole(userId, dto.organizationId, ['OWNER', 'ADMIN']);

    // 동일 조직 내 프로젝트 이름 중복 검사
    const existing = await this.prisma.project.findUnique({
      where: {
        organizationId_name: {
          organizationId: dto.organizationId,
          name: dto.name,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('동일한 이름의 프로젝트가 이미 존재합니다.');
    }

    // 트랜잭션: 프로젝트 + 2개 환경 생성
    const project = await this.prisma.$transaction(async (tx) => {
      const newProject = await tx.project.create({
        data: {
          name: dto.name,
          organizationId: dto.organizationId,
          ...(dto.recontactDays !== undefined && {
            recontactDays: dto.recontactDays,
          }),
          ...(dto.placement !== undefined && { placement: dto.placement }),
          ...(dto.mode !== undefined && { mode: dto.mode }),
          ...(dto.inAppSurveyBranding !== undefined && {
            inAppSurveyBranding: dto.inAppSurveyBranding,
          }),
          ...(dto.linkSurveyBranding !== undefined && {
            linkSurveyBranding: dto.linkSurveyBranding,
          }),
          ...(dto.clickOutsideClose !== undefined && {
            clickOutsideClose: dto.clickOutsideClose,
          }),
          ...(dto.darkOverlay !== undefined && {
            darkOverlay: dto.darkOverlay,
          }),
          environments: {
            createMany: {
              data: [{ type: 'production' }, { type: 'development' }],
            },
          },
        },
        include: {
          environments: true,
        },
      });

      return newProject;
    });

    // 감사 로그 기록 (fire-and-forget)
    this.auditLogService.logEvent({
      action: 'project.created',
      userId,
      targetType: 'project',
      targetId: project.id,
      organizationId: dto.organizationId,
      ipAddress,
      metadata: { projectName: project.name },
    });

    this.logger.debug(
      `프로젝트 생성 완료: ${project.id} (org: ${dto.organizationId})`
    );

    return project;
  }

  /**
   * 조직에 속한 프로젝트 목록을 조회한다.
   * 조직 멤버만 조회 가능하다.
   *
   * @param userId - 요청자 사용자 ID
   * @param organizationId - 조직 ID
   */
  async getProjectsByOrganization(userId: string, organizationId: string) {
    // 조직 멤버십 확인
    await this.validateOrgMembership(userId, organizationId);

    return this.prisma.project.findMany({
      where: { organizationId },
      include: {
        environments: {
          select: { id: true, type: true, appSetupCompleted: true },
        },
        _count: { select: { languages: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 단일 프로젝트를 ID로 조회한다.
   * 조직 멤버만 조회 가능하다.
   *
   * @param userId - 요청자 사용자 ID
   * @param projectId - 프로젝트 ID
   */
  async getProject(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        environments: true,
        languages: true,
      },
    });

    if (!project) {
      throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
    }

    // 조직 멤버십 확인
    await this.validateOrgMembership(userId, project.organizationId);

    return project;
  }

  /**
   * 프로젝트 정보를 부분 업데이트한다.
   * OWNER 또는 ADMIN만 수정 가능하다.
   * customHeadScript는 IS_SELF_HOSTED 환경변수가 활성화된 경우에만 변경 가능하다.
   *
   * @param userId - 요청자 사용자 ID
   * @param projectId - 프로젝트 ID
   * @param dto - 업데이트할 데이터 (부분 업데이트)
   * @param ipAddress - 요청자 IP (감사 로그용)
   */
  async updateProject(
    userId: string,
    projectId: string,
    dto: UpdateProjectDto,
    ipAddress?: string
  ) {
    const existing = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existing) {
      throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
    }

    // OWNER 또는 ADMIN만 수정 가능
    await this.validateOrgRole(userId, existing.organizationId, [
      'OWNER',
      'ADMIN',
    ]);

    // customHeadScript는 Self-hosted 환경에서만 변경 가능
    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) updateData['name'] = dto.name;
    if (dto.recontactDays !== undefined)
      updateData['recontactDays'] = dto.recontactDays;
    if (dto.placement !== undefined) updateData['placement'] = dto.placement;
    if (dto.mode !== undefined) updateData['mode'] = dto.mode;
    if (dto.inAppSurveyBranding !== undefined)
      updateData['inAppSurveyBranding'] = dto.inAppSurveyBranding;
    if (dto.linkSurveyBranding !== undefined)
      updateData['linkSurveyBranding'] = dto.linkSurveyBranding;
    if (dto.clickOutsideClose !== undefined)
      updateData['clickOutsideClose'] = dto.clickOutsideClose;
    if (dto.darkOverlay !== undefined)
      updateData['darkOverlay'] = dto.darkOverlay;
    if (dto.styling !== undefined) updateData['styling'] = dto.styling;
    if (dto.logo !== undefined) updateData['logo'] = dto.logo;
    if (dto.config !== undefined) updateData['config'] = dto.config;

    // customHeadScript: Self-hosted 환경에서만 허용
    if (dto.customHeadScript !== undefined) {
      const isSelfHosted =
        this.configService.get<string>('IS_SELF_HOSTED', 'false') === 'true';
      if (isSelfHosted) {
        updateData['customHeadScript'] = dto.customHeadScript;
      }
    }

    // 이름 변경 시 중복 검사
    if (dto.name !== undefined && dto.name !== existing.name) {
      const duplicate = await this.prisma.project.findUnique({
        where: {
          organizationId_name: {
            organizationId: existing.organizationId,
            name: dto.name,
          },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictException(
          '동일한 이름의 프로젝트가 이미 존재합니다.'
        );
      }
    }

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        environments: true,
        languages: true,
      },
    });

    // 감사 로그 기록 (fire-and-forget)
    this.auditLogService.logEvent({
      action: 'project.updated',
      userId,
      targetType: 'project',
      targetId: projectId,
      organizationId: existing.organizationId,
      ipAddress,
      changes: {
        before: this.extractChangedFields(
          existing as unknown as Record<string, unknown>,
          updateData
        ),
        after: this.extractChangedFields(
          updated as unknown as Record<string, unknown>,
          updateData
        ),
      },
    });

    this.logger.debug(`프로젝트 수정 완료: ${projectId}`);

    return updated;
  }

  /**
   * 프로젝트를 삭제한다.
   * OWNER만 삭제 가능하다.
   * Prisma onDelete: Cascade로 하위 Environment, ActionClass, Language가 함께 삭제된다.
   *
   * @param userId - 요청자 사용자 ID
   * @param projectId - 프로젝트 ID
   * @param ipAddress - 요청자 IP (감사 로그용)
   */
  async deleteProject(
    userId: string,
    projectId: string,
    ipAddress?: string
  ): Promise<{ id: string }> {
    const existing = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existing) {
      throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
    }

    // OWNER만 삭제 가능
    await this.validateOrgRole(userId, existing.organizationId, ['OWNER']);

    await this.prisma.project.delete({
      where: { id: projectId },
    });

    // 감사 로그 기록 (fire-and-forget)
    this.auditLogService.logEvent({
      action: 'project.deleted',
      userId,
      targetType: 'project',
      targetId: projectId,
      organizationId: existing.organizationId,
      ipAddress,
      metadata: { projectName: existing.name },
    });

    this.logger.debug(`프로젝트 삭제 완료: ${projectId}`);

    return { id: projectId };
  }

  /**
   * 프로젝트 ID로 소속 조직 ID를 반환한다.
   * 다른 서비스에서 조직 권한 확인 시 사용된다.
   *
   * @param projectId - 프로젝트 ID
   */
  async getOrganizationIdByProject(projectId: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });

    if (!project) {
      throw new NotFoundException('프로젝트를 찾을 수 없습니다.');
    }

    return project.organizationId;
  }

  /**
   * 사용자가 해당 조직의 멤버인지 확인한다.
   * 멤버가 아니면 ForbiddenException을 던진다.
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

  /**
   * 사용자가 해당 조직에서 요구되는 역할을 가지고 있는지 확인한다.
   * 역할 계층: OWNER(40) > ADMIN(30) > BILLING(20) > MEMBER(10)
   */
  private async validateOrgRole(
    userId: string,
    organizationId: string,
    requiredRoles: string[]
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

    const ROLE_HIERARCHY: Record<string, number> = {
      OWNER: 40,
      ADMIN: 30,
      BILLING: 20,
      MEMBER: 10,
    };

    const userLevel = ROLE_HIERARCHY[membership.role] ?? 0;
    const hasRole = requiredRoles.some(
      (role) => userLevel >= (ROLE_HIERARCHY[role] ?? 0)
    );

    if (!hasRole) {
      throw new ForbiddenException('이 작업에 대한 권한이 부족합니다.');
    }
  }

  /**
   * 변경된 필드만 추출하여 감사 로그용 diff 객체를 생성한다.
   */
  private extractChangedFields(
    entity: Record<string, unknown>,
    updateData: Record<string, unknown>
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(updateData)) {
      result[key] = entity[key];
    }
    return result;
  }
}
