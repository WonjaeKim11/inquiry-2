import { SetMetadata } from '@nestjs/common';
import type { MembershipRole } from '@inquiry/db';

/** RBAC 역할 메타데이터 키 */
export const ROLES_KEY = 'roles';

/**
 * RBAC 역할 데코레이터.
 * 컨트롤러 또는 핸들러에 필요한 역할을 지정한다.
 * @example @Roles('OWNER', 'ADMIN')
 */
export const Roles = (...roles: MembershipRole[]) =>
  SetMetadata(ROLES_KEY, roles);
