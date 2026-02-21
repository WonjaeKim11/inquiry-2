# 구독/빌링/브랜딩 — 요구사항 명세서

> **문서번호**: FSD-029 | **FR 범위**: FR-048, FR-044
> **라이선스**: Community (기본 기능) / Enterprise (유료 기능)

---

## 1. 목적/배경

Formbricks는 오픈소스 Community 버전과 유료 Enterprise 기능을 제공하는 하이브리드 라이선스 모델을 사용한다. Cloud 환경에서는 Free, Startup, Custom의 3가지 요금제를 Stripe를 통해 관리하며, Self-hosted 환경에서는 Enterprise License Key를 통해 기능을 활성화한다. 브랜딩 관련 기능으로는 설문 내 Formbricks 로고 제거, 이메일 로고 커스터마이징, 파비콘 커스터마이징을 제공한다.

---

## 2. 범위 (In-scope / Out-of-scope)

### In-scope
- Cloud 요금제 구조 (Free, Startup, Custom)
- Stripe 결제 통합 (구독, 결제, 취소)
- Enterprise License 14개 feature flag
- 브랜딩 제거 (링크 설문 브랜딩, 인앱 설문 브랜딩)
- Whitelabel (이메일 로고, 파비콘 커스터마이징)
- Cloud vs Self-hosted 기능 게이팅 차이
- 요금제별 사용량 제한

### Out-of-scope
- 결제 수단 관리 (Stripe Customer Portal로 위임)
- 인보이스/세금 계산 상세 (Stripe에 위임)
- 환불 처리

---

## 3. 사용자/이해관계자

| 역할 | 설명 |
|------|------|
| Organization Owner | 빌링 설정 관리, 요금제 업그레이드/다운그레이드 |
| Manager | 빌링 현황 조회 |
| Billing Role | 빌링 전용 접근 역할 |
| Self-hosted Admin | Enterprise License Key 관리 |

---

## 4. 기능 요구사항

### FR-048-01: 요금제 구조

#### Cloud 요금제 (3단계)

| 요금제 | 월 가격 | 연 가격 | 설명 |
|--------|---------|---------|------|
| **Free** | $0 | $0 | 기본 무료 플랜 |
| **Startup** | $49 | $490 | 브랜딩 제거, 확장된 제한 |
| **Custom** | 커스텀 | 커스텀 | Enterprise 기능, SLA 제공 |

#### 요금제별 사용량 제한

| 항목 | Free | Startup | Custom |
|------|------|---------|--------|
| 최대 프로젝트(워크스페이스) | 3개 | 3개 | 무제한 (또는 협의) |
| 월 응답 수 | 1,500건 | 5,000건 | 무제한 (또는 협의) |
| 월 연락처(MIU) | 2,000건 | 7,500건 | 무제한 (또는 협의) |

#### 요금제별 주요 기능

**Free 플랜 기능**:
- 무제한 설문
- 월 1,000 응답 (UI 표시) / 1,500 (실제 제한)
- 2,000 연락처
- 1개 워크스페이스 (UI 표시) / 3개 (실제 제한)
- 무제한 팀 멤버
- Link/Website/App 설문
- iOS/Android SDK
- Email Embedded 설문
- Logic Jumps, Hidden Fields, Recurring Surveys
- API, Webhooks
- 모든 통합(Integration)

**Startup 플랜 추가 기능**:
- Free 포함 전부
- 월 5,000 응답
- 7,500 연락처
- 3개 워크스페이스
- 브랜딩 제거
- 속성 기반 타겟팅

**Custom 플랜 추가 기능**:
- Startup 포함 전부
- Email Follow-ups
- 커스텀 응답 제한
- 커스텀 연락처 제한
- 커스텀 워크스페이스 제한
- Team Access Roles
- 다국어 설문 (Multi-language)
- 99% Uptime SLA
- Premium 지원

### FR-048-02: Stripe 결제 통합

#### 구독 생성

구독 생성 시 Stripe Checkout 세션을 통해 처리되며, 다음 속성이 적용된다:

- 모드: 구독(subscription)
- 성공 시: 빌링 확인 페이지로 리다이렉트
- 취소 시: 빌링 설정 페이지로 리다이렉트
- 프로모션 코드 허용
- 무료 체험 기간: **15일**
- 청구 주소 수집 필수
- 자동 세금 계산 활성화
- 세금 ID 수집 활성화

#### Checkout 완료 처리

Checkout 세션 완료 시 Organization의 빌링 정보가 Startup 플랜으로 업데이트된다. 빌링 정보에는 Stripe 고객 ID, 요금제, 결제 주기(monthly/yearly), 사용량 제한, 주기 시작일이 포함된다.

#### Webhook 이벤트 처리

Stripe Webhook을 통해 다음 이벤트를 처리:
- checkout.session.completed - 구독 시작
- invoice.finalized - 청구서 확정
- customer.subscription.deleted - 구독 취소

### FR-048-03: Enterprise License 시스템

#### License Feature Flags (14개)

Enterprise License는 다음 14개의 독립적인 feature flag를 제어한다:

| Feature Flag | 설명 |
|-------------|------|
| 다중 Organization 지원 | 여러 Organization 생성 허용 |
| 연락처 관리 | 연락처(Contact) 관리 기능 |
| 프로젝트 제한 | 프로젝트 수 제한 (null = 무제한) |
| Whitelabel | 이메일/파비콘 커스터마이징 |
| 브랜딩 제거 | 설문 내 Formbricks 로고 제거 |
| 2단계 인증 | TOTP 기반 2단계 인증 |
| SSO | Google, GitHub, Azure AD, OIDC |
| SAML | SAML SSO |
| 스팸 보호 | reCAPTCHA 스팸 보호 |
| AI 기능 | AI 기능 |
| 감사 로그 | 감사 로그 |
| 다국어 설문 | 다국어 설문 지원 |
| 접근 제어 | Team Access Roles |
| 사용량 할당 제어 | 사용량 할당 제어 |

#### License 상태 유형

| 상태 | 설명 |
|------|------|
| active | 활성 라이선스 |
| expired | 만료된 라이선스 |
| unreachable | 라이선스 서버 접근 불가 |
| invalid_license | 유효하지 않은 라이선스 키 |
| no-license | 라이선스 키 미설정 |

#### License 기본값 (비활성 시)

라이선스가 비활성인 경우 모든 feature flag는 false로 설정되며, 프로젝트 제한은 3개로 적용된다.

#### License 검증 흐름

1. In-process Memory Cache 확인 (TTL: 1분)
2. Redis Cache 확인 (TTL: 24시간)
3. License Server API 호출 (최대 3회 재시도, 지수 백오프)
4. Grace Period 적용 (서버 접근 불가 시 3일간 기존 상태 유지)

**캐시 설정**:

| 캐시 | TTL | 용도 |
|------|-----|------|
| Memory Cache | 1분 | 프로세스 내 중복 요청 방지 |
| Redis - 성공 응답 캐시 | 24시간 | 성공 응답 캐시 |
| Redis - 실패 응답 캐시 | 10분 | 실패 응답 캐시 (빠른 재시도) |
| Redis - 이전 결과 캐시 | 4일 | Grace Period용 이전 결과 |
| Grace Period | 3일 | 서버 접근 불가 시 유예 기간 |

**API 엔드포인트**:
- Production: https://ee.formbricks.com/api/licenses/check
- Staging: https://staging.ee.formbricks.com/api/licenses/check
- Timeout: 5초

### FR-048-04: Cloud vs Self-hosted 기능 게이팅

#### 권한 확인 함수 체계

| 기능 | Cloud 조건 | Self-hosted 조건 |
|------|-----------|-----------------|
| 브랜딩 제거 권한 | 활성 라이선스 + FREE가 아닌 플랜 | 활성 라이선스 + 브랜딩 제거 flag |
| Whitelabel 권한 | 활성 라이선스 + FREE가 아닌 플랜 | 활성 라이선스 + whitelabel flag |
| 큰 파일 업로드 권한 | FREE가 아닌 플랜 + 활성 라이선스 | 활성 라이선스 |
| 다중 Organization | 다중 Organization flag | 다중 Organization flag |
| 연락처 관리 | contacts flag | contacts flag |
| 2단계 인증 | 2단계 인증 flag | 2단계 인증 flag |
| SSO | SSO flag | SSO flag |
| 사용량 할당 | CUSTOM 플랜 + quotas flag | quotas flag |
| 감사 로그 | 감사 로그 flag + 감사 로그 활성화 설정 | 감사 로그 flag + 감사 로그 활성화 설정 |
| SAML SSO | **항상 false** (Cloud에서 미지원) | SSO + SAML flag |
| 스팸 보호 | CUSTOM 플랜 + 스팸 보호 flag | 스팸 보호 flag |
| 다국어 설문 | CUSTOM 플랜 + 다국어 설문 flag | 다국어 설문 flag |
| 접근 제어 | CUSTOM 플랜 + 접근 제어 flag | 접근 제어 flag |
| Organization 프로젝트 제한 | 활성 시 limits.projects (기본 무제한), 비활성 시 3 | 활성 시 features.projects, 비활성 시 3 |

#### 세 가지 게이팅 패턴

1. **기능 권한 패턴**: Cloud에서는 FREE가 아닌 플랜 + 활성 라이선스, Self-hosted에서는 활성 라이선스 + 해당 feature flag
2. **Custom 플랜 전용 패턴**: Cloud에서는 CUSTOM 플랜 + 활성 라이선스 + feature flag, Self-hosted에서는 활성 라이선스 + feature flag
3. **특정 Feature Flag 패턴**: 빌링 확인 없이 라이선스 + feature flag만 확인

### FR-044-01: 브랜딩 관리

#### 설문 브랜딩 제거

프로젝트 단위로 다음 두 가지 브랜딩을 제어한다:

- **링크 설문 브랜딩**: false로 설정 시 링크 설문에서 Formbricks 로고 숨김
- **인앱 설문 브랜딩**: false로 설정 시 인앱/웹사이트 설문에서 Formbricks 로고 숨김

#### 이메일 로고 커스터마이징

Organization 단위로 이메일에 표시되는 로고 URL을 설정/제거한다.

- 로고 설정: Organization에 커스텀 로고 URL을 저장
- 로고 제거: 기본 Formbricks 로고로 복원
- 로고 조회: 현재 설정된 로고 URL 반환

로고 URL은 Organization의 whitelabel 설정 내 logoUrl 필드에 저장된다.

#### 파비콘 커스터마이징

Organization 단위로 설문 페이지의 파비콘을 커스터마이징한다.

### FR-048-05: Organization Billing 데이터 모델

Organization 모델에 빌링(billing)과 whitelabel 두 개의 JSON 필드가 포함된다.

Billing JSON 구조:

| 필드 | 설명 | 예시 값 |
|------|------|---------|
| 요금제 | 현재 요금제 | free, startup, custom |
| 결제 주기 | 결제 주기 | monthly, yearly |
| Stripe 고객 ID | Stripe 고객 식별자 | cus_xxx |
| 주기 시작일 | 현재 빌링 주기 시작 | ISO 8601 날짜 |
| 프로젝트 제한 | 최대 프로젝트 수 | 숫자 |
| 월 응답 제한 | 월 최대 응답 수 | 숫자 |
| 월 MIU 제한 | 월 최대 식별 사용자 수 | 숫자 |

---

## 5. 비기능 요구사항

| ID | 항목 | 내용 |
|----|------|------|
| NFR-B01 | 가용성 | License 서버 장애 시 3일 Grace Period로 서비스 지속 |
| NFR-B02 | 성능 | Memory Cache(1분) + Redis Cache(24시간)로 라이선스 체크 최소화 |
| NFR-B03 | 보안 | License Key는 해시하여 캐시 키에 사용, Stripe Secret Key 환경변수 관리 |
| NFR-B04 | 복원력 | API 호출 실패 시 최대 3회 재시도 (지수 백오프), 429/502/503/504 코드에서만 재시도 |
| NFR-B05 | 원자성 | Stripe Webhook 이벤트 처리의 멱등성 보장 |

---

## 6. 정책/제약

| 항목 | 값 |
|------|-----|
| Cloud 요금제 | Free, Startup, Custom (3단계) |
| Free 프로젝트 제한 | 3개 |
| Free 월 응답 제한 | 1,500건 |
| Free 월 MIU 제한 | 2,000건 |
| Startup 프로젝트 제한 | 3개 |
| Startup 월 응답 제한 | 5,000건 |
| Startup 월 MIU 제한 | 7,500건 |
| Custom 제한 | 무제한/협의 |
| Startup 월 가격 | $49 |
| Startup 연 가격 | $490 |
| 무료 체험 기간 | 15일 |
| License Feature Flags | 14개 |
| License Cache TTL | 24시간 |
| 실패 캐시 TTL | 10분 |
| Grace Period | 3일 |
| Memory Cache TTL | 1분 |
| API Timeout | 5초 |
| Max Retries | 3회 |
| Stripe API Version | 2024-06-20 |
| 브랜딩 토글 | 링크 설문 브랜딩, 인앱 설문 브랜딩 |
| SAML SSO Cloud | 항상 false |
| 기본 프로젝트 제한 (비활성) | 3개 |

---

## 7. 수용 기준 (Acceptance Criteria)

| AC-ID | 기준 |
|-------|------|
| AC-029-01 | Free 플랜 사용자가 Startup 플랜 구독 시 15일 무료 체험이 시작된다 |
| AC-029-02 | Checkout 완료 후 Organization의 billing 정보가 Startup 플랜으로 업데이트된다 |
| AC-029-03 | 구독 취소 시 Organization의 billing 정보가 Free 플랜으로 다운그레이드된다 |
| AC-029-04 | Enterprise License가 없는 상태에서 contacts 기능 접근 시 적절한 제한이 적용된다 |
| AC-029-05 | License 서버 장애 시 3일간 기존 라이선스 상태가 유지된다 (Grace Period) |
| AC-029-06 | Grace Period 만료 후 라이선스가 비활성화되고 기본값이 적용된다 |
| AC-029-07 | Cloud에서 Free 플랜 사용자는 브랜딩 제거가 불가능하다 |
| AC-029-08 | Cloud에서 Startup 이상 플랜 사용자는 브랜딩을 제거할 수 있다 |
| AC-029-09 | Self-hosted에서 브랜딩 제거 flag가 활성화된 라이선스로 브랜딩을 제거할 수 있다 |
| AC-029-10 | 14개 Enterprise Feature Flag가 각각 독립적으로 제어된다 |
| AC-029-11 | SAML SSO는 Cloud 환경에서 항상 비활성화된다 |
| AC-029-12 | Custom 플랜 전용 기능(다국어 설문, 접근 제어, 사용량 할당)은 Cloud에서 Custom 플랜이 아니면 비활성이다 |
| AC-029-13 | 이메일 로고를 설정하면 알림 이메일에 커스텀 로고가 표시된다 |
| AC-029-14 | 링크 설문 브랜딩을 false로 설정하면 링크 설문에서 Formbricks 로고가 숨겨진다 |
| AC-029-15 | 라이선스 키가 유효하지 않으면 invalid_license 상태가 반환된다 |
