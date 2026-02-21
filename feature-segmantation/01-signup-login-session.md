# 회원가입 / 로그인 / 세션 관리 -- 요구사항 명세서

> **문서번호**: FSD-001 | **FR 범위**: FR-001
> **라이선스**: Community

---

## 1. 목적/배경

Formbricks 플랫폼의 사용자 인증 시스템에 대한 요구사항을 정의한다. 이메일/비밀번호 기반의 Credentials 인증과 이메일 토큰 기반 검증을 지원하며, Next-Auth 4.24.12 (patched)를 사용하여 JWT 세션 관리를 구현한다. 보안 관점에서 Timing Attack 방지, bcrypt DoS 방지, IP 기반 Rate Limiting을 적용한다.

---

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- 이메일/비밀번호 기반 회원가입 (Credentials Provider)
- 이메일 검증 토큰 기반 로그인 (Token Provider)
- 비밀번호 재설정 (Forgot Password / Reset)
- JWT 세션 관리
- IP 기반 Rate Limiting
- Turnstile CAPTCHA 연동 (Cloudflare)
- 초대(Invite) 기반 회원가입 흐름

### Out-of-scope
- SSO/OAuth 인증 (FSD-002에서 다룸)
- 2FA/TOTP (FSD-002에서 다룸)
- 조직(Organization) 관리 (FSD-003에서 다룸)

---

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| 신규 사용자 | 회원가입 및 이메일 인증을 통해 계정을 생성하는 사용자 |
| 기존 사용자 | 이메일/비밀번호로 로그인하는 사용자 |
| 초대받은 사용자 | 조직 초대를 통해 가입하는 사용자 |
| 시스템 관리자 | Rate Limit, 이메일 검증 정책 등을 관리 |

---

## 4. 기능 요구사항

### FR-001-01: 비밀번호 유효성 검사 규칙

비밀번호는 유효성 검사 스키마를 통해 검증된다.

| 규칙 | 값 | 근거 |
|------|----|------|
| 최소 길이 | 8자 | 보안 기본 요건 |
| 최대 길이 | 128자 | bcrypt DoS 방지 (bcrypt는 72 bytes까지 처리하나 128자로 제한) |
| 대문자 포함 | 1자 이상 필수 | 대문자 포함 필수 규칙 |
| 숫자 포함 | 1자 이상 필수 | 숫자 포함 필수 규칙 |

### FR-001-02: 사용자 이름 유효성 검사

- 최소 1자, 유니코드 문자/숫자/공백/하이픈/아포스트로피 허용
- 자동 trim 처리

### FR-001-03: 이메일 유효성 검사

- 최대 255자
- 표준 이메일 형식 검증

### FR-001-04: 회원가입 흐름

회원가입은 Server Action을 통해 처리된다.

**입력 항목:**

| 필드 | 필수 | 설명 |
|------|------|------|
| 이름 | O | 사용자 이름 (유효성 검사 규칙 적용) |
| 이메일 | O | 사용자 이메일 (유효성 검사 규칙 적용) |
| 비밀번호 | O | 사용자 비밀번호 (유효성 검사 규칙 적용) |
| 초대 토큰 | X | 초대를 통한 가입 시 토큰 |
| 사용자 로케일 | X | 사용자 언어 설정 |
| 이메일 검증 비활성화 | X | 이메일 검증 생략 여부 |
| Turnstile 토큰 | X (Turnstile 설정 시 필수) | CAPTCHA 검증 토큰 |
| Cloud 여부 | O | Formbricks Cloud 환경 여부 |
| 보안 업데이트 구독 | X | 보안 메일링 리스트 구독 여부 |
| 제품 업데이트 구독 | X | 제품 메일링 리스트 구독 여부 |

**처리 흐름:**
1. IP Rate Limit 적용 (회원가입, 30회/시간)
2. Turnstile CAPTCHA 검증 (설정된 경우)
3. 비밀번호 해시 (bcrypt)
4. 사용자 생성 시도 (이메일 소문자 변환)
5. 이미 존재하는 이메일의 경우 에러를 catch하고 조용히 성공 반환 (user enumeration 방지)
6. 새 사용자인 경우:
   - **초대 토큰이 있으면**: 초대 수락 처리 (Membership 생성, Team Membership 생성, 초대 삭제)
   - **초대 토큰이 없으면**: Multi-Org가 활성화된 경우 새 Organization 자동 생성 (owner 역할)
   - 이메일 검증 메일 발송 (비활성화되지 않은 경우)
7. Mailing List 구독 처리
8. Audit Log 기록 (사용자 생성 이벤트)

### FR-001-05: 로그인 흐름 (Credentials Provider)

**처리 흐름:**
1. IP Rate Limit 적용 (로그인, 10회/15분)
2. 비밀번호 길이 사전 검증 (128자 초과 시 즉시 거부 -- bcrypt DoS 방지)
3. 이메일로 사용자 조회
4. **Timing Attack 방지**: 사용자 존재 여부와 관계없이 항상 비밀번호 검증 수행
   - 사용자가 없으면 더미 해시(CONTROL_HASH)를 사용하여 일정한 시간 소모
5. CONTROL_HASH는 bcrypt cost factor 12로 생성되어 실제 비밀번호 해시와 동일한 연산 시간을 보장
6. 사용자 상태 검증:
   - 사용자 미존재: "Invalid credentials"
   - 비밀번호 미설정 (SSO 사용자): "User has no password stored"
   - 계정 비활성화: "Your account is currently inactive"
   - 비밀번호 불일치: "Invalid credentials"
7. 2FA 활성화 시 추가 검증 (FSD-002 참조)
8. 인증 성공 시 사용자 ID, 이메일, 이메일 검증 여부 반환

### FR-001-06: 이메일 토큰 기반 검증 (Token Provider)

**처리 흐름:**
1. IP Rate Limit 적용 (이메일 검증, 10회/시간)
2. JWT 토큰 검증
3. 사용자 조회 및 상태 확인
4. 이미 인증된 이메일 거부
5. 비활성 계정 거부
6. 이메일 검증 완료 시각 업데이트
7. Brevo 고객 생성 (마케팅 연동)

### FR-001-07: 비밀번호 재설정

**입력 항목:**
- 토큰: 비밀번호 재설정용 JWT 토큰
- 비밀번호: 새 비밀번호 (유효성 검사 규칙 충족 필수)

**처리 흐름:**
1. 새 비밀번호 해시
2. JWT 토큰 검증으로 사용자 ID 추출
3. 비밀번호 업데이트
4. Audit Log 기록 (사용자 업데이트 이벤트)
5. 비밀번호 재설정 알림 이메일 발송

### FR-001-08: JWT 세션 관리

- 세션 최대 유지 시간: 환경변수로 설정 가능, 기본 86400초 (24시간)

**JWT Callback:**
- 토큰에 사용자 ID, 활성 상태(isActive) 포함

**Session Callback:**
- 세션에 사용자 ID 매핑
- 세션에 사용자 활성 상태 포함

**SignIn Callback:**
- Credentials/Token provider: 이메일 검증 여부 확인 (이메일 검증 비활성화 설정이 아닌 경우)
- SSO provider: SSO 콜백 핸들러에 위임 (Enterprise License 필요)
- 로그인 성공 시 마지막 로그인 시각 업데이트

### FR-001-09: 인증 페이지 라우팅

| 페이지 | 경로 |
|--------|------|
| 로그인 | /auth/login |
| 로그아웃 | /auth/logout |
| 에러 | /auth/login (에러 코드는 query string으로 전달) |

---

## 5. 비기능 요구사항

### NFR-001: Rate Limiting

IP 기반 Rate Limiting이 모든 인증 엔드포인트에 적용된다.

| 엔드포인트 | 허용 횟수 | 간격 |
|------------|-----------|------|
| 로그인 | 10회 | 15분 (900초) |
| 회원가입 | 30회 | 1시간 (3600초) |
| 비밀번호 재설정 요청 | 5회 | 1시간 (3600초) |
| 이메일 검증 | 10회 | 1시간 (3600초) |

### NFR-002: Timing Attack 방지

사용자 존재 여부에 관계없이 동일한 시간을 소모하도록 더미 해시(CONTROL_HASH)를 사용한 constant-time 비밀번호 검증을 수행한다. CONTROL_HASH는 bcrypt cost factor 12로 생성되어 실제 비밀번호 해시와 동일한 연산 시간을 보장한다.

### NFR-003: bcrypt DoS 방지

비밀번호 최대 128자 제한으로 bcrypt의 긴 입력에 대한 CPU-intensive 연산을 방지한다. bcrypt는 72 bytes까지만 처리하지만, 입력 전처리 과정의 DoS를 방지하기 위해 128자로 제한한다.

### NFR-004: Audit Logging

회원가입(사용자 생성), 비밀번호 재설정(사용자 업데이트), 로그인 시도/성공/실패 등이 감사 로그로 기록된다. 감사 로그 래퍼 패턴을 사용한다.

---

## 6. 정책/제약

| 항목 | 값 |
|------|----|
| 세션 최대 유지 시간 | 86400초 (24시간, 환경변수 오버라이드 가능) |
| 비밀번호 최소 길이 | 8자 |
| 비밀번호 최대 길이 | 128자 |
| 이메일 최대 길이 | 255자 |
| bcrypt cost factor | 12 (CONTROL_HASH 기준) |
| Next-Auth 버전 | 4.24.12 (patched) |
| 이메일 소문자 변환 | 회원가입 시 자동 적용 |
| SSO 활성화 조건 | Enterprise License Key 존재 시 |

### 사용자 데이터 모델

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| id | String | 자동 생성 (cuid) | 고유 식별자 |
| createdAt | DateTime | 생성 시각 | 생성일 |
| updatedAt | DateTime | 수정 시 자동 갱신 | 수정일 |
| name | String | - | 사용자 이름 |
| email | String (unique) | - | 이메일 주소 |
| emailVerified | DateTime (nullable) | null | 이메일 검증 완료 시각 |
| twoFactorSecret | String (nullable) | null | 2FA TOTP 시크릿 (암호화 저장) |
| twoFactorEnabled | Boolean | false | 2FA 활성화 여부 |
| backupCodes | String (nullable) | null | 2FA 백업 코드 (암호화 저장) |
| password | String (nullable) | null | 비밀번호 해시 (SSO 사용자는 null) |
| identityProvider | Enum | email | 인증 제공자 (email/github/google/azuread/openid/saml) |
| identityProviderAccountId | String (nullable) | null | SSO 제공자 계정 ID |
| locale | String | "en-US" | 사용자 언어 설정 |
| lastLoginAt | DateTime (nullable) | null | 마지막 로그인 시각 |
| isActive | Boolean | true | 계정 활성 상태 |

### 지원 로케일

de-DE, en-US, es-ES, fr-FR, hu-HU, ja-JP, nl-NL, pt-BR, pt-PT, ro-RO, ru-RU, sv-SE, zh-Hans-CN, zh-Hant-TW

### 인증 제공자 유형

email, github, google, azuread, openid, saml

---

## 7. 수용 기준 (Acceptance Criteria)

### AC-001: 회원가입
- [ ] 유효한 이름(1자 이상, 유니코드), 이메일(최대 255자), 비밀번호(8~128자, 대문자+숫자)로 가입 가능
- [ ] 이미 존재하는 이메일로 가입 시 에러를 노출하지 않고 성공 응답 반환 (user enumeration 방지)
- [ ] Turnstile이 설정된 환경에서 CAPTCHA 토큰 없이 가입 불가
- [ ] 가입 후 이메일 검증 메일 발송 (이메일 검증 비활성화가 false인 경우)
- [ ] 초대 토큰이 있는 경우 해당 Organization에 초대된 역할로 Membership 생성
- [ ] 초대 토큰이 없고 Multi-Org가 활성화된 경우 새 Organization 생성 (owner 역할)
- [ ] 30회/시간 Rate Limit 초과 시 요청 거부

### AC-002: 로그인
- [ ] 유효한 이메일/비밀번호로 로그인 시 JWT 세션 생성
- [ ] 존재하지 않는 사용자 로그인 시도 시 "Invalid credentials" 에러 (사용자 존재 여부 미노출)
- [ ] 128자 초과 비밀번호 입력 시 즉시 "Invalid credentials" 에러
- [ ] 비활성 계정 로그인 시 차단 메시지 반환
- [ ] 이메일 미검증 사용자는 로그인 불가 (이메일 검증 비활성화 설정이 아닌 경우)
- [ ] 10회/15분 Rate Limit 초과 시 요청 거부
- [ ] Timing Attack 방지를 위해 사용자 미존재 시에도 동일 시간 소모

### AC-003: 비밀번호 재설정
- [ ] 유효한 토큰과 새 비밀번호(규칙 충족)로 비밀번호 변경 가능
- [ ] 변경 후 알림 이메일 발송
- [ ] 만료/유효하지 않은 토큰으로 재설정 불가
- [ ] Audit Log 기록

### AC-004: 세션 관리
- [ ] JWT 세션 기본 만료 시간 24시간 (환경변수로 오버라이드 가능)
- [ ] 세션에 사용자 ID와 활성 상태 포함
- [ ] 로그인 성공 시 마지막 로그인 시각 업데이트
