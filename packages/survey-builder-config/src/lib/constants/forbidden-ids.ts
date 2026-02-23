/**
 * 예약/금지된 Element ID 목록.
 * 시스템 내부적으로 사용되는 ID로, 사용자가 직접 사용할 수 없다.
 */
export const FORBIDDEN_IDS = [
  'suid',
  'odp',
  'userId',
  'recipientId',
  'surveyId',
  'responseId',
  'environmentId',
  'projectId',
  'organizationId',
  'teamId',
] as const;

/** 금지된 ID 유니온 타입 */
export type ForbiddenId = (typeof FORBIDDEN_IDS)[number];
