import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { AuditLogService } from '@inquiry/server-audit-log';
import type { CreateActionClassDto } from '../dto/create-action-class.dto.js';
import type { UpdateActionClassDto } from '../dto/update-action-class.dto.js';

/**
 * ActionClass 서비스.
 * 사용자 행동 클래스의 CRUD 비즈니스 로직을 담당한다.
 * code 타입은 key 기반, noCode 타입은 noCodeConfig 기반으로 동작한다.
 */
@Injectable()
export class ActionClassService {
  private readonly logger = new Logger(ActionClassService.name);

  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly auditLogService: AuditLogService
  ) {}

  /**
   * 새 ActionClass를 생성한다.
   * code 타입: key 필수, (key, environmentId) 고유성 검증
   * noCode 타입: noCodeConfig 필수
   *
   * @param userId - 생성자 사용자 ID
   * @param environmentId - 환경 ID
   * @param dto - ActionClass 생성 데이터
   * @param ipAddress - 요청자 IP (감사 로그용)
   */
  async createActionClass(
    userId: string,
    environmentId: string,
    dto: CreateActionClassDto,
    ipAddress?: string
  ) {
    // 환경 존재 확인 및 조직 멤버십 검증
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      include: {
        project: { select: { organizationId: true } },
      },
    });

    if (!environment) {
      throw new NotFoundException('환경을 찾을 수 없습니다.');
    }

    await this.validateOrgMembership(
      userId,
      environment.project.organizationId
    );

    // 이름 고유성 검사
    const existingByName = await this.prisma.actionClass.findUnique({
      where: {
        name_environmentId: {
          name: dto.name,
          environmentId,
        },
      },
      select: { id: true },
    });

    if (existingByName) {
      throw new ConflictException(
        '동일한 이름의 액션 클래스가 이미 존재합니다.'
      );
    }

    // code 타입: key 고유성 검사
    if (dto.type === 'code' && dto.key) {
      const existingByKey = await this.prisma.actionClass.findUnique({
        where: {
          key_environmentId: {
            key: dto.key,
            environmentId,
          },
        },
        select: { id: true },
      });

      if (existingByKey) {
        throw new ConflictException(
          '동일한 key의 액션 클래스가 이미 존재합니다.'
        );
      }
    }

    const actionClass = await this.prisma.actionClass.create({
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description,
        key: dto.type === 'code' ? dto.key : null,
        noCodeConfig:
          dto.type === 'noCode'
            ? (dto.noCodeConfig as Record<string, unknown>)
            : null,
        environmentId,
      },
    });

    // 감사 로그 기록 (fire-and-forget)
    this.auditLogService.logEvent({
      action: 'actionClass.created',
      userId,
      targetType: 'actionClass',
      targetId: actionClass.id,
      organizationId: environment.project.organizationId,
      ipAddress,
      metadata: {
        actionClassName: actionClass.name,
        type: actionClass.type,
        environmentId,
      },
    });

    this.logger.debug(
      `ActionClass 생성 완료: ${actionClass.id} (env: ${environmentId})`
    );

    return actionClass;
  }

  /**
   * 환경에 속한 ActionClass 목록을 조회한다.
   *
   * @param userId - 요청자 사용자 ID
   * @param environmentId - 환경 ID
   */
  async getActionClassesByEnvironment(userId: string, environmentId: string) {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      include: {
        project: { select: { organizationId: true } },
      },
    });

    if (!environment) {
      throw new NotFoundException('환경을 찾을 수 없습니다.');
    }

    await this.validateOrgMembership(
      userId,
      environment.project.organizationId
    );

    return this.prisma.actionClass.findMany({
      where: { environmentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 단일 ActionClass를 ID로 조회한다.
   *
   * @param userId - 요청자 사용자 ID
   * @param actionClassId - ActionClass ID
   */
  async getActionClass(userId: string, actionClassId: string) {
    const actionClass = await this.prisma.actionClass.findUnique({
      where: { id: actionClassId },
      include: {
        environment: {
          include: {
            project: { select: { organizationId: true } },
          },
        },
      },
    });

    if (!actionClass) {
      throw new NotFoundException('액션 클래스를 찾을 수 없습니다.');
    }

    await this.validateOrgMembership(
      userId,
      actionClass.environment.project.organizationId
    );

    return actionClass;
  }

  /**
   * ActionClass 정보를 부분 업데이트한다.
   * type은 변경할 수 없다.
   *
   * @param userId - 요청자 사용자 ID
   * @param actionClassId - ActionClass ID
   * @param dto - 업데이트할 데이터
   * @param ipAddress - 요청자 IP (감사 로그용)
   */
  async updateActionClass(
    userId: string,
    actionClassId: string,
    dto: UpdateActionClassDto,
    ipAddress?: string
  ) {
    const existing = await this.prisma.actionClass.findUnique({
      where: { id: actionClassId },
      include: {
        environment: {
          include: {
            project: { select: { organizationId: true } },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('액션 클래스를 찾을 수 없습니다.');
    }

    await this.validateOrgMembership(
      userId,
      existing.environment.project.organizationId
    );

    // 이름 변경 시 고유성 검사
    if (dto.name !== undefined && dto.name !== existing.name) {
      const duplicate = await this.prisma.actionClass.findUnique({
        where: {
          name_environmentId: {
            name: dto.name,
            environmentId: existing.environmentId,
          },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictException(
          '동일한 이름의 액션 클래스가 이미 존재합니다.'
        );
      }
    }

    // key 변경 시 고유성 검사 (code 타입만)
    if (dto.key !== undefined && dto.key !== existing.key) {
      if (existing.type !== 'code') {
        throw new BadRequestException(
          'key는 code 타입의 액션 클래스에서만 변경할 수 있습니다.'
        );
      }

      const duplicate = await this.prisma.actionClass.findUnique({
        where: {
          key_environmentId: {
            key: dto.key,
            environmentId: existing.environmentId,
          },
        },
        select: { id: true },
      });

      if (duplicate) {
        throw new ConflictException(
          '동일한 key의 액션 클래스가 이미 존재합니다.'
        );
      }
    }

    // noCodeConfig 변경 시 타입 검증
    if (dto.noCodeConfig !== undefined && existing.type !== 'noCode') {
      throw new BadRequestException(
        'noCodeConfig는 noCode 타입의 액션 클래스에서만 변경할 수 있습니다.'
      );
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData['name'] = dto.name;
    if (dto.key !== undefined) updateData['key'] = dto.key;
    if (dto.description !== undefined)
      updateData['description'] = dto.description;
    if (dto.noCodeConfig !== undefined)
      updateData['noCodeConfig'] = dto.noCodeConfig as Record<string, unknown>;

    const updated = await this.prisma.actionClass.update({
      where: { id: actionClassId },
      data: updateData,
    });

    this.logger.debug(`ActionClass 수정 완료: ${actionClassId}`);

    return updated;
  }

  /**
   * ActionClass를 삭제한다.
   *
   * @param userId - 요청자 사용자 ID
   * @param actionClassId - ActionClass ID
   * @param ipAddress - 요청자 IP (감사 로그용)
   */
  async deleteActionClass(
    userId: string,
    actionClassId: string,
    ipAddress?: string
  ): Promise<{ id: string }> {
    const existing = await this.prisma.actionClass.findUnique({
      where: { id: actionClassId },
      include: {
        environment: {
          include: {
            project: { select: { organizationId: true } },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('액션 클래스를 찾을 수 없습니다.');
    }

    await this.validateOrgMembership(
      userId,
      existing.environment.project.organizationId
    );

    await this.prisma.actionClass.delete({
      where: { id: actionClassId },
    });

    // 감사 로그 기록 (fire-and-forget)
    this.auditLogService.logEvent({
      action: 'actionClass.deleted',
      userId,
      targetType: 'actionClass',
      targetId: actionClassId,
      organizationId: existing.environment.project.organizationId,
      ipAddress,
      metadata: {
        actionClassName: existing.name,
        type: existing.type,
      },
    });

    this.logger.debug(`ActionClass 삭제 완료: ${actionClassId}`);

    return { id: actionClassId };
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
