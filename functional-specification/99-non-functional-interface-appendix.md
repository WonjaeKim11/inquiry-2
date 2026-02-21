# 기능 명세서: 비기능 요구사항 / 인터페이스 명세 / 부록

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서 ID | FS-099 |
| 문서 버전 | 1.0 |
| 작성일 | 2026-02-21 |
| 기반 문서 | FSD-099 (비기능 요구사항 / 인터페이스 요구사항 / 부록 - 요구사항 명세서) |
| 상태 | 초안 |

---

## 2. 개요

### 2.1 목적

본 문서는 Inquiry 기반 Inquiry SaaS 시스템의 비기능 요구사항(NFR), 외부 인터페이스 요구사항(IFR), 시스템 제약사항, 용어 정의 및 기능-플랜 매트릭스를 상세 기능 명세 수준으로 기술한다. 개별 기능 명세서(FS-001 ~ FS-030)에서 횡단적으로 참조되는 공통 기준과 인터페이스 사양을 한 곳에 통합하여 일관성을 확보한다.

### 2.2 범위

**In-scope:**
- 비기능 요구사항 10건 (NFR-001 ~ NFR-010) 상세 명세
- 인터페이스 요구사항 11건 (IFR-001 ~ IFR-011) 상세 명세
- 기술/법적/비용/운영 제약사항
- 용어 정의 (40개 도메인 용어)
- Community vs Enterprise 기능 매트릭스
- Cloud 플랜별 기능 매트릭스
- Self-hosted 전용 기능

**Out-of-scope:**
- 개별 기능의 비즈니스 로직 상세 (각 FS-001 ~ FS-030 참조)
- 인프라 프로비저닝 절차
- 배포 파이프라인 구성 상세

### 2.3 대상 사용자

| 역할 | 관련 섹션 |
|------|----------|
| 백엔드 개발자 | NFR 전체, IFR-001 ~ IFR-003, IFR-008 ~ IFR-011 |
| 프론트엔드 개발자 | NFR-005, NFR-007, NFR-009, IFR-004 ~ IFR-007 |
| DevOps/인프라 엔지니어 | NFR-001, NFR-002, NFR-006, NFR-008, 제약사항 전체 |
| QA 엔지니어 | NFR 전체 (테스트 기준), IFR 전체 (통합 테스트 기준) |
| 보안 담당자 | NFR-003, NFR-004 |
| 프로덕트 매니저 | 기능-플랜 매트릭스, 제약사항 |

### 2.4 용어 정의

본 문서에서 사용하는 용어 정의는 **섹션 8 (용어 사전)**에 별도로 기술한다.

---

## 3. 시스템 개요

### 3.1 시스템 구성도

```
[Browser/SDK Client]
    |
    v
[CDN (UMD Bundle)] --> [Next.js App Router (16)]
    |                         |
    v                         v
[Client API]           [Management API]
    |                         |
    v                         v
[Redis Cache/Rate Limit] <-> [Application Server]
                                    |
                         +----------+----------+
                         |          |          |
                    [PostgreSQL] [Sentry]  [Email Service]
                    (Prisma ORM)           (SMTP)
                         |
                    [Stripe API]
```

### 3.2 주요 기능 목록 (횡단 관심사)

| ID | 기능명 | 분류 |
|----|--------|------|
| NFR-001 ~ NFR-010 | 비기능 요구사항 10건 | 성능, 가용성, 보안, 준수, 호환성, 확장성, 유지보수성, 모니터링, 국제화, 데이터 무결성 |
| IFR-001 ~ IFR-011 | 인터페이스 요구사항 11건 | Client API, Management API, Webhook, SDK, GTM, Email Embed, Export, SSO, reCAPTCHA, Stripe, Standard Webhooks |

### 3.3 기능 간 관계도

```
NFR-001 (성능) -----> IFR-001 (Client API): API 응답 시간 2초 이내
                 +--> IFR-002 (Management API): API 응답 시간 2초 이내
                 +--> IFR-004 (JS SDK): 설문 로딩 2초 이내

NFR-002 (가용성) ---> IFR-001/002: API Retry 정책 적용
                 +--> 전체 시스템: Uptime SLA 99.9%

NFR-003 (보안) -----> IFR-001: Environment ID 기반 공개 접근
                 +--> IFR-002: API Key Bearer 토큰 인증
                 +--> IFR-003: Standard Webhooks 서명
                 +--> IFR-008: SSO 프로바이더 통합
                 +--> IFR-009: reCAPTCHA 스팸 방지

NFR-004 (GDPR) -----> 전체 데이터 처리 인터페이스

NFR-010 (무결성) ---> IFR-001/002: Zod 스키마 검증
```

---

## 4. 상세 비기능 요구사항 명세

### 4.1 NFR-001: 성능 (Performance)

#### 4.1.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | NFR-001 |
| 기능명 | 성능 요구사항 |
| 관련 요구사항 ID | FSD-099 > NFR-001 |
| 우선순위 | 높음 |
| 기능 설명 | 시스템 전반의 응답 시간, 캐싱 전략, 페이지네이션 정책을 정의한다 |

#### 4.1.2 성능 목표

| 측정 항목 | 목표값 | 측정 조건 | 근거 |
|----------|--------|----------|------|
| 설문 로딩 시간 | 2초 이내 | UMD 번들 CDN 제공 기준, 네트워크 RTT 제외 | UMD 번들 사전 빌드 + CDN 배포 |
| API 응답 시간 (평균) | 2초 이내 | 캐시 적중 포함, P95 기준 별도 정의 필요 | 요청 단위 중복 제거 + Redis 캐싱 |
| Webhook 외부 호출 Timeout | 5초 | Pipeline 내 외부 HTTP 호출 기준 | 외부 서비스 응답 대기 상한 |

#### 4.1.3 페이지네이션 정책

| 대상 | 방식 | 기본 페이지 크기 |
|------|------|-----------------|
| 일반 목록 | 커서 기반 또는 offset 기반 | 30건 |
| 설문 목록 | 커서 기반 또는 offset 기반 | 12건 |
| 응답 목록 | 커서 기반 또는 offset 기반 | 25건 |

#### 4.1.4 캐싱 전략

**4.1.4.1 요청 단위 캐시 (Request-level Deduplication)**

| 항목 | 상세 |
|------|------|
| 적용 대상 | 서버 함수 내 중복 호출 (연락처 조회, 세그먼트 조회 등) |
| 메커니즘 | 동일 요청 컨텍스트 내에서 동일 인자의 함수 호출 결과를 재사용 |
| TTL | 요청 수명과 동일 (요청 종료 시 폐기) |
| 무효화 | 요청 종료 시 자동 폐기 |

**4.1.4.2 Redis 캐시**

| 항목 | 상세 |
|------|------|
| 적용 대상 | 비용이 높은 데이터 조회 결과 (라이선스 정보 등) |
| TTL | 데이터 유형별 설정 (License 캐시: 24시간) |
| 무효화 | TTL 만료 또는 관련 데이터 변경 시 명시적 삭제 |
| 인프라 의존 | Redis 서버 필수 |

**4.1.4.3 Memory Cache (프로세스 내 캐시)**

| 항목 | 상세 |
|------|------|
| 적용 대상 | License 체크 결과 |
| TTL | 1분 |
| 범위 | 단일 프로세스 내 (인스턴스 간 공유 불가) |

**4.1.4.4 금지 캐시**

| 항목 | 사유 |
|------|------|
| Next.js `unstable_cache()` | 프로젝트 정책에 의해 사용 금지. 캐시 무효화 제어가 불명확하여 데이터 일관성 문제 발생 가능 |

#### 4.1.5 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| NFR-001-BR-01 | API 요청 시 동일 인자 서버 함수 중복 호출 발생 | 요청 단위 캐시로 중복 제거하여 단일 호출로 처리 |
| NFR-001-BR-02 | License 체크 요청 | Memory Cache(1분) 확인 -> Redis Cache(24시간) 확인 -> API 호출 순서로 조회 |
| NFR-001-BR-03 | 페이지네이션 요청 시 크기 미지정 | 대상별 기본 페이지 크기 적용 |

---

### 4.2 NFR-002: 가용성 (Availability)

#### 4.2.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | NFR-002 |
| 기능명 | 가용성 요구사항 |
| 관련 요구사항 ID | FSD-099 > NFR-002 |
| 우선순위 | 높음 |
| 기능 설명 | 시스템 Uptime SLA, 라이선스 유예 기간, API 재시도 정책을 정의한다 |

#### 4.2.2 Uptime SLA

| 플랜 | 목표 Uptime | 최대 허용 다운타임 (월간) |
|------|------------|------------------------|
| Custom 플랜 | 99.9% | 약 43분 |
| Free/Startup 플랜 | SLA 미보장 | - |

#### 4.2.3 License Grace Period

| 항목 | 값 | 설명 |
|------|-----|------|
| 유예 기간 | 3일 (72시간) | 라이선스 서버 접근 불가 시 기존 라이선스 상태를 유지하는 기간 |
| 이전 결과 TTL | 4일 (96시간) | Grace Period 동안 사용할 이전 라이선스 확인 결과의 보존 기간 |
| 유예 초과 시 동작 | Enterprise 기능 비활성화 | 라이선스 검증 실패 상태로 전환 |

**Grace Period 흐름:**

```
1. License API 호출 시도
2. 호출 실패 발생
3. Redis에서 이전 License 결과 조회 (TTL 4일)
   3a. 이전 결과 존재 + 3일 이내 -> 이전 라이선스 상태 유지
   3b. 이전 결과 존재 + 3일 초과 -> Enterprise 기능 비활성화
   3c. 이전 결과 없음 -> Enterprise 기능 비활성화
```

#### 4.2.4 API Retry 정책

| 항목 | 값 |
|------|-----|
| 최대 재시도 횟수 | 3회 |
| 재시도 전략 | 지수 백오프 (Exponential Backoff) |
| 초기 지연 | 1초 |
| 재시도 간격 | 1초 -> 2초 -> 4초 |
| 재시도 대상 HTTP 상태 코드 | 429 (Too Many Requests), 502 (Bad Gateway), 503 (Service Unavailable), 504 (Gateway Timeout) |
| 적용 대상 | License API fetch 호출 |
| 비재시도 대상 | 4xx (429 제외), 5xx (502/503/504 제외) |

#### 4.2.5 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| NFR-002-BR-01 | License API 호출이 429/502/503/504로 실패 | 지수 백오프로 최대 3회 재시도 (1초 -> 2초 -> 4초) |
| NFR-002-BR-02 | License API 3회 재시도 모두 실패 | Redis 캐시에서 이전 결과 조회하여 Grace Period 적용 |
| NFR-002-BR-03 | Grace Period 3일 경과 후에도 License API 복구 안 됨 | Enterprise 기능 전체 비활성화 |

---

### 4.3 NFR-003: 보안 (Security)

#### 4.3.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | NFR-003 |
| 기능명 | 보안 요구사항 |
| 관련 요구사항 ID | FSD-099 > NFR-003 |
| 우선순위 | 높음 |
| 기능 설명 | TLS, 인증, 인가, 암호화, Rate Limiting 등 시스템 전반의 보안 정책을 정의한다 |

#### 4.3.2 전송 보안

| 항목 | 구현 |
|------|------|
| 프로토콜 | HTTPS 강제 (TLS 1.2 이상 권장) |
| HTTP 요청 | HTTPS로 리다이렉트 |

#### 4.3.3 인증 체계

| 인증 방식 | 적용 대상 | 상세 |
|----------|----------|------|
| 이메일/비밀번호 | 관리자 로그인 | 비밀번호 정책 적용 (섹션 4.3.4 참조) |
| 2FA (TOTP) | 관리자 로그인 (선택적) | TOTP 기반 2단계 인증, Enterprise 기능 |
| SSO | 관리자 로그인 | Google, GitHub, Azure AD, OIDC, Enterprise 기능 |
| SAML | 관리자 로그인 | BoxyHQ SAML, Self-hosted 전용 |
| API Key | Management API | Bearer 토큰 방식, Environment 단위 발급 |
| Session | 관리자 UI | next-auth 기반 세션 관리 |
| Environment ID | Client API | 공개 접근, Environment ID로 데이터 격리 |

#### 4.3.4 비밀번호 정책

| 규칙 | 값 |
|------|-----|
| 최소 길이 | 8자 |
| 최대 길이 | 128자 (FS-001 참조) |
| 대문자 | 1개 이상 필수 |
| 숫자 | 1개 이상 필수 |

#### 4.3.5 RBAC (역할 기반 접근 제어)

| 역할 | 수준 | 설명 |
|------|------|------|
| owner | Organization | 조직의 최고 권한. 모든 설정 변경 가능 |
| manager | Organization | 멤버 관리, 프로젝트 관리 가능 |
| member | Organization | 할당된 프로젝트 접근만 가능 |
| billing | Organization | 빌링 정보만 접근 가능 |

#### 4.3.6 암호화

| 항목 | 구현 |
|------|------|
| 암호화 키 관리 | 환경변수(`ENCRYPTION_KEY`)를 통한 키 주입 |
| License Key 보호 | 원본 키를 해시 처리 후 캐시 키로 사용 |
| Webhook 비밀 키 | 선택적 설정, HMAC 서명에 사용 |

#### 4.3.7 Rate Limiting

**인프라 요구사항:**
- Redis 기반 구현 (Redis URL 환경변수 설정 필수)
- 환경변수를 통해 Rate Limiting 비활성화 가능
- 엔드포인트별 개별 설정

**4.3.7.1 인증 관련 Rate Limiting**

| 엔드포인트 | 제한 | 시간 윈도우 | 초과 시 HTTP 상태 |
|-----------|------|-----------|-----------------|
| 로그인 | 10회 | 15분 | 429 Too Many Requests |
| 회원가입 | 30회 | 1시간 | 429 Too Many Requests |
| 비밀번호 찾기 | 5회 | 1시간 | 429 Too Many Requests |
| 이메일 인증 | 10회 | 1시간 | 429 Too Many Requests |

**4.3.7.2 API Rate Limiting**

| 엔드포인트 | 제한 | 시간 윈도우 | 초과 시 HTTP 상태 |
|-----------|------|-----------|-----------------|
| Management API v1 | 100회 | 1분 | 429 Too Many Requests |
| API v2 | 100회 | 1분 | 429 Too Many Requests |
| Client API | 100회 | 1분 | 429 Too Many Requests |

**4.3.7.3 액션 관련 Rate Limiting**

| 엔드포인트 | 제한 | 시간 윈도우 | 초과 시 HTTP 상태 |
|-----------|------|-----------|-----------------|
| 이메일 업데이트 | 3회 | 1시간 | 429 Too Many Requests |
| 설문 후속 처리 | 50회 | 1시간 | 429 Too Many Requests |
| 링크 설문 이메일 발송 | 10회 | 1시간 | 429 Too Many Requests |
| 라이선스 재확인 | 5회 | 1분 | 429 Too Many Requests |

**4.3.7.4 스토리지 관련 Rate Limiting**

| 엔드포인트 | 제한 | 시간 윈도우 | 초과 시 HTTP 상태 |
|-----------|------|-----------|-----------------|
| 파일 업로드 | 5회 | 1분 | 429 Too Many Requests |
| 파일 삭제 | 5회 | 1분 | 429 Too Many Requests |

#### 4.3.8 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| NFR-003-BR-01 | HTTP 요청 수신 | HTTPS로 강제 리다이렉트 |
| NFR-003-BR-02 | Rate Limit 초과 | HTTP 429 응답 반환, 재시도 가능 시간 헤더 포함 |
| NFR-003-BR-03 | Redis 미연결 상태에서 Rate Limiting | Rate Limiting 환경변수 비활성화 설정 시 통과, 미설정 시 요청 거부 |
| NFR-003-BR-04 | API Key 인증 실패 | HTTP 401 Unauthorized 응답 |
| NFR-003-BR-05 | RBAC 권한 부족 | HTTP 403 Forbidden 응답 |

---

### 4.4 NFR-004: GDPR 준수 (Compliance)

#### 4.4.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | NFR-004 |
| 기능명 | GDPR 준수 요구사항 |
| 관련 요구사항 ID | FSD-099 > NFR-004 |
| 우선순위 | 높음 |
| 기능 설명 | EU 일반 데이터 보호 규정(GDPR) 준수를 위한 데이터 처리 정책을 정의한다 |

#### 4.4.2 데이터 보호 정책

| 항목 | 구현 | 비고 |
|------|------|------|
| 데이터 삭제 | 연락처 hard delete 지원 | 물리적 삭제, soft delete 아님 |
| 데이터 격리 | Organization/Environment 단위 | 테넌트 간 데이터 접근 불가 |
| 동의 관리 | 설문 내 동의 수집 기능 | 설문 질문으로 동의 여부 수집 |
| 데이터 호스팅 | Frankfurt, EU (Cloud) | AWS eu-central-1 리전 |

#### 4.4.3 법적 고지 URL 설정

| 환경변수 | 용도 | 필수 여부 |
|---------|------|----------|
| 개인정보 처리 방침 URL | 개인정보 처리 방침 링크 표시 | 권장 |
| 이용약관 URL | 이용약관 링크 표시 | 권장 |

#### 4.4.4 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| NFR-004-BR-01 | 연락처 삭제 요청 | 연락처 및 관련 속성 데이터를 물리적으로 삭제 (hard delete). 복구 불가 |
| NFR-004-BR-02 | 다른 Organization의 데이터 접근 시도 | 접근 차단, HTTP 403 응답 |
| NFR-004-BR-03 | 다른 Environment의 데이터 접근 시도 | 접근 차단, 데이터 격리 보장 |

---

### 4.5 NFR-005: 브라우저 호환성

#### 4.5.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | NFR-005 |
| 기능명 | 브라우저 호환성 요구사항 |
| 관련 요구사항 ID | FSD-099 > NFR-005 |
| 우선순위 | 중간 |
| 기능 설명 | 관리자 UI 및 설문 런타임의 브라우저 지원 범위를 정의한다 |

#### 4.5.2 지원 브라우저

| 대상 | 지원 브라우저 | 최소 버전 | 비고 |
|------|-------------|----------|------|
| 관리자 UI | Chrome | 최신 2개 메이저 버전 | - |
| 관리자 UI | Firefox | 최신 2개 메이저 버전 | - |
| 관리자 UI | Safari | 최신 2개 메이저 버전 | - |
| 관리자 UI | Edge | 최신 2개 메이저 버전 | - |
| 설문 런타임 | Shadow DOM 지원 브라우저 | - | 호스트 페이지 스타일과 격리 |

#### 4.5.3 설문 런타임 격리

| 항목 | 구현 |
|------|------|
| 렌더링 방식 | Shadow DOM |
| 스타일 격리 | 호스트 페이지 CSS와 완전 격리 |
| 장점 | 호스트 페이지의 CSS가 설문 UI에 영향을 미치지 않음 |

#### 4.5.4 E2E 테스트 환경

| 항목 | 값 |
|------|-----|
| 테스트 프레임워크 | Playwright |
| 테스트 브라우저 | Chromium |
| 비고 | 크로스 브라우저 E2E 테스트는 Chromium 기반으로만 실행 |

---

### 4.6 NFR-006: 확장성 (Scalability)

#### 4.6.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | NFR-006 |
| 기능명 | 확장성 요구사항 |
| 관련 요구사항 ID | FSD-099 > NFR-006 |
| 우선순위 | 중간 |
| 기능 설명 | 시스템의 데이터 처리 한도 및 병렬 처리 정책을 정의한다 |

#### 4.6.2 시스템 한도

| 항목 | 제한값 | 단위 | 비고 |
|------|--------|------|------|
| 환경당 최대 속성 키 수 | 150 | 개 | Contact Attribute Key 수 상한 |
| CSV 업로드 최대 레코드 | 10,000 | 건 | 단일 CSV 파일 기준 |
| API Bulk 작업 최대 건수 | 250 | 건 | 단일 API 요청 기준 |

#### 4.6.3 병렬 처리 정책

| 적용 대상 | 처리 방식 | 비고 |
|----------|----------|------|
| 대량 데이터 조회 | Promise.all / 병렬 쿼리 | DB 커넥션 풀 한도 내에서 처리 |
| 이메일 발송 | 병렬 발송 | 발송 실패 시 개별 오류 처리 |

#### 4.6.4 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| NFR-006-BR-01 | 환경 내 속성 키 150개 초과 시도 | 생성 거부, 오류 메시지 반환 |
| NFR-006-BR-02 | CSV 업로드 10,000건 초과 | 업로드 거부, 최대 건수 안내 |
| NFR-006-BR-03 | API Bulk 요청 250건 초과 | 요청 거부, 최대 건수 안내 |

---

### 4.7 NFR-007: 유지보수성 (Maintainability)

#### 4.7.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | NFR-007 |
| 기능명 | 유지보수성 요구사항 |
| 관련 요구사항 ID | FSD-099 > NFR-007 |
| 우선순위 | 중간 |
| 기능 설명 | 코드 품질, 타입 안전성, 테스트, 빌드 시스템의 기준을 정의한다 |

#### 4.7.2 코드 품질 도구

| 도구 | 용도 | 설정 |
|------|------|------|
| ESLint | 정적 분석 | 프로젝트 규칙 적용 |
| SonarQube | 코드 품질 분석 | 코드 스멜, 중복, 복잡도 검사 |
| Prettier | 코드 포맷팅 | 줄 길이 110자, 더블쿼트(`"`), 세미콜론(`;`) 사용 |

#### 4.7.3 타입 안전성

| 항목 | 구현 |
|------|------|
| TypeScript | strict mode 활성화 |
| 런타임 검증 | Zod 스키마 기반 런타임 데이터 검증 |
| 컴파일 타임 + 런타임 | TypeScript 타입과 Zod 스키마 동기화 |

#### 4.7.4 테스트 프레임워크

| 유형 | 도구 | 비고 |
|------|------|------|
| 단위 테스트 | Vitest | 컴포넌트, 유틸리티, 서비스 테스트 |
| E2E 테스트 | Playwright | Chromium 기반 브라우저 테스트 |

#### 4.7.5 빌드 시스템

| 항목 | 구현 |
|------|------|
| 모노레포 관리 | pnpm (패키지 매니저) + Turborepo (빌드 오케스트레이션) |
| 의존성 그래프 | Turborepo 기반 빌드 순서 자동 결정 |

#### 4.7.6 커밋 규칙

| 유형 | 접두사 | 사용 시점 |
|------|--------|----------|
| 버그 수정 | `fix:` | 버그 수정 커밋 |
| 새 기능 | `feat:` | 새 기능 추가 커밋 |
| 기타 | `chore:` | 빌드, 설정, 도구 변경 등 |

---

### 4.8 NFR-008: 로깅 및 모니터링

#### 4.8.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | NFR-008 |
| 기능명 | 로깅 및 모니터링 요구사항 |
| 관련 요구사항 ID | FSD-099 > NFR-008 |
| 우선순위 | 중간 |
| 기능 설명 | 애플리케이션 로깅, 에러 추적, 감사 로그, 텔레메트리 정책을 정의한다 |

#### 4.8.2 로깅

| 항목 | 구현 | 비고 |
|------|------|------|
| 로깅 라이브러리 | Pino | 구조화된 JSON 로그 출력 |
| 로그 레벨 | debug, info, warn, error | 환경별 레벨 설정 |

#### 4.8.3 에러 추적

| 항목 | 구현 |
|------|------|
| 에러 추적 서비스 | Sentry |
| 자동 보고 | 미처리 예외 및 거부된 Promise 자동 보고 |
| 컨텍스트 정보 | 사용자 ID, 환경 정보 등 포함 |

#### 4.8.4 감사 로그

| 항목 | 구현 |
|------|------|
| 기능 범위 | Enterprise 플랜 전용 |
| 처리 방식 | 감사 이벤트 큐잉 (비동기 처리) |
| 상세 명세 | FS-005 (감사로그 기능 명세서) 참조 |

#### 4.8.5 텔레메트리

| 항목 | 구현 |
|------|------|
| 데이터 유형 | 익명 사용 통계 |
| 비활성화 | 환경변수를 통해 비활성화 가능 |
| 수집 데이터 | 기능 사용 빈도, 설문 생성 수 등 (개인정보 미포함) |

---

### 4.9 NFR-009: 국제화 (Internationalization)

#### 4.9.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | NFR-009 |
| 기능명 | 국제화 요구사항 |
| 관련 요구사항 ID | FSD-099 > NFR-009 |
| 우선순위 | 중간 |
| 기능 설명 | 관리자 UI의 다국어 지원 범위와 기술 스택을 정의한다 |

#### 4.9.2 다국어 지원

| 항목 | 값 | 비고 |
|------|-----|------|
| 지원 언어 수 | 14개 | FS-030 참조 |
| 메시지 포맷 | ICU Message Format | 복수형, 성별, 선택 구문 지원 |
| 폴백 언어 | en-US | 번역 누락 시 영어로 표시 |

#### 4.9.3 기술 스택

| 라이브러리 | 역할 |
|-----------|------|
| i18next | 핵심 국제화 엔진 |
| react-i18next | React 컴포넌트 바인딩 |

#### 4.9.4 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| NFR-009-BR-01 | 사용자가 지원되지 않는 언어 선택 | en-US(영어)로 폴백 |
| NFR-009-BR-02 | 특정 키에 번역이 누락된 경우 | en-US 번역값 표시 |

---

### 4.10 NFR-010: 데이터 무결성

#### 4.10.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | NFR-010 |
| 기능명 | 데이터 무결성 요구사항 |
| 관련 요구사항 ID | FSD-099 > NFR-010 |
| 우선순위 | 높음 |
| 기능 설명 | 입력 검증, DB 제약, 트랜잭션 처리 등 데이터 정합성 보장 정책을 정의한다 |

#### 4.10.2 입력 검증

| 항목 | 구현 |
|------|------|
| 검증 라이브러리 | Zod |
| 검증 방식 | Zod 스키마 기반 유효성 검증 유틸리티 |
| 적용 범위 | API 요청 바디, 폼 입력, 환경변수 등 |
| 검증 실패 시 | HTTP 400 Bad Request + 상세 오류 메시지 |

#### 4.10.3 데이터베이스 제약

| 제약 유형 | 적용 | 비고 |
|----------|------|------|
| Unique Constraint | 이메일, API Key, 슬러그 등 | 중복 방지 |
| Foreign Key | 엔티티 간 참조 무결성 | Organization-Project-Environment 계층 등 |
| Index | 조회 빈도 높은 컬럼 | 성능 최적화 |
| Cascade Delete | 부모 엔티티 삭제 시 | 관련 하위 레코드 자동 정리 |

#### 4.10.4 트랜잭션 처리

| 항목 | 구현 |
|------|------|
| 트랜잭션 대상 | 복수 테이블에 걸친 연산 (세그먼트 리셋, 연락처 일괄 처리 등) |
| 구현 방식 | Prisma 트랜잭션 (`$transaction`) |
| 실패 시 | 전체 롤백 |

#### 4.10.5 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| NFR-010-BR-01 | Zod 스키마 검증 실패 | HTTP 400 응답 + 필드별 오류 목록 반환 |
| NFR-010-BR-02 | Unique Constraint 위반 | HTTP 409 Conflict 응답 |
| NFR-010-BR-03 | 부모 엔티티 삭제 | Cascade 설정에 따라 하위 레코드 자동 삭제 |
| NFR-010-BR-04 | 트랜잭션 내 오류 발생 | 전체 연산 롤백, 오류 메시지 반환 |

---

## 5. 상세 인터페이스 명세

### 5.1 IFR-001: Client API

#### 5.1.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | IFR-001 |
| 기능명 | Client API 인터페이스 |
| 관련 요구사항 ID | FSD-099 > IFR-001 |
| 우선순위 | 높음 |
| 기능 설명 | SDK에서 설문 데이터 조회, 응답 제출, 사용자 식별을 위한 공개 API 인터페이스 |

#### 5.1.2 엔드포인트 체계

| 버전 | 기본 경로 | 비고 |
|------|----------|------|
| v1 | `/api/v1/client/{environmentId}/...` | 레거시 버전 |
| v2 | `/api/v2/client/{environmentId}/...` | 최신 버전 |

#### 5.1.3 인증 방식

| 항목 | 값 |
|------|-----|
| 인증 방식 | Environment ID 기반 (공개 접근) |
| API Key 불요 | 클라이언트 측 SDK에서 직접 호출하므로 별도 인증 키 없음 |
| 데이터 격리 | Environment ID로 데이터 범위 자동 제한 |

#### 5.1.4 Rate Limiting

| 항목 | 값 |
|------|-----|
| 제한 | 100회/분 |
| 식별 기준 | IP 주소 또는 Environment ID |
| 초과 시 | HTTP 429 Too Many Requests |

#### 5.1.5 주요 기능

| 기능 | 설명 | 관련 FS |
|------|------|---------|
| 설문 데이터 조회 | 활성 설문 목록 및 상세 정보 반환 | FS-007 |
| 응답 제출 | 사용자 설문 응답 데이터 저장 | FS-021 |
| 사용자 식별 | SDK를 통한 사용자 식별 및 속성 설정 | FS-020 |

#### 5.1.6 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| IFR-001-BR-01 | 유효하지 않은 Environment ID | HTTP 404 Not Found 응답 |
| IFR-001-BR-02 | Rate Limit 초과 | HTTP 429 응답, Retry-After 헤더 포함 |
| IFR-001-BR-03 | 다른 Environment의 데이터 요청 | 해당 Environment 범위 내 데이터만 반환 |

---

### 5.2 IFR-002: Management API

#### 5.2.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | IFR-002 |
| 기능명 | Management API 인터페이스 |
| 관련 요구사항 ID | FSD-099 > IFR-002 |
| 우선순위 | 높음 |
| 기능 설명 | 설문, 응답, 연락처, 속성 키 CRUD를 위한 인증된 관리 API 인터페이스 |

#### 5.2.2 엔드포인트 체계

| 버전 | 기본 경로 | 비고 |
|------|----------|------|
| v1 | `/api/v1/management/...` | 레거시 버전 |
| v2 | `/api/v2/management/...` | 최신 버전 |

#### 5.2.3 인증 방식

| 항목 | 값 |
|------|-----|
| 인증 방식 | API Key (Bearer token) |
| 헤더 형식 | `Authorization: Bearer {apiKey}` |
| 키 발급 단위 | Environment 단위 |
| 키 관리 | 관리자 UI에서 생성/폐기 |

#### 5.2.4 Rate Limiting

| 항목 | 값 |
|------|-----|
| 제한 | 100회/분 |
| 식별 기준 | API Key |
| 초과 시 | HTTP 429 Too Many Requests |

#### 5.2.5 주요 CRUD 대상

| 리소스 | 지원 작업 | 관련 FS |
|--------|----------|---------|
| 설문 (Survey) | CRUD | FS-008, FS-024 |
| 응답 (Response) | CRUD | FS-021, FS-024 |
| 연락처 (Contact) | CRUD | FS-026, FS-024 |
| 속성 키 (Attribute Key) | CRUD | FS-026, FS-024 |

#### 5.2.6 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| IFR-002-BR-01 | API Key 미제공 또는 무효 | HTTP 401 Unauthorized 응답 |
| IFR-002-BR-02 | API Key의 Environment 범위 외 데이터 접근 | HTTP 403 Forbidden 응답 |
| IFR-002-BR-03 | Rate Limit 초과 | HTTP 429 응답, Retry-After 헤더 포함 |

---

### 5.3 IFR-003: Webhook

#### 5.3.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | IFR-003 |
| 기능명 | Webhook 인터페이스 |
| 관련 요구사항 ID | FSD-099 > IFR-003 |
| 우선순위 | 높음 |
| 기능 설명 | 설문 이벤트 발생 시 외부 URL로 HTTP POST 요청을 발송하는 Webhook 인터페이스 |

#### 5.3.2 트리거 이벤트

| 이벤트명 | 발생 시점 |
|---------|----------|
| `responseCreated` | 새 응답이 생성되었을 때 |
| `responseUpdated` | 기존 응답이 업데이트되었을 때 |
| `responseFinished` | 응답이 완료(finished)되었을 때 |

#### 5.3.3 Webhook 소스

| 소스 | 설명 |
|------|------|
| `user` | 사용자 직접 생성 Webhook |
| `zapier` | Zapier 통합 |
| `make` | Make (Integromat) 통합 |
| `n8n` | n8n 통합 |
| `activepieces` | Activepieces 통합 |

#### 5.3.4 Standard Webhooks 헤더

| 헤더 | 값 | 필수 |
|------|-----|------|
| `content-type` | `application/json` | 필수 |
| `webhook-id` | UUID v7 기반 고유 메시지 ID | 필수 |
| `webhook-timestamp` | Unix timestamp (초 단위) | 필수 |
| `webhook-signature` | HMAC 기반 서명 | 비밀 키 설정 시 필수 |

#### 5.3.5 설정 옵션

| 항목 | 값 | 비고 |
|------|-----|------|
| 비밀 키 | 선택적 | 설정 시 HMAC 서명 포함 |
| Timeout | 5초 | 외부 서비스 응답 대기 상한 |
| 필터 | 특정 설문 ID 또는 전체 설문 | 이벤트 발생 설문 범위 지정 |

#### 5.3.6 기본 흐름

```
1. 설문 이벤트 발생 (응답 생성/수정/완료)
2. Pipeline에서 해당 환경의 활성 Webhook 목록 조회
3. 각 Webhook에 대해:
   3a. Webhook 필터 확인 (특정 설문 또는 전체)
   3b. 필터 통과 시 페이로드 구성
   3c. Standard Webhooks 헤더 생성 (webhook-id, webhook-timestamp)
   3d. 비밀 키 설정된 경우 HMAC 서명 생성 (webhook-signature)
   3e. HTTP POST 요청 발송 (Timeout 5초)
4. 응답 수신 또는 Timeout 발생
   4a. 성공 (2xx) -> 완료
   4b. Timeout 또는 오류 -> 로그 기록 (자동 재시도 없음)
```

#### 5.3.7 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| IFR-003-BR-01 | Webhook 외부 호출 5초 초과 | Timeout 처리, Pipeline 진행 차단하지 않음 |
| IFR-003-BR-02 | Webhook 필터에 특정 설문 ID 설정 | 해당 설문의 이벤트만 발송 |
| IFR-003-BR-03 | 비밀 키 미설정 | webhook-signature 헤더 생략 |

---

### 5.4 IFR-004: JavaScript SDK

#### 5.4.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | IFR-004 |
| 기능명 | JavaScript SDK 인터페이스 |
| 관련 요구사항 ID | FSD-099 > IFR-004 |
| 우선순위 | 높음 |
| 기능 설명 | 웹 애플리케이션에 설문을 삽입하기 위한 JavaScript SDK 패키지 |

#### 5.4.2 패키지 구성

| 패키지명 | 역할 | 번들 형식 |
|---------|------|----------|
| `@formbricks/js` | 최종 사용자용 SDK (브라우저 환경) | UMD + ESM |
| `@formbricks/js-core` | SDK 코어 로직 라이브러리 | ESM |

#### 5.4.3 주요 기능

| 기능 | 설명 | 관련 FS |
|------|------|---------|
| 설문 표시 | 조건에 맞는 설문을 인앱으로 렌더링 | FS-007, FS-019 |
| 사용자 식별 | `identify()` 메서드로 사용자 식별 | FS-020 |
| 속성 설정 | 사용자 속성(Attribute) 설정 및 업데이트 | FS-026 |
| 이벤트 트리거 | 커스텀 이벤트를 트리거하여 설문 표시 조건 충족 | FS-019 |

#### 5.4.4 배포

| 항목 | 값 |
|------|-----|
| CDN 제공 | UMD 번들 사전 빌드 후 CDN 배포 |
| npm 배포 | `@formbricks/js` npm 패키지 |
| 로딩 성능 목표 | 2초 이내 (NFR-001 참조) |

---

### 5.5 IFR-005: GTM (Google Tag Manager)

#### 5.5.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | IFR-005 |
| 기능명 | GTM 통합 인터페이스 |
| 관련 요구사항 ID | FSD-099 > IFR-005 |
| 우선순위 | 중간 |
| 기능 설명 | Google Tag Manager 컨테이너를 통해 설문 SDK를 웹 페이지에 삽입하는 기능 |

#### 5.5.2 기본 흐름

```
1. GTM 컨테이너에 Inquiry SDK 스크립트 태그 등록
2. GTM 트리거 조건 충족 시 SDK 스크립트 로드
3. SDK 초기화 (Environment ID 전달)
4. Client API를 통해 활성 설문 조회
5. 조건에 맞는 설문 인앱 표시
```

#### 5.5.3 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| IFR-005-BR-01 | GTM 컨테이너 로드 완료 | SDK 스크립트 주입 및 초기화 |
| IFR-005-BR-02 | SDK 로드 실패 | 호스트 페이지에 영향 없음 (비차단 로드) |

---

### 5.6 IFR-006: Email Embed

#### 5.6.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | IFR-006 |
| 기능명 | 이메일 임베드 인터페이스 |
| 관련 요구사항 ID | FSD-099 > IFR-006 |
| 우선순위 | 중간 |
| 기능 설명 | 이메일 본문 내에 설문의 첫 번째 질문을 임베드하여 응답률을 향상시키는 기능 |

#### 5.6.2 기본 흐름

```
1. 설문 링크 이메일 발송 시 첫 번째 질문 HTML 생성
2. 이메일 본문에 첫 번째 질문 렌더링 (정적 HTML)
3. 수신자가 이메일 내 선택지 클릭
4. 설문 링크 페이지로 이동 (선택 값 파라미터 전달)
5. 나머지 질문 표시 및 응답 수집
```

#### 5.6.3 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| IFR-006-BR-01 | 이메일 클라이언트에서 HTML 렌더링 불가 | 설문 링크 텍스트 폴백 표시 |
| IFR-006-BR-02 | 첫 번째 질문 선택 후 | 선택값을 쿼리 파라미터로 전달하여 설문 페이지 이동 |

---

### 5.7 IFR-007: Export

#### 5.7.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | IFR-007 |
| 기능명 | 데이터 내보내기 인터페이스 |
| 관련 요구사항 ID | FSD-099 > IFR-007 |
| 우선순위 | 중간 |
| 기능 설명 | 설문 응답 데이터를 CSV 또는 Excel 형식으로 내보내는 기능 |

#### 5.7.2 지원 형식

| 형식 | MIME Type | 확장자 |
|------|----------|--------|
| CSV | `text/csv` | `.csv` |
| Excel | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `.xlsx` |

#### 5.7.3 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| IFR-007-BR-01 | 내보내기 요청 | 해당 설문의 응답 데이터를 선택한 형식으로 생성하여 다운로드 |
| IFR-007-BR-02 | 응답 데이터 없음 | 헤더만 포함된 빈 파일 다운로드 |

---

### 5.8 IFR-008: SSO 통합

#### 5.8.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | IFR-008 |
| 기능명 | SSO 통합 인터페이스 |
| 관련 요구사항 ID | FSD-099 > IFR-008 |
| 우선순위 | 높음 |
| 기능 설명 | 외부 ID 프로바이더를 통한 Single Sign-On 인증 통합 |

#### 5.8.2 SSO 프로바이더 설정

| 프로바이더 | 활성화 조건 (환경변수) | 라이선스 |
|-----------|----------------------|---------|
| Google | Client ID + Client Secret 설정 | Enterprise (sso) |
| GitHub | ID + Secret 설정 | Enterprise (sso) |
| Azure AD | Client ID + Client Secret + Tenant ID 설정 | Enterprise (sso) |
| OIDC | Client ID + Client Secret + Issuer 설정 | Enterprise (sso) |
| SAML | SAML DB URL 설정 | Enterprise (sso + saml), Self-hosted 전용 |

#### 5.8.3 기술 스택

| 항목 | 값 |
|------|-----|
| Auth 라이브러리 | next-auth 4.24.12 (패치 버전) |
| SAML 라이브러리 | BoxyHQ SAML |

#### 5.8.4 SAML 설정

| 항목 | 값 |
|------|-----|
| Tenant | `formbricks.com` |
| Product | `formbricks` |
| Audience | `https://saml.formbricks.com` |

#### 5.8.5 기본 흐름

```
1. 사용자가 SSO 로그인 버튼 클릭
2. 선택한 프로바이더로 리다이렉트
3. 프로바이더에서 인증 수행
4. 인증 성공 시 콜백 URL로 리다이렉트 (인증 토큰 포함)
5. next-auth가 토큰 검증 및 세션 생성
6. 기존 계정 매핑 또는 신규 계정 생성
7. 관리자 UI 메인 페이지로 이동
```

#### 5.8.6 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| IFR-008-BR-01 | SSO 프로바이더 환경변수 미설정 | 해당 SSO 버튼 비표시 |
| IFR-008-BR-02 | Enterprise 라이선스 미보유 | SSO 기능 전체 비활성화 |
| IFR-008-BR-03 | SAML 설정 시 Cloud 환경 | SAML 비활성화 (Self-hosted 전용) |
| IFR-008-BR-04 | SSO 인증 성공 + 기존 이메일 일치 | 기존 계정에 SSO 연결 |
| IFR-008-BR-05 | SSO 인증 성공 + 신규 이메일 | 신규 계정 자동 생성 |

---

### 5.9 IFR-009: reCAPTCHA

#### 5.9.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | IFR-009 |
| 기능명 | reCAPTCHA 스팸 방지 인터페이스 |
| 관련 요구사항 ID | FSD-099 > IFR-009 |
| 우선순위 | 중간 |
| 기능 설명 | 설문 응답에 대한 스팸 방지를 위한 CAPTCHA 통합 |

#### 5.9.2 활성화 조건

| 조건 | 필수 여부 |
|------|----------|
| reCAPTCHA Site Key 환경변수 설정 | 필수 |
| reCAPTCHA Secret Key 환경변수 설정 | 필수 |
| Enterprise License `spamProtection` flag 활성화 | 필수 |

#### 5.9.3 Cloud 제한

| 플랜 | 사용 가능 |
|------|----------|
| Free | 불가 |
| Startup | 불가 |
| Custom | 가능 |

#### 5.9.4 대안 지원

| 서비스 | 비고 |
|--------|------|
| Cloudflare Turnstile | reCAPTCHA 대안으로 지원 |

#### 5.9.5 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| IFR-009-BR-01 | 활성화 조건 3가지 모두 충족 | 설문 응답 제출 시 CAPTCHA 검증 수행 |
| IFR-009-BR-02 | CAPTCHA 검증 실패 | 응답 제출 거부, 재시도 요청 |
| IFR-009-BR-03 | 활성화 조건 미충족 | CAPTCHA 없이 응답 제출 허용 |

---

### 5.10 IFR-010: Stripe 결제

#### 5.10.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | IFR-010 |
| 기능명 | Stripe 결제 인터페이스 |
| 관련 요구사항 ID | FSD-099 > IFR-010 |
| 우선순위 | 높음 |
| 기능 설명 | Stripe를 통한 구독 결제, 체험 기간, 프로모션 관리 인터페이스 |

#### 5.10.2 Stripe 설정

| 항목 | 값 |
|------|-----|
| API Version | `2024-06-20` |
| 자동 세금 | 활성 |
| 세금 ID 수집 | 활성 |
| 프로모션 코드 | 지원 |

#### 5.10.3 Webhook Events

| 이벤트 | 처리 내용 |
|--------|----------|
| `checkout.session.completed` | 결제 완료 처리, 구독 활성화 |
| `invoice.finalized` | 청구서 확정 처리 |
| `customer.subscription.deleted` | 구독 취소 처리, 플랜 다운그레이드 |

#### 5.10.4 체험 기간

| 항목 | 값 |
|------|-----|
| 기간 | 15일 |
| 적용 대상 | 유료 플랜 최초 가입 시 |

#### 5.10.5 기본 흐름 (구독 생성)

```
1. 사용자가 유료 플랜 선택
2. Stripe Checkout 세션 생성
   - 체험 기간 15일 설정
   - 프로모션 코드 적용 (선택적)
   - 자동 세금 + 세금 ID 수집 활성화
3. Stripe 결제 페이지로 리다이렉트
4. 결제 정보 입력 및 완료
5. Stripe Webhook: checkout.session.completed 수신
6. 구독 상태 업데이트 및 플랜 활성화
```

#### 5.10.6 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| IFR-010-BR-01 | 최초 유료 플랜 가입 | 15일 체험 기간 자동 적용 |
| IFR-010-BR-02 | `checkout.session.completed` 수신 | 구독 활성화, 플랜 업그레이드 반영 |
| IFR-010-BR-03 | `customer.subscription.deleted` 수신 | 구독 취소 처리, Free 플랜으로 다운그레이드 |
| IFR-010-BR-04 | `invoice.finalized` 수신 | 청구서 확정 기록 |

---

### 5.11 IFR-011: Standard Webhooks

#### 5.11.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | IFR-011 |
| 기능명 | Standard Webhooks 사양 |
| 관련 요구사항 ID | FSD-099 > IFR-011 |
| 우선순위 | 높음 |
| 기능 설명 | Webhook 발송 시 준수하는 Standard Webhooks 사양 (https://www.standardwebhooks.com/) |

#### 5.11.2 헤더 명세

| 헤더 | 형식 | 생성 규칙 | 필수 |
|------|------|----------|------|
| `webhook-id` | UUID v7 문자열 | 각 Webhook 메시지마다 고유 UUID v7 생성 | 필수 |
| `webhook-timestamp` | 정수 (Unix epoch, 초) | 발송 시점의 Unix timestamp | 필수 |
| `webhook-signature` | 문자열 | HMAC-SHA256 기반 서명 (비밀 키 + 메시지 바디) | 비밀 키 설정 시 필수 |

#### 5.11.3 서명 생성 절차

```
1. 서명 대상 문자열 생성: "{webhook-id}.{webhook-timestamp}.{body}"
2. HMAC-SHA256 해시 계산: HMAC(secret_key, 서명_대상_문자열)
3. Base64 인코딩
4. 접두사 추가: "v1,{base64_signature}"
5. webhook-signature 헤더에 설정
```

#### 5.11.4 비즈니스 규칙

| 규칙 ID | 조건 | 동작 |
|---------|------|------|
| IFR-011-BR-01 | Webhook 발송 시 | webhook-id, webhook-timestamp 헤더 항상 포함 |
| IFR-011-BR-02 | 비밀 키 설정된 Webhook | webhook-signature 헤더 추가 포함 |
| IFR-011-BR-03 | 비밀 키 미설정 Webhook | webhook-signature 헤더 생략 |

---

## 6. 제약사항

### 6.1 기술적 제약사항

| 항목 | 제약 | 비고 |
|------|------|------|
| Node.js | >= 20 (권장: 22.1.0) | LTS 버전 사용 |
| pnpm | 10.28.2 | 고정 버전 |
| PostgreSQL | Prisma ORM 통한 접근 | 직접 SQL 사용 제한 |
| Redis | Rate Limiting, 캐싱에 필수 | 미연결 시 Rate Limiting 불가 |
| Next.js | 16 (App Router) | Pages Router 사용 금지 |
| React | 19 | - |
| TypeScript | Strict mode | 타입 안전성 보장 |
| DB 제약 | `skip`/`offset`과 응답 `count` 동시 사용 금지 | Prisma 쿼리 제약 |

### 6.2 법적 제약사항

| 항목 | 제약 | 비고 |
|------|------|------|
| 오픈소스 라이선스 | AGPLv3 (Community Edition) | 소스코드 공개 의무 |
| Enterprise 기능 | 별도 상용 라이선스 필요 | License Key 기반 활성화 |
| GDPR | EU 데이터 보호 규정 준수 | 데이터 삭제 권리 보장 |
| Data Hosting | Cloud: Frankfurt, EU | EU 리전 고정 |

### 6.3 비용 제약사항

| 플랜 | 월 비용 | 월 응답 | 월 MIU | 프로젝트 |
|------|--------|---------|--------|---------|
| Free | 무료 | 1,500 | 2,000 | 3개 |
| Startup | $49 (월) / $490 (연) | 5,000 | 7,500 | 3개 |
| Custom | 별도 협의 | 협의 | 협의 | 협의 |
| Self-hosted | Enterprise License 비용 별도 | 무제한 | 무제한 | 무제한 |

### 6.4 운영 제약사항

| 항목 | 제약 | 비고 |
|------|------|------|
| Docker | PostgreSQL + Redis 컨테이너 필요 | Self-hosted 배포 시 |
| 환경변수 | 필수 환경변수 다수 설정 필요 | 환경변수 설정 파일 참조 |
| 빌드 | Turborepo 의존성 그래프 기반 | 빌드 순서 자동 결정 |
| 배포 | Vercel 또는 Docker 기반 | Cloud: Vercel, Self-hosted: Docker |

---

## 7. 가정사항

| 가정 ID | 가정 내용 | 영향 범위 |
|---------|----------|----------|
| ASM-001 | Redis 서버가 항상 가용하다 | Rate Limiting, 캐싱 정상 동작 |
| ASM-002 | PostgreSQL 서버가 항상 가용하다 | 전체 데이터 CRUD |
| ASM-003 | CDN 서비스가 정상 동작한다 | SDK UMD 번들 배포 |
| ASM-004 | Stripe API가 정상 동작한다 | 결제 처리 |
| ASM-005 | SSO 프로바이더 서비스가 정상 동작한다 | SSO 인증 |
| ASM-006 | SMTP 서버가 정상 동작한다 | 이메일 발송 (알림, Follow-up 등) |

---

## 8. 용어 사전

| 용어 | 정의 |
|------|------|
| **Organization** | Inquiry의 최상위 조직 단위. 멤버십, 프로젝트, 빌링을 관리한다. Cloud에서는 여러 Organization을 지원하고, Self-hosted에서는 단일 Organization이 기본이다. |
| **Project** | Organization 하위의 프로젝트(워크스페이스). 각 프로젝트는 별도의 설문, 환경, 설정을 가진다. Organization ID와 이름 조합으로 유니크 제약이 설정된다. |
| **Environment** | 프로젝트 내 production과 development 두 환경을 제공. 데이터가 완전히 격리되며, 알림은 production 환경에서만 발송된다. |
| **Survey** | 사용자에게 표시되는 설문. link(독립 URL) 또는 app(인앱 임베드) 유형. 상태는 draft, inProgress, paused, completed. |
| **Response** | 설문에 대한 응답 데이터. finished 필드로 완료 여부 구분. |
| **Contact** | 설문 대상이 되는 사용자/고객. Environment 단위로 격리되며 속성(Attribute)을 가진다. Enterprise 기능. |
| **Contact Attribute** | 연락처에 연결된 속성 값. string, number, date 데이터 타입 지원. 문자열, 숫자, 날짜 세 컬럼에 저장. |
| **Contact Attribute Key** | 속성의 정의(스키마). default(시스템 정의, 수정 불가)와 custom(사용자 정의) 두 유형. |
| **Segment** | 속성, 행동, 디바이스 조건으로 연락처를 그룹화하는 필터 집합. Private(설문 전용)과 Public(재사용 가능) 구분. |
| **Hidden Field** | 설문 URL의 쿼리 파라미터로 전달되는 숨겨진 필드. 응답 데이터에 포함되지만 응답자에게 보이지 않는다. |
| **Variable** | 설문 내에서 사용되는 동적 변수. 계산, 조건 분기 등에 활용. |
| **Recall** | 이전 질문의 응답을 다음 질문에서 참조하는 기능. `@{questionId}` 구문 사용. |
| **Webhook** | 설문 이벤트 발생 시 외부 URL로 HTTP POST 요청을 보내는 기능. Standard Webhooks 사양 준수. |
| **MTU (Monthly Tracked Users)** | 월간 추적 사용자 수. 요금제 제한에 사용되는 지표 (현재 코드에서는 MIU로 표현). |
| **MIU (Monthly Identified Users)** | 월간 식별된 사용자 수. SDK를 통해 identify된 고유 사용자 수. |
| **Welcome Card** | 설문 시작 전 표시되는 환영 카드. 설문 소개, 설명 등을 포함. |
| **Pretty URL** | 설문의 사람이 읽기 쉬운 URL 경로. 기본 ID 대신 커스텀 경로 사용. |
| **Standard Webhooks** | Webhook 전송의 표준 사양. webhook-id, webhook-timestamp, webhook-signature 헤더 포함. |
| **Placement** | 인앱 설문 위젯의 화면 배치 위치. bottomLeft, bottomRight, topLeft, topRight, center. |
| **Overlay** | 인앱 설문 표시 시 배경 오버레이 스타일. none, light, dark. |
| **Follow-up** | 설문 응답 완료 후 자동으로 발송되는 후속 이메일. Enterprise 기능. |
| **Action Class** | 사용자 행동을 정의하는 클래스. 설문 트리거 조건에 사용. |
| **Display** | 설문이 사용자에게 표시된 기록. 동일 설문의 재표시 제어에 사용. |
| **displayOptions** | 설문 표시 옵션. displayOnce(1회), displayMultiple(무제한), displaySome(제한 횟수). |
| **Recontact Days** | 동일 사용자에게 다시 설문을 표시하기까지의 대기 일수. 기본값 7일. |
| **Tag** | 응답에 붙이는 라벨. 분류 및 필터링에 사용. |
| **Team** | Organization 내 하위 팀 단위. 프로젝트 접근 권한 관리에 사용. |
| **API Key** | Management API 인증에 사용되는 키. Environment 단위로 발급. |
| **Pipeline** | 설문 이벤트(응답 생성/완료 등) 발생 시 Webhook, 이메일, 통합 처리를 수행하는 내부 파이프라인. |
| **Grace Period** | Enterprise License 서버 접근 불가 시 기존 라이선스 상태를 유지하는 유예 기간 (3일). |
| **Whitelabel** | Inquiry 브랜딩을 제거하고 자사 브랜드로 대체하는 기능. 설문 로고, 이메일 로고, 파비콘 커스터마이징 포함. |
| **RBAC** | Role-Based Access Control. 역할 기반 접근 제어. |
| **TOTP** | Time-based One-Time Password. 시간 기반 일회용 비밀번호. 2FA에 사용. |
| **OIDC** | OpenID Connect. OAuth 2.0 기반 인증 프로토콜. |
| **SAML** | Security Assertion Markup Language. 엔터프라이즈 SSO 프로토콜. |
| **ICU Message Format** | International Components for Unicode. 국제화 메시지 포맷 표준. 복수형, 성별, 선택 구문 지원. |
| **Shadow DOM** | 웹 컴포넌트의 캡슐화 메커니즘. 호스트 페이지와 스타일/DOM 격리. |
| **UMD** | Universal Module Definition. 브라우저와 Node.js 양쪽에서 사용 가능한 모듈 형식. |
| **ESM** | ECMAScript Modules. JavaScript 표준 모듈 시스템. |

---

## 9. 부록

### 9.1 기능-플랜 매트릭스

#### 9.1.1 Community vs Enterprise 기능 매트릭스

| 기능 | Community (OSS) | Enterprise (Licensed) | License Flag |
|------|:-----------:|:-----------:|-------------|
| 무제한 설문 생성 | O | O | - |
| Link / App 설문 | O | O | - |
| 응답 수집 | O | O | - |
| Hidden Fields | O | O | - |
| Logic Jumps | O | O | - |
| API & Webhooks | O | O | - |
| 모든 통합 | O | O | - |
| 관리자 UI 다국어 (14개) | O | O | - |
| 기본 역할 (owner, manager, member) | O | O | - |
| 연락처 관리 | X | O | `contacts` |
| 세그먼트 필터 | X | O | `contacts` |
| 2단계 인증 | X | O | `twoFactorAuth` |
| SSO (Google/GitHub/Azure/OIDC) | X | O | `sso` |
| SAML SSO | X | O | `sso` + `saml` |
| 브랜딩 제거 | X | O | `removeBranding` |
| Whitelabel (이메일/파비콘) | X | O | `whitelabel` |
| 다국어 설문 | X | O | `multiLanguageSurveys` |
| Team Access Roles | X | O | `accessControl` |
| 다중 Organization | X | O | `isMultiOrgEnabled` |
| 스팸 보호 (reCAPTCHA) | X | O | `spamProtection` |
| AI 기능 | X | O | `ai` |
| 감사 로그 | X | O | `auditLogs` |
| 사용량 할당 제어 | X | O | `quotas` |
| 프로젝트 수 제한 해제 | X | O | `projects` |

#### 9.1.2 Cloud 플랜별 기능 매트릭스

| 기능 | Free | Startup | Custom |
|------|:----:|:-------:|:------:|
| 월 응답 | 1,500 | 5,000 | 협의 |
| 월 MIU | 2,000 | 7,500 | 협의 |
| 프로젝트(워크스페이스) | 3 | 3 | 협의 |
| 팀 멤버 | 무제한 | 무제한 | 무제한 |
| 브랜딩 제거 | X | O | O |
| 속성 기반 타겟팅 | X | O | O |
| 큰 파일 업로드 | X | O | O |
| 다국어 설문 | X | X | O |
| Team Access Roles | X | X | O |
| Email Follow-ups | X | X | O |
| 사용량 할당 제어 | X | X | O |
| 스팸 보호 | X | X | O |
| Uptime SLA 99.9% | X | X | O |
| Premium Support | X | X | O |
| SAML SSO | X | X | X (Cloud 미지원) |

#### 9.1.3 Self-hosted 전용 기능

| 기능 | 설명 | 활성화 조건 |
|------|------|-----------|
| SAML SSO | SAML 기반 엔터프라이즈 SSO | SSO + SAML flag 조합 + SAML DB URL 설정 |
| Custom Head Scripts | Link 설문에 커스텀 HTML 스크립트 삽입 | Self-hosted 환경에서만 지원 |
| 무제한 응답 | 라이선스 제한 외 소프트웨어 제한 없음 | Self-hosted 배포 |
| 데이터 주권 | 자체 인프라에서 데이터 관리 | Self-hosted 배포 |

### 9.2 요구사항 추적 매트릭스 (RTM)

| 요구사항 ID (원본) | 요구사항명 | 기능 명세 ID | 기능 명세 섹션 |
|-------------------|-----------|------------|--------------|
| NFR-001 | 성능 | FS-099 | 4.1 |
| NFR-002 | 가용성 | FS-099 | 4.2 |
| NFR-003 | 보안 | FS-099 | 4.3 |
| NFR-004 | GDPR 준수 | FS-099 | 4.4 |
| NFR-005 | 브라우저 호환성 | FS-099 | 4.5 |
| NFR-006 | 확장성 | FS-099 | 4.6 |
| NFR-007 | 유지보수성 | FS-099 | 4.7 |
| NFR-008 | 로깅 및 모니터링 | FS-099 | 4.8 |
| NFR-009 | 국제화 | FS-099 | 4.9 |
| NFR-010 | 데이터 무결성 | FS-099 | 4.10 |
| IFR-001 | Client API | FS-099 | 5.1 |
| IFR-002 | Management API | FS-099 | 5.2 |
| IFR-003 | Webhook | FS-099 | 5.3 |
| IFR-004 | JavaScript SDK | FS-099 | 5.4 |
| IFR-005 | GTM | FS-099 | 5.5 |
| IFR-006 | Email Embed | FS-099 | 5.6 |
| IFR-007 | Export | FS-099 | 5.7 |
| IFR-008 | SSO 통합 | FS-099 | 5.8 |
| IFR-009 | reCAPTCHA | FS-099 | 5.9 |
| IFR-010 | Stripe 결제 | FS-099 | 5.10 |
| IFR-011 | Standard Webhooks | FS-099 | 5.11 |
| 제약사항 3.1 | 기술 제약 | FS-099 | 6.1 |
| 제약사항 3.2 | 법적 제약 | FS-099 | 6.2 |
| 제약사항 3.3 | 비용 제약 | FS-099 | 6.3 |
| 제약사항 3.4 | 운영 제약 | FS-099 | 6.4 |
| 용어 정의 | 도메인 용어 40건 | FS-099 | 8 |
| 부록 A 5.1 | Community vs Enterprise 매트릭스 | FS-099 | 9.1.1 |
| 부록 A 5.2 | Cloud 플랜별 매트릭스 | FS-099 | 9.1.2 |
| 부록 A 5.3 | Self-hosted 전용 기능 | FS-099 | 9.1.3 |

### 9.3 변경 이력

| 날짜 | 버전 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 2026-02-21 | 1.0 | 초기 작성 - FSD-099 기반 기능 명세서 작성 | Claude |
