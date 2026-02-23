/** API Key 인증 정보. Guard가 request에 주입하는 객체. */
export interface ApiKeyAuthObject {
  /** API Key 레코드 ID */
  apiKeyId: string;
  /** API Key가 속한 조직 ID */
  organizationId: string;
  /** API Key 라벨 */
  label: string;
  /** 환경별 권한 목록 */
  environmentPermissions: {
    environmentId: string;
    permission: 'READ' | 'WRITE' | 'MANAGE';
  }[];
}
