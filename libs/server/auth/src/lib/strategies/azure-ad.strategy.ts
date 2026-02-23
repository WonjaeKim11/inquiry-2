/**
 * Azure AD (Entra ID) 인증 전략 골격.
 *
 * 실제 동작 구현은 Azure AD 테넌트 설정 및 passport-azure-ad 패키지가 필요하다.
 * 현재는 타입과 인터페이스만 정의하여 구조를 잡아둔다.
 *
 * 필요한 환경변수:
 * - AZURE_AD_CLIENT_ID: Azure AD 앱 등록 클라이언트 ID
 * - AZURE_AD_CLIENT_SECRET: Azure AD 앱 등록 클라이언트 시크릿
 * - AZURE_AD_TENANT_ID: Azure AD 테넌트 ID
 *
 * 향후 구현 시 passport-azure-ad 패키지를 설치하고
 * BearerStrategy 또는 OIDCStrategy를 확장하여 구현한다.
 */

/** Azure AD 프로필 인터페이스 (향후 passport-azure-ad에서 제공) */
export interface AzureAdProfile {
  /** Azure AD 고유 사용자 ID (oid 클레임) */
  oid: string;
  /** 사용자 표시 이름 */
  displayName: string;
  /** 사용자 이메일 (upn 또는 preferred_username) */
  email: string;
  /** 프로필 이미지 URL (선택) */
  photo?: string;
}

/** Azure AD 전략 설정 인터페이스 */
export interface AzureAdStrategyConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  /** 콜백 URL (기본: /api/auth/azure-ad/callback) */
  callbackUrl: string;
  /** 요청 스코프 */
  scope: string[];
}

/**
 * Azure AD 인증 전략 (골격).
 *
 * TODO: passport-azure-ad 패키지 설치 후 다음과 같이 구현
 * @example
 * ```typescript
 * import { PassportStrategy } from '@nestjs/passport';
 * import { OIDCStrategy } from 'passport-azure-ad';
 *
 * @Injectable()
 * export class AzureAdStrategy extends PassportStrategy(OIDCStrategy, 'azure-ad') {
 *   constructor(configService: ConfigService, ssoCallbackService: SsoCallbackService) {
 *     super({
 *       clientID: configService.getOrThrow('AZURE_AD_CLIENT_ID'),
 *       clientSecret: configService.getOrThrow('AZURE_AD_CLIENT_SECRET'),
 *       identityMetadata: `https://login.microsoftonline.com/${configService.getOrThrow('AZURE_AD_TENANT_ID')}/v2.0/.well-known/openid-configuration`,
 *       redirectUrl: '/api/auth/azure-ad/callback',
 *       responseType: 'code',
 *       responseMode: 'query',
 *       scope: ['openid', 'profile', 'email'],
 *     });
 *   }
 *
 *   async validate(profile: AzureAdProfile) {
 *     return this.ssoCallbackService.handleCallback({
 *       email: profile.email,
 *       name: profile.displayName,
 *       provider: 'AZUREAD',
 *       providerAccountId: profile.oid,
 *     });
 *   }
 * }
 * ```
 */
export class AzureAdStrategy {
  // 골격 클래스: 향후 passport-azure-ad 기반으로 구현 예정
}
