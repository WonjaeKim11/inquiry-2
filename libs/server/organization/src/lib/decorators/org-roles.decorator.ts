import { SetMetadata } from '@nestjs/common';
import type { MembershipRole } from '@inquiry/db';

/** 조직 역할 메타데이터 키 */
export const ORG_ROLES_KEY = 'org_roles';

/**
 * 조직 역할 기반 접근 제어 데코레이터.
 * OrgRoleGuard와 함께 사용하여 컨트롤러/핸들러에 필요한 역할을 지정한다.
 * 지정된 역할 이상의 권한을 가진 멤버만 접근 가능하다.
 *
 * @example
 * @OrgRoles('OWNER', 'ADMIN')
 * @UseGuards(AuthGuard('jwt'), OrgRoleGuard)
 * updateOrganization() { ... }
 */
export const OrgRoles = (...roles: MembershipRole[]) =>
  SetMetadata(ORG_ROLES_KEY, roles);
