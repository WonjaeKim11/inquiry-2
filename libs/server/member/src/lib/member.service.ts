import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerPrismaService } from '@inquiry/server-prisma';
import { AuditLogService } from '@inquiry/server-audit-log';
import type { MembershipRole } from '@inquiry/db';

/**
 * 멤버 서비스.
 * 멤버 목록 조회, 역할 변경, 멤버 삭제, 조직 탈퇴 등의 비즈니스 로직을 담당한다.
 */
@Injectable()
export class MemberService {
  private readonly logger = new Logger(MemberService.name);

  /** Owner/Admin 역할 목록: 승격 시 팀 역할 자동 변경 대상 */
  private static readonly ELEVATED_ROLES: MembershipRole[] = ['OWNER', 'ADMIN'];

  constructor(
    private readonly prisma: ServerPrismaService,
    private readonly configService: ConfigService,
    private readonly auditLogService: AuditLogService
  ) {}

  /**
   * 조직의 멤버 목록을 조회한다.
   * 각 멤버의 사용자 정보(이름, 이메일, 이미지)를 포함한다.
   *
   * @param organizationId - 조직 ID
   */
  async getMembers(organizationId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      userId: m.userId,
      organizationId: m.organizationId,
      role: m.role,
      createdAt: m.createdAt,
      user: m.user,
    }));
  }

  /**
   * 멤버의 역할을 변경한다.
   *
   * 규칙:
   * - Owner: 모든 역할 변경 가능
   * - Admin(Manager): MEMBER 역할만 변경 가능
   * - 마지막 Owner의 역할 변경 방지
   * - Owner/Admin으로 승격 시 해당 멤버의 모든 TeamUser 역할을 ADMIN으로 자동 변경
   *
   * @param currentUserId - 요청자 사용자 ID
   * @param organizationId - 조직 ID
   * @param targetUserId - 역할을 변경할 대상 사용자 ID
   * @param newRole - 변경할 역할
   * @param ipAddress - 요청자 IP (감사 로그용)
   */
  async updateMemberRole(
    currentUserId: string,
    organizationId: string,
    targetUserId: string,
    newRole: MembershipRole,
    ipAddress?: string
  ) {
    // 1. License 기반 역할 관리 제한
    const roleManagementEnabled =
      this.configService.get<string>('ROLE_MANAGEMENT_ENABLED', 'false') ===
      'true';

    // 요청자 멤버십 확인
    const currentMembership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: currentUserId,
          organizationId,
        },
      },
      select: { role: true },
    });

    if (!currentMembership) {
      throw new ForbiddenException('이 조직의 멤버가 아닙니다.');
    }

    // ADMIN은 MEMBER 역할에서만 변경 가능
    if (currentMembership.role === 'ADMIN') {
      // 대상의 현재 역할 확인
      const targetMembership = await this.prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: targetUserId,
            organizationId,
          },
        },
        select: { role: true },
      });

      if (!targetMembership) {
        throw new NotFoundException('대상 멤버를 찾을 수 없습니다.');
      }

      // Admin은 MEMBER만 변경 가능하고, MEMBER로만 변경 가능
      if (targetMembership.role !== 'MEMBER' || newRole !== 'MEMBER') {
        throw new ForbiddenException(
          'Manager는 Member 역할만 변경할 수 있습니다.'
        );
      }
    }

    // Owner가 아니고 License가 없으면 역할 변경 차단
    if (!roleManagementEnabled && currentMembership.role !== 'OWNER') {
      throw new ForbiddenException(
        '역할 관리 기능을 사용하려면 Enterprise 라이선스가 필요합니다.'
      );
    }

    // 2. 대상 멤버십 조회
    const targetMembership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: targetUserId,
          organizationId,
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('대상 멤버를 찾을 수 없습니다.');
    }

    const oldRole = targetMembership.role;

    // 3. 마지막 Owner 강등 방지
    if (oldRole === 'OWNER' && newRole !== 'OWNER') {
      const ownerCount = await this.prisma.membership.count({
        where: { organizationId, role: 'OWNER' },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException(
          '마지막 Owner의 역할은 변경할 수 없습니다.'
        );
      }
    }

    // 4. 역할 변경
    const updated = await this.prisma.membership.update({
      where: {
        userId_organizationId: {
          userId: targetUserId,
          organizationId,
        },
      },
      data: { role: newRole },
    });

    // 5. Owner/Admin 승격 시 TeamUser 역할 자동 변경
    if (
      MemberService.ELEVATED_ROLES.includes(newRole) &&
      !MemberService.ELEVATED_ROLES.includes(oldRole)
    ) {
      await this.autoPromoteTeamRoles(targetUserId, organizationId);
    }

    // 6. 감사 로그 (fire-and-forget)
    this.auditLogService.logEvent({
      action: 'member.role-changed',
      userId: currentUserId,
      targetType: 'membership',
      targetId: `${targetUserId}:${organizationId}`,
      organizationId,
      ipAddress,
      changes: {
        before: { role: oldRole },
        after: { role: newRole },
      },
    });

    this.logger.debug(
      `멤버 역할 변경 완료: ${targetUserId} (${oldRole} -> ${newRole})`
    );

    return {
      userId: updated.userId,
      organizationId: updated.organizationId,
      role: updated.role,
    };
  }

  /**
   * 멤버를 조직에서 삭제한다.
   * 트랜잭션으로 TeamUser 삭제 + Membership 삭제를 처리한다.
   *
   * 규칙:
   * - 자기 자신 삭제 불가 (탈퇴 API 사용)
   * - 마지막 Owner 삭제 불가
   * - Admin이 Owner를 삭제하는 것은 불가
   *
   * @param currentUserId - 요청자 사용자 ID
   * @param organizationId - 조직 ID
   * @param targetUserId - 삭제할 대상 사용자 ID
   * @param ipAddress - 요청자 IP (감사 로그용)
   */
  async deleteMember(
    currentUserId: string,
    organizationId: string,
    targetUserId: string,
    ipAddress?: string
  ) {
    // 1. 자기 삭제 방지
    if (currentUserId === targetUserId) {
      throw new BadRequestException(
        '자기 자신은 삭제할 수 없습니다. 조직 탈퇴를 이용해주세요.'
      );
    }

    // 2. 요청자 멤버십 확인
    const currentMembership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: currentUserId,
          organizationId,
        },
      },
      select: { role: true },
    });

    if (!currentMembership) {
      throw new ForbiddenException('이 조직의 멤버가 아닙니다.');
    }

    // 3. 대상 멤버십 확인
    const targetMembership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: targetUserId,
          organizationId,
        },
      },
      select: { role: true },
    });

    if (!targetMembership) {
      throw new NotFoundException('대상 멤버를 찾을 수 없습니다.');
    }

    // 4. Admin이 Owner를 삭제하려는 경우 차단
    if (
      currentMembership.role === 'ADMIN' &&
      targetMembership.role === 'OWNER'
    ) {
      throw new ForbiddenException('Manager는 Owner를 삭제할 수 없습니다.');
    }

    // 5. 마지막 Owner 삭제 방지
    if (targetMembership.role === 'OWNER') {
      const ownerCount = await this.prisma.membership.count({
        where: { organizationId, role: 'OWNER' },
      });

      if (ownerCount <= 1) {
        throw new BadRequestException('마지막 Owner는 삭제할 수 없습니다.');
      }
    }

    // 6. 트랜잭션: 해당 조직의 팀에서 TeamUser 삭제 + Membership 삭제
    const orgTeams = await this.prisma.team.findMany({
      where: { organizationId },
      select: { id: true },
    });

    const teamIds = orgTeams.map((t) => t.id);

    await this.prisma.$transaction([
      // 해당 조직의 팀에서 TeamUser 삭제
      this.prisma.teamUser.deleteMany({
        where: {
          userId: targetUserId,
          teamId: { in: teamIds },
        },
      }),
      // Membership 삭제
      this.prisma.membership.delete({
        where: {
          userId_organizationId: {
            userId: targetUserId,
            organizationId,
          },
        },
      }),
    ]);

    // 7. 감사 로그 (fire-and-forget)
    this.auditLogService.logEvent({
      action: 'member.deleted',
      userId: currentUserId,
      targetType: 'membership',
      targetId: `${targetUserId}:${organizationId}`,
      organizationId,
      ipAddress,
      metadata: { deletedRole: targetMembership.role },
    });

    this.logger.debug(
      `멤버 삭제 완료: ${targetUserId} (from ${organizationId})`
    );
  }

  /**
   * 조직을 탈퇴한다.
   *
   * 규칙:
   * - Owner는 탈퇴 불가 (먼저 역할 변경 필요)
   * - Multi-Org가 활성화되어 있어야 함
   * - 유일한 조직에서는 탈퇴 불가
   *
   * @param userId - 탈퇴할 사용자 ID
   * @param organizationId - 탈퇴할 조직 ID
   * @param ipAddress - 요청자 IP (감사 로그용)
   */
  async leaveOrganization(
    userId: string,
    organizationId: string,
    ipAddress?: string
  ) {
    // 1. Multi-Org 활성화 확인
    const multiOrgEnabled =
      this.configService.get<string>('MULTI_ORG_ENABLED', 'true') === 'true';

    if (!multiOrgEnabled) {
      throw new ForbiddenException(
        'Multi-Organization 기능이 비활성화되어 있어 탈퇴가 불가능합니다.'
      );
    }

    // 2. 멤버십 확인
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      select: { role: true },
    });

    if (!membership) {
      throw new NotFoundException('이 조직의 멤버가 아닙니다.');
    }

    // 3. Owner 탈퇴 차단
    if (membership.role === 'OWNER') {
      throw new ForbiddenException(
        'Owner는 조직을 탈퇴할 수 없습니다. 먼저 역할을 변경해주세요.'
      );
    }

    // 4. 유일 조직 탈퇴 차단
    const membershipCount = await this.prisma.membership.count({
      where: { userId },
    });

    if (membershipCount <= 1) {
      throw new BadRequestException('유일한 조직에서는 탈퇴할 수 없습니다.');
    }

    // 5. 트랜잭션: TeamUser 삭제 + Membership 삭제
    const orgTeams = await this.prisma.team.findMany({
      where: { organizationId },
      select: { id: true },
    });

    const teamIds = orgTeams.map((t) => t.id);

    await this.prisma.$transaction([
      this.prisma.teamUser.deleteMany({
        where: {
          userId,
          teamId: { in: teamIds },
        },
      }),
      this.prisma.membership.delete({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
      }),
    ]);

    // 6. 감사 로그 (fire-and-forget)
    this.auditLogService.logEvent({
      action: 'member.left',
      userId,
      targetType: 'membership',
      targetId: `${userId}:${organizationId}`,
      organizationId,
      ipAddress,
    });

    this.logger.debug(`조직 탈퇴 완료: ${userId} (from ${organizationId})`);
  }

  /**
   * Owner/Admin 승격 시 해당 사용자의 모든 TeamUser 역할을 ADMIN으로 변경한다.
   * 해당 조직의 팀에 속한 TeamUser만 대상으로 한다.
   */
  private async autoPromoteTeamRoles(
    userId: string,
    organizationId: string
  ): Promise<void> {
    // 조직에 속한 팀 ID 목록 조회
    const orgTeams = await this.prisma.team.findMany({
      where: { organizationId },
      select: { id: true },
    });

    if (orgTeams.length === 0) return;

    const teamIds = orgTeams.map((t) => t.id);

    // 해당 팀들에서 사용자의 TeamUser 역할을 ADMIN으로 변경
    await this.prisma.teamUser.updateMany({
      where: {
        userId,
        teamId: { in: teamIds },
      },
      data: { role: 'ADMIN' },
    });

    this.logger.debug(
      `팀 역할 자동 승격 완료: ${userId} -> ADMIN (${teamIds.length}개 팀)`
    );
  }
}
