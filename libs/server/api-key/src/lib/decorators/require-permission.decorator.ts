import { SetMetadata } from '@nestjs/common';

/**
 * 엔드포인트에 필요한 최소 권한 수준을 설정하는 데코레이터.
 * RequirePermissionGuard와 함께 사용한다.
 */
export const RequirePermission = (permission: 'READ' | 'WRITE' | 'MANAGE') =>
  SetMetadata('requiredPermission', permission);
