import { SetMetadata } from '@nestjs/common';
import type { AccessRule } from '../types/access-rule.types.js';

/** 접근 규칙 메타데이터 키 */
export const ACCESS_RULES_KEY = 'access_rules';

/**
 * 접근 규칙 데코레이터.
 * RbacGuard와 함께 사용하여 컨트롤러/핸들러에 접근 규칙 배열을 지정한다.
 * 규칙들은 OR 조건으로 평가된다 (하나라도 통과하면 접근 허용).
 *
 * @example
 * // 조직 Owner 또는 Admin만 접근 가능
 * @AccessRules(
 *   { type: 'organization', allowedRoles: ['OWNER', 'ADMIN'] }
 * )
 *
 * @example
 * // 조직 Owner/Admin 또는 팀 Admin이면 접근 가능 (OR 조건)
 * @AccessRules(
 *   { type: 'organization', allowedRoles: ['OWNER', 'ADMIN'] },
 *   { type: 'team', minPermission: 'ADMIN' }
 * )
 */
export const AccessRules = (...rules: AccessRule[]) =>
  SetMetadata(ACCESS_RULES_KEY, rules);
