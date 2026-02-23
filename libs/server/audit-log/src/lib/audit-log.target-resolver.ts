/**
 * 감사 액션 → 대상 엔티티 자동 매핑.
 * AuditAction에서 대상 엔티티(AuditTarget)를 자동으로 추론한다.
 */

import type { AuditAction, AuditTarget } from './audit-log.types';

/**
 * Action → Target 자동 매핑 테이블.
 * 각 액션이 어떤 엔티티에 영향을 미치는지 정의한다.
 */
const ACTION_TARGET_MAP: Record<string, AuditTarget> = {
  // 사용자 관련 액션
  'user.signup': 'user',
  'user.login': 'user',
  'user.logout': 'user',
  'user.email-verified': 'user',
  'user.profile-updated': 'user',
  'user.locale-changed': 'user',
  'user.deleted': 'user',
  // 비밀번호 관련 액션
  'password.reset-requested': 'user',
  'password.reset-completed': 'user',
  'password.changed': 'user',
  // 조직 관련 액션
  'org.created': 'organization',
  'org.updated': 'organization',
  'org.deleted': 'organization',
  'org.member-invited': 'invite',
  'org.member-removed': 'membership',
  'org.member-role-changed': 'membership',
  // 설문 관련 액션
  'survey.created': 'survey',
  'survey.updated': 'survey',
  'survey.published': 'survey',
  'survey.closed': 'survey',
  'survey.deleted': 'survey',
  // 응답 관련 액션
  'response.submitted': 'response',
  'response.deleted': 'response',
  // API 키 관련 액션
  'apikey.created': 'api_key',
  'apikey.revoked': 'api_key',
};

/**
 * Action에서 기본 Target을 추론.
 * 매핑 테이블에 없는 액션은 기본값 'user'를 반환한다.
 * @param action - 감사 액션
 * @returns 추론된 대상 엔티티 타입
 */
export function resolveTarget(action: AuditAction): AuditTarget {
  return ACTION_TARGET_MAP[action] || 'user';
}
