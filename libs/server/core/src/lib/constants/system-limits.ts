/** 시스템 한도 상수 */
export const SYSTEM_LIMITS = {
  /** 무료 플랜 설문 수 */
  FREE_SURVEY_LIMIT: 3,
  /** 무료 플랜 응답 수 (설문당) */
  FREE_RESPONSE_LIMIT: 100,
  /** 무료 플랜 파일 업로드 용량 (MB) */
  FREE_STORAGE_LIMIT_MB: 100,
  /** 무료 플랜 멤버 수 */
  FREE_MEMBER_LIMIT: 3,
  /** API 키 최대 개수 */
  MAX_API_KEYS: 10,
  /** 비밀번호 최대 길이 (bcrypt DoS 방지) */
  MAX_PASSWORD_LENGTH: 128,
  /** 페이지네이션 최대 limit */
  MAX_PAGE_SIZE: 100,
  /** 기본 페이지 크기 */
  DEFAULT_PAGE_SIZE: 20,
} as const;
