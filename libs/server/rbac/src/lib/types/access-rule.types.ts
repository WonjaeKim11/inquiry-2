import type {
  MembershipRole,
  TeamUserRole,
  ProjectTeamPermission,
} from '@inquiry/db';

/**
 * 접근 규칙 union 타입.
 * 배열로 사용되며, OR 조건으로 평가된다 (하나라도 통과하면 허용).
 */
export type AccessRule =
  | OrganizationAccessRule
  | TeamAccessRule
  | ProjectTeamAccessRule;

/**
 * 조직 수준 접근 규칙.
 * 사용자가 해당 조직에서 allowedRoles 중 하나의 역할을 가지면 통과.
 */
export interface OrganizationAccessRule {
  type: 'organization';
  /** 조직 ID를 가져올 요청 파라미터 키 (기본값: 'orgId') */
  organizationIdParam?: string;
  /** 허용되는 멤버십 역할 목록 */
  allowedRoles: MembershipRole[];
}

/**
 * 팀 수준 접근 규칙.
 * 사용자가 해당 팀에서 minPermission 이상의 역할을 가지면 통과.
 */
export interface TeamAccessRule {
  type: 'team';
  /** 팀 ID를 가져올 요청 파라미터 키 (기본값: 'teamId') */
  teamIdParam?: string;
  /** 최소 필요 팀 역할 */
  minPermission: TeamUserRole;
}

/**
 * 프로젝트-팀 수준 접근 규칙.
 * Project 모델은 FSD-006에서 추가되므로, 현재 타입 정의만 포함.
 */
export interface ProjectTeamAccessRule {
  type: 'projectTeam';
  /** 프로젝트 ID를 가져올 요청 파라미터 키 (기본값: 'projectId') */
  projectIdParam?: string;
  /** 최소 필요 프로젝트-팀 권한 */
  minPermission: ProjectTeamPermission;
}

/**
 * TeamUserRole 가중치 맵.
 * 숫자가 클수록 높은 권한을 의미한다.
 */
export const TEAM_ROLE_WEIGHT: Record<string, number> = {
  CONTRIBUTOR: 1,
  ADMIN: 2,
};

/**
 * ProjectTeamPermission 가중치 맵.
 * 숫자가 클수록 높은 권한을 의미한다.
 */
export const PROJECT_PERMISSION_WEIGHT: Record<string, number> = {
  READ: 1,
  READ_WRITE: 2,
  MANAGE: 3,
};
