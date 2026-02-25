import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ServerPrismaService } from '@inquiry/server-prisma';
import type { Request } from 'express';

/** 필요한 최소 역할 메타데이터 키 */
export const SEGMENT_MIN_ROLE_KEY = 'segment_min_role';

/**
 * 세그먼트 접근 최소 역할을 지정하는 데코레이터.
 * SegmentAccessGuard와 함께 사용하여 컨트롤러/핸들러에 필요한 최소 역할을 지정한다.
 * 지정된 역할 이상의 권한을 가진 멤버만 접근 가능하다.
 *
 * @example @SegmentMinRole('ADMIN')  // OWNER 또는 ADMIN만 접근
 * @example @SegmentMinRole('MEMBER') // 모든 멤버 접근 가능
 */
export const SegmentMinRole = (minRole: 'OWNER' | 'ADMIN' | 'MEMBER') =>
  SetMetadata(SEGMENT_MIN_ROLE_KEY, minRole);

/**
 * 세그먼트 환경 접근 + 역할 검증 가드.
 * 경로의 envId에서 프로젝트 -> 조직을 추적하여 멤버십 역할을 확인한다.
 *
 * 동작 방식:
 * 1. JWT 인증된 사용자 정보를 확인한다.
 * 2. 요청 파라미터(:envId)에서 환경 ID를 추출한다.
 * 3. 환경 -> 프로젝트 -> 조직 관계를 추적하여 조직 ID를 얻는다.
 * 4. 사용자의 해당 조직 멤버십과 역할을 확인한다.
 * 5. @SegmentMinRole() 데코레이터에 지정된 최소 역할과 비교한다.
 */
@Injectable()
export class SegmentAccessGuard implements CanActivate {
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
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as { id: string } | undefined;

    if (!user) {
      throw new ForbiddenException('인증이 필요합니다.');
    }

    const envId = request.params['envId'];
    if (!envId) {
      throw new ForbiddenException('환경 ID가 필요합니다.');
    }

    // 환경 -> 프로젝트 -> 조직 추적
    const environment = await this.prisma.environment.findUnique({
      where: { id: envId },
      select: { project: { select: { organizationId: true } } },
    });

    if (!environment) {
      throw new ForbiddenException('유효하지 않은 환경입니다.');
    }

    const organizationId = environment.project.organizationId;

    // 조직 멤버십 확인
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

    // 최소 역할 확인
    const minRole = this.reflector.getAllAndOverride<string | undefined>(
      SEGMENT_MIN_ROLE_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (minRole) {
      const userLevel = SegmentAccessGuard.ROLE_HIERARCHY[membership.role] ?? 0;
      const requiredLevel = SegmentAccessGuard.ROLE_HIERARCHY[minRole] ?? 0;

      if (userLevel < requiredLevel) {
        throw new ForbiddenException('이 작업에 대한 권한이 부족합니다.');
      }
    }

    return true;
  }
}
