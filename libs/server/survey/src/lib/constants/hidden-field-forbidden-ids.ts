/**
 * Hidden Field에 사용 불가한 예약 ID 목록.
 * 시스템 내부에서 사용되는 ID와 충돌을 방지한다.
 */
export const HIDDEN_FIELD_FORBIDDEN_IDS = [
  'suid',
  'odp',
  'userId',
  'recipientId',
  'recipientEmail',
  'recipientFirstName',
  'recipientLastName',
  'surveyId',
  'source',
];
