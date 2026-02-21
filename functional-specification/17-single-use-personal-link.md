# 기능 명세서 — 싱글유즈 및 개인 링크 (Functional Specification)

---

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 버전 | v1.0 |
| 작성일 | 2026-02-21 |
| 기반 문서 | FSD-017 싱글유즈 및 개인 링크 요구사항 명세서 (FR-025 ~ FR-026) |
| 상태 | 초안 |

---

## 2. 개요

### 2.1 목적

본 문서는 FSD-017 요구사항 명세서를 기반으로, 설문 응답의 고유성과 추적 가능성을 보장하는 두 가지 핵심 기능인 **Single-use 링크**와 **Personal Link**의 상세 기능 명세를 정의한다. Single-use 링크는 각 링크가 1회만 사용 가능하도록 하여 중복 응답을 방지하고, Personal Link는 Contact에 연결된 개인화 링크를 JWT 토큰 기반으로 생성하여 응답자를 식별 및 추적할 수 있게 한다.

### 2.2 범위

**포함 범위:**
- Single-use ID 생성, 암호화/복호화, 검증
- Single-use 링크의 설문 페이지 렌더링 흐름
- Multi-use / Single-use 토글 UI 및 확인 모달
- 대량 Single-use 링크 생성 및 CSV 다운로드
- Personal Link JWT 토큰 생성 및 검증
- Personal Link 만료(expiration) 지원
- Contact ID 기반 중복 응답 방지
- Contact Survey 페이지 렌더링 흐름

**제외 범위:**
- Contact 관리(CRUD) 기능
- Segment 기반 대량 링크 생성 API
- 응답 데이터 저장 로직

### 2.3 대상 사용자

| 역할 | 설명 |
|------|------|
| Survey Creator | Single-use 또는 Personal Link를 설정하고 배포하는 사용자 |
| Survey Respondent | 고유 링크를 통해 설문에 접근하여 1회 응답하는 최종 사용자 |
| Organization Admin | Enterprise 라이선스 관리 및 Contact 데이터 관리 |
| API Consumer | Management API를 통해 Personal Link를 대량 생성하는 외부 시스템 |

### 2.4 용어 정의

| 용어 | 정의 |
|------|------|
| Single-use 링크 | 1회만 사용 가능한 고유 설문 접근 링크. CUID2 기반 ID를 URL 파라미터로 포함한다. |
| Personal Link | Contact(연락처)에 연결된 개인화 설문 링크. JWT 토큰 기반으로 생성되며 Enterprise 플랜에서만 사용 가능하다. |
| CUID2 | Collision-resistant Unique Identifier의 2세대 버전. 충돌률이 이론적으로 10^-24 이하인 고유 ID 생성 알고리즘이다. |
| AES-256-GCM | 256비트 키를 사용하는 Galois/Counter Mode 대칭 암호화 알고리즘. NIST 표준이며 인증 태그를 통해 무결성을 보장한다. |
| JWT (JSON Web Token) | JSON 기반의 토큰 표준(RFC 7519). 페이로드를 서명하여 변조를 방지한다. |
| HS256 | HMAC-SHA256. JWT 서명에 사용되는 대칭 키 기반 서명 알고리즘이다. |
| Contact | Inquiry에서 관리되는 연락처 엔티티. Personal Link의 대상이 된다. |
| suId | Single-use ID의 URL 파라미터 키. 쿼리스트링으로 `?suId={id}` 형태로 전달된다. |
| 암호화 키 (Encryption Key) | AES-256-GCM 암호화 및 JWT HS256 서명에 사용되는 환경변수 기반 대칭 키이다. |
| 초기화 벡터 (IV) | AES-GCM 암호화에서 사용되는 초기화 벡터. 각 암호화 연산마다 고유하게 생성된다. |
| 인증 태그 (Auth Tag) | AES-GCM 암호화에서 생성되는 인증 태그. 암호문의 무결성과 진본성을 검증한다. |

---

## 3. 시스템 개요

### 3.1 시스템 구성도

```
[Survey Creator]
    |
    |-- (1) Single-use/Personal Link 설정
    v
[Admin Dashboard]
    |
    |-- (2a) Single-use 링크 생성 요청
    |-- (2b) Personal Link 생성 요청 (Enterprise)
    v
[Backend Server]
    |
    |-- CUID2 생성 + AES-256-GCM 암호화 (Single-use)
    |-- AES-256-GCM 암호화 + JWT HS256 서명 (Personal Link)
    v
[Generated URLs]
    |
    |-- Single-use: {domain}/s/{surveyId}?suId={encryptedId}
    |-- Personal:   {domain}/c/{jwt_token}[?suId={singleUseId}]
    v
[Survey Respondent]
    |
    |-- (3) 링크 접근
    v
[Link Survey Page / Contact Survey Page]
    |
    |-- ID 검증 (복호화 / JWT 검증)
    |-- 기존 응답 확인
    |-- 설문 렌더링 또는 상태 메시지 표시
```

### 3.2 주요 기능 목록 (Feature List)

| 기능 ID | 기능명 | 관련 요구사항 | 라이선스 |
|---------|--------|-------------|---------|
| FN-025-01 | Single-use 설정 관리 | FR-025-01 | Community |
| FN-025-02 | Single-use ID 생성 | FR-025-02 | Community |
| FN-025-03 | Single-use ID 검증 | FR-025-03 | Community |
| FN-025-04 | Single-use 설문 페이지 렌더링 | FR-025-04 | Community |
| FN-025-05 | Multi-use / Single-use 토글 UI | FR-025-05 | Community |
| FN-025-06 | 대량 링크 생성 및 CSV 다운로드 | FR-025-06 | Community |
| FN-026-01 | Personal Link 생성 | FR-026-01 | Enterprise |
| FN-026-02 | Personal Link 토큰 검증 | FR-026-02 | Enterprise |
| FN-026-03 | Contact Survey 페이지 렌더링 | FR-026-03 | Enterprise |

### 3.3 기능 간 관계도

```
[FN-025-01 Single-use 설정 관리]
    |
    +---> [FN-025-02 Single-use ID 생성] ---> [FN-025-06 대량 링크 생성/CSV]
    |         |
    |         v
    |     [FN-025-03 Single-use ID 검증]
    |         |
    |         v
    |     [FN-025-04 Single-use 설문 페이지 렌더링]
    |
    +---> [FN-025-05 Multi-use/Single-use 토글 UI]

[FN-026-01 Personal Link 생성]
    |
    +---> FN-025-02 참조 (Single-use 활성 시 suId 추가 생성)
    |
    v
[FN-026-02 Personal Link 토큰 검증]
    |
    v
[FN-026-03 Contact Survey 페이지 렌더링]
```

---

## 4. 상세 기능 명세

### 4.1 Single-use 설정 관리

#### 4.1.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-025-01 |
| 기능명 | Single-use 설정 관리 |
| 관련 요구사항 ID | FR-025-01 |
| 우선순위 | 높음 |
| 기능 설명 | 설문에 대한 Single-use 링크 설정을 구성한다. 활성화 여부, 완료 메시지, 암호화 여부를 포함한다. |

#### 4.1.2 선행 조건 (Preconditions)

1. 사용자가 Survey Creator 이상의 권한으로 로그인되어 있어야 한다.
2. 대상 설문이 Link Survey 타입으로 생성되어 있어야 한다.

#### 4.1.3 후행 조건 (Postconditions)

1. 설문의 `singleUse` 설정 객체가 데이터베이스에 저장된다.
2. `singleUse`가 `null`이면 Single-use가 비활성화된 상태로 간주된다.

#### 4.1.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | Survey Creator | Anonymous Links 탭에서 Single-use 옵션을 활성화한다. |
| 2 | 시스템 | Single-use 설정 폼을 표시한다. |
| 3 | Survey Creator | 완료 메시지 제목(heading), 부제(subheading)를 입력한다 (선택). |
| 4 | Survey Creator | URL 암호화 여부(isEncrypted)를 설정한다. |
| 5 | Survey Creator | 설정을 저장한다. |
| 6 | 시스템 | `singleUse` 객체를 생성하여 설문에 저장한다. |

#### 4.1.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-01 | heading/subheading을 입력하지 않은 경우 | 시스템 기본 완료 메시지를 사용한다. |
| AF-02 | isEncrypted를 false로 설정한 경우 | Single-use ID가 평문 CUID2로 URL에 노출된다. |

#### 4.1.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-01 | isEncrypted를 true로 설정했으나 암호화 키가 환경변수에 미설정인 경우 | 서버 에러를 반환한다. 사용자에게 암호화 키 설정이 필요함을 안내한다. |

#### 4.1.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-01-01 | Single-use 비활성 판정 | `singleUse` 값이 `null`이거나 `enabled`가 `false`인 경우 | Single-use가 비활성화된 것으로 간주한다. |
| BR-01-02 | 암호화 키 필수 조건 | `isEncrypted`가 `true`인 경우 | 암호화 키 환경변수가 반드시 설정되어 있어야 한다. |

#### 4.1.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| enabled | boolean | 예 | `true` 또는 `false` |
| heading | string | 아니오 | 최대 길이 제한 없음 (null 허용) |
| subheading | string | 아니오 | 최대 길이 제한 없음 (null 허용) |
| isEncrypted | boolean | 예 | `true` 또는 `false` |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| singleUse | object \| null | Single-use 설정 객체. 비활성 시 null. |

#### 4.1.9 화면/UI 요구사항

- Anonymous Links 탭 내 Single-use 활성화 토글 스위치를 제공한다.
- 활성화 시 heading, subheading 입력 필드와 isEncrypted 체크박스를 표시한다.

#### 4.1.10 비기능 요구사항

- 해당 없음.

---

### 4.2 Single-use ID 생성

#### 4.2.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-025-02 |
| 기능명 | Single-use ID 생성 |
| 관련 요구사항 ID | FR-025-02 |
| 우선순위 | 높음 |
| 기능 설명 | CUID2 기반의 고유 Single-use ID를 생성하고, 옵션에 따라 AES-256-GCM으로 암호화하여 반환한다. |

#### 4.2.2 선행 조건 (Preconditions)

1. Single-use 설정이 활성화(`enabled: true`)되어 있어야 한다.
2. 암호화 옵션이 활성화된 경우, 암호화 키가 환경변수에 설정되어 있어야 한다.

#### 4.2.3 후행 조건 (Postconditions)

1. 고유한 Single-use ID가 반환된다.
2. 암호화 활성 시 `{IV_hex}:{ciphertext_hex}:{authTag_hex}` 형식의 문자열이 반환된다.
3. 암호화 비활성 시 평문 CUID2 문자열이 반환된다.

#### 4.2.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | CUID2 라이브러리를 호출하여 고유 ID를 생성한다. |
| 2 | 시스템 | 설문의 `isEncrypted` 설정을 확인한다. |
| 3 | 시스템 | `isEncrypted`가 `true`인 경우, 암호화 키를 사용하여 AES-256-GCM으로 암호화한다. |
| 4 | 시스템 | 암호화 결과를 `{IV_hex}:{ciphertext_hex}:{authTag_hex}` 형식으로 조합한다. |
| 5 | 시스템 | 암호화된 ID 문자열을 반환한다. |

#### 4.2.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-01 | `isEncrypted`가 `false`인 경우 | 단계 3~4를 건너뛰고 평문 CUID2를 그대로 반환한다. |

#### 4.2.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-01 | `isEncrypted`가 `true`이나 암호화 키가 미설정인 경우 | 에러를 발생시킨다. 링크 생성이 중단된다. |

#### 4.2.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-02-01 | 암호화 알고리즘 | 암호화 활성 시 | AES-256-GCM (V2)을 사용한다. |
| BR-02-02 | 인코딩 형식 | 암호화 결과 출력 시 | 모든 바이너리 값을 hex 인코딩한다. |
| BR-02-03 | 구분자 | 암호화 결과 형식 | 콜론(`:`)으로 IV, 암호문, 인증 태그를 구분한다. |
| BR-02-04 | ID 고유성 | CUID2 생성 시 | 이론적 충돌률 10^-24 이하를 보장한다. |

#### 4.2.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| isEncrypted | boolean | 예 | Single-use 설정에서 참조 |
| encryptionKey | string | 조건부 (isEncrypted=true일 때 필수) | 환경변수에서 로드. AES-256 키 길이 충족 필요 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| singleUseId | string | 암호화된 ID (`{IV}:{ciphertext}:{authTag}`) 또는 평문 CUID2 |

#### 4.2.9 화면/UI 요구사항

- 해당 없음 (서버 내부 로직).

#### 4.2.10 비기능 요구사항

- CUID2 충돌률: 이론적으로 10^-24 이하 (NFR-025-05).
- 암호화 강도: AES-256-GCM, NIST 표준 (NFR-025-01).

---

### 4.3 Single-use ID 검증

#### 4.3.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-025-03 |
| 기능명 | Single-use ID 검증 |
| 관련 요구사항 ID | FR-025-03 |
| 우선순위 | 높음 |
| 기능 설명 | URL 파라미터로 전달된 Single-use ID를 복호화하고, CUID2 형식 검사를 수행하여 유효성을 검증한다. |

#### 4.3.2 선행 조건 (Preconditions)

1. 암호화 키가 환경변수에 설정되어 있어야 한다.
2. 검증 대상 Single-use ID 문자열이 전달되어야 한다.

#### 4.3.3 후행 조건 (Postconditions)

1. 유효한 ID인 경우: 복호화된 원본 CUID2 ID를 반환한다.
2. 유효하지 않은 ID인 경우: `undefined`를 반환한다.

#### 4.3.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | 암호화 키가 환경변수에 설정되어 있는지 확인한다. |
| 2 | 시스템 | 전달된 ID를 AES-256-GCM으로 복호화를 시도한다. |
| 3 | 시스템 | 복호화에 성공한 경우, 결과값이 CUID2 형식인지 검사한다. |
| 4 | 시스템 | CUID2 형식이면 원본 ID를 반환한다. |

#### 4.3.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-01 | 암호화가 비활성화된 설문에서 평문 CUID2가 전달된 경우 | 복호화 과정 없이 CUID2 형식 검사만 수행하여 유효성을 판정한다. |

#### 4.3.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-01 | 암호화 키가 미설정인 경우 | 에러를 발생시킨다. |
| EF-02 | AES-256-GCM 복호화에 실패한 경우 (변조/잘못된 키) | `undefined`를 반환한다. |
| EF-03 | 복호화 성공했으나 CUID2 형식이 아닌 경우 | `undefined`를 반환한다. |

#### 4.3.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-03-01 | 복호화 실패 처리 | 복호화 과정에서 예외 발생 시 | 에러를 전파하지 않고 `undefined`를 반환한다. |
| BR-03-02 | CUID2 형식 검증 | 복호화 결과가 CUID2 패턴에 부합하지 않는 경우 | `undefined`를 반환한다. |
| BR-03-03 | 레거시 호환 | AES-256-CBC (V1)로 암호화된 기존 ID | 읽기 전용으로 복호화를 지원한다 (신규 생성은 V2만 사용). |

#### 4.3.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| encryptedSuId | string | 예 | `{IV_hex}:{ciphertext_hex}:{authTag_hex}` 형식 또는 평문 CUID2 |
| encryptionKey | string | 예 | 환경변수에서 로드 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| originalId | string \| undefined | 유효 시 원본 CUID2 ID, 무효 시 undefined |

#### 4.3.9 화면/UI 요구사항

- 해당 없음 (서버 내부 로직).

#### 4.3.10 비기능 요구사항

- 토큰 위변조 방지: AES-GCM 인증 태그를 통해 암호문 무결성을 검증한다 (NFR-025-04).

---

### 4.4 Single-use 설문 페이지 렌더링

#### 4.4.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-025-04 |
| 기능명 | Single-use 설문 페이지 렌더링 |
| 관련 요구사항 ID | FR-025-04 |
| 우선순위 | 높음 |
| 기능 설명 | Single-use 링크를 통해 접근한 응답자에게 설문을 렌더링하거나, 링크 상태에 따라 적절한 상태 메시지를 표시한다. |

#### 4.4.2 선행 조건 (Preconditions)

1. 설문이 존재하며 활성(active) 상태여야 한다.
2. 설문에 Single-use 설정이 활성화되어 있어야 한다.

#### 4.4.3 후행 조건 (Postconditions)

1. 유효한 신규 링크: 설문이 렌더링되고, 응답 시 해당 Single-use ID와 연결된 응답이 생성된다.
2. 이미 완료된 링크: 커스텀 완료 메시지가 표시된다.
3. 무효한 링크: "link invalid" 상태가 표시된다.

#### 4.4.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | Survey Respondent | Single-use 링크 URL(`?suId={id}`)로 접근한다. |
| 2 | 시스템 | 설문의 Single-use 활성 여부를 확인한다. |
| 3 | 시스템 | URL의 `suId` 파라미터를 추출한다. |
| 4 | 시스템 | Single-use ID 검증을 수행한다 (FN-025-03 호출). |
| 5 | 시스템 | 검증된 ID로 기존 응답을 조회한다 (설문 ID + Single-use ID 기준). |
| 6 | 시스템 | 기존 응답이 없으면 설문을 렌더링한다 (Single-use ID를 응답에 연결). |

#### 4.4.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-01 | 기존 응답이 존재하나 미완료 상태인 경우 | 기존 응답 ID를 전달하여 이어서 응답할 수 있도록 한다. |
| AF-02 | 비암호화 모드에서 커스텀 suId가 전달된 경우 | CUID2 형식 검증을 생략하고 해당 ID를 그대로 사용한다. |

#### 4.4.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-01 | `suId` 파라미터가 없는 경우 | "link invalid" 상태를 표시한다. |
| EF-02 | Single-use ID 검증에 실패한 경우 (변조/무효) | "link invalid" 상태를 표시한다. |
| EF-03 | 기존 응답이 완료 상태인 경우 | 커스텀 heading/subheading이 포함된 완료 메시지를 표시한다. heading/subheading이 미설정이면 기본 완료 메시지를 사용한다. |

#### 4.4.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-04-01 | 1회 응답 강제 | Single-use ID에 대해 완료된 응답이 존재하는 경우 | 설문을 렌더링하지 않고 완료 메시지를 표시한다. |
| BR-04-02 | 미완료 응답 이어쓰기 | Single-use ID에 대해 미완료 응답이 존재하는 경우 | 해당 응답을 이어서 진행한다. |
| BR-04-03 | 무효 링크 처리 | suId가 없거나 검증 실패 시 | "link invalid" 상태를 표시한다. |

#### 4.4.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| surveyId | string | 예 | URL path에서 추출. 유효한 설문 ID |
| suId | string | 예 | URL 쿼리 파라미터. 암호화된 ID 또는 평문 CUID2 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| surveyStatus | enum | "active", "paused", "completed", "link invalid" 중 하나 |
| responseId | string \| null | 이어쓰기 시 기존 응답 ID. 신규면 null |
| completionMessage | object \| null | 완료 시 { heading, subheading }. 미완료 시 null |

#### 4.4.9 화면/UI 요구사항

- **설문 렌더링 상태**: 일반 Link Survey와 동일한 설문 UI를 표시한다.
- **완료 메시지 상태**: 설정된 heading과 subheading을 표시한다. 미설정 시 기본 완료 메시지를 사용한다.
- **무효 링크 상태**: "link invalid" 상태 화면을 표시한다.

#### 4.4.10 비기능 요구사항

- 설문 로딩 시간: 2초 이내 (NFR-001).

---

### 4.5 Multi-use / Single-use 토글 UI

#### 4.5.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-025-05 |
| 기능명 | Multi-use / Single-use 토글 UI |
| 관련 요구사항 ID | FR-025-05 |
| 우선순위 | 중간 |
| 기능 설명 | Anonymous Links 탭에서 Multi-use와 Single-use 모드를 상호 배타적으로 전환하는 토글 UI를 제공하며, 전환 시 확인 모달을 표시한다. |

#### 4.5.2 선행 조건 (Preconditions)

1. 사용자가 Survey Creator 이상의 권한으로 로그인되어 있어야 한다.
2. 대상 설문이 Link Survey 타입이어야 한다.
3. Share Modal의 Anonymous Links 탭이 열려 있어야 한다.

#### 4.5.3 후행 조건 (Postconditions)

1. Multi-use에서 Single-use로 전환 시: Multi-use 링크가 무효화되고 Single-use 설정이 활성화된다.
2. Single-use에서 Multi-use로 전환 시: Single-use 링크가 무효화되고 Multi-use 모드가 활성화된다.

#### 4.5.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | Survey Creator | Anonymous Links 탭에서 토글을 전환한다 (예: Multi-use -> Single-use). |
| 2 | 시스템 | 확인 모달을 표시한다. 모달 내용: "기존 링크가 무효화됩니다." |
| 3 | Survey Creator | 모달에서 "확인"을 선택한다. |
| 4 | 시스템 | 설문의 링크 모드를 변경하고 저장한다. |
| 5 | 시스템 | UI를 새로운 모드에 맞게 업데이트한다. |

#### 4.5.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-01 | 사용자가 확인 모달에서 "취소"를 선택한 경우 | 토글 상태를 원래대로 되돌린다. 설정 변경은 발생하지 않는다. |

#### 4.5.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-01 | 설정 저장 중 서버 에러 발생 | 토글 상태를 원래대로 되돌리고 에러 메시지를 표시한다. |

#### 4.5.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-05-01 | 상호 배타성 | Multi-use와 Single-use는 동시에 활성화될 수 없다 | 하나가 활성화되면 다른 하나는 자동 비활성화된다. |
| BR-05-02 | 기존 링크 무효화 경고 | 모드 전환 시 | 반드시 확인 모달을 표시하여 기존 링크 무효화를 안내한다. |

#### 4.5.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| linkMode | enum("multi-use", "single-use") | 예 | 두 값 중 하나만 허용 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| updatedSurvey | object | 변경된 설문 설정 객체 |

#### 4.5.9 화면/UI 요구사항

- **토글 스위치**: Multi-use / Single-use 상호 배타 토글을 제공한다.
- **확인 모달 (Multi-use 비활성화)**: "Multi-use 링크를 비활성화하면 기존 링크가 무효화됩니다." 내용과 확인/취소 버튼을 포함한다.
- **확인 모달 (Single-use 비활성화)**: "Single-use 링크를 비활성화하면 기존 링크가 무효화됩니다." 내용과 확인/취소 버튼을 포함한다.

#### 4.5.10 비기능 요구사항

- 해당 없음.

---

### 4.6 대량 링크 생성 및 CSV 다운로드

#### 4.6.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-025-06 |
| 기능명 | 대량 링크 생성 및 CSV 다운로드 |
| 관련 요구사항 ID | FR-025-06 |
| 우선순위 | 중간 |
| 기능 설명 | 지정된 수량만큼 Single-use ID를 일괄 생성하고, 각 ID가 포함된 설문 URL을 CSV 파일로 다운로드한다. |

#### 4.6.2 선행 조건 (Preconditions)

1. 설문에 Single-use 설정이 활성화되어 있어야 한다.
2. 사용자가 Survey Creator 이상의 권한으로 로그인되어 있어야 한다.

#### 4.6.3 후행 조건 (Postconditions)

1. 지정된 수량만큼 고유한 Single-use ID가 생성된다.
2. 각 ID가 포함된 설문 URL로 구성된 CSV 파일이 다운로드된다.

#### 4.6.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | Survey Creator | 생성할 링크 수량을 입력한다. |
| 2 | 시스템 | 입력 수량의 유효성을 검증한다 (1 이상, 5,000 이하). |
| 3 | 시스템 | 입력 수량만큼 Single-use ID를 일괄 생성한다 (FN-025-02 반복 호출). |
| 4 | 시스템 | 각 ID를 설문 URL에 `suId` 파라미터로 추가하여 완전한 링크를 구성한다. |
| 5 | 시스템 | 모든 링크를 줄바꿈(`\n`)으로 구분한 CSV 파일을 생성한다. |
| 6 | 시스템 | 파일명 `single-use-links-{surveyId}.csv`로 다운로드를 트리거한다. |

#### 4.6.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-01 | 비암호화 모드에서 커스텀 suId를 사용하는 경우 | URL에 `?suId=CUSTOM-ID` 형태로 사용자가 지정한 ID를 사용한다. |

#### 4.6.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-01 | 입력 수량이 1 미만인 경우 | 유효성 검증 에러를 표시하고 생성을 차단한다. |
| EF-02 | 입력 수량이 5,000 초과인 경우 | 유효성 검증 에러를 표시하고 생성을 차단한다. |
| EF-03 | 암호화 키 미설정 상태에서 암호화 활성 링크 생성 시도 | 서버 에러를 반환한다. |

#### 4.6.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-06-01 | 최소 생성 수 | 수량 입력 시 | 최소 1개 |
| BR-06-02 | 최대 생성 수 | 수량 입력 시 | 최대 5,000개 |
| BR-06-03 | 파일명 규칙 | CSV 다운로드 시 | `single-use-links-{surveyId}.csv` 형식 |
| BR-06-04 | URL 형식 | 링크 생성 시 | `{domain}/s/{surveyId}?suId={singleUseId}` |

#### 4.6.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| quantity | integer | 예 | 1 <= quantity <= 5,000 |
| surveyId | string | 예 | 유효한 설문 ID |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| csvFile | file | 줄바꿈으로 구분된 URL 목록. 파일명: `single-use-links-{surveyId}.csv` |

#### 4.6.9 화면/UI 요구사항

- 수량 입력 필드 (정수, 1~5,000 범위 표시).
- "링크 생성" 버튼.
- 생성 중 로딩 인디케이터 표시.
- 생성 완료 시 자동으로 CSV 파일 다운로드 트리거.

#### 4.6.10 비기능 요구사항

- 대량 링크 생성: 최대 5,000개 동시 생성을 지원해야 한다 (NFR-025-03).

---

### 4.7 Personal Link 생성

#### 4.7.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-026-01 |
| 기능명 | Personal Link 생성 |
| 관련 요구사항 ID | FR-026-01 |
| 우선순위 | 높음 |
| 기능 설명 | Contact ID와 Survey ID를 이중 암호화(AES-256-GCM + JWT HS256)하여 개인화된 설문 링크를 생성한다. Enterprise 플랜에서만 사용 가능하다. |

#### 4.7.2 선행 조건 (Preconditions)

1. 조직이 Enterprise 라이선스를 보유해야 한다 (NFR-026-01).
2. 암호화 키가 환경변수에 설정되어 있어야 한다.
3. 대상 설문이 존재하고 활성 상태여야 한다.
4. 대상 Contact이 시스템에 존재해야 한다.

#### 4.7.3 후행 조건 (Postconditions)

1. JWT 토큰이 포함된 Personal Link URL이 생성된다.
2. Single-use가 활성화된 설문인 경우, URL에 `suId` 파라미터도 추가된다.

#### 4.7.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | 암호화 키가 환경변수에 존재하는지 확인한다. |
| 2 | 시스템 | 대상 설문이 존재하는지 확인한다. |
| 3 | 시스템 | Contact ID를 AES-256-GCM으로 암호화한다 (1계층). |
| 4 | 시스템 | Survey ID를 AES-256-GCM으로 암호화한다 (1계층). |
| 5 | 시스템 | 암호화된 Contact ID와 Survey ID를 JWT 페이로드에 포함한다. |
| 6 | 시스템 | 만료일이 설정된 경우, JWT `exp` 클레임에 만료 시간을 설정한다 (일 단위). |
| 7 | 시스템 | 암호화 키로 HS256 서명하여 JWT 토큰을 생성한다 (2계층). |
| 8 | 시스템 | URL을 구성한다: `{publicDomain}/c/{jwt_token}` |

#### 4.7.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-01 | 만료일이 설정되지 않은 경우 | JWT `exp` 클레임을 설정하지 않는다. 토큰은 무기한 유효하다. |
| AF-02 | Single-use가 활성화된 설문인 경우 | Single-use ID를 추가로 생성하고(FN-025-02 호출), URL에 `?suId={singleUseId}`를 추가한다. |

#### 4.7.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-01 | 암호화 키가 미설정인 경우 | 서버 에러를 반환한다. |
| EF-02 | 대상 설문이 존재하지 않는 경우 | 에러를 반환한다 (설문을 찾을 수 없음). |
| EF-03 | Enterprise 라이선스가 없는 경우 | 기능 접근을 차단하고 라이선스 업그레이드를 안내한다. |

#### 4.7.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-07-01 | 이중 암호화 | Personal Link 생성 시 | 1계층(AES-256-GCM 대칭 암호화) + 2계층(JWT HS256 서명) 이중 보안을 적용한다. |
| BR-07-02 | 만료 단위 | 만료일 설정 시 | 일(day) 단위로 설정한다. |
| BR-07-03 | Enterprise 전용 | Personal Link 기능 접근 시 | Enterprise 라이선스가 필수이다. |
| BR-07-04 | URL 패턴 | 링크 생성 시 | `{publicDomain}/c/{jwt_token}[?suId={singleUseId}]` 형식을 따른다. |

#### 4.7.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| contactId | string | 예 | 시스템에 존재하는 유효한 Contact ID |
| surveyId | string | 예 | 시스템에 존재하는 유효한 Survey ID |
| expirationDays | integer | 아니오 | 양의 정수. null이면 무기한 유효 |
| encryptionKey | string | 예 | 환경변수에서 로드 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| personalLinkUrl | string | `{publicDomain}/c/{jwt_token}[?suId={singleUseId}]` 형식의 URL |
| jwtToken | string | HS256으로 서명된 JWT 토큰 |

#### 4.7.9 화면/UI 요구사항

- Personal Links 탭에서 Contact를 선택하고 Personal Link를 생성하는 UI를 제공한다.
- 만료일 설정 입력 필드 (일 단위, 선택 사항).
- 생성된 링크 복사 버튼.
- OG 메타데이터: 커스텀 favicon 및 OG 이미지를 포함한다 (AC-026-07).

#### 4.7.10 비기능 요구사항

- JWT 알고리즘: HS256 (HMAC-SHA256) (NFR-025-02).
- 토큰 위변조 방지: JWT 서명 + AES-GCM 인증 태그 이중 검증 (NFR-025-04).
- 토큰 만료 정밀도: 일 단위 (NFR-026-02).

---

### 4.8 Personal Link 토큰 검증

#### 4.8.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-026-02 |
| 기능명 | Personal Link 토큰 검증 |
| 관련 요구사항 ID | FR-026-02 |
| 우선순위 | 높음 |
| 기능 설명 | 전달된 JWT 토큰의 서명, 만료 시간을 검증하고, 페이로드에서 암호화된 Contact ID와 Survey ID를 복호화하여 원본 ID를 복원한다. |

#### 4.8.2 선행 조건 (Preconditions)

1. 암호화 키가 환경변수에 설정되어 있어야 한다.
2. JWT 토큰 문자열이 URL 경로에서 전달되어야 한다.

#### 4.8.3 후행 조건 (Postconditions)

1. 검증 성공 시: 원본 Contact ID와 Survey ID가 반환된다.
2. 검증 실패 시: 에러 유형에 따른 상태가 반환된다 (만료/무효/서버 에러).

#### 4.8.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | 시스템 | 암호화 키가 환경변수에 존재하는지 확인한다. |
| 2 | 시스템 | JWT 토큰의 서명을 HS256으로 검증한다. |
| 3 | 시스템 | JWT 토큰의 만료 시간(`exp` 클레임)을 확인한다. |
| 4 | 시스템 | JWT 페이로드에서 암호화된 Contact ID를 추출한다. |
| 5 | 시스템 | JWT 페이로드에서 암호화된 Survey ID를 추출한다. |
| 6 | 시스템 | 각 ID를 AES-256-GCM으로 복호화하여 원본 ID를 복원한다. |
| 7 | 시스템 | 복원된 Contact ID와 Survey ID를 반환한다. |

#### 4.8.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-01 | JWT `exp` 클레임이 없는 경우 (무기한 토큰) | 만료 검증을 건너뛴다. |

#### 4.8.6 예외 흐름 (Exception Flow)

| ID | 조건 | 에러 유형 | 동작 |
|----|------|----------|------|
| EF-01 | 암호화 키가 미설정인 경우 | 서버 내부 에러 | 서버 에러를 반환한다. |
| EF-02 | JWT 만료 시간이 경과한 경우 | 토큰 만료 | "link expired" 상태를 반환한다. 에러 상세: `{ field: "token", issue: "token_expired" }` |
| EF-03 | JWT 서명이 불일치하거나 토큰이 변조된 경우 | 유효하지 않은 토큰 | "link invalid" 상태를 반환한다. |
| EF-04 | AES-256-GCM 복호화에 실패한 경우 | 유효하지 않은 토큰 | "link invalid" 상태를 반환한다. |

#### 4.8.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-08-01 | 에러 구분 | JWT 만료 vs JWT 무효 | 만료는 "link expired", 서명 불일치/변조는 "link invalid"로 구분하여 표시한다. |
| BR-08-02 | 복호화 순서 | 검증 성공 시 | JWT 서명 검증 -> 만료 확인 -> 페이로드 추출 -> AES-256-GCM 복호화 순서로 처리한다. |

#### 4.8.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| jwtToken | string | 예 | URL 경로(`/c/{token}`)에서 추출. 유효한 JWT 형식 |
| encryptionKey | string | 예 | 환경변수에서 로드 |

**출력 데이터 (성공 시):**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| contactId | string | 복호화된 원본 Contact ID |
| surveyId | string | 복호화된 원본 Survey ID |

**출력 데이터 (실패 시):**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| status | enum | "link expired", "link invalid", "server error" 중 하나 |
| errorDetail | object | `{ field: string, issue: string }` 형식의 에러 상세 정보 |

#### 4.8.9 화면/UI 요구사항

- 해당 없음 (서버 내부 로직).

#### 4.8.10 비기능 요구사항

- JWT 알고리즘: HS256 (NFR-025-02).
- 토큰 위변조 방지: JWT 서명 + AES-GCM 인증 태그 이중 검증 (NFR-025-04).

---

### 4.9 Contact Survey 페이지 렌더링

#### 4.9.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | FN-026-03 |
| 기능명 | Contact Survey 페이지 렌더링 |
| 관련 요구사항 ID | FR-026-03 |
| 우선순위 | 높음 |
| 기능 설명 | Personal Link를 통해 접근한 응답자에게 JWT 토큰을 검증하고, Contact 기반 중복 응답을 확인하여 설문을 렌더링하거나 적절한 상태 메시지를 표시한다. |

#### 4.9.2 선행 조건 (Preconditions)

1. Personal Link URL(`/c/{jwt_token}`)로 접근해야 한다.
2. 암호화 키가 환경변수에 설정되어 있어야 한다.

#### 4.9.3 후행 조건 (Postconditions)

1. JWT 검증 성공 및 미응답 Contact: 설문이 렌더링되고, Contact ID가 응답에 연결된다.
2. JWT 검증 성공 및 기응답 Contact: "response submitted" 상태가 표시된다.
3. JWT 만료: "link expired" 상태가 표시된다.
4. JWT 무효: "link invalid" 상태가 표시된다.

#### 4.9.4 기본 흐름 (Basic Flow)

| 단계 | 행위자 | 동작 |
|------|--------|------|
| 1 | Survey Respondent | Personal Link URL(`/c/{jwt_token}`)로 접근한다. |
| 2 | 시스템 | JWT 토큰을 검증한다 (FN-026-02 호출). |
| 3 | 시스템 | 검증 성공 시, 복호화된 Contact ID와 Survey ID를 획득한다. |
| 4 | 시스템 | 해당 Contact ID로 해당 설문에 대한 기존 응답이 있는지 조회한다. |
| 5 | 시스템 | 기존 응답이 없으면 설문을 렌더링한다 (Contact ID를 응답에 연결). |

#### 4.9.5 대안 흐름 (Alternative Flow)

| ID | 조건 | 동작 |
|----|------|------|
| AF-01 | Single-use + Personal Link 조합인 경우 | URL의 `suId` 파라미터도 함께 검증한다 (FN-025-03 호출). |

#### 4.9.6 예외 흐름 (Exception Flow)

| ID | 조건 | 동작 |
|----|------|------|
| EF-01 | JWT 토큰이 만료된 경우 | "link expired" 상태를 표시한다. |
| EF-02 | JWT 토큰이 유효하지 않은 경우 (서명 불일치/변조) | "link invalid" 상태를 표시한다. |
| EF-03 | 해당 Contact이 이미 해당 설문에 응답한 경우 | "response submitted" 상태를 표시한다. |
| EF-04 | 암호화 키 미설정으로 인한 서버 에러 | 서버 에러 페이지를 표시한다. |

#### 4.9.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 | 조건 | 결과 |
|---------|------|------|------|
| BR-09-01 | 1인 1응답 강제 | Contact ID 기준으로 이미 완료된 응답이 존재하는 경우 | "response submitted" 상태를 표시하고 재응답을 차단한다. |
| BR-09-02 | 상태 우선순위 | 여러 상태 조건이 동시에 해당될 때 | (1) 토큰 무효 -> (2) 토큰 만료 -> (3) 응답 완료 -> (4) 설문 렌더링 순서로 판단한다. |
| BR-09-03 | Anonymous vs Personal 차이 | Personal Link 접근 시 | Contact ID를 서버에서 응답에 연결하여 응답자를 식별한다 (Anonymous 링크와의 핵심 차이점). |

#### 4.9.8 데이터 요구사항

**입력 데이터:**

| 필드명 | 타입 | 필수 여부 | 유효성 검증 규칙 |
|--------|------|----------|----------------|
| jwtToken | string | 예 | URL 경로(`/c/{token}`)에서 추출 |
| suId | string | 조건부 (Single-use 활성 시) | URL 쿼리 파라미터 |

**출력 데이터:**

| 필드명 | 타입 | 설명 |
|--------|------|------|
| pageStatus | enum | "active", "link expired", "link invalid", "response submitted" 중 하나 |
| contactId | string \| null | 검증 성공 시 Contact ID. 실패 시 null |
| surveyId | string \| null | 검증 성공 시 Survey ID. 실패 시 null |

#### 4.9.9 화면/UI 요구사항

- **설문 렌더링 상태**: 일반 설문 UI를 표시한다. Contact ID가 백그라운드에서 응답에 연결된다.
- **"link expired" 상태**: 링크 만료 안내 메시지를 표시한다.
- **"link invalid" 상태**: 링크 무효 안내 메시지를 표시한다.
- **"response submitted" 상태**: 이미 응답 완료되었음을 안내하는 메시지를 표시한다.
- **OG 메타데이터**: 커스텀 favicon 및 OG 이미지를 포함한다.

#### 4.9.10 비기능 요구사항

- Enterprise 라이선스 필수 (NFR-026-01).
- 설문 로딩 시간: 2초 이내 (NFR-001).

---

## 5. 데이터 모델

### 5.1 주요 엔티티 정의

| 엔티티 | 설명 | 주요 속성 |
|--------|------|----------|
| Survey | 설문 엔티티 | id, singleUse(object\|null), status, type |
| SingleUseSettings | Single-use 설정 | enabled(boolean), heading(string\|null), subheading(string\|null), isEncrypted(boolean) |
| Response | 설문 응답 엔티티 | id, surveyId, singleUseId(string\|null), contactId(string\|null), finished(boolean) |
| Contact | 연락처 엔티티 | id, email, attributes |
| PersonalLinkToken | JWT 토큰 페이로드 | encryptedContactId(string), encryptedSurveyId(string), exp(number\|undefined) |

### 5.2 엔티티 간 관계

```
Survey (1) --- (0..1) SingleUseSettings
  "singleUse 필드로 내장"

Survey (1) --- (*) Response
  "surveyId로 연결"

Response (*) --- (0..1) Contact
  "contactId로 연결 (Personal Link 시)"

Response --- (0..1) SingleUseId
  "singleUseId로 연결 (Single-use 시)"

Contact (1) --- (*) PersonalLinkToken
  "contactId로 JWT 생성"
```

### 5.3 데이터 흐름

**Single-use 데이터 흐름:**
```
[CUID2 생성] -> [AES-256-GCM 암호화 (선택)] -> [URL suId 파라미터]
    -> [페이지 접근 시 복호화] -> [응답 조회 (surveyId + singleUseId)]
    -> [응답 생성/이어쓰기/완료 표시]
```

**Personal Link 데이터 흐름:**
```
[Contact ID + Survey ID] -> [각각 AES-256-GCM 암호화] -> [JWT HS256 서명]
    -> [URL /c/{token}] -> [JWT 검증 + 복호화]
    -> [Contact 기반 응답 조회] -> [설문 렌더링/상태 표시]
```

---

## 6. 인터페이스 명세

### 6.1 외부 시스템 연동

| 연동 대상 | 연동 방식 | 설명 |
|----------|----------|------|
| CUID2 라이브러리 | 내부 라이브러리 호출 | Single-use ID 생성에 사용 |
| Node.js crypto 모듈 | 내부 모듈 호출 | AES-256-GCM 암호화/복호화에 사용 |
| jsonwebtoken 라이브러리 | 내부 라이브러리 호출 | JWT 토큰 생성/검증에 사용 |
| Contact 관리 시스템 | 내부 API 호출 | Contact ID 조회 및 유효성 확인 |

### 6.2 API 명세

#### 6.2.1 대량 Single-use 링크 생성 API

| 항목 | 내용 |
|------|------|
| 엔드포인트 | POST /api/v1/surveys/{surveyId}/single-use-links |
| 인증 | API Key 또는 Session |
| 요청 본문 | `{ "quantity": number }` (1~5,000) |
| 성공 응답 | `200 OK` - CSV 파일 (Content-Type: text/csv) |
| 에러 응답 | `400 Bad Request` - 유효성 검증 실패 / `500 Internal Server Error` - 암호화 키 미설정 |

#### 6.2.2 Personal Link 생성 API

| 항목 | 내용 |
|------|------|
| 엔드포인트 | POST /api/v1/surveys/{surveyId}/personal-links |
| 인증 | API Key 또는 Session |
| 라이선스 | Enterprise 필수 |
| 요청 본문 | `{ "contactId": string, "expirationDays": number \| null }` |
| 성공 응답 | `200 OK` - `{ "url": string, "token": string }` |
| 에러 응답 | `400 Bad Request` - 유효성 검증 실패 / `403 Forbidden` - Enterprise 라이선스 없음 / `404 Not Found` - 설문/Contact 미존재 / `500 Internal Server Error` - 암호화 키 미설정 |

---

## 7. 비기능 요구사항

### 7.1 성능 요구사항

| ID | 항목 | 기준 | 근거 |
|----|------|------|------|
| NFR-025-03 | 대량 링크 생성 | 최대 5,000개 동시 생성 지원 | FR-025-06 대량 생성 요구사항 |
| NFR-P-01 | 설문 페이지 로딩 | 2초 이내 | NFR-001 성능 요구사항 |

### 7.2 보안 요구사항

| ID | 항목 | 기준 | 근거 |
|----|------|------|------|
| NFR-025-01 | 암호화 강도 | AES-256-GCM (NIST 표준) | 데이터 기밀성 및 무결성 보장 |
| NFR-025-02 | JWT 알고리즘 | HS256 (HMAC-SHA256) | JWT 서명 표준 |
| NFR-025-04 | 위변조 방지 | JWT 서명 + AES-GCM 인증 태그 이중 검증 | 토큰 기반 링크의 무결성 보장 |
| NFR-025-05 | ID 고유성 | CUID2 충돌률 10^-24 이하 | Single-use ID 고유성 보장 |

### 7.3 가용성 요구사항

| ID | 항목 | 기준 | 근거 |
|----|------|------|------|
| NFR-026-01 | Enterprise 라이선스 | Personal Links는 Enterprise 플랜에서만 사용 가능 | 라이선스 정책 |
| NFR-026-02 | 토큰 만료 정밀도 | 일 단위 | JWT exp 클레임 설정 단위 |

---

## 8. 제약사항 및 가정

### 8.1 기술적 제약사항

| ID | 제약사항 |
|----|---------|
| TC-01 | 암호화 알고리즘은 AES-256-GCM (V2)만 신규 생성에 사용한다. AES-256-CBC (V1)는 읽기 전용 레거시 호환만 지원한다. |
| TC-02 | JWT 서명 알고리즘은 HS256만 지원한다. |
| TC-03 | 암호화 키는 환경변수를 통해 제공되어야 하며, 애플리케이션 코드에 하드코딩하지 않는다. |
| TC-04 | Single-use 링크의 최대 대량 생성 수는 5,000개로 제한한다. |
| TC-05 | JWT 만료는 일(day) 단위로만 설정 가능하다 (시/분 단위 설정 불가). |

### 8.2 비즈니스 제약사항

| ID | 제약사항 |
|----|---------|
| BC-01 | Single-use 링크 기능은 Community 라이선스 이상에서 사용 가능하다. |
| BC-02 | Personal Link 기능은 Enterprise 라이선스에서만 사용 가능하다. |
| BC-03 | Contact 관리(CRUD) 기능은 본 명세의 범위에 포함되지 않는다. |

### 8.3 가정사항

| ID | 가정 |
|----|------|
| AS-01 | 암호화 키는 운영 환경에서 안전하게 관리되고 있다고 가정한다. |
| AS-02 | CUID2 라이브러리의 충돌률이 공식 문서에 명시된 수준(10^-24 이하)을 충족한다고 가정한다. |
| AS-03 | Contact 데이터는 외부 시스템 또는 별도 기능에 의해 사전에 생성되어 있다고 가정한다. |
| AS-04 | 설문 응답 저장 로직은 별도 기능 명세(FSD 범위 외)에서 정의된다고 가정한다. |

---

## 9. 부록

### 9.1 요구사항 추적 매트릭스 (RTM)

| 요구사항 ID | 요구사항 설명 | 기능 ID | 기능명 | 수용 기준 |
|------------|-------------|---------|--------|----------|
| FR-025-01 | Single-use 설정 구조 | FN-025-01 | Single-use 설정 관리 | AC-025-07 |
| FR-025-02 | Single-use ID 생성 | FN-025-02 | Single-use ID 생성 | AC-025-01, AC-025-05 |
| FR-025-03 | Single-use ID 검증 | FN-025-03 | Single-use ID 검증 | AC-025-02, AC-025-04 |
| FR-025-04 | 링크 설문 페이지에서의 Single-use 처리 | FN-025-04 | Single-use 설문 페이지 렌더링 | AC-025-01, AC-025-02, AC-025-03, AC-025-04 |
| FR-025-05 | Multi-use / Single-use 토글 UI | FN-025-05 | Multi-use / Single-use 토글 UI | AC-025-07 |
| FR-025-06 | 대량 링크 생성 및 CSV 다운로드 | FN-025-06 | 대량 링크 생성 및 CSV 다운로드 | AC-025-06, AC-025-08 |
| FR-026-01 | Personal Link 생성 | FN-026-01 | Personal Link 생성 | AC-026-01, AC-026-02, AC-026-05, AC-026-06, AC-026-07 |
| FR-026-02 | Personal Link 토큰 검증 | FN-026-02 | Personal Link 토큰 검증 | AC-026-02, AC-026-04, AC-026-05 |
| FR-026-03 | Contact Survey 페이지 렌더링 | FN-026-03 | Contact Survey 페이지 렌더링 | AC-026-03, AC-026-04 |

### 9.2 수용 기준 매핑

| AC-ID | 시나리오 | 관련 기능 ID | 기대 결과 |
|-------|----------|-------------|----------|
| AC-025-01 | 암호화 활성 Single-use 링크 접근 | FN-025-02, FN-025-04 | suId가 정상 복호화되어 설문 표시 |
| AC-025-02 | 변조된 suId로 접근 | FN-025-03, FN-025-04 | "link invalid" 상태 표시 |
| AC-025-03 | 이미 완료된 Single-use 링크 재접근 | FN-025-04 | 완료 메시지 표시 (커스텀 heading/subheading) |
| AC-025-04 | suId 없이 Single-use 설문 접근 | FN-025-04 | "link invalid" 상태 표시 |
| AC-025-05 | 비암호화 Single-use 링크 | FN-025-02 | CUID2 값이 그대로 URL에 표시됨 |
| AC-025-06 | 1,000개 링크 대량 생성 | FN-025-06 | CSV 파일이 다운로드되며 각 링크에 고유 suId 포함 |
| AC-025-07 | Multi-use <-> Single-use 토글 | FN-025-05 | 확인 모달 표시 후 설정 변경 |
| AC-025-08 | 커스텀 suId (비암호화 모드) | FN-025-06 | ?suId=CUSTOM-ID 형태로 URL 제공 |
| AC-026-01 | Personal Link 생성 (만료 없음) | FN-026-01 | 유효한 JWT 토큰 URL 반환, 무기한 유효 |
| AC-026-02 | Personal Link 생성 (30일 만료) | FN-026-01, FN-026-02 | JWT에 30일 만료 설정, 만료 후 "link expired" 표시 |
| AC-026-03 | Personal Link로 이미 응답한 Contact | FN-026-03 | "response submitted" 상태 표시 |
| AC-026-04 | 변조된 JWT 토큰으로 접근 | FN-026-02, FN-026-03 | "link invalid" 상태 표시 |
| AC-026-05 | 암호화 키 미설정 시 | FN-026-01, FN-026-02 | 서버 에러 반환 (링크 생성/검증 모두) |
| AC-026-06 | Single-use + Personal Link 조합 | FN-026-01 | Personal Link URL에 suId 파라미터 추가됨 |
| AC-026-07 | Personal Link의 OG 메타데이터 | FN-026-01 | 커스텀 favicon, OG 이미지 포함 |

### 9.3 비활성 상태 목록

| 상태 | 표시 조건 | 설명 |
|------|----------|------|
| paused | 설문이 일시 중지된 경우 | 설문 자체가 중지 상태 |
| completed | 설문이 완료된 경우 | 설문이 종료 상태 |
| link invalid | suId/JWT가 무효한 경우 | 링크 변조 또는 suId 누락 |
| response submitted | Contact이 이미 응답한 경우 | Personal Link 1인 1응답 위반 시도 |
| link expired | JWT 만료 시간 경과 | Personal Link의 JWT 토큰 만료 |

### 9.4 변경 이력

| 버전 | 일자 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| v1.0 | 2026-02-21 | 최초 작성 | - |
