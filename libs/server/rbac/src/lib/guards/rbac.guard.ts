import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ServerPrismaService } from '@inquiry/server-prisma';
import type { Request } from 'express';
import { ACCESS_RULES_KEY } from '../decorators/access-rules.decorator.js';
import type {
  AccessRule,
  OrganizationAccessRule,
  TeamAccessRule,
} from '../types/access-rule.types.js';
import { TEAM_ROLE_WEIGHT } from '../types/access-rule.types.js';

/**
 * 인증된 요청에 포함되는 사용자 정보.
 * JwtAuthGuard 이후 request.user에 설정된다.
 */
interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * RBAC 가드.
 * @AccessRules() 데코레이터로 지정된 접근 규칙 배열을 OR 조건으로 평가한다.
 * 하나라도 통과하면 접근을 허용하고, 모두 실패하면 403을 반환한다.
 *
 * 지원하는 규칙 타입:
 * - organization: 조직 멤버십의 역할이 allowedRoles에 포함되는지 확인
 * - team: 팀 멤버의 역할 가중치가 minPermission 이상인지 확인
 * - projectTeam: FSD-006에서 구현 예정
 */
@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: ServerPrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rules = this.reflector.getAllAndOverride<AccessRule[] | undefined>(
      ACCESS_RULES_KEY,
      [context.getHandler(), context.getClass()]
    );

    // @AccessRules()가 없으면 허용 (인증만 확인)
    if (!rules || rules.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('인증이 필요합니다.');
    }

    // OR 조건: 하나라도 통과하면 허용
    for (const rule of rules) {
      const passed = await this.evaluateRule(rule, user, request);
      if (passed) {
        return true;
      }
    }

    throw new ForbiddenException('이 작업에 대한 권한이 부족합니다.');
  }

  /**
   * 개별 접근 규칙을 평가한다.
   * @returns true이면 해당 규칙을 통과
   */
  private async evaluateRule(
    rule: AccessRule,
    user: AuthenticatedUser,
    request: Request
  ): Promise<boolean> {
    switch (rule.type) {
      case 'organization':
        return this.evaluateOrganizationRule(rule, user, request);
      case 'team':
        return this.evaluateTeamRule(rule, user, request);
      case 'projectTeam':
        // FSD-006에서 구현 예정. 현재는 항상 실패.
        this.logger.debug('projectTeam 규칙은 아직 구현되지 않았습니다.');
        return false;
      default:
        this.logger.warn(
          `알 수 없는 접근 규칙 타입: ${(rule as AccessRule).type}`
        );
        return false;
    }
  }

  /**
   * 조직 수준 접근 규칙을 평가한다.
   * 사용자의 조직 멤버십 역할이 allowedRoles에 포함되면 통과.
   */
  private async evaluateOrganizationRule(
    rule: OrganizationAccessRule,
    user: AuthenticatedUser,
    request: Request
  ): Promise<boolean> {
    const paramKey = rule.organizationIdParam ?? 'orgId';
    const organizationId =
      request.params[paramKey] ||
      request.query['organizationId'] ||
      request.body?.organizationId;

    if (!organizationId || typeof organizationId !== 'string') {
      return false;
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId,
        },
      },
      select: { role: true },
    });

    if (!membership) {
      return false;
    }

    return rule.allowedRoles.includes(membership.role);
  }

  /**
   * 팀 수준 접근 규칙을 평가한다.
   * 사용자의 팀 역할 가중치가 minPermission 가중치 이상이면 통과.
   */
  private async evaluateTeamRule(
    rule: TeamAccessRule,
    user: AuthenticatedUser,
    request: Request
  ): Promise<boolean> {
    const paramKey = rule.teamIdParam ?? 'teamId';
    const teamId = request.params[paramKey] || request.body?.teamId;

    if (!teamId || typeof teamId !== 'string') {
      return false;
    }

    const teamUser = await this.prisma.teamUser.findUnique({
      where: {
        teamId_userId: {
          teamId,
          userId: user.id,
        },
      },
      select: { role: true },
    });

    if (!teamUser) {
      return false;
    }

    const userWeight = TEAM_ROLE_WEIGHT[teamUser.role] ?? 0;
    const requiredWeight = TEAM_ROLE_WEIGHT[rule.minPermission] ?? 0;

    return userWeight >= requiredWeight;
  }
}
