/**
 * 감사 로그 타입 정의.
 * 감사 이벤트의 액션, 대상, 모드 등의 타입과 상수를 관리한다.
 */

/** 감사 로그 액션 타입 - 시스템에서 추적하는 모든 사용자/시스템 액션 */
export type AuditAction =
  | 'user.signup'
  | 'user.login'
  | 'user.logout'
  | 'user.email-verified'
  | 'user.profile-updated'
  | 'user.locale-changed'
  | 'user.deleted'
  | 'password.reset-requested'
  | 'password.reset-completed'
  | 'password.changed'
  | 'org.created'
  | 'org.updated'
  | 'org.deleted'
  | 'org.member-invited'
  | 'org.member-removed'
  | 'org.member-role-changed'
  | 'survey.created'
  | 'survey.updated'
  | 'survey.published'
  | 'survey.closed'
  | 'survey.deleted'
  | 'response.submitted'
  | 'response.deleted'
  | 'apikey.created'
  | 'apikey.revoked'
  | 'project.created'
  | 'project.updated'
  | 'project.deleted'
  | 'actionClass.created'
  | 'actionClass.deleted'
  | 'language.created'
  | 'language.deleted';

/** 감사 로그 대상 엔티티 - 감사 이벤트가 영향을 미치는 리소스 유형 */
export type AuditTarget =
  | 'user'
  | 'organization'
  | 'membership'
  | 'invite'
  | 'survey'
  | 'question'
  | 'response'
  | 'answer'
  | 'api_key'
  | 'environment'
  | 'project'
  | 'actionClass'
  | 'language';

/** 감사 모드 - 이벤트 기록 방식 (DB 저장, 로그 출력, 또는 둘 다) */
export type AuditMode = 'db' | 'log' | 'both';

/** 감사 이벤트 입력 - logEvent() 메서드에 전달하는 이벤트 데이터 */
export interface AuditEventInput {
  /** 수행된 액션 */
  action: AuditAction;
  /** 액션을 수행한 사용자 ID */
  userId?: string;
  /** 대상 엔티티 타입 */
  targetType: AuditTarget;
  /** 대상 엔티티 ID */
  targetId?: string;
  /** 관련 조직 ID */
  organizationId?: string;
  /** 클라이언트 IP 주소 */
  ipAddress?: string;
  /** 클라이언트 User-Agent */
  userAgent?: string;
  /** 추가 메타데이터 */
  metadata?: Record<string, unknown>;
  /** 변경 전/후 diff */
  changes?: AuditChanges;
}

/** 변경 전/후 diff - 엔티티의 상태 변경을 추적하기 위한 구조 */
export interface AuditChanges {
  /** 변경 전 상태 */
  before?: Record<string, unknown>;
  /** 변경 후 상태 */
  after?: Record<string, unknown>;
}

/** 감사 이벤트 상수 - 기본 설정값 및 PII 필드 목록 */
export const AUDIT_CONSTANTS = {
  /** DB 저장 + 로그 모드 기본값 */
  DEFAULT_MODE: 'both' as AuditMode,
  /** Retention 기간 (일) */
  RETENTION_DAYS: 90,
  /** PII Redaction 대상 필드 - 이 필드들은 로그/DB에 저장 시 마스킹 처리됨 */
  PII_FIELDS: [
    'email',
    'password',
    'ip',
    'ipAddress',
    'token',
    'secret',
    'accessToken',
    'refreshToken',
  ],
} as const;
