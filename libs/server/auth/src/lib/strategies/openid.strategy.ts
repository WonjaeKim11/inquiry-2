/**
 * OpenID Connect 인증 전략 골격.
 *
 * 실제 동작 구현은 OpenID Provider 설정 및 openid-client 패키지가 필요하다.
 * 현재는 타입과 인터페이스만 정의하여 구조를 잡아둔다.
 *
 * 필요한 환경변수:
 * - OPENID_CLIENT_ID: OpenID Connect 클라이언트 ID
 * - OPENID_CLIENT_SECRET: OpenID Connect 클라이언트 시크릿
 * - OPENID_ISSUER: OpenID Provider의 Issuer URL
 *
 * 향후 구현 시 openid-client 패키지를 설치하고
 * Passport의 OpenIDConnectStrategy를 확장하여 구현한다.
 */

/** OpenID Connect 사용자 정보 인터페이스 (UserInfo Endpoint 응답) */
export interface OpenIdUserInfo {
  /** 사용자 고유 식별자 (sub 클레임) */
  sub: string;
  /** 사용자 이메일 */
  email: string;
  /** 이메일 검증 여부 */
  emailVerified: boolean;
  /** 사용자 전체 이름 */
  name: string;
  /** 프로필 이미지 URL (선택) */
  picture?: string;
}

/** OpenID Connect 전략 설정 인터페이스 */
export interface OpenIdStrategyConfig {
  clientId: string;
  clientSecret: string;
  /** OpenID Provider의 Issuer URL (discovery 지원) */
  issuer: string;
  /** 콜백 URL (기본: /api/auth/openid/callback) */
  callbackUrl: string;
  /** 요청 스코프 */
  scope: string[];
}

/**
 * OpenID Connect 인증 전략 (골격).
 *
 * TODO: openid-client 패키지 설치 후 다음과 같이 구현
 * @example
 * ```typescript
 * import { PassportStrategy } from '@nestjs/passport';
 * import { Strategy, Issuer } from 'openid-client';
 *
 * @Injectable()
 * export class OpenIdStrategy extends PassportStrategy(Strategy, 'openid') {
 *   constructor(configService: ConfigService, ssoCallbackService: SsoCallbackService) {
 *     // Issuer.discover()로 OpenID Provider 설정을 동적으로 가져옴
 *     super({
 *       client: new (await Issuer.discover(configService.getOrThrow('OPENID_ISSUER'))).Client({
 *         client_id: configService.getOrThrow('OPENID_CLIENT_ID'),
 *         client_secret: configService.getOrThrow('OPENID_CLIENT_SECRET'),
 *       }),
 *       params: {
 *         redirect_uri: '/api/auth/openid/callback',
 *         scope: 'openid profile email',
 *       },
 *     });
 *   }
 *
 *   async validate(tokenset: TokenSet, userinfo: OpenIdUserInfo) {
 *     return this.ssoCallbackService.handleCallback({
 *       email: userinfo.email,
 *       name: userinfo.name,
 *       provider: 'OPENID',
 *       providerAccountId: userinfo.sub,
 *     });
 *   }
 * }
 * ```
 */
export class OpenIdStrategy {
  // 골격 클래스: 향후 openid-client 기반으로 구현 예정
}
