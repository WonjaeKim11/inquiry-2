import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ForbiddenException } from '@inquiry/server-core';
import type { ApiKeyAuthObject } from '../interfaces/api-key-auth.interface';

/** 권한 수준 계층: READ(1) < WRITE(2) < MANAGE(3) */
const PERMISSION_LEVEL: Record<string, number> = {
  READ: 1,
  WRITE: 2,
  MANAGE: 3,
};

/**
 * 환경별 권한 검증 가드.
 * @RequirePermission() 데코레이터와 함께 사용한다.
 * environmentId는 경로 파라미터 또는 쿼리 파라미터에서 자동 해석한다.
 */
@Injectable()
export class RequirePermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermission = this.reflector.get<string>(
      'requiredPermission',
      context.getHandler()
    );

    // @RequirePermission()이 없으면 권한 검증 스킵
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const apiKeyAuth = (request as Record<string, unknown>)['apiKeyAuth'] as
      | ApiKeyAuthObject
      | undefined;

    if (!apiKeyAuth) {
      throw new ForbiddenException('API key authentication required');
    }

    // environmentId를 경로 파라미터 또는 쿼리 파라미터에서 추출
    const environmentId =
      (request.params as Record<string, string>)['environmentId'] ||
      (request.query as Record<string, string>)['environmentId'];

    if (!environmentId) {
      throw new ForbiddenException('Environment ID is required');
    }

    // 해당 환경에 대한 권한 확인
    const envPermission = apiKeyAuth.environmentPermissions.find(
      (ep) => ep.environmentId === environmentId
    );

    if (!envPermission) {
      throw new ForbiddenException(
        `No permission for environment: ${environmentId}`
      );
    }

    // 계층적 권한 비교: 보유 권한 >= 요구 권한
    const hasLevel = PERMISSION_LEVEL[envPermission.permission] || 0;
    const requiredLevel = PERMISSION_LEVEL[requiredPermission] || 0;

    if (hasLevel < requiredLevel) {
      throw new ForbiddenException(
        `Requires ${requiredPermission} permission, but has ${envPermission.permission}`
      );
    }

    return true;
  }
}
