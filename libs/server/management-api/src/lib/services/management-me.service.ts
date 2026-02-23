import { Injectable } from '@nestjs/common';
import type { ApiKeyAuthObject } from '@inquiry/server-api-key';

/**
 * Management API /me 서비스.
 * API Key 인증 정보를 조회한다.
 */
@Injectable()
export class ManagementMeService {
  /**
   * API Key 인증 정보 반환.
   * 현재 인증된 API Key의 정보와 사용 가능한 환경 목록을 반환한다.
   * @param apiKeyAuth - Guard가 주입한 API Key 인증 객체
   * @returns API Key ID, 조직 ID, 라벨, 환경별 권한 목록
   */
  getMe(apiKeyAuth: ApiKeyAuthObject) {
    return {
      apiKeyId: apiKeyAuth.apiKeyId,
      organizationId: apiKeyAuth.organizationId,
      label: apiKeyAuth.label,
      environmentPermissions: apiKeyAuth.environmentPermissions,
    };
  }
}
