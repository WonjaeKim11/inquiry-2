# 2FA / SSO 인증 -- 요구사항 명세서

> **문서번호**: FSD-002 | **FR 범위**: FR-005, FR-006
> **라이선스**: Enterprise

---

## 1. 목적/배경

Formbricks 플랫폼의 2단계 인증(2FA)과 SSO(Single Sign-On) 기능에 대한 요구사항을 정의한다. TOTP 기반 2FA와 Backup Code를 지원하며, GitHub/Google/AzureAD/OpenID(PKCE)/SAML(BoxyHQ) 총 5개의 SSO Provider를 Enterprise License 하에서 제공한다. 두 기능 모두 Enterprise License의 Feature Flag에 의해 제어된다.

---

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- TOTP 기반 2단계 인증 (활성화, 검증, 비활성화)
- Backup Code 생성 및 사용
- 5종 SSO Provider 설정 및 인증 흐름
- SSO Callback 처리 (신규 사용자 자동 프로비저닝)
- License Feature Flag 기반 접근 제어

### Out-of-scope
- 기본 이메일/비밀번호 인증 (FSD-001에서 다룸)
- 회원가입 흐름 (FSD-001에서 다룸)
- RBAC 및 멤버 권한 (FSD-004에서 다룸)

---

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| Enterprise 사용자 | 2FA를 활성화/사용하는 사용자 |
| SSO 사용자 | GitHub, Google, AzureAD, OpenID, SAML로 로그인하는 사용자 |
| 조직 관리자 | SSO 설정을 관리하는 관리자 |
| 시스템 관리자 | License Key 및 환경변수를 관리하는 운영자 |

---

## 4. 기능 요구사항

### FR-005: 2단계 인증 (2FA)

#### FR-005-01: TOTP 구현

TOTP는 OTP 라이브러리를 사용하여 구현된다.

| 설정 항목 | 값 | 설명 |
|-----------|-----|------|
| window | 이전 1개 + 현재 허용, 미래 불허 | 시간 동기화 유연성 제공 |
| encoding | base32 | 표준 TOTP 인코딩 |
| digest | SHA-1 | HMAC 기반 다이제스트 |
| secret 길이 | 32자 | 32자가 아니면 거부 |

#### FR-005-02: 2FA 로그인 검증 흐름

인증 옵션의 Credentials Provider 인증 함수 내에서 처리된다.

**TOTP 코드 검증:**
1. 2FA가 활성화된 상태이고 TOTP 코드가 제공된 경우
2. 2FA 시크릿 존재 확인
3. 암호화 키 존재 확인
4. 암호화된 시크릿을 대칭 복호화
5. 시크릿 길이 32자 검증
6. TOTP 코드 검증
7. 실패 시: "Invalid two factor code"

**2FA 필요 시 응답:**
- 2FA가 활성화된 상태이고 TOTP 코드가 미제공된 경우
- "second factor required" 에러 반환 -- 클라이언트에 2FA 입력 UI 표시 트리거

#### FR-005-03: Backup Code 검증 흐름

1. 2FA가 활성화된 상태이고 백업 코드가 제공된 경우
2. 암호화 키 존재 확인
3. 암호화된 백업 코드를 대칭 복호화 후 JSON parse
4. 하이픈 제거 후 배열에서 일치하는 코드 검색
5. 일치하는 코드가 있으면:
   - 해당 인덱스를 null로 교체 (일회용 사용 처리)
   - 나머지 코드를 다시 암호화하여 DB 업데이트
6. Audit Log 기록 (백업 코드 사용 이벤트)

**Backup Code 저장 구조:**
- 사용자 모델의 백업 코드 필드 (String, nullable)
- JSON 배열을 대칭 암호화하여 저장
- 사용된 코드는 null로 교체 (배열 크기 유지)

#### FR-005-04: 2FA 관련 데이터 모델

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| 2FA 시크릿 | String (nullable) | null | 암호화된 TOTP Secret (base32, 32자) |
| 2FA 활성화 여부 | Boolean | false | 2FA 활성화 상태 |
| 백업 코드 | String (nullable) | null | 암호화된 JSON 배열 (10개의 Backup Code) |

#### FR-005-05: License Feature Flag

- Enterprise License의 2FA Feature Flag가 true여야 활성화
- License가 비활성이면 false 반환

---

### FR-006: SSO (Single Sign-On)

#### FR-006-01: SSO Provider 정의 (5종)

SSO Provider는 Enterprise License Key가 존재할 때만 인증 시스템에 등록된다.

| # | Provider | ID | 인증 방식 | 주요 설정 |
|---|----------|----|-----------|-----------|
| 1 | GitHub | github | OAuth | GitHub 클라이언트 ID/Secret |
| 2 | Google | google | OAuth | Google 클라이언트 ID/Secret, 위험한 이메일 계정 연결 허용 |
| 3 | Azure AD | azure-ad | OAuth | Azure AD 클라이언트 ID/Secret/테넌트 ID |
| 4 | OpenID (PKCE) | openid | OAuth + PKCE | OpenID 클라이언트 ID/Secret, Issuer URL, 서명 알고리즘 (기본 RS256) |
| 5 | SAML (BoxyHQ) | saml | SAML 2.0 via OAuth bridge | 웹앱 URL 기반 엔드포인트, 위험한 이메일 계정 연결 허용 |

**OpenID Provider 상세:**
- well-known URL: Issuer URL + /.well-known/openid-configuration
- 스코프: openid email profile
- ID 토큰 사용: 활성화
- 서명 알고리즘: 환경변수로 설정 가능 (기본 RS256)
- 보안 검증: PKCE + State 체크

**SAML Provider 상세:**
- SAML 버전: 2.0
- 보안 검증: PKCE + State 체크
- 인가 URL: 웹앱 URL + /api/auth/saml/authorize
- 토큰 URL: 웹앱 URL + /api/auth/saml/token
- 사용자 정보 URL: 웹앱 URL + /api/auth/saml/userinfo
- 위험한 이메일 계정 연결: 허용

#### FR-006-02: SSO Callback 처리 흐름

SSO 콜백 핸들러는 SSO 인증 성공 후 사용자 매칭/생성을 처리한다.

**전제 조건 검증:**
1. SSO License Feature Flag 확인
2. 이메일 존재 여부 및 OAuth 계정 타입 확인
3. SAML인 경우 추가로 SAML SSO 활성화 여부 확인
   - Cloud 환경에서는 SAML 항상 비활성
   - Self-hosted: SSO 기능과 SAML 기능 모두 활성화되어야 함

**시나리오 1: 기존 SSO 계정 존재**
1. 인증 제공자 + 제공자 계정 ID로 사용자 조회
2. 이메일이 동일하면 즉시 성공 반환
3. 이메일이 변경된 경우:
   - 새 이메일로 다른 사용자가 없으면 이메일 업데이트
   - 다른 사용자가 있으면 에러: "Looks like you updated your email somewhere else..."

**시나리오 2: 기존 이메일 사용자 존재 (SSO 계정은 없음)**
1. 이메일로 사용자 조회
2. 기존 사용자가 있으면 성공 반환 (기존 계정으로 SSO 로그인 허용)

**시나리오 3: 완전한 신규 사용자**
1. 보안 검증 (Self-hosted, 비-Multi-Org 환경):
   - 초대 없는 SSO 가입 건너뛰기 설정이 false이고 Multi-Org가 비활성이면
   - Callback URL에서 invite token 추출 및 검증
   - 초대 이메일과 SSO 이메일 일치 확인
2. Organization 할당:
   - Multi-Org 비활성 + 초대 없는 SSO 가입 허용 + 기본 팀 ID 설정 시: 해당 Team의 Organization에 할당
   - Multi-Org 비활성 + 위 미설정: 첫 번째 Organization에 할당
   - Multi-Org 활성: Organization 할당 없이 사용자만 생성
3. 사용자 생성:
   - 이메일 검증 자동 완료 -- SSO 사용자는 이메일 자동 검증
   - 인증 제공자: 해당 SSO provider
   - 로케일: 자동 감지

**사용자 이름 추출 (Provider별):**

| Provider | 이름 추출 순서 |
|----------|---------------|
| OpenID | name -> given_name + family_name -> preferred_username |
| SAML | name -> firstName + lastName |
| 기타 | user.name -> 이메일 로컬 파트 정제 (특수문자 제거) |

**Organization 멤버 할당:**
- 역할: member (고정)
- OAuth 토큰 저장을 위한 Account 레코드 생성
- 기본 팀 ID 설정 시 기본 Team Membership 생성
- Notification Settings 업데이트 (Organization unsubscribe)

#### FR-006-03: SSO License Feature Flags

| Feature Flag | 설명 | Cloud | Self-hosted |
|--------------|------|-------|-------------|
| SSO | SSO 전체 활성/비활성 | License에 의해 제어 | License에 의해 제어 |
| SAML | SAML 추가 활성화 | 항상 비활성 | SSO와 SAML 모두 필요 |
| 2FA | 2FA 활성/비활성 | License에 의해 제어 | License에 의해 제어 |

---

## 5. 비기능 요구사항

### NFR-001: 암호화

- TOTP Secret: AES 대칭 암호화로 저장/복호화
- Backup Codes: JSON 배열을 대칭 암호화하여 저장
- 암호화 키 환경변수 필수

### NFR-002: TOTP 시간 윈도우

- 이전 30초 토큰 1개 허용, 미래 토큰 불허
- 서버-클라이언트 시간 차이에 대한 유연성 제공

### NFR-003: Logging

- 2FA 시도/성공/실패: 2FA 시도 로깅 함수로 기록
- SSO 콜백: 상세 디버그 로깅 (correlationId 포함)
- PII 정보 자동 제거

### NFR-004: 보안

- Backup Code 일회용 사용 (사용 후 null로 교체)
- SSO 신규 사용자: Self-hosted 환경에서 invite 없이 가입 방지 가능
- PKCE + State 체크: OpenID 및 SAML Provider 모두 적용

---

## 6. 정책/제약

| 항목 | 값 |
|------|----|
| TOTP Secret 길이 | 32자 (base32) |
| TOTP Window | 이전 1개, 미래 0개 |
| TOTP 알고리즘 | HMAC-SHA1 |
| Backup Code 개수 | 배열 (일반적으로 10개) |
| Backup Code 구분자 제거 | 하이픈 제거 후 비교 |
| SSO 신규 사용자 역할 | member (고정) |
| SSO 이메일 검증 | 자동 완료 |
| OIDC Signing Algorithm 기본값 | RS256 |
| OIDC Scope | openid email profile |
| SAML Version | 2.0 |
| SSO Provider 등록 조건 | Enterprise License Key 존재 |
| SAML Cloud 제한 | Cloud 환경에서 항상 비활성 |
| Google 위험한 이메일 계정 연결 | 허용 |
| SAML 위험한 이메일 계정 연결 | 허용 |

---

## 7. 수용 기준 (Acceptance Criteria)

### AC-005: 2FA (TOTP)
- [ ] Enterprise License의 2FA Feature Flag가 활성화되어야 2FA 설정 가능
- [ ] TOTP 코드 검증 시 현재 + 이전 30초 윈도우 허용
- [ ] TOTP Secret은 32자 base32 형식이어야 하며, 길이 불일치 시 거부
- [ ] 2FA가 활성화된 사용자가 TOTP 코드 없이 로그인 시도 시 "second factor required" 에러 반환
- [ ] 암호화 키가 없으면 2FA 검증 불가 (Internal Server Error)
- [ ] 인증 성공/실패가 Audit Log에 기록

### AC-006: Backup Code
- [ ] Backup Code 사용 시 하이픈 제거 후 비교
- [ ] 일치하는 코드 사용 후 해당 코드는 null로 교체
- [ ] 남은 코드는 다시 암호화되어 DB에 저장
- [ ] 유효하지 않은 Backup Code 사용 시 "Invalid backup code" 에러

### AC-007: SSO Provider
- [ ] Enterprise License Key가 없으면 SSO Provider가 인증 시스템에 등록되지 않음
- [ ] 5종 Provider (GitHub, Google, AzureAD, OpenID, SAML) 모두 등록 가능
- [ ] SAML은 Cloud 환경에서 항상 비활성화
- [ ] OpenID Provider는 PKCE + State 체크 적용

### AC-008: SSO Callback
- [ ] 기존 SSO 계정이 있고 이메일 동일 시 정상 로그인
- [ ] SSO Provider에서 이메일 변경 시: 충돌이 없으면 업데이트, 충돌 시 에러
- [ ] 이메일로 기존 사용자가 있으면 기존 계정으로 로그인 허용
- [ ] 신규 사용자: SSO로 자동 계정 생성, 이메일 자동 검증
- [ ] Self-hosted + 비-Multi-Org: invite 없이 신규 SSO 가입 차단 가능
- [ ] SSO 신규 사용자 Organization 역할은 member 고정
- [ ] Multi-Org 활성 시 Organization 자동 할당 없이 사용자만 생성
