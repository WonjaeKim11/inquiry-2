# 기능 명세서 (Functional Specification) -- 2FA / SSO 인증

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 버전 | 1.0 |
| 작성일 | 2026-02-21 |
| 기반 문서 | FSD-002 (2FA / SSO 인증 요구사항 명세서 v1.0) |
| 상태 | 초안 |

---

## 2. 개요

### 2.1 목적

본 문서는 Inquiry 플랫폼의 2단계 인증(2FA)과 SSO(Single Sign-On) 기능에 대한 상세 기능 명세를 정의한다. FSD-002 요구사항 명세서를 기반으로, 각 기능의 동작 흐름, 데이터 요구사항, 비즈니스 규칙, 예외 처리를 개발 및 테스트 가능한 수준으로 상세히 기술한다.

### 2.2 범위

**포함 범위:**
- TOTP 기반 2단계 인증 (활성화, 검증, 비활성화)
- Backup Code 생성, 검증, 소진 관리
- 5종 SSO Provider 설정 및 인증 흐름 (GitHub, Google, Azure AD, OpenID/PKCE, SAML/BoxyHQ)
- SSO Callback 처리 (기존 사용자 매칭, 신규 사용자 자동 프로비저닝)
- Enterprise License Feature Flag 기반 접근 제어

**제외 범위:**
- 기본 이메일/비밀번호 인증 (FSD-001 범위)
- 회원가입 흐름 (FSD-001 범위)
- RBAC 및 멤버 권한 관리 (FSD-004 범위)

### 2.3 대상 사용자

| 역할 | 설명 |
|------|------|
| Enterprise 사용자 | 2FA를 활성화하고 TOTP/Backup Code로 인증하는 사용자 |
| SSO 사용자 | GitHub, Google, Azure AD, OpenID, SAML 중 하나로 로그인하는 사용자 |
| 조직 관리자 | SSO Provider 설정을 관리하는 Organization 관리자 |
| 시스템 관리자 | Enterprise License Key, 암호화 키, SSO 환경변수 등을 관리하는 운영자 |

### 2.4 용어 정의

| 용어 | 정의 |
|------|------|
| **TOTP** | Time-based One-Time Password. RFC 6238 기반의 시간 동기화 일회용 비밀번호 |
| **2FA** | Two-Factor Authentication. 비밀번호 외에 추가 인증 수단을 요구하는 인증 방식 |
| **Backup Code** | TOTP 기기 분실 시 사용할 수 있는 일회용 복구 코드 |
| **SSO** | Single Sign-On. 하나의 인증으로 여러 시스템에 접근할 수 있는 인증 방식 |
| **PKCE** | Proof Key for Code Exchange. OAuth 2.0 인가 코드 흐름의 보안 확장 |
| **SAML** | Security Assertion Markup Language. XML 기반의 인증/인가 표준 |
| **BoxyHQ** | SAML SSO를 OAuth bridge로 제공하는 오픈소스 라이브러리 |
| **Feature Flag** | Enterprise License에 포함된 기능 활성화/비활성화 플래그 |
| **Identity Provider** | 사용자 인증을 수행하는 외부 서비스 (GitHub, Google 등) |
| **대칭 암호화** | AES 기반 암호화로, 동일한 키로 암호화/복호화를 수행하는 방식 |
| **Multi-Org** | 하나의 Inquiry 인스턴스에서 여러 Organization을 지원하는 기능 |
| **Self-hosted** | 사용자가 자체 인프라에 Inquiry를 설치/운영하는 배포 방식 |
| **Cloud** | Inquiry가 호스팅하여 SaaS로 제공하는 배포 방식 |

---

## 3. 시스템 개요

### 3.1 시스템 구성도

```
+------------------+      +--------------------+      +---------------------+
|   클라이언트      |      |   Inquiry 서버   |      |   외부 IdP           |
|   (웹 브라우저)   |      |   (Next.js App)    |      |                     |
+------------------+      +--------------------+      +---------------------+
        |                         |                           |
        |  1. 로그인 요청          |                           |
        |  (이메일+비밀번호)       |                           |
        |------------------------>|                           |
        |                         |                           |
        |  2. 2FA 필요 응답       |                           |
        |  ("second factor       |                           |
        |   required")           |                           |
        |<------------------------|                           |
        |                         |                           |
        |  3. TOTP/Backup Code   |                           |
        |  입력 후 재요청         |                           |
        |------------------------>|                           |
        |                         |  4. TOTP 검증             |
        |                         |  (OTP 라이브러리)          |
        |  5. JWT 세션 반환       |                           |
        |<------------------------|                           |
        |                         |                           |
        |  --- SSO 흐름 ---       |                           |
        |                         |                           |
        |  A. SSO 로그인 요청     |                           |
        |------------------------>|                           |
        |                         |  B. OAuth/SAML 리다이렉트 |
        |                         |-------------------------->|
        |                         |                           |
        |                         |  C. Callback + 토큰       |
        |                         |<--------------------------|
        |                         |                           |
        |                         |  D. 사용자 매칭/생성       |
        |                         |  (SSO Callback Handler)   |
        |  E. JWT 세션 반환       |                           |
        |<------------------------|                           |
```

### 3.2 주요 기능 목록 (Feature List)

| 기능 ID | 기능명 | 우선순위 | 관련 요구사항 |
|---------|--------|---------|--------------|
| FN-001 | TOTP 2FA 활성화 | 높음 | FR-005-01, FR-005-04 |
| FN-002 | TOTP 코드 검증 (로그인) | 높음 | FR-005-02 |
| FN-003 | Backup Code 검증 (로그인) | 높음 | FR-005-03 |
| FN-004 | 2FA 비활성화 | 중간 | FR-005-04 |
| FN-005 | 2FA Feature Flag 확인 | 높음 | FR-005-05 |
| FN-006 | SSO Provider 등록 | 높음 | FR-006-01 |
| FN-007 | SSO Callback 처리 | 높음 | FR-006-02 |
| FN-008 | SSO Feature Flag 확인 | 높음 | FR-006-03 |

### 3.3 기능 간 관계도

```
[FN-005: 2FA Feature Flag 확인]
        |
        v
[FN-001: TOTP 2FA 활성화] -----> [FN-004: 2FA 비활성화]
        |
        v
[FN-002: TOTP 코드 검증] <-----> [FN-003: Backup Code 검증]
   (로그인 흐름에서          (TOTP 불가 시 대안 경로)
    FSD-001과 연계)

[FN-008: SSO Feature Flag 확인]
        |
        v
[FN-006: SSO Provider 등록] -----> [FN-007: SSO Callback 처리]
                                       |
                                       v
                              (사용자 매칭/생성 -> JWT 세션)
```

- FN-001 ~ FN-005는 FSD-001의 Credentials Provider 로그인 흐름(FR-001-05)과 연계
- FN-006 ~ FN-008은 Next-Auth의 SignIn Callback에서 SSO Callback Handler로 위임되어 처리
- 모든 기능은 Enterprise License Feature Flag에 의해 게이트 제어

---

## 4. 상세 기능 명세

### 4.1 TOTP 2FA 활성화

#### 4.1.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-001 |
| 기능명 | TOTP 2FA 활성화 |
| 관련 요구사항 ID | FR-005-01, FR-005-04, FR-005-05 |
| 우선순위 | 높음 |
| 기능 설명 | 사용자가 TOTP 기반 2FA를 활성화하고, TOTP Secret과 Backup Code를 생성하여 저장하는 기능 |

#### 4.1.2 선행 조건 (Preconditions)

1. 사용자가 로그인 상태이며 유효한 JWT 세션을 보유해야 한다.
2. Enterprise License의 2FA Feature Flag(`twoFactorAuth`)가 `true`여야 한다.
3. 사용자의 `twoFactorEnabled`가 `false`여야 한다 (이미 활성화된 경우 중복 활성화 불가).
4. 환경변수에 암호화 키(`ENCRYPTION_KEY`)가 설정되어 있어야 한다.

#### 4.1.3 후행 조건 (Postconditions)

1. 사용자 레코드의 `twoFactorSecret`에 AES 대칭 암호화된 TOTP Secret이 저장된다.
2. 사용자 레코드의 `twoFactorEnabled`가 `true`로 변경된다.
3. 사용자 레코드의 `backupCodes`에 AES 대칭 암호화된 10개의 Backup Code JSON 배열이 저장된다.
4. 사용자에게 QR 코드(또는 Secret 문자열)와 Backup Code 목록이 표시된다.

#### 4.1.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | 2FA 설정 페이지에서 "2FA 활성화" 요청 |
| 2 | 시스템 | Enterprise License의 2FA Feature Flag 확인 |
| 3 | 시스템 | OTP 라이브러리를 사용하여 TOTP Secret 생성 (base32 인코딩, 32자) |
| 4 | 시스템 | 10개의 Backup Code 생성 (각 코드는 하이픈 포함 형식) |
| 5 | 시스템 | TOTP Secret을 AES 대칭 암호화하여 `twoFactorSecret` 필드에 저장 |
| 6 | 시스템 | Backup Code 배열을 JSON 직렬화 후 AES 대칭 암호화하여 `backupCodes` 필드에 저장 |
| 7 | 시스템 | `twoFactorEnabled`를 `true`로 설정 |
| 8 | 시스템 | QR 코드 URI 및 Backup Code 목록을 응답으로 반환 |
| 9 | 사용자 | TOTP 앱(Google Authenticator 등)에 QR 코드를 스캔하여 등록 |
| 10 | 사용자 | Backup Code를 안전한 장소에 보관 |

#### 4.1.5 대안 흐름 (Alternative Flow)

- **AF-001-01: QR 코드 스캔 불가 시**: 사용자는 QR 코드 대신 Secret 문자열을 수동으로 TOTP 앱에 입력할 수 있다.

#### 4.1.6 예외 흐름 (Exception Flow)

| 예외 ID | 조건 | 시스템 동작 |
|---------|------|------------|
| EX-001-01 | 2FA Feature Flag가 비활성 | 2FA 설정 UI를 비표시하거나 접근 시 비활성 상태 안내. `false` 반환 |
| EX-001-02 | 이미 2FA가 활성화된 상태 | "2FA is already enabled" 에러 반환 |
| EX-001-03 | 암호화 키 환경변수 미설정 | Internal Server Error 반환. 서버 로그에 암호화 키 미설정 경고 기록 |
| EX-001-04 | 생성된 Secret 길이가 32자가 아님 | Secret 생성 재시도 또는 에러 반환 |

#### 4.1.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-001-01 | TOTP Secret은 반드시 base32 인코딩, 32자 길이여야 한다. 32자가 아닌 Secret은 거부된다 |
| BR-001-02 | Backup Code는 정확히 10개 생성되어야 한다 |
| BR-001-03 | 모든 Secret 및 Backup Code는 AES 대칭 암호화로 저장되어야 한다 (평문 저장 금지) |
| BR-001-04 | Enterprise License가 없으면 2FA 기능에 접근할 수 없다 |
| BR-001-05 | TOTP 파라미터: window는 이전 1개 + 현재 허용/미래 불허, encoding은 base32, digest는 SHA-1 |

#### 4.1.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|-----------------|
| userId | String | O | 유효한 사용자 ID (cuid 형식) |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| secret | String | TOTP Secret (base32, 32자). 사용자에게 한 번만 노출 |
| qrCodeUri | String | TOTP 앱 등록용 QR 코드 URI (otpauth:// 형식) |
| backupCodes | String[] | 10개의 Backup Code 배열 (하이픈 포함 형식). 사용자에게 한 번만 노출 |

#### 4.1.9 화면/UI 요구사항

- 2FA 설정 섹션은 Enterprise License 활성 시에만 표시
- QR 코드 이미지와 Secret 문자열 동시 제공
- Backup Code는 복사 가능한 형태로 표시
- "Backup Code를 안전한 곳에 보관하세요" 안내 문구 표시

#### 4.1.10 비기능 요구사항

- TOTP Secret은 메모리에서 사용 후 즉시 폐기해야 한다 (암호화된 형태만 DB에 저장)
- Backup Code 생성 시 암호학적으로 안전한 난수 생성기 사용

---

### 4.2 TOTP 코드 검증 (로그인)

#### 4.2.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-002 |
| 기능명 | TOTP 코드 검증 (로그인) |
| 관련 요구사항 ID | FR-005-02 |
| 우선순위 | 높음 |
| 기능 설명 | 2FA가 활성화된 사용자의 로그인 시 TOTP 코드를 검증하여 2단계 인증을 완료하는 기능. Credentials Provider 인증 함수 내에서 처리 |

#### 4.2.2 선행 조건 (Preconditions)

1. 사용자가 이메일/비밀번호 1차 인증을 통과한 상태여야 한다 (FSD-001 FR-001-05 참조).
2. 사용자의 `twoFactorEnabled`가 `true`여야 한다.
3. 사용자의 `twoFactorSecret`이 `null`이 아니어야 한다.
4. 환경변수에 암호화 키가 설정되어 있어야 한다.

#### 4.2.3 후행 조건 (Postconditions)

1. TOTP 코드 검증 성공 시: 사용자 인증이 완료되고 JWT 세션이 발급된다.
2. TOTP 코드 검증 실패 시: 인증이 거부되고 에러가 반환된다.
3. 2FA 시도 결과(성공/실패)가 Audit Log에 기록된다.

#### 4.2.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 1차 인증(이메일/비밀번호) 통과 후 `twoFactorEnabled` 확인 |
| 2 | 시스템 | `twoFactorEnabled`가 `true`이고 TOTP 코드가 미제공인 경우: "second factor required" 에러 반환 |
| 3 | 사용자 | 2FA 입력 UI에서 6자리 TOTP 코드 입력 후 재요청 |
| 4 | 시스템 | `twoFactorSecret` 존재 확인 |
| 5 | 시스템 | 암호화 키 존재 확인 |
| 6 | 시스템 | 암호화된 `twoFactorSecret`을 AES 대칭 복호화 |
| 7 | 시스템 | 복호화된 Secret 길이가 32자인지 검증 |
| 8 | 시스템 | OTP 라이브러리로 TOTP 코드 검증 (window: 이전 1개 + 현재, 미래 불허) |
| 9 | 시스템 | 검증 성공 시 사용자 ID, 이메일, 이메일 검증 여부 반환 (JWT 세션 발급) |
| 10 | 시스템 | 2FA 시도 로깅 함수로 성공 이벤트 기록 |

#### 4.2.5 대안 흐름 (Alternative Flow)

- **AF-002-01: Backup Code 사용**: 사용자가 TOTP 앱에 접근할 수 없는 경우, TOTP 코드 대신 Backup Code를 제출할 수 있다. 이 경우 FN-003(Backup Code 검증)으로 전환된다.

#### 4.2.6 예외 흐름 (Exception Flow)

| 예외 ID | 조건 | 시스템 동작 |
|---------|------|------------|
| EX-002-01 | TOTP 코드 미제공 (2FA 활성 상태) | "second factor required" 에러 반환. 클라이언트에서 2FA 입력 UI 표시 트리거 |
| EX-002-02 | `twoFactorSecret`이 `null` | 인증 실패 처리. 데이터 무결성 오류로 로그 기록 |
| EX-002-03 | 암호화 키 미설정 | Internal Server Error 반환 |
| EX-002-04 | 복호화된 Secret 길이가 32자 아님 | 인증 실패 처리. 데이터 무결성 오류로 로그 기록 |
| EX-002-05 | TOTP 코드 불일치 | "Invalid two factor code" 에러 반환. 2FA 시도 로깅 함수로 실패 이벤트 기록 |

#### 4.2.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-002-01 | TOTP 검증 시 현재 시간 기준 이전 30초 토큰 1개를 추가로 허용한다 (서버-클라이언트 시간 차이 유연성) |
| BR-002-02 | 미래 시간 기반 토큰은 허용하지 않는다 (window의 미래 값 = 0) |
| BR-002-03 | TOTP 코드 검증은 Credentials Provider 인증 함수 내에서 1차 인증 직후에 수행된다 |
| BR-002-04 | 2FA 인증 시도(성공/실패 모두)는 반드시 Audit Log에 기록되어야 한다 |

#### 4.2.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|-----------------|
| email | String | O | 유효한 이메일 형식 |
| password | String | O | 8~128자 |
| totpCode | String | 조건부 (2FA 활성 시 필수) | 6자리 숫자 문자열 |

**출력 데이터 (성공 시):**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| id | String | 사용자 고유 식별자 |
| email | String | 사용자 이메일 |
| emailVerified | DateTime / null | 이메일 검증 완료 시각 |

#### 4.2.9 화면/UI 요구사항

- "second factor required" 응답 수신 시 TOTP 코드 입력 화면 표시
- 6자리 숫자 입력 필드
- "Backup Code 사용" 링크 제공 (FN-003으로 전환)
- 검증 실패 시 에러 메시지 표시 및 재입력 허용

#### 4.2.10 비기능 요구사항

- 로그인 Rate Limit(10회/15분)이 2FA 검증 단계에도 동일하게 적용된다 (FSD-001 참조).
- 2FA 검증 실패도 PII 정보가 자동 제거된 형태로 로그에 기록되어야 한다.

---

### 4.3 Backup Code 검증 (로그인)

#### 4.3.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-003 |
| 기능명 | Backup Code 검증 (로그인) |
| 관련 요구사항 ID | FR-005-03 |
| 우선순위 | 높음 |
| 기능 설명 | TOTP 앱에 접근할 수 없는 상황에서 Backup Code를 사용하여 2FA 인증을 완료하는 기능. 각 Backup Code는 일회용으로, 사용된 코드는 즉시 무효화됨 |

#### 4.3.2 선행 조건 (Preconditions)

1. 사용자가 이메일/비밀번호 1차 인증을 통과한 상태여야 한다.
2. 사용자의 `twoFactorEnabled`가 `true`여야 한다.
3. 사용자의 `backupCodes` 필드가 `null`이 아니어야 한다.
4. 환경변수에 암호화 키가 설정되어 있어야 한다.
5. 사용 가능한 Backup Code가 최소 1개 남아 있어야 한다 (배열 내 `null`이 아닌 요소 존재).

#### 4.3.3 후행 조건 (Postconditions)

1. 검증 성공 시: 인증이 완료되고 JWT 세션이 발급된다.
2. 사용된 Backup Code의 배열 인덱스가 `null`로 교체된다 (배열 크기는 유지).
3. 업데이트된 Backup Code 배열이 재암호화되어 DB에 저장된다.
4. Backup Code 사용 이벤트가 Audit Log에 기록된다.

#### 4.3.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | 2FA 입력 화면에서 "Backup Code 사용" 선택 |
| 2 | 사용자 | Backup Code 입력 후 제출 |
| 3 | 시스템 | 암호화 키 존재 확인 |
| 4 | 시스템 | 암호화된 `backupCodes`를 AES 대칭 복호화 |
| 5 | 시스템 | 복호화된 문자열을 JSON 배열로 파싱 |
| 6 | 시스템 | 입력된 Backup Code에서 하이픈 제거 |
| 7 | 시스템 | 배열 내 각 요소에서 하이픈 제거 후 입력 코드와 비교 |
| 8 | 시스템 | 일치하는 코드 발견 시: 해당 인덱스를 `null`로 교체 |
| 9 | 시스템 | 업데이트된 배열을 JSON 직렬화 후 AES 대칭 암호화 |
| 10 | 시스템 | 암호화된 배열을 DB의 `backupCodes` 필드에 업데이트 |
| 11 | 시스템 | Audit Log에 Backup Code 사용 이벤트 기록 |
| 12 | 시스템 | 인증 성공 응답 반환 (사용자 ID, 이메일, 이메일 검증 여부) |

#### 4.3.5 대안 흐름 (Alternative Flow)

- **AF-003-01: TOTP 코드로 전환**: 사용자가 Backup Code 대신 TOTP 코드 입력으로 돌아갈 수 있다. 이 경우 FN-002로 전환된다.

#### 4.3.6 예외 흐름 (Exception Flow)

| 예외 ID | 조건 | 시스템 동작 |
|---------|------|------------|
| EX-003-01 | 암호화 키 미설정 | Internal Server Error 반환 |
| EX-003-02 | `backupCodes`가 `null` | 인증 실패 처리. "No backup codes available" 안내 |
| EX-003-03 | 입력된 코드와 일치하는 Backup Code 없음 | "Invalid backup code" 에러 반환 |
| EX-003-04 | 모든 Backup Code가 사용됨 (배열 내 모든 요소가 `null`) | "No backup codes remaining" 에러 반환. 2FA 재설정 안내 |
| EX-003-05 | JSON 파싱 실패 | Internal Server Error 반환. 데이터 무결성 오류 로그 기록 |

#### 4.3.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-003-01 | Backup Code는 일회용이다. 한 번 사용된 코드는 `null`로 교체되어 재사용이 불가하다 |
| BR-003-02 | Backup Code 비교 시 하이픈은 제거된 상태로 비교한다 |
| BR-003-03 | 배열 크기는 사용 여부와 관계없이 항상 유지된다 (사용된 슬롯은 `null`로 표시) |
| BR-003-04 | Backup Code 사용 후 남은 코드 목록은 반드시 재암호화되어 DB에 저장되어야 한다 |
| BR-003-05 | Backup Code 사용 이벤트는 반드시 Audit Log에 기록되어야 한다 |

#### 4.3.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|-----------------|
| email | String | O | 유효한 이메일 형식 |
| password | String | O | 8~128자 |
| backupCode | String | O | Backup Code 형식 (하이픈 포함/미포함 모두 허용) |

**출력 데이터 (성공 시):**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| id | String | 사용자 고유 식별자 |
| email | String | 사용자 이메일 |
| emailVerified | DateTime / null | 이메일 검증 완료 시각 |

**DB 저장 구조 (backupCodes):**

```json
// 초기 상태 (10개 코드, 암호화 전)
["abcd-1234", "efgh-5678", "ijkl-9012", ..., "wxyz-3456"]

// 3번째 코드 사용 후
["abcd-1234", "efgh-5678", null, ..., "wxyz-3456"]

// 모든 코드 소진
[null, null, null, null, null, null, null, null, null, null]
```

#### 4.3.9 화면/UI 요구사항

- Backup Code 입력 필드 (단일 텍스트 입력)
- 하이픈 포함/미포함 모두 허용하는 안내 문구
- "TOTP 코드 입력으로 돌아가기" 링크
- 남은 Backup Code 개수 표시 (선택사항)

#### 4.3.10 비기능 요구사항

- 로그인 Rate Limit(10회/15분)이 Backup Code 검증에도 적용된다.
- Backup Code 비교 시 timing-safe comparison을 사용해야 한다.

---

### 4.4 2FA 비활성화

#### 4.4.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-004 |
| 기능명 | 2FA 비활성화 |
| 관련 요구사항 ID | FR-005-04 |
| 우선순위 | 중간 |
| 기능 설명 | 활성화된 2FA를 비활성화하여 TOTP Secret과 Backup Code를 삭제하고, 이후 로그인 시 2FA 없이 인증할 수 있도록 하는 기능 |

#### 4.4.2 선행 조건 (Preconditions)

1. 사용자가 로그인 상태이며 유효한 JWT 세션을 보유해야 한다.
2. 사용자의 `twoFactorEnabled`가 `true`여야 한다.

#### 4.4.3 후행 조건 (Postconditions)

1. 사용자 레코드의 `twoFactorEnabled`가 `false`로 변경된다.
2. 사용자 레코드의 `twoFactorSecret`이 `null`로 설정된다.
3. 사용자 레코드의 `backupCodes`가 `null`로 설정된다.

#### 4.4.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | 2FA 설정 페이지에서 "2FA 비활성화" 요청 |
| 2 | 시스템 | 현재 사용자의 `twoFactorEnabled` 상태 확인 |
| 3 | 시스템 | `twoFactorEnabled`를 `false`로 설정 |
| 4 | 시스템 | `twoFactorSecret`을 `null`로 설정 |
| 5 | 시스템 | `backupCodes`를 `null`로 설정 |
| 6 | 시스템 | 비활성화 완료 응답 반환 |

#### 4.4.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.4.6 예외 흐름 (Exception Flow)

| 예외 ID | 조건 | 시스템 동작 |
|---------|------|------------|
| EX-004-01 | 2FA가 이미 비활성 상태 | "2FA is not enabled" 에러 반환 |

#### 4.4.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-004-01 | 2FA 비활성화 시 TOTP Secret과 Backup Code는 DB에서 완전히 제거되어야 한다 (`null`로 설정) |
| BR-004-02 | 비활성화 후 재활성화 시 새로운 TOTP Secret과 Backup Code가 생성된다 (이전 Secret/Code 복원 불가) |

#### 4.4.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|-----------------|
| userId | String | O | 유효한 사용자 ID (세션에서 추출) |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| success | Boolean | 비활성화 성공 여부 |

#### 4.4.9 화면/UI 요구사항

- 2FA 비활성화 확인 다이얼로그 표시 (실수 방지)
- 비활성화 성공 후 상태 갱신

#### 4.4.10 비기능 요구사항

해당 없음.

---

### 4.5 2FA Feature Flag 확인

#### 4.5.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-005 |
| 기능명 | 2FA Feature Flag 확인 |
| 관련 요구사항 ID | FR-005-05 |
| 우선순위 | 높음 |
| 기능 설명 | Enterprise License의 2FA Feature Flag 상태를 확인하여 2FA 기능 접근을 제어하는 기능 |

#### 4.5.2 선행 조건 (Preconditions)

1. Enterprise License Key가 환경변수에 설정되어 있어야 한다.

#### 4.5.3 후행 조건 (Postconditions)

1. Feature Flag 상태(`true`/`false`)가 반환된다.

#### 4.5.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | Enterprise License Key 존재 확인 |
| 2 | 시스템 | License 서버에서 Feature Flag 조회 (캐시 우선: Memory 1분, Redis 24시간) |
| 3 | 시스템 | `twoFactorAuth` Feature Flag 값 반환 |

#### 4.5.5 대안 흐름 (Alternative Flow)

- **AF-005-01: License 서버 접근 불가**: Grace Period(3일) 동안 이전 캐시된 결과를 사용한다. 이전 결과 TTL은 4일이다.

#### 4.5.6 예외 흐름 (Exception Flow)

| 예외 ID | 조건 | 시스템 동작 |
|---------|------|------------|
| EX-005-01 | Enterprise License Key 미설정 | `false` 반환 (2FA 비활성 상태) |
| EX-005-02 | License 만료 | `false` 반환 |
| EX-005-03 | License 서버 접근 불가 + Grace Period 초과 | `false` 반환 |

#### 4.5.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-005-01 | Enterprise License가 비활성이면 `false`를 반환한다 |
| BR-005-02 | License 결과는 Memory Cache(1분 TTL)와 Redis Cache(24시간 TTL)로 캐싱된다 |
| BR-005-03 | License 서버 접근 불가 시 Grace Period(3일) 동안 이전 결과 유지 (이전 결과 TTL: 4일) |
| BR-005-04 | License API 재시도: 최대 3회, 지수 백오프, 대상 HTTP 상태 코드 429/502/503/504 |

#### 4.5.8 데이터 요구사항

**입력 데이터:**

없음 (시스템 환경변수에서 License Key를 읽음).

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| twoFactorAuth | Boolean | 2FA Feature Flag 활성 여부 |

#### 4.5.9 화면/UI 요구사항

해당 없음 (내부 시스템 로직).

#### 4.5.10 비기능 요구사항

- License 확인 API 호출은 캐싱을 통해 최소화해야 한다.
- License 재확인 Rate Limit: 5회/분.

---

### 4.6 SSO Provider 등록

#### 4.6.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-006 |
| 기능명 | SSO Provider 등록 |
| 관련 요구사항 ID | FR-006-01, FR-006-03 |
| 우선순위 | 높음 |
| 기능 설명 | Enterprise License Key가 존재할 때 5종의 SSO Provider(GitHub, Google, Azure AD, OpenID/PKCE, SAML/BoxyHQ)를 Next-Auth 인증 시스템에 등록하는 기능 |

#### 4.6.2 선행 조건 (Preconditions)

1. Enterprise License Key가 환경변수에 설정되어 있어야 한다.
2. 각 Provider별 필수 환경변수가 설정되어 있어야 한다 (아래 상세 참조).

#### 4.6.3 후행 조건 (Postconditions)

1. 조건을 충족하는 SSO Provider가 Next-Auth의 인증 Provider 목록에 등록된다.
2. 등록된 Provider의 로그인 버튼이 로그인 페이지에 표시된다.

#### 4.6.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 서버 시작 시 Enterprise License Key 존재 여부 확인 |
| 2 | 시스템 | License Key가 존재하면 각 Provider별 환경변수 확인 |
| 3 | 시스템 | 환경변수가 설정된 Provider를 Next-Auth Provider 목록에 등록 |
| 4 | 시스템 | SAML의 경우 추가 조건 확인 (Cloud 환경 여부) |
| 5 | 시스템 | 등록된 Provider 목록을 로그인 페이지에 반영 |

**Provider별 등록 조건 및 설정:**

| # | Provider | ID | 필수 환경변수 | 추가 조건 |
|---|----------|----|-------------|-----------|
| 1 | GitHub | `github` | GitHub 클라이언트 ID, GitHub 클라이언트 Secret | 없음 |
| 2 | Google | `google` | Google 클라이언트 ID, Google 클라이언트 Secret | 위험한 이메일 계정 연결 허용 설정 |
| 3 | Azure AD | `azure-ad` | Azure AD 클라이언트 ID, Azure AD 클라이언트 Secret, Azure AD 테넌트 ID | 없음 |
| 4 | OpenID | `openid` | OpenID 클라이언트 ID, OpenID 클라이언트 Secret, OpenID Issuer URL | PKCE + State 체크 활성화. 서명 알고리즘 환경변수 (기본 RS256) |
| 5 | SAML | `saml` | 웹앱 URL | Cloud 환경에서 항상 비활성. Self-hosted에서 SSO + SAML Feature Flag 모두 필요 |

#### 4.6.5 대안 흐름 (Alternative Flow)

- **AF-006-01: 일부 Provider만 설정**: 환경변수가 설정된 Provider만 등록되고, 미설정 Provider는 무시된다.

#### 4.6.6 예외 흐름 (Exception Flow)

| 예외 ID | 조건 | 시스템 동작 |
|---------|------|------------|
| EX-006-01 | Enterprise License Key 미설정 | SSO Provider를 등록하지 않음. 로그인 페이지에 SSO 버튼 미표시 |
| EX-006-02 | Provider 환경변수 불완전 | 해당 Provider만 등록하지 않음 (다른 Provider에 영향 없음) |
| EX-006-03 | Cloud 환경에서 SAML 시도 | SAML Provider 등록하지 않음 |

#### 4.6.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-006-01 | SSO Provider는 Enterprise License Key가 존재할 때만 등록된다 |
| BR-006-02 | SAML은 Cloud 환경에서 항상 비활성이다 |
| BR-006-03 | Self-hosted에서 SAML을 사용하려면 SSO Feature Flag와 SAML Feature Flag가 모두 활성이어야 한다 |
| BR-006-04 | OpenID Provider는 PKCE + State 체크가 반드시 적용되어야 한다 |
| BR-006-05 | SAML Provider는 PKCE + State 체크가 반드시 적용되어야 한다 |
| BR-006-06 | Google Provider와 SAML Provider는 위험한 이메일 계정 연결이 허용된다 |
| BR-006-07 | OpenID Provider의 기본 서명 알고리즘은 RS256이며 환경변수로 변경 가능하다 |

#### 4.6.8 데이터 요구사항

**OpenID Provider 상세 설정:**

| 설정 항목 | 값 |
|-----------|-----|
| Well-known URL | `{Issuer URL}/.well-known/openid-configuration` |
| Scope | `openid email profile` |
| ID Token 사용 | 활성화 |
| 서명 알고리즘 | 환경변수 설정 가능 (기본 RS256) |
| 보안 검증 | PKCE + State 체크 |

**SAML Provider 상세 설정:**

| 설정 항목 | 값 |
|-----------|-----|
| SAML Version | 2.0 |
| 인가 URL | `{웹앱 URL}/api/auth/saml/authorize` |
| 토큰 URL | `{웹앱 URL}/api/auth/saml/token` |
| 사용자 정보 URL | `{웹앱 URL}/api/auth/saml/userinfo` |
| 보안 검증 | PKCE + State 체크 |
| 위험한 이메일 계정 연결 | 허용 |

#### 4.6.9 화면/UI 요구사항

- 등록된 SSO Provider별 로그인 버튼이 로그인 페이지에 표시
- Enterprise License가 없으면 SSO 관련 UI 미표시

#### 4.6.10 비기능 요구사항

- Auth 라이브러리: next-auth 4.24.12 (패치 버전)
- SAML: BoxyHQ SAML 라이브러리 사용
- SAML 기본 설정: Tenant `formbricks.com`, Product `formbricks`, Audience `https://saml.formbricks.com`

---

### 4.7 SSO Callback 처리

#### 4.7.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-007 |
| 기능명 | SSO Callback 처리 |
| 관련 요구사항 ID | FR-006-02 |
| 우선순위 | 높음 |
| 기능 설명 | SSO 인증 성공 후 Callback을 처리하여 기존 사용자를 매칭하거나 신규 사용자를 자동 프로비저닝하는 기능. 3가지 시나리오(기존 SSO 계정, 기존 이메일 사용자, 신규 사용자)를 처리 |

#### 4.7.2 선행 조건 (Preconditions)

1. SSO License Feature Flag가 활성 상태여야 한다.
2. 사용자가 외부 IdP에서 인증을 완료하고 Callback URL로 리다이렉트된 상태여야 한다.
3. Callback에 사용자 프로필 정보(이메일, 이름 등)가 포함되어 있어야 한다.

#### 4.7.3 후행 조건 (Postconditions)

1. **기존 SSO 계정**: 기존 사용자로 인증 완료. 이메일 변경 시 업데이트.
2. **기존 이메일 사용자**: 기존 계정으로 SSO 로그인 허용.
3. **신규 사용자**: 새 사용자 계정 생성, 이메일 자동 검증, Organization/Team 할당 완료.

#### 4.7.4 기본 흐름 (Basic Flow)

**공통 전제 조건 검증:**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | SSO License Feature Flag 확인 |
| 2 | 시스템 | Callback에서 이메일 존재 여부 확인 |
| 3 | 시스템 | OAuth 계정 타입 확인 |
| 4 | 시스템 | SAML인 경우 추가 조건 검증 (아래 참조) |

**SAML 추가 조건 검증:**

| 환경 | 조건 |
|------|------|
| Cloud | SAML 항상 비활성 --> Callback 거부 |
| Self-hosted | SSO Feature Flag와 SAML Feature Flag 모두 활성이어야 함 |

**시나리오 1: 기존 SSO 계정 존재**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | `identityProvider` + `identityProviderAccountId`로 사용자 조회 |
| 2-A | 시스템 | 이메일이 동일한 경우: 즉시 인증 성공 반환 |
| 2-B | 시스템 | 이메일이 변경된 경우: 새 이메일로 다른 사용자 존재 여부 확인 |
| 3-B-1 | 시스템 | 다른 사용자 없음: 이메일 업데이트 후 인증 성공 반환 |
| 3-B-2 | 시스템 | 다른 사용자 있음: 에러 반환 "Looks like you updated your email somewhere else..." |

**시나리오 2: 기존 이메일 사용자 존재 (SSO 계정 없음)**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 이메일로 사용자 조회 |
| 2 | 시스템 | 기존 사용자 발견: 기존 계정으로 인증 성공 반환 (SSO 로그인 허용) |

**시나리오 3: 완전한 신규 사용자**

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 보안 검증 수행 (Self-hosted + 비-Multi-Org 환경에서) |
| 2 | 시스템 | Organization 할당 결정 (아래 규칙 참조) |
| 3 | 시스템 | 사용자 생성 (이메일 검증 자동 완료, 로케일 자동 감지) |
| 4 | 시스템 | Account 레코드 생성 (OAuth 토큰 저장) |
| 5 | 시스템 | Organization 멤버십 생성 (역할: member) |
| 6 | 시스템 | 기본 Team Membership 생성 (기본 팀 ID 설정 시) |
| 7 | 시스템 | Notification Settings 업데이트 |
| 8 | 시스템 | 인증 성공 반환 |

#### 4.7.5 대안 흐름 (Alternative Flow)

- **AF-007-01: Multi-Org 활성 환경의 신규 사용자**: Organization 할당 없이 사용자만 생성된다. 사용자는 이후 Organization을 직접 생성하거나 초대를 받아야 한다.
- **AF-007-02: 초대 토큰이 있는 신규 사용자**: Callback URL에서 invite token을 추출하여 해당 Organization에 할당된다.

#### 4.7.6 예외 흐름 (Exception Flow)

| 예외 ID | 조건 | 시스템 동작 |
|---------|------|------------|
| EX-007-01 | SSO Feature Flag 비활성 | Callback 처리 거부 |
| EX-007-02 | Callback에 이메일 미포함 | 인증 실패. 에러 로그 기록 |
| EX-007-03 | Cloud 환경에서 SAML Callback | Callback 처리 거부 |
| EX-007-04 | Self-hosted SAML: SSO 또는 SAML Flag 비활성 | Callback 처리 거부 |
| EX-007-05 | 기존 SSO 계정의 이메일 변경 시 충돌 | "Looks like you updated your email somewhere else..." 에러 반환 |
| EX-007-06 | Self-hosted + 비-Multi-Org: 초대 없는 SSO 가입 차단 설정이 `false`이고 invite token 없음 | 가입 거부 |
| EX-007-07 | 초대 이메일과 SSO 이메일 불일치 | 가입 거부 |

#### 4.7.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-007-01 | SSO로 생성된 사용자의 이메일은 자동으로 검증 완료 처리된다 |
| BR-007-02 | SSO 신규 사용자의 Organization 역할은 `member`로 고정된다 |
| BR-007-03 | Organization 할당 규칙 (아래 우선순위대로 적용): |
| | 1) Multi-Org 비활성 + 초대 없는 SSO 가입 허용 + 기본 팀 ID 설정: 해당 Team의 Organization에 할당 |
| | 2) Multi-Org 비활성 + 위 미설정: 첫 번째 Organization에 할당 |
| | 3) Multi-Org 활성: Organization 할당 없이 사용자만 생성 |
| BR-007-04 | Provider별 사용자 이름 추출 규칙: |
| | - OpenID: `name` --> `given_name` + ` ` + `family_name` --> `preferred_username` |
| | - SAML: `name` --> `firstName` + ` ` + `lastName` |
| | - 기타(GitHub, Google, Azure AD): `user.name` --> 이메일 로컬 파트에서 특수문자 제거 |
| BR-007-05 | Self-hosted + 비-Multi-Org 환경에서 `초대 없는 SSO 가입 건너뛰기` 설정이 `false`이고 Multi-Org가 비활성이면, invite token이 반드시 필요하다 |
| BR-007-06 | invite token 사용 시 초대 이메일과 SSO 이메일이 일치해야 한다 |
| BR-007-07 | 기본 팀 ID가 설정된 경우 기본 Team Membership이 자동 생성된다 |

#### 4.7.8 데이터 요구사항

**입력 데이터 (SSO Callback):**

| 필드명 | 타입 | 필수 | 출처 |
|--------|------|------|------|
| provider | String | O | OAuth/SAML 인증 흐름 |
| providerAccountId | String | O | 외부 IdP |
| email | String | O | 외부 IdP의 사용자 프로필 |
| name | String | X | 외부 IdP의 사용자 프로필 (Provider별 추출 규칙 적용) |
| access_token | String | O | OAuth 토큰 |
| callbackUrl | String | X | Callback URL (invite token 추출용) |

**생성 데이터 (신규 사용자):**

| 필드명 | 타입 | 값 |
|--------|------|-----|
| id | String | 자동 생성 (cuid) |
| email | String | SSO에서 제공받은 이메일 |
| emailVerified | DateTime | 현재 시각 (자동 검증 완료) |
| name | String | Provider별 이름 추출 규칙에 따른 값 |
| identityProvider | Enum | `github` / `google` / `azuread` / `openid` / `saml` |
| identityProviderAccountId | String | 외부 IdP의 계정 ID |
| locale | String | 자동 감지된 로케일 |
| isActive | Boolean | `true` |

#### 4.7.9 화면/UI 요구사항

- SSO 로그인 중 로딩 표시
- 에러 발생 시 에러 페이지로 리다이렉트 (에러 코드 query string 포함)
- 신규 사용자 생성 완료 후 대시보드로 리다이렉트

#### 4.7.10 비기능 요구사항

- SSO Callback은 상세 디버그 로깅 포함 (correlationId 포함).
- PII 정보(이메일 등)는 로그에서 자동 제거되어야 한다.
- Callback 처리 시간은 API 응답 시간 목표(평균 2초 이내) 내에 완료되어야 한다.

---

### 4.8 SSO Feature Flag 확인

#### 4.8.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-008 |
| 기능명 | SSO Feature Flag 확인 |
| 관련 요구사항 ID | FR-006-03 |
| 우선순위 | 높음 |
| 기능 설명 | Enterprise License의 SSO 및 SAML Feature Flag 상태를 확인하여 SSO 기능 접근을 제어하는 기능 |

#### 4.8.2 선행 조건 (Preconditions)

1. Enterprise License Key가 환경변수에 설정되어 있어야 한다.

#### 4.8.3 후행 조건 (Postconditions)

1. SSO 및 SAML Feature Flag 상태가 반환된다.

#### 4.8.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | Enterprise License Key 존재 확인 |
| 2 | 시스템 | License 서버에서 Feature Flag 조회 (캐시 우선) |
| 3 | 시스템 | SSO Feature Flag 및 SAML Feature Flag 값 반환 |

#### 4.8.5 대안 흐름 (Alternative Flow)

- **AF-008-01: License 서버 접근 불가**: FN-005와 동일하게 Grace Period(3일) 동안 이전 캐시 결과를 사용한다.

#### 4.8.6 예외 흐름 (Exception Flow)

| 예외 ID | 조건 | 시스템 동작 |
|---------|------|------------|
| EX-008-01 | Enterprise License Key 미설정 | SSO: `false`, SAML: `false` 반환 |
| EX-008-02 | License 만료 | SSO: `false`, SAML: `false` 반환 |

#### 4.8.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-008-01 | SSO Feature Flag는 License에 의해 제어된다 (Cloud, Self-hosted 모두 동일) |
| BR-008-02 | SAML Feature Flag는 Cloud 환경에서 항상 비활성이다 |
| BR-008-03 | Self-hosted에서 SAML을 사용하려면 SSO Feature Flag와 SAML Feature Flag가 모두 활성이어야 한다 |

**Feature Flag 매트릭스:**

| Feature Flag | Cloud | Self-hosted |
|--------------|-------|-------------|
| SSO | License에 의해 제어 | License에 의해 제어 |
| SAML | 항상 비활성 | SSO와 SAML 모두 필요 |
| 2FA | License에 의해 제어 | License에 의해 제어 |

#### 4.8.8 데이터 요구사항

**입력 데이터:**

없음 (시스템 환경변수에서 License Key를 읽음).

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| sso | Boolean | SSO Feature Flag 활성 여부 |
| saml | Boolean | SAML Feature Flag 활성 여부 |

#### 4.8.9 화면/UI 요구사항

해당 없음 (내부 시스템 로직).

#### 4.8.10 비기능 요구사항

- FN-005와 동일한 캐싱 및 Grace Period 정책 적용.

---

## 5. 데이터 모델

### 5.1 주요 엔티티 정의

**User (사용자) - 2FA 관련 필드:**

| 필드 | 타입 | 기본값 | Nullable | 설명 |
|------|------|--------|----------|------|
| twoFactorSecret | String | - | Yes | AES 대칭 암호화된 TOTP Secret (base32, 32자) |
| twoFactorEnabled | Boolean | `false` | No | 2FA 활성화 상태 |
| backupCodes | String | - | Yes | AES 대칭 암호화된 JSON 배열 (10개 Backup Code) |

**User (사용자) - SSO 관련 필드:**

| 필드 | 타입 | 기본값 | Nullable | 설명 |
|------|------|--------|----------|------|
| identityProvider | Enum | `email` | No | 인증 제공자: `email`, `github`, `google`, `azuread`, `openid`, `saml` |
| identityProviderAccountId | String | - | Yes | 외부 IdP의 계정 고유 ID |
| emailVerified | DateTime | - | Yes | 이메일 검증 완료 시각 (SSO 사용자는 생성 시 자동 설정) |

**Account (OAuth 계정):**

| 필드 | 타입 | 설명 |
|------|------|------|
| userId | String | 사용자 ID (FK -> User) |
| type | String | 계정 유형 (oauth) |
| provider | String | Provider ID (github, google, azure-ad, openid, saml) |
| providerAccountId | String | 외부 Provider 계정 ID |
| access_token | String | OAuth Access Token |
| refresh_token | String | OAuth Refresh Token (선택적) |
| expires_at | Int | 토큰 만료 시각 |

**Membership (Organization 멤버십 - SSO 신규 사용자 관련):**

| 필드 | 타입 | 설명 |
|------|------|------|
| userId | String | 사용자 ID (FK -> User) |
| organizationId | String | Organization ID (FK -> Organization) |
| role | Enum | 역할: SSO 신규 사용자는 `member` 고정 |

### 5.2 엔티티 간 관계

```
User (1) -----> (N) Account
  |                    (OAuth 토큰 저장)
  |
  +-----> (N) Membership
  |              |
  |              +-----> (1) Organization
  |
  +-----> (N) TeamMembership
                 |
                 +-----> (1) Team
```

- User : Account = 1 : N (하나의 사용자가 여러 SSO Provider로 연결 가능)
- User : Membership = 1 : N (하나의 사용자가 여러 Organization에 소속 가능)
- User : TeamMembership = 1 : N (하나의 사용자가 여러 Team에 소속 가능)

### 5.3 데이터 흐름

**2FA 활성화 데이터 흐름:**
```
TOTP Secret 생성 --> AES 암호화 --> User.twoFactorSecret 저장
Backup Code 생성 --> JSON 직렬화 --> AES 암호화 --> User.backupCodes 저장
User.twoFactorEnabled = true
```

**2FA 검증 데이터 흐름:**
```
User.twoFactorSecret 조회 --> AES 복호화 --> Secret 길이 검증(32자) --> TOTP 검증
                                                                     |
User.backupCodes 조회 --> AES 복호화 --> JSON 파싱 --> 코드 비교 -----+
                                                          |
                                         (일치 시) null 교체 --> JSON 직렬화 --> AES 암호화 --> DB 업데이트
```

**SSO Callback 데이터 흐름:**
```
외부 IdP Callback
    |
    v
Feature Flag 확인 --> 사용자 조회 (identityProvider + accountId)
    |                      |
    |                   [존재]  --> 이메일 확인 --> [동일] 성공 / [변경] 업데이트 또는 에러
    |
    +--- 이메일로 사용자 조회
    |         |
    |      [존재]  --> 기존 계정으로 로그인 허용
    |
    +--- [미존재] --> 보안 검증 --> Organization 할당 --> 사용자 생성
                                                         |
                                                         v
                                                   Account 생성
                                                   Membership 생성 (role: member)
                                                   TeamMembership 생성 (선택적)
                                                   Notification Settings 업데이트
```

---

## 6. 인터페이스 명세

### 6.1 외부 시스템 연동

| 시스템 | 연동 방식 | 용도 |
|--------|----------|------|
| GitHub OAuth | OAuth 2.0 | GitHub SSO 인증 |
| Google OAuth | OAuth 2.0 | Google SSO 인증 |
| Azure AD | OAuth 2.0 | Azure AD SSO 인증 |
| OpenID Connect Provider | OAuth 2.0 + PKCE | OpenID SSO 인증 |
| BoxyHQ SAML | SAML 2.0 via OAuth bridge | SAML SSO 인증 |
| Enterprise License Server | HTTPS API | Feature Flag 조회 |

### 6.2 API 명세

**SSO Provider 환경변수 인터페이스:**

| Provider | 환경변수 | 필수 |
|----------|---------|------|
| GitHub | GitHub Client ID | O |
| GitHub | GitHub Client Secret | O |
| Google | Google Client ID | O |
| Google | Google Client Secret | O |
| Azure AD | Azure AD Client ID | O |
| Azure AD | Azure AD Client Secret | O |
| Azure AD | Azure AD Tenant ID | O |
| OpenID | OpenID Client ID | O |
| OpenID | OpenID Client Secret | O |
| OpenID | OpenID Issuer URL | O |
| OpenID | OpenID Signing Algorithm | X (기본 RS256) |
| SAML | SAML DB URL | O (Self-hosted) |
| 공통 | Enterprise License Key | O |
| 공통 | Encryption Key | O |
| 공통 | Web App URL | O |

**Next-Auth Callback URL 패턴:**

| Provider | Callback URL |
|----------|-------------|
| GitHub | `{웹앱 URL}/api/auth/callback/github` |
| Google | `{웹앱 URL}/api/auth/callback/google` |
| Azure AD | `{웹앱 URL}/api/auth/callback/azure-ad` |
| OpenID | `{웹앱 URL}/api/auth/callback/openid` |
| SAML | `{웹앱 URL}/api/auth/callback/saml` |

---

## 7. 비기능 요구사항

### 7.1 성능 요구사항

| 항목 | 목표 |
|------|------|
| 2FA 검증 응답 시간 | TOTP 검증 포함하여 평균 2초 이내 |
| SSO Callback 처리 시간 | 사용자 매칭/생성 포함하여 평균 2초 이내 |
| License Feature Flag 조회 | 캐시 히트 시 밀리초 단위, 캐시 미스 시 License API 호출 |
| License 캐시 TTL | Memory: 1분, Redis: 24시간 |

### 7.2 보안 요구사항

| 항목 | 요구사항 |
|------|---------|
| TOTP Secret 암호화 | AES 대칭 암호화로 DB 저장. 평문 저장 금지 |
| Backup Code 암호화 | JSON 배열을 AES 대칭 암호화로 DB 저장 |
| Backup Code 일회용 | 사용 후 해당 코드 `null`로 교체. 재사용 불가 |
| 암호화 키 관리 | 환경변수로 관리. 코드에 하드코딩 금지 |
| SSO 보안 검증 | OpenID: PKCE + State 체크. SAML: PKCE + State 체크 |
| SSO 신규 사용자 제한 | Self-hosted 환경에서 invite 없이 가입 방지 가능 |
| 인증 로그인 Rate Limit | 10회/15분 (FSD-001과 동일하게 2FA 검증에도 적용) |
| PII 보호 | 로그에서 PII 정보(이메일 등) 자동 제거 |

### 7.3 가용성 요구사항

| 항목 | 요구사항 |
|------|---------|
| License Grace Period | 3일 (License 서버 접근 불가 시 유예) |
| License 이전 결과 TTL | 4일 |
| License API Retry | 최대 3회, 지수 백오프 |
| Retry 대상 HTTP 상태 | 429, 502, 503, 504 |

---

## 8. 제약사항 및 가정

### 8.1 기술적 제약사항

| 항목 | 제약 |
|------|------|
| 인증 라이브러리 | next-auth 4.24.12 (패치 버전) 사용 |
| SAML 라이브러리 | BoxyHQ SAML 라이브러리 사용 |
| TOTP 라이브러리 | OTP 라이브러리 사용 (base32 인코딩, SHA-1 digest) |
| TOTP Secret 길이 | 32자 (base32) 고정. 미달 시 거부 |
| TOTP Window | 이전 1개, 미래 0개 |
| Backup Code 개수 | 10개 고정 |
| 암호화 방식 | AES 대칭 암호화 |
| SSO Provider 최대 수 | 5종 (GitHub, Google, Azure AD, OpenID, SAML) |

### 8.2 비즈니스 제약사항

| 항목 | 제약 |
|------|------|
| 라이선스 | 2FA, SSO 모두 Enterprise License 필수 |
| SAML Cloud 제한 | Cloud 환경에서 SAML은 지원하지 않음 |
| SSO 신규 사용자 역할 | `member` 고정 (관리자 역할 자동 할당 불가) |
| SSO 이메일 검증 | 자동 완료 (별도 검증 절차 없음) |
| OIDC 서명 알고리즘 기본값 | RS256 |

### 8.3 가정사항

| 항목 | 가정 |
|------|------|
| 외부 IdP 가용성 | 외부 SSO Provider(GitHub, Google 등)가 정상 운영 중인 것으로 가정 |
| 시간 동기화 | 서버와 TOTP 앱 간의 시간 차이가 30초 이내인 것으로 가정 |
| 암호화 키 관리 | 시스템 관리자가 암호화 키를 안전하게 관리하는 것으로 가정 |
| 브라우저 지원 | 사용자가 주요 최신 브라우저(Chrome, Firefox, Safari, Edge)를 사용하는 것으로 가정 |
| 네트워크 연결 | SSO 인증 시 사용자와 서버 간 안정적인 네트워크 연결이 보장되는 것으로 가정 |

---

## 9. 부록

### 9.1 요구사항 추적 매트릭스 (RTM)

| 요구사항 ID | 요구사항 설명 | 기능 ID | 기능명 | 수용 기준 |
|------------|-------------|---------|--------|-----------|
| FR-005-01 | TOTP 구현 | FN-001 | TOTP 2FA 활성화 | AC-005 |
| FR-005-02 | 2FA 로그인 검증 흐름 | FN-002 | TOTP 코드 검증 (로그인) | AC-005 |
| FR-005-03 | Backup Code 검증 흐름 | FN-003 | Backup Code 검증 (로그인) | AC-006 |
| FR-005-04 | 2FA 관련 데이터 모델 | FN-001, FN-004 | TOTP 2FA 활성화, 2FA 비활성화 | AC-005 |
| FR-005-05 | License Feature Flag | FN-005 | 2FA Feature Flag 확인 | AC-005 |
| FR-006-01 | SSO Provider 정의 (5종) | FN-006 | SSO Provider 등록 | AC-007 |
| FR-006-02 | SSO Callback 처리 흐름 | FN-007 | SSO Callback 처리 | AC-008 |
| FR-006-03 | SSO License Feature Flags | FN-008 | SSO Feature Flag 확인 | AC-007 |
| NFR-001 | 암호화 | FN-001, FN-002, FN-003 | 2FA 관련 기능 | - |
| NFR-002 | TOTP 시간 윈도우 | FN-002 | TOTP 코드 검증 | AC-005 |
| NFR-003 | Logging | FN-002, FN-003, FN-007 | 인증 및 Callback 관련 기능 | - |
| NFR-004 | 보안 | FN-001, FN-002, FN-003, FN-006, FN-007 | 전체 기능 | - |

### 9.2 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-02-21 | 1.0 | 초기 작성 - FSD-002 요구사항 명세서 기반 | Claude |
