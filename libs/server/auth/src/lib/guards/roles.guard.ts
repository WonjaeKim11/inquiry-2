import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { MembershipRole } from '@inquiry/db';
import type { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';

/** 사용자 요청에 포함된 멤버십 정보 인터페이스 */
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    membership?: {
      role: MembershipRole;
    };
  };
}

/**
 * 조직 역할 기반 접근 제어 가드.
 * @Roles() 데코레이터에 지정된 역할과 사용자의 멤버십 역할을 비교한다.
 * 역할 우선순위: OWNER > ADMIN > BILLING > MEMBER
 */
@Injectable()
export class OrgRoleGuard implements CanActivate {
  /** 역할 우선순위 (높을수록 권한이 많음) */
  private static readonly ROLE_HIERARCHY: Record<string, number> = {
    OWNER: 40,
    ADMIN: 30,
    BILLING: 20,
    MEMBER: 10,
  };

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      MembershipRole[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    // @Roles() 데코레이터가 없으면 접근 허용
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userRole = request.user?.membership?.role;

    if (!userRole) {
      throw new ForbiddenException('조직 멤버십이 필요합니다.');
    }

    // 필요 역할 중 하나라도 만족하면 허용
    const hasRole = requiredRoles.some(
      (role) =>
        (OrgRoleGuard.ROLE_HIERARCHY[userRole] ?? 0) >=
        (OrgRoleGuard.ROLE_HIERARCHY[role] ?? 0)
    );

    if (!hasRole) {
      throw new ForbiddenException('이 작업에 대한 권한이 부족합니다.');
    }

    return true;
  }
}
