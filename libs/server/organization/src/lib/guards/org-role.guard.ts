import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ServerPrismaService } from '@inquiry/server-prisma';
import type { MembershipRole } from '@inquiry/db';
import type { Request } from 'express';
import { ORG_ROLES_KEY } from '../decorators/org-roles.decorator.js';

/**
 * 인증된 요청에 포함되는 사용자 정보.
 * JwtAuthGuard 이후 request.user에 설정된다.
 */
interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * 조직 역할 기반 접근 제어 가드.
 *
 * 동작 방식:
 * 1. 요청 파라미터(:id)에서 organizationId를 추출한다.
 * 2. JWT의 userId + Membership 테이블을 조회하여 해당 조직에서의 역할을 확인한다.
 * 3. @OrgRoles() 데코레이터에 지정된 역할과 비교하여 접근을 허용/거부한다.
 *
 * 역할 우선순위(계층): OWNER > ADMIN > BILLING > MEMBER
 * 상위 역할은 하위 역할의 권한을 자동으로 포함한다.
 */
@Injectable()
export class OrgRoleGuard implements CanActivate {
  /** 역할 계층 (높을수록 권한이 많음) */
  private static readonly ROLE_HIERARCHY: Record<string, number> = {
    OWNER: 40,
    ADMIN: 30,
    BILLING: 20,
    MEMBER: 10,
  };

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: ServerPrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<
      MembershipRole[] | undefined
    >(ORG_ROLES_KEY, [context.getHandler(), context.getClass()]);

    // @OrgRoles() 데코레이터가 없으면 멤버십 확인만 수행 (멤버이면 허용)
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as AuthenticatedUser | undefined;
    const organizationId = request.params['id'];

    if (!user) {
      throw new ForbiddenException('인증이 필요합니다.');
    }

    if (!organizationId) {
      throw new ForbiddenException('조직 ID가 필요합니다.');
    }

    // 조직 존재 여부 확인
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });

    if (!organization) {
      throw new NotFoundException('조직을 찾을 수 없습니다.');
    }

    // 사용자의 해당 조직 내 멤버십 조회
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
      throw new ForbiddenException('이 조직의 멤버가 아닙니다.');
    }

    // @OrgRoles() 데코레이터가 없으면 멤버십만 확인하고 허용
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 역할 계층 비교: 필요 역할 중 하나라도 만족하면 허용
    const userRoleLevel = OrgRoleGuard.ROLE_HIERARCHY[membership.role] ?? 0;
    const hasRequiredRole = requiredRoles.some(
      (role) => userRoleLevel >= (OrgRoleGuard.ROLE_HIERARCHY[role] ?? 0)
    );

    if (!hasRequiredRole) {
      throw new ForbiddenException('이 작업에 대한 권한이 부족합니다.');
    }

    return true;
  }
}
