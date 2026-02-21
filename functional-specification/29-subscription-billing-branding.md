# 기능 명세서 (Functional Specification)

## 구독/빌링/브랜딩

---

## 1. 문서 정보

| 항목 | 내용 |
|------|------|
| 문서번호 | FS-029 |
| 문서 버전 | v1.0 |
| 작성일 | 2026-02-21 |
| 기반 문서 | FSD-029 구독/빌링/브랜딩 요구사항 명세서, REQ-FB-2026-001 v1.0 |
| 관련 요구사항 | FR-048, FR-044 |
| 상태 | 초안 |

---

## 2. 개요

### 2.1 목적

본 문서는 Inquiry SaaS(Cloud) 플랫폼의 구독/빌링/브랜딩 기능에 대한 상세 기능 명세를 정의한다. Cloud 환경의 요금제 구조(Free/Startup/Custom), Stripe 결제 통합, Enterprise License 시스템, Cloud/Self-hosted 간 기능 게이팅, 그리고 브랜딩 관리(로고 제거, Whitelabel) 기능을 포함한다.

### 2.2 범위

**포함 범위 (In-scope)**:
- Cloud 요금제 구조 및 사용량 제한 (Free, Startup, Custom)
- Stripe 결제 통합 (구독 생성, Checkout, Webhook 이벤트 처리)
- Enterprise License 시스템 (14개 Feature Flag, 검증 흐름, 캐싱)
- Cloud vs Self-hosted 기능 게이팅 (3가지 게이팅 패턴)
- 브랜딩 제거 (링크 설문 브랜딩, 인앱 설문 브랜딩)
- Whitelabel (이메일 로고 커스터마이징, 파비콘 커스터마이징)
- Organization Billing 데이터 모델

**제외 범위 (Out-of-scope)**:
- 결제 수단 관리 (Stripe Customer Portal로 위임)
- 인보이스/세금 계산 상세 (Stripe에 위임)
- 환불 처리

### 2.3 대상 사용자

| 역할 | 설명 | 주요 기능 접근 |
|------|------|--------------|
| Organization Owner | 조직 소유자 | 빌링 설정 관리, 요금제 업그레이드/다운그레이드, 브랜딩 설정 |
| Manager | 조직 관리자 | 빌링 현황 조회 |
| Billing Role | 빌링 전용 역할 | 빌링 설정 관리 (소유자와 동일한 빌링 접근 권한) |
| Self-hosted Admin | 자체 호스팅 관리자 | Enterprise License Key 등록/관리 |

### 2.4 용어 정의

| 용어 | 정의 |
|------|------|
| Cloud | Inquiry에서 호스팅하는 SaaS 환경 |
| Self-hosted | 고객이 직접 인프라에 설치/운영하는 환경 |
| Enterprise License | 유료 기능을 활성화하기 위한 라이선스 키 시스템 |
| Feature Flag | Enterprise License에 포함된 개별 기능 활성화/비활성화 토글 |
| MIU (Monthly Identified Users) | 월간 식별된 고유 사용자(연락처) 수 |
| Grace Period | 라이선스 서버 접근 불가 시 기존 라이선스 상태를 유지하는 유예 기간 (3일) |
| Whitelabel | Inquiry 브랜딩을 제거하고 고객의 자체 브랜딩으로 대체하는 기능 |
| Stripe Checkout | Stripe에서 제공하는 호스팅형 결제 페이지 |
| Webhook | 특정 이벤트 발생 시 외부 시스템으로 HTTP 요청을 보내는 메커니즘 |
| TTL (Time To Live) | 캐시 데이터의 유효 기간 |
| 지수 백오프 (Exponential Backoff) | 재시도 간격을 점진적으로 증가시키는 재시도 전략 |
| 멱등성 (Idempotency) | 동일 요청을 여러 번 실행해도 결과가 동일함을 보장하는 속성 |

---

## 3. 시스템 개요

### 3.1 시스템 구성도

```
+-------------------+      +-------------------+      +-------------------+
|   Client (Web)    |      |  Inquiry       |      |  Stripe           |
|   - 빌링 설정 UI  |----->|  Server            |----->|  - Checkout       |
|   - 브랜딩 설정 UI|      |  - Billing Module  |<-----|  - Subscription   |
|   - 요금제 비교 UI|      |  - License Module  |      |  - Webhook        |
+-------------------+      |  - Branding Module |      +-------------------+
                           +--------+-----------+
                                    |
                           +--------v-----------+      +-------------------+
                           |  Redis Cache       |      |  License Server   |
                           |  - License 캐시    |      |  (ee.formbricks   |
                           |  - 성공/실패 캐시  |      |   .com)           |
                           +--------------------+      +-------------------+
                                                              ^
                           +--------------------+             |
                           |  Database          |             |
                           |  - Organization    |-------------+
                           |    (billing JSON)  |  License Key 검증
                           |    (whitelabel     |
                           |     JSON)          |
                           +--------------------+
```

### 3.2 주요 기능 목록 (Feature List)

| 기능 ID | 기능명 | 우선순위 | 관련 요구사항 |
|---------|--------|---------|-------------|
| F-029-01 | 요금제 구조 관리 | High | FR-048-01 |
| F-029-02 | Stripe 결제 통합 | High | FR-048-02 |
| F-029-03 | Enterprise License 시스템 | High | FR-048-03 |
| F-029-04 | Cloud/Self-hosted 기능 게이팅 | High | FR-048-04 |
| F-029-05 | 설문 브랜딩 제거 | Medium | FR-044-01 |
| F-029-06 | 이메일 로고 커스터마이징 | Medium | FR-044-01 |
| F-029-07 | 파비콘 커스터마이징 | Medium | FR-044-01 |
| F-029-08 | Organization Billing 데이터 모델 | High | FR-048-05 |

### 3.3 기능 간 관계도

```
F-029-01 요금제 구조 관리
    |
    +---> F-029-02 Stripe 결제 통합 (구독 생성/관리)
    |         |
    |         +---> F-029-08 Organization Billing 데이터 모델 (빌링 정보 저장)
    |
    +---> F-029-04 Cloud/Self-hosted 기능 게이팅 (요금제별 기능 제어)
              |
              +---> F-029-03 Enterprise License 시스템 (라이선스 기반 기능 활성화)
              |
              +---> F-029-05 설문 브랜딩 제거 (게이팅 결과에 따른 기능)
              |
              +---> F-029-06 이메일 로고 커스터마이징 (게이팅 결과에 따른 기능)
              |
              +---> F-029-07 파비콘 커스터마이징 (게이팅 결과에 따른 기능)
```

---

## 4. 상세 기능 명세

### 4.1 요금제 구조 관리

#### 4.1.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | F-029-01 |
| 기능명 | 요금제 구조 관리 |
| 관련 요구사항 ID | FR-048-01 |
| 우선순위 | High |
| 기능 설명 | Cloud 환경에서 Free, Startup, Custom 3단계 요금제를 정의하고, 요금제별 가격/사용량 제한/기능 범위를 관리한다. |

#### 4.1.2 선행 조건 (Preconditions)

- 사용자가 Inquiry Cloud에 가입하여 Organization을 보유하고 있어야 한다.
- 요금제 정보 조회 시 사용자가 해당 Organization에 소속되어 있어야 한다.

#### 4.1.3 후행 조건 (Postconditions)

- Organization에 요금제가 할당되고, 해당 요금제의 사용량 제한이 적용된다.
- 기본 가입 시 Free 플랜이 자동 할당된다.

#### 4.1.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 신규 Organization 생성 시 Free 플랜을 기본 할당한다. |
| 2 | 시스템 | Free 플랜의 사용량 제한을 적용한다: 최대 프로젝트 3개, 월 응답 1,500건, 월 MIU 2,000건. |
| 3 | 사용자 | 빌링 설정 페이지에서 현재 요금제 정보를 확인한다. |
| 4 | 사용자 | 요금제 비교 화면에서 Free/Startup/Custom 요금제의 기능과 가격을 비교한다. |
| 5 | 사용자 | 원하는 요금제의 업그레이드 버튼을 클릭한다. |

#### 4.1.5 대안 흐름 (Alternative Flow)

| 흐름 ID | 조건 | 동작 |
|---------|------|------|
| AF-01-01 | 이미 Startup 플랜인 사용자가 Custom 플랜을 원하는 경우 | 시스템은 Custom 플랜 문의 페이지 또는 영업팀 연락 안내를 표시한다. Custom 플랜은 개별 협의를 통해 설정된다. |
| AF-01-02 | 사용자가 연간(yearly) 결제를 선택하는 경우 | Startup 플랜 연간 가격 $490이 적용된다 (월간 $49 대비 약 17% 할인). |

#### 4.1.6 예외 흐름 (Exception Flow)

| 흐름 ID | 조건 | 동작 |
|---------|------|------|
| EF-01-01 | 사용량 제한 초과 시 (월 응답 수 또는 MIU) | 시스템은 제한 초과 알림을 표시하고, 업그레이드를 권장한다. |
| EF-01-02 | 프로젝트 생성 시 최대 프로젝트 수 초과 | 시스템은 프로젝트 생성을 차단하고 요금제 업그레이드 안내를 표시한다. |

#### 4.1.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-01-01 | 모든 신규 Organization은 Free 플랜으로 시작한다. |
| BR-01-02 | Free 플랜: 월 $0, 프로젝트 최대 3개, 월 응답 1,500건, 월 MIU 2,000건. |
| BR-01-03 | Startup 플랜: 월 $49 / 연 $490, 프로젝트 최대 3개, 월 응답 5,000건, 월 MIU 7,500건. |
| BR-01-04 | Custom 플랜: 가격/제한은 개별 협의. 무제한 프로젝트/응답/MIU 가능. |
| BR-01-05 | UI에 표시되는 Free 플랜 수치와 실제 제한이 다를 수 있다 (UI: 1,000 응답/1개 워크스페이스, 실제: 1,500 응답/3개 워크스페이스). |
| BR-01-06 | 요금제 업그레이드는 Free -> Startup -> Custom 순서로만 가능하다. Custom 플랜은 영업팀을 통해 협의한다. |

#### 4.1.8 데이터 요구사항

**입력 데이터**: 없음 (요금제 구조는 시스템 설정)

**출력 데이터 (요금제 정보)**:

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| plan | Enum(free, startup, custom) | Y | 현재 요금제 |
| billingCycle | Enum(monthly, yearly) | Y | 결제 주기 |
| limits.maxProjects | Integer | Y | 최대 프로젝트 수 |
| limits.monthlyResponses | Integer | Y | 월 최대 응답 수 |
| limits.monthlyMIU | Integer | Y | 월 최대 MIU 수 |
| price.monthly | Decimal | Y | 월간 가격 (USD) |
| price.yearly | Decimal | Y | 연간 가격 (USD) |

#### 4.1.9 화면/UI 요구사항

- 빌링 설정 페이지에 현재 요금제, 사용량 현황(응답 수/MIU/프로젝트 수), 결제 주기를 표시한다.
- 요금제 비교 화면에 Free/Startup/Custom의 기능/가격/제한을 테이블 형태로 비교 표시한다.
- 업그레이드 버튼은 현재 요금제보다 상위 요금제에만 활성화한다.

#### 4.1.10 비기능 요구사항

- 해당 없음.

---

### 4.2 Stripe 결제 통합

#### 4.2.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | F-029-02 |
| 기능명 | Stripe 결제 통합 |
| 관련 요구사항 ID | FR-048-02 |
| 우선순위 | High |
| 기능 설명 | Stripe Checkout을 통한 구독 생성, Webhook을 통한 구독 상태 동기화, 구독 취소 처리를 수행한다. |

#### 4.2.2 선행 조건 (Preconditions)

- 사용자가 Organization Owner 또는 Billing 역할을 보유하고 있어야 한다.
- Stripe API Key(Secret Key)가 환경변수에 설정되어 있어야 한다.
- Stripe API 버전은 2024-06-20이어야 한다.

#### 4.2.3 후행 조건 (Postconditions)

- 구독 생성 완료 시: Organization의 billing JSON이 Startup 플랜 정보로 업데이트된다.
- 구독 취소 시: Organization의 billing JSON이 Free 플랜으로 다운그레이드된다.

#### 4.2.4 기본 흐름 (Basic Flow) - 구독 생성

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | 빌링 설정 페이지에서 Startup 플랜 업그레이드 버튼을 클릭한다. |
| 2 | 시스템 | Stripe Checkout 세션을 생성한다. 세션 속성: 모드=subscription, 프로모션 코드 허용=true, 무료 체험=15일, 청구 주소 수집=필수, 자동 세금 계산=활성, 세금 ID 수집=활성. |
| 3 | 시스템 | 사용자를 Stripe Checkout 페이지로 리다이렉트한다. |
| 4 | 사용자 | Stripe Checkout 페이지에서 결제 정보를 입력하고 구독을 확인한다. |
| 5 | Stripe | Checkout 완료 후 성공 URL(빌링 확인 페이지)로 사용자를 리다이렉트한다. |
| 6 | Stripe | `checkout.session.completed` Webhook 이벤트를 Inquiry 서버로 전송한다. |
| 7 | 시스템 | Webhook 이벤트를 수신하여 Organization의 billing JSON을 업데이트한다: Stripe 고객 ID, 요금제=startup, 결제 주기(monthly/yearly), 사용량 제한(프로젝트 3개, 응답 5,000건, MIU 7,500건), 주기 시작일. |
| 8 | 시스템 | 빌링 확인 페이지에 업그레이드 완료 상태를 표시한다. |

#### 4.2.5 대안 흐름 (Alternative Flow)

| 흐름 ID | 조건 | 동작 |
|---------|------|------|
| AF-02-01 | 사용자가 Checkout 중 결제를 취소하는 경우 | Stripe는 취소 URL(빌링 설정 페이지)로 사용자를 리다이렉트한다. Organization의 billing 정보는 변경되지 않는다. |
| AF-02-02 | 사용자가 프로모션 코드를 적용하는 경우 | Stripe Checkout에서 프로모션 코드 입력 필드를 통해 할인을 적용한다. 할인 적용 후 결제 금액이 갱신된다. |
| AF-02-03 | 청구서 확정 이벤트 수신 시 | `invoice.finalized` Webhook 이벤트를 수신하면, 시스템은 빌링 주기 시작일을 업데이트한다. |

#### 4.2.6 예외 흐름 (Exception Flow)

| 흐름 ID | 조건 | 동작 |
|---------|------|------|
| EF-02-01 | Stripe Checkout 세션 생성 실패 | 시스템은 사용자에게 결제 서비스 연결 오류를 안내하고, 재시도를 권장한다. |
| EF-02-02 | Webhook 서명 검증 실패 | 시스템은 해당 Webhook 요청을 거부하고 로그를 기록한다. billing 정보는 변경하지 않는다. |
| EF-02-03 | Webhook 이벤트 중복 수신 | 시스템은 멱등성을 보장하여 동일 이벤트를 중복 처리하지 않는다. |
| EF-02-04 | 구독 취소 Webhook 수신 (`customer.subscription.deleted`) | 시스템은 Organization의 billing 정보를 Free 플랜으로 다운그레이드한다: 요금제=free, 사용량 제한을 Free 수준으로 변경. |

#### 4.2.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-02-01 | Startup 플랜 구독 시 15일 무료 체험 기간이 제공된다. |
| BR-02-02 | 결제 주기는 monthly($49/월) 또는 yearly($490/년) 중 선택한다. |
| BR-02-03 | 구독 취소 시 Organization은 Free 플랜으로 자동 다운그레이드된다. |
| BR-02-04 | 모든 Stripe Webhook 이벤트 처리는 멱등성을 보장해야 한다. |
| BR-02-05 | Stripe Secret Key는 환경변수로 관리하며, 코드에 하드코딩하지 않는다. |

#### 4.2.8 데이터 요구사항

**입력 데이터 (Checkout 세션 생성)**:

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|-----------------|
| organizationId | String (UUID) | Y | 유효한 Organization ID |
| plan | Enum(startup) | Y | 현재는 startup만 지원 |
| billingCycle | Enum(monthly, yearly) | Y | monthly 또는 yearly |
| successUrl | URL | Y | Checkout 성공 후 리다이렉트 URL |
| cancelUrl | URL | Y | Checkout 취소 후 리다이렉트 URL |

**출력 데이터 (Webhook 처리 후 업데이트되는 billing JSON)**:

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| plan | Enum(free, startup, custom) | Y | 현재 요금제 |
| billingCycle | Enum(monthly, yearly) | Y | 결제 주기 |
| stripeCustomerId | String | Y | Stripe 고객 식별자 (cus_xxx 형식) |
| periodStart | ISO 8601 Date | Y | 현재 빌링 주기 시작일 |
| limits.projects | Integer | Y | 최대 프로젝트 수 |
| limits.monthlyResponses | Integer | Y | 월 최대 응답 수 |
| limits.monthlyMIU | Integer | Y | 월 최대 MIU 수 |

#### 4.2.9 화면/UI 요구사항

- 빌링 설정 페이지: 현재 요금제, 결제 주기, 다음 결제일, Stripe Customer Portal 링크를 표시한다.
- Checkout 성공 페이지: 업그레이드 완료 메시지와 함께 새로운 요금제 정보를 표시한다.
- Checkout 취소 시: 빌링 설정 페이지로 돌아가며, 요금제 변경 없음을 사용자에게 안내한다.

#### 4.2.10 비기능 요구사항

| 항목 | 요구사항 |
|------|---------|
| 보안 | Stripe Secret Key는 환경변수로 관리. Webhook 서명 검증 필수. |
| 원자성 | Webhook 이벤트 처리의 멱등성 보장 (NFR-B05). |
| Stripe API 버전 | 2024-06-20 |

---

### 4.3 Enterprise License 시스템

#### 4.3.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | F-029-03 |
| 기능명 | Enterprise License 시스템 |
| 관련 요구사항 ID | FR-048-03 |
| 우선순위 | High |
| 기능 설명 | Enterprise License Key를 통해 14개의 독립적인 Feature Flag를 제어하고, 다계층 캐싱과 Grace Period를 포함한 라이선스 검증 시스템을 운영한다. |

#### 4.3.2 선행 조건 (Preconditions)

- Self-hosted 환경: Enterprise License Key가 시스템에 설정되어 있어야 한다.
- Cloud 환경: Inquiry에서 Organization의 요금제에 따라 자동으로 라이선스가 관리된다.
- Redis 서버가 가동 중이어야 한다 (캐싱 목적).

#### 4.3.3 후행 조건 (Postconditions)

- 라이선스 검증 결과에 따라 14개 Feature Flag의 활성/비활성 상태가 결정된다.
- 검증 결과가 Memory Cache(1분) 및 Redis Cache(24시간)에 저장된다.

#### 4.3.4 기본 흐름 (Basic Flow) - 라이선스 검증

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 기능 접근 요청 발생 시, 라이선스 검증을 시작한다. |
| 2 | 시스템 | In-process Memory Cache를 확인한다 (TTL: 1분). |
| 3-A | 시스템 | [캐시 히트] Memory Cache에 유효한 결과가 있으면 해당 결과를 반환한다. |
| 3-B | 시스템 | [캐시 미스] Redis Cache를 확인한다 (성공 응답 TTL: 24시간, 실패 응답 TTL: 10분). |
| 4-A | 시스템 | [Redis 캐시 히트] Redis에 유효한 결과가 있으면 해당 결과를 Memory Cache에 저장하고 반환한다. |
| 4-B | 시스템 | [Redis 캐시 미스] License Server API를 호출한다. |
| 5 | 시스템 | License Server API 호출: POST 요청을 전송한다 (Timeout: 5초). |
| 6 | License Server | 라이선스 키를 검증하고 결과(Feature Flags, 상태)를 반환한다. |
| 7 | 시스템 | 검증 결과를 Memory Cache(TTL: 1분)와 Redis Cache(성공: TTL 24시간, 이전 결과: TTL 4일)에 저장한다. |
| 8 | 시스템 | 검증 결과에 따라 Feature Flag 상태를 적용한다. |

#### 4.3.5 대안 흐름 (Alternative Flow)

| 흐름 ID | 조건 | 동작 |
|---------|------|------|
| AF-03-01 | License Key가 미설정(no-license)인 경우 | 시스템은 모든 Feature Flag를 false로 설정하고, 프로젝트 제한을 3개로 적용한다. 상태를 no-license로 반환한다. |
| AF-03-02 | Staging 환경인 경우 | API 엔드포인트를 staging.ee.formbricks.com/api/licenses/check로 변경하여 호출한다. |

#### 4.3.6 예외 흐름 (Exception Flow)

| 흐름 ID | 조건 | 동작 |
|---------|------|------|
| EF-03-01 | License Server API 호출 실패 (429/502/503/504) | 시스템은 최대 3회까지 지수 백오프 방식으로 재시도한다. |
| EF-03-02 | 3회 재시도 후에도 실패 (unreachable) | 시스템은 Redis에 저장된 이전 결과 캐시(TTL: 4일)를 확인한다. 이전 결과가 있고 Grace Period(3일) 이내이면 기존 라이선스 상태를 유지한다. |
| EF-03-03 | Grace Period(3일) 만료 | 시스템은 라이선스를 비활성화하고, 모든 Feature Flag를 false로 설정하며, 프로젝트 제한을 3개로 적용한다. |
| EF-03-04 | 유효하지 않은 License Key | 시스템은 invalid_license 상태를 반환하고, 모든 Feature Flag를 false로 설정한다. 실패 응답을 Redis에 캐시한다 (TTL: 10분). |
| EF-03-05 | License가 만료된 경우 | 시스템은 expired 상태를 반환하고, 모든 Feature Flag를 false로 설정한다. |

#### 4.3.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-03-01 | Enterprise License는 14개의 독립적인 Feature Flag를 제어한다. 각 Flag는 개별적으로 활성/비활성이 가능하다. |
| BR-03-02 | 라이선스 비활성 시 기본값: 모든 Feature Flag = false, 프로젝트 제한 = 3개. |
| BR-03-03 | License Server 접근 불가 시 3일간 Grace Period를 적용하여 기존 상태를 유지한다. |
| BR-03-04 | API 호출 재시도는 HTTP 상태 코드 429, 502, 503, 504에서만 수행한다. |
| BR-03-05 | License Key는 해시하여 캐시 키에 사용한다 (보안). |
| BR-03-06 | License 상태는 active, expired, unreachable, invalid_license, no-license 중 하나이다. |

#### 4.3.8 데이터 요구사항

**14개 Feature Flag 목록**:

| Flag ID | Flag명 | 타입 | 설명 |
|---------|--------|------|------|
| FF-01 | multiOrgEnabled | Boolean | 다중 Organization 지원 |
| FF-02 | contacts | Boolean | 연락처 관리 기능 |
| FF-03 | projects | Integer / null | 프로젝트 수 제한 (null = 무제한) |
| FF-04 | whitelabel | Boolean | 이메일/파비콘 커스터마이징 |
| FF-05 | removeBranding | Boolean | 설문 내 Inquiry 로고 제거 |
| FF-06 | twoFactorAuth | Boolean | TOTP 기반 2단계 인증 |
| FF-07 | sso | Boolean | Google, GitHub, Azure AD, OIDC SSO |
| FF-08 | saml | Boolean | SAML SSO |
| FF-09 | spamProtection | Boolean | reCAPTCHA 스팸 보호 |
| FF-10 | ai | Boolean | AI 기능 |
| FF-11 | auditLogs | Boolean | 감사 로그 |
| FF-12 | multiLanguage | Boolean | 다국어 설문 지원 |
| FF-13 | accessControl | Boolean | Team Access Roles |
| FF-14 | quotas | Boolean | 사용량 할당 제어 |

**캐시 설정 데이터**:

| 캐시 유형 | TTL | 용도 |
|-----------|-----|------|
| Memory Cache | 60초 (1분) | 프로세스 내 중복 요청 방지 |
| Redis - 성공 응답 | 86,400초 (24시간) | 성공 응답 캐시 |
| Redis - 실패 응답 | 600초 (10분) | 실패 응답 캐시 (빠른 재시도 가능) |
| Redis - 이전 결과 | 345,600초 (4일) | Grace Period용 이전 결과 보존 |

**API 엔드포인트**:

| 환경 | URL | Timeout |
|------|-----|---------|
| Production | https://ee.formbricks.com/api/licenses/check | 5초 |
| Staging | https://staging.ee.formbricks.com/api/licenses/check | 5초 |

#### 4.3.9 화면/UI 요구사항

- Self-hosted 관리 화면에서 Enterprise License Key 입력/변경 필드를 제공한다.
- 라이선스 상태(active/expired/unreachable/invalid_license/no-license)를 시각적으로 표시한다.
- 각 Feature Flag의 활성/비활성 상태를 목록으로 표시한다.

#### 4.3.10 비기능 요구사항

| 항목 | 요구사항 | 관련 NFR |
|------|---------|---------|
| 가용성 | License Server 장애 시 3일 Grace Period로 서비스 지속 | NFR-B01 |
| 성능 | Memory Cache(1분) + Redis Cache(24시간)로 라이선스 체크 최소화 | NFR-B02 |
| 보안 | License Key는 해시하여 캐시 키에 사용 | NFR-B03 |
| 복원력 | API 호출 실패 시 최대 3회 재시도 (지수 백오프), 429/502/503/504에서만 재시도 | NFR-B04 |

---

### 4.4 Cloud/Self-hosted 기능 게이팅

#### 4.4.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | F-029-04 |
| 기능명 | Cloud/Self-hosted 기능 게이팅 |
| 관련 요구사항 ID | FR-048-04 |
| 우선순위 | High |
| 기능 설명 | Cloud와 Self-hosted 환경에서 각각 다른 조건으로 기능 접근을 제어한다. 3가지 게이팅 패턴(기능 권한 패턴, Custom 플랜 전용 패턴, 특정 Feature Flag 패턴)을 적용한다. |

#### 4.4.2 선행 조건 (Preconditions)

- 시스템이 현재 환경(Cloud 또는 Self-hosted)을 식별할 수 있어야 한다.
- Enterprise License 검증 결과가 캐시 또는 실시간으로 조회 가능해야 한다.
- Cloud 환경인 경우 Organization의 billing 정보가 존재해야 한다.

#### 4.4.3 후행 조건 (Postconditions)

- 권한 확인 함수가 true/false를 반환하여 해당 기능의 접근이 허용/차단된다.

#### 4.4.4 기본 흐름 (Basic Flow) - 권한 확인

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | 사용자가 특정 기능에 접근을 시도한다. |
| 2 | 시스템 | 현재 환경(Cloud/Self-hosted)을 확인한다. |
| 3 | 시스템 | 해당 기능의 게이팅 패턴에 따라 권한을 확인한다. |
| 4-A | 시스템 | [Cloud] 요금제(Free/Startup/Custom)와 라이선스 상태를 함께 확인한다. |
| 4-B | 시스템 | [Self-hosted] 라이선스 상태와 해당 Feature Flag를 확인한다. |
| 5 | 시스템 | 권한 확인 결과(true/false)를 반환한다. |
| 6 | 시스템 | 권한이 없는 경우 기능을 비활성화하고, 업그레이드 안내를 표시한다. |

#### 4.4.5 대안 흐름 (Alternative Flow)

해당 없음. 각 기능별 게이팅 조건은 4.4.7 비즈니스 규칙에서 상세하게 정의한다.

#### 4.4.6 예외 흐름 (Exception Flow)

| 흐름 ID | 조건 | 동작 |
|---------|------|------|
| EF-04-01 | 라이선스 상태를 확인할 수 없는 경우 (캐시 미스 + 서버 접근 불가 + Grace Period 만료) | 모든 Enterprise 기능을 비활성화하고, 기본 제한을 적용한다 (프로젝트 3개). |

#### 4.4.7 비즈니스 규칙 (Business Rules)

**패턴 1: 기능 권한 패턴** - Cloud에서는 FREE가 아닌 플랜 + 활성 라이선스, Self-hosted에서는 활성 라이선스 + 해당 Feature Flag

| 규칙 ID | 기능 | Cloud 조건 | Self-hosted 조건 |
|---------|------|-----------|-----------------|
| BR-04-01 | 브랜딩 제거 | 활성 라이선스 AND plan != FREE | 활성 라이선스 AND removeBranding = true |
| BR-04-02 | Whitelabel | 활성 라이선스 AND plan != FREE | 활성 라이선스 AND whitelabel = true |
| BR-04-03 | 큰 파일 업로드 | plan != FREE AND 활성 라이선스 | 활성 라이선스 |

**패턴 2: Custom 플랜 전용 패턴** - Cloud에서는 CUSTOM 플랜 + 활성 라이선스 + Feature Flag, Self-hosted에서는 활성 라이선스 + Feature Flag

| 규칙 ID | 기능 | Cloud 조건 | Self-hosted 조건 |
|---------|------|-----------|-----------------|
| BR-04-04 | 사용량 할당 | plan = CUSTOM AND quotas = true | 활성 라이선스 AND quotas = true |
| BR-04-05 | 스팸 보호 | plan = CUSTOM AND spamProtection = true | 활성 라이선스 AND spamProtection = true |
| BR-04-06 | 다국어 설문 | plan = CUSTOM AND multiLanguage = true | 활성 라이선스 AND multiLanguage = true |
| BR-04-07 | 접근 제어 | plan = CUSTOM AND accessControl = true | 활성 라이선스 AND accessControl = true |

**패턴 3: 특정 Feature Flag 패턴** - 빌링 확인 없이 라이선스 + Feature Flag만 확인

| 규칙 ID | 기능 | Cloud 조건 | Self-hosted 조건 |
|---------|------|-----------|-----------------|
| BR-04-08 | 다중 Organization | multiOrgEnabled = true | multiOrgEnabled = true |
| BR-04-09 | 연락처 관리 | contacts = true | contacts = true |
| BR-04-10 | 2단계 인증 | twoFactorAuth = true | twoFactorAuth = true |
| BR-04-11 | SSO | sso = true | sso = true |
| BR-04-12 | 감사 로그 | auditLogs = true AND 감사 로그 활성화 설정 | auditLogs = true AND 감사 로그 활성화 설정 |

**특수 규칙**:

| 규칙 ID | 규칙 |
|---------|------|
| BR-04-13 | SAML SSO: Cloud에서는 항상 false (미지원). Self-hosted에서는 sso = true AND saml = true일 때 활성. |
| BR-04-14 | Organization 프로젝트 제한: 라이선스 활성 시 Cloud에서는 limits.projects(기본 무제한), Self-hosted에서는 features.projects를 적용. 비활성 시 양쪽 모두 3개로 제한. |

#### 4.4.8 데이터 요구사항

**입력 데이터 (권한 확인 함수)**:

| 필드명 | 타입 | 필수 | 설명 |
|--------|------|------|------|
| environment | Enum(cloud, self-hosted) | Y | 현재 실행 환경 |
| licenseStatus | Enum(active, expired, unreachable, invalid_license, no-license) | Y | 라이선스 상태 |
| featureFlags | Object (14개 Flag) | Y | Feature Flag 값 |
| organizationBilling | Object (billing JSON) | Cloud에서 Y | Organization의 빌링 정보 |

**출력 데이터**:

| 필드명 | 타입 | 설명 |
|--------|------|------|
| isAllowed | Boolean | 기능 접근 허용 여부 |

#### 4.4.9 화면/UI 요구사항

- 권한이 없는 기능의 UI 요소(메뉴, 버튼 등)는 비활성화 상태로 표시하거나 숨긴다.
- 비활성화된 기능에 접근 시도 시 업그레이드 안내 모달 또는 메시지를 표시한다.

#### 4.4.10 비기능 요구사항

- 권한 확인 함수는 캐시된 라이선스 정보를 사용하므로 1ms 이내에 응답해야 한다 (Memory Cache 히트 시).

---

### 4.5 설문 브랜딩 제거

#### 4.5.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | F-029-05 |
| 기능명 | 설문 브랜딩 제거 |
| 관련 요구사항 ID | FR-044-01 |
| 우선순위 | Medium |
| 기능 설명 | 프로젝트 단위로 링크 설문과 인앱/웹사이트 설문에 표시되는 "Powered by Inquiry" 로고를 개별적으로 제거한다. |

#### 4.5.2 선행 조건 (Preconditions)

- 사용자가 해당 프로젝트의 설정 변경 권한(Owner, Manager, 또는 Write 이상)을 보유해야 한다.
- 브랜딩 제거 권한이 활성화되어 있어야 한다 (Cloud: Startup 이상 + 활성 라이선스, Self-hosted: 활성 라이선스 + removeBranding = true).

#### 4.5.3 후행 조건 (Postconditions)

- 링크 설문 브랜딩 설정이 false로 변경되면, 해당 프로젝트의 모든 링크 설문에서 Inquiry 로고가 숨겨진다.
- 인앱 설문 브랜딩 설정이 false로 변경되면, 해당 프로젝트의 모든 인앱/웹사이트 설문에서 Inquiry 로고가 숨겨진다.

#### 4.5.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | 프로젝트 설정 페이지의 브랜딩 섹션에 접근한다. |
| 2 | 시스템 | 브랜딩 제거 권한을 확인한다 (F-029-04 게이팅 참조). |
| 3 | 시스템 | 권한이 있으면 링크 설문 브랜딩 토글과 인앱 설문 브랜딩 토글을 활성 상태로 표시한다. |
| 4 | 사용자 | 링크 설문 브랜딩 토글을 OFF로 변경한다. |
| 5 | 시스템 | 프로젝트의 linkSurveyBranding 값을 false로 저장한다. |
| 6 | 시스템 | 해당 프로젝트의 모든 링크 설문에서 Inquiry 로고를 숨긴다. |
| 7 | 사용자 | (선택) 인앱 설문 브랜딩 토글을 OFF로 변경한다. |
| 8 | 시스템 | 프로젝트의 inAppSurveyBranding 값을 false로 저장한다. |
| 9 | 시스템 | 해당 프로젝트의 모든 인앱/웹사이트 설문에서 Inquiry 로고를 숨긴다. |

#### 4.5.5 대안 흐름 (Alternative Flow)

| 흐름 ID | 조건 | 동작 |
|---------|------|------|
| AF-05-01 | 사용자가 브랜딩을 다시 활성화하려는 경우 | 토글을 ON으로 변경하면, 해당 브랜딩 값이 true로 저장되고, 설문에 Inquiry 로고가 다시 표시된다. |

#### 4.5.6 예외 흐름 (Exception Flow)

| 흐름 ID | 조건 | 동작 |
|---------|------|------|
| EF-05-01 | 브랜딩 제거 권한이 없는 경우 (Free 플랜 또는 라이선스 비활성) | 시스템은 브랜딩 토글을 비활성화(disabled) 상태로 표시하고, 업그레이드 안내 메시지를 표시한다. |
| EF-05-02 | 구독 다운그레이드로 권한이 상실된 경우 | 기존에 OFF로 설정된 브랜딩이 자동으로 ON으로 복원되며, 설문에 Inquiry 로고가 다시 표시된다. |

#### 4.5.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-05-01 | 브랜딩 제거는 프로젝트 단위로 설정한다. |
| BR-05-02 | 링크 설문 브랜딩과 인앱 설문 브랜딩은 독립적으로 제어한다. |
| BR-05-03 | Cloud 환경에서 Free 플랜 사용자는 브랜딩을 제거할 수 없다. |
| BR-05-04 | 요금제 다운그레이드 시 브랜딩 제거 설정은 자동으로 복원(ON)된다. |

#### 4.5.8 데이터 요구사항

**입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|-----------------|
| projectId | String (UUID) | Y | 유효한 Project ID |
| linkSurveyBranding | Boolean | N | true(표시) / false(숨김) |
| inAppSurveyBranding | Boolean | N | true(표시) / false(숨김) |

**출력 데이터**:

| 필드명 | 타입 | 설명 |
|--------|------|------|
| linkSurveyBranding | Boolean | 링크 설문 브랜딩 표시 여부 |
| inAppSurveyBranding | Boolean | 인앱 설문 브랜딩 표시 여부 |

#### 4.5.9 화면/UI 요구사항

- 프로젝트 설정 페이지의 "Branding" 또는 "Look & Feel" 섹션에 두 개의 토글을 배치한다.
- 각 토글에 "Link Survey Branding", "In-app Survey Branding" 레이블을 표시한다.
- 권한이 없는 경우 토글에 잠금 아이콘과 함께 "Upgrade to remove branding" 메시지를 표시한다.

#### 4.5.10 비기능 요구사항

- 브랜딩 설정 변경은 해당 프로젝트의 모든 설문에 즉시 반영되어야 한다 (실시간 반영).

---

### 4.6 이메일 로고 커스터마이징

#### 4.6.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | F-029-06 |
| 기능명 | 이메일 로고 커스터마이징 |
| 관련 요구사항 ID | FR-044-01 |
| 우선순위 | Medium |
| 기능 설명 | Organization 단위로 알림/팔로우업 이메일에 표시되는 로고를 커스텀 이미지로 변경하거나 기본 Inquiry 로고로 복원한다. |

#### 4.6.2 선행 조건 (Preconditions)

- 사용자가 Organization Owner 또는 Manager 역할을 보유해야 한다.
- Whitelabel 권한이 활성화되어 있어야 한다 (Cloud: Startup 이상 + 활성 라이선스, Self-hosted: 활성 라이선스 + whitelabel = true).

#### 4.6.3 후행 조건 (Postconditions)

- Organization의 whitelabel.logoUrl 필드에 커스텀 로고 URL이 저장된다.
- 이후 발송되는 모든 이메일에 커스텀 로고가 표시된다.

#### 4.6.4 기본 흐름 (Basic Flow) - 로고 설정

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Organization 설정 페이지의 Whitelabel 섹션에 접근한다. |
| 2 | 시스템 | Whitelabel 권한을 확인한다 (F-029-04 게이팅 참조). |
| 3 | 시스템 | 권한이 있으면 이메일 로고 설정 영역을 활성화한다. |
| 4 | 사용자 | 커스텀 로고 이미지 URL을 입력하거나 이미지 파일을 업로드한다. |
| 5 | 시스템 | 로고 URL의 유효성을 검증한다 (유효한 URL 형식, 접근 가능한 이미지). |
| 6 | 시스템 | Organization의 whitelabel.logoUrl 필드에 로고 URL을 저장한다. |
| 7 | 시스템 | 설정 완료 메시지를 표시한다. |

#### 4.6.5 대안 흐름 (Alternative Flow)

| 흐름 ID | 조건 | 동작 |
|---------|------|------|
| AF-06-01 | 로고를 제거(기본 복원)하려는 경우 | 사용자가 로고 제거 버튼을 클릭하면, 시스템은 whitelabel.logoUrl 필드를 null로 설정하고, 이후 이메일에 기본 Inquiry 로고를 표시한다. |
| AF-06-02 | 현재 설정된 로고를 조회하려는 경우 | 시스템은 Organization의 whitelabel.logoUrl 값을 읽어 현재 로고 미리보기를 표시한다. logoUrl이 null이면 기본 로고를 표시한다. |

#### 4.6.6 예외 흐름 (Exception Flow)

| 흐름 ID | 조건 | 동작 |
|---------|------|------|
| EF-06-01 | Whitelabel 권한이 없는 경우 | 시스템은 이메일 로고 설정 영역을 비활성화하고, 업그레이드 안내를 표시한다. |
| EF-06-02 | 유효하지 않은 이미지 URL을 입력한 경우 | 시스템은 "유효한 이미지 URL을 입력해 주세요" 오류 메시지를 표시하고, 저장을 차단한다. |

#### 4.6.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-06-01 | 이메일 로고는 Organization 단위로 설정한다. |
| BR-06-02 | 로고 URL이 null이면 기본 Inquiry 로고가 이메일에 표시된다. |
| BR-06-03 | 이메일 로고 설정은 Whitelabel 권한이 필요하다. |

#### 4.6.8 데이터 요구사항

**입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|-----------------|
| organizationId | String (UUID) | Y | 유효한 Organization ID |
| logoUrl | URL / null | Y | 유효한 URL 형식. null인 경우 기본 로고로 복원. |

**출력 데이터**:

| 필드명 | 타입 | 설명 |
|--------|------|------|
| logoUrl | URL / null | 현재 설정된 로고 URL. null이면 기본 로고. |

#### 4.6.9 화면/UI 요구사항

- Organization 설정 > Whitelabel 섹션에 이메일 로고 설정 영역을 배치한다.
- 현재 설정된 로고의 미리보기를 표시한다.
- 로고 업로드/URL 입력 필드와 "저장", "기본 로고로 복원" 버튼을 제공한다.

#### 4.6.10 비기능 요구사항

- 로고 URL 변경은 이후 발송되는 이메일에만 적용된다 (이미 발송된 이메일에는 영향 없음).

---

### 4.7 파비콘 커스터마이징

#### 4.7.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | F-029-07 |
| 기능명 | 파비콘 커스터마이징 |
| 관련 요구사항 ID | FR-044-01 |
| 우선순위 | Medium |
| 기능 설명 | Organization 단위로 링크 설문 페이지의 브라우저 탭에 표시되는 파비콘을 커스텀 이미지로 변경한다. |

#### 4.7.2 선행 조건 (Preconditions)

- 사용자가 Organization Owner 또는 Manager 역할을 보유해야 한다.
- Whitelabel 권한이 활성화되어 있어야 한다 (Cloud: Startup 이상 + 활성 라이선스, Self-hosted: 활성 라이선스 + whitelabel = true).

#### 4.7.3 후행 조건 (Postconditions)

- Organization의 whitelabel 설정에 커스텀 파비콘 URL이 저장된다.
- 해당 Organization의 링크 설문 페이지에 커스텀 파비콘이 표시된다.

#### 4.7.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 사용자 | Organization 설정 페이지의 Whitelabel 섹션에 접근한다. |
| 2 | 시스템 | Whitelabel 권한을 확인한다. |
| 3 | 시스템 | 권한이 있으면 파비콘 설정 영역을 활성화한다. |
| 4 | 사용자 | 커스텀 파비콘 이미지를 업로드하거나 URL을 입력한다. |
| 5 | 시스템 | 파비콘 이미지의 유효성을 검증한다. |
| 6 | 시스템 | Organization의 whitelabel 설정에 파비콘 URL을 저장한다. |
| 7 | 시스템 | 해당 Organization의 링크 설문 페이지에 커스텀 파비콘을 적용한다. |

#### 4.7.5 대안 흐름 (Alternative Flow)

| 흐름 ID | 조건 | 동작 |
|---------|------|------|
| AF-07-01 | 파비콘을 기본으로 복원하려는 경우 | 파비콘 URL을 null로 설정하여 기본 Inquiry 파비콘으로 복원한다. |

#### 4.7.6 예외 흐름 (Exception Flow)

| 흐름 ID | 조건 | 동작 |
|---------|------|------|
| EF-07-01 | Whitelabel 권한이 없는 경우 | 파비콘 설정 영역을 비활성화하고 업그레이드 안내를 표시한다. |
| EF-07-02 | 유효하지 않은 이미지 파일/URL인 경우 | 오류 메시지를 표시하고 저장을 차단한다. |

#### 4.7.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-07-01 | 파비콘은 Organization 단위로 설정한다. |
| BR-07-02 | 파비콘 설정은 Whitelabel 권한이 필요하다. |
| BR-07-03 | 파비콘 URL이 null이면 기본 Inquiry 파비콘이 표시된다. |

#### 4.7.8 데이터 요구사항

**입력 데이터**:

| 필드명 | 타입 | 필수 | 유효성 검증 규칙 |
|--------|------|------|-----------------|
| organizationId | String (UUID) | Y | 유효한 Organization ID |
| faviconUrl | URL / null | Y | 유효한 이미지 URL. null이면 기본 파비콘. |

**출력 데이터**:

| 필드명 | 타입 | 설명 |
|--------|------|------|
| faviconUrl | URL / null | 현재 설정된 파비콘 URL |

#### 4.7.9 화면/UI 요구사항

- Organization 설정 > Whitelabel 섹션에 파비콘 설정 영역을 배치한다 (이메일 로고 설정과 동일 페이지).
- 현재 파비콘 미리보기와 업로드/URL 입력 필드를 제공한다.
- "저장", "기본 파비콘으로 복원" 버튼을 제공한다.

#### 4.7.10 비기능 요구사항

- 파비콘 변경은 이후 접근하는 링크 설문 페이지부터 적용된다.

---

### 4.8 Organization Billing 데이터 모델

#### 4.8.1 기능 개요

| 항목 | 내용 |
|------|------|
| 기능 ID | F-029-08 |
| 기능명 | Organization Billing 데이터 모델 |
| 관련 요구사항 ID | FR-048-05 |
| 우선순위 | High |
| 기능 설명 | Organization 모델에 빌링(billing)과 whitelabel 두 개의 JSON 필드를 정의하여, 요금제/결제/사용량 제한/브랜딩 설정 데이터를 저장한다. |

#### 4.8.2 선행 조건 (Preconditions)

- Organization이 생성되어 있어야 한다.
- 데이터베이스 스키마에 Organization 모델이 정의되어 있어야 한다.

#### 4.8.3 후행 조건 (Postconditions)

- Organization의 billing 및 whitelabel JSON 필드가 요금제/결제 변경 및 브랜딩 설정 시 갱신된다.

#### 4.8.4 기본 흐름 (Basic Flow)

| 단계 | 주체 | 동작 |
|------|------|------|
| 1 | 시스템 | Organization 생성 시 billing JSON을 기본값(Free 플랜)으로 초기화한다. |
| 2 | 시스템 | Stripe Webhook 이벤트 수신 시 billing JSON을 업데이트한다. |
| 3 | 시스템 | 브랜딩/Whitelabel 설정 변경 시 whitelabel JSON을 업데이트한다. |
| 4 | 시스템 | 기능 게이팅 시 billing JSON을 읽어 요금제/제한 정보를 확인한다. |

#### 4.8.5 대안 흐름 (Alternative Flow)

해당 없음.

#### 4.8.6 예외 흐름 (Exception Flow)

| 흐름 ID | 조건 | 동작 |
|---------|------|------|
| EF-08-01 | billing JSON이 null이거나 손상된 경우 | 시스템은 Free 플랜 기본값을 적용한다. |

#### 4.8.7 비즈니스 규칙 (Business Rules)

| 규칙 ID | 규칙 |
|---------|------|
| BR-08-01 | 신규 Organization의 billing 기본값: plan=free, limits.projects=3, limits.monthlyResponses=1500, limits.monthlyMIU=2000. |
| BR-08-02 | billing JSON과 whitelabel JSON은 Organization 모델에 JSON 타입 컬럼으로 저장한다. |
| BR-08-03 | billing JSON의 stripeCustomerId는 Stripe Checkout 완료 후에만 설정된다. |

#### 4.8.8 데이터 요구사항

**Billing JSON 스키마**:

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| plan | Enum(free, startup, custom) | Y | free | 현재 요금제 |
| billingCycle | Enum(monthly, yearly) | N | null | 결제 주기 (Free 플랜에서는 null) |
| stripeCustomerId | String | N | null | Stripe 고객 식별자 |
| periodStart | ISO 8601 Date | N | null | 현재 빌링 주기 시작일 |
| limits.projects | Integer | Y | 3 | 최대 프로젝트 수 |
| limits.monthlyResponses | Integer | Y | 1500 | 월 최대 응답 수 |
| limits.monthlyMIU | Integer | Y | 2000 | 월 최대 MIU 수 |

**Whitelabel JSON 스키마**:

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|------|------|------|--------|------|
| logoUrl | URL / null | N | null | 커스텀 이메일 로고 URL |
| faviconUrl | URL / null | N | null | 커스텀 파비콘 URL |

#### 4.8.9 화면/UI 요구사항

- 해당 없음 (데이터 모델은 백엔드 구조).

#### 4.8.10 비기능 요구사항

- billing JSON 업데이트는 트랜잭션 내에서 수행하여 데이터 정합성을 보장해야 한다.

---

## 5. 데이터 모델

### 5.1 주요 엔티티 정의

| 엔티티 | 설명 | 주요 필드 |
|--------|------|----------|
| Organization | 조직. 빌링 및 Whitelabel 정보를 포함 | id, name, billing(JSON), whitelabel(JSON) |
| Project | 프로젝트. 브랜딩 설정을 포함 | id, organizationId, linkSurveyBranding(Boolean), inAppSurveyBranding(Boolean) |
| License | Enterprise 라이선스 정보 (캐시) | licenseKey(해시), status, featureFlags(14개), lastChecked, expiresAt |

### 5.2 엔티티 간 관계

```
Organization (1) ----< (N) Project
     |
     +-- billing (JSON): 요금제/결제/사용량 제한
     +-- whitelabel (JSON): 이메일 로고 URL, 파비콘 URL

Project
     +-- linkSurveyBranding (Boolean)
     +-- inAppSurveyBranding (Boolean)

License (캐시 기반, Organization/환경에 종속)
     +-- featureFlags (14개 Boolean/Integer)
     +-- status (Enum)
```

### 5.3 데이터 흐름

```
[사용자 Checkout] --> [Stripe] --> [Webhook] --> [Organization.billing 업데이트]
                                                         |
                                                         v
[기능 접근 요청] --> [게이팅 모듈] --> [Organization.billing 읽기]
                        |
                        v
                 [License 검증 모듈] --> [Memory Cache] --> [Redis Cache] --> [License Server API]
                        |
                        v
                 [Feature Flag 상태 확인] --> [기능 활성/비활성 결정]

[브랜딩/Whitelabel 설정] --> [Organization.whitelabel / Project.branding 업데이트]
                                    |
                                    v
                            [설문 렌더링 시 브랜딩/로고/파비콘 반영]
```

---

## 6. 인터페이스 명세

### 6.1 외부 시스템 연동

| 대상 시스템 | 연동 방식 | 용도 | 비고 |
|------------|----------|------|------|
| Stripe | REST API + Webhook | 구독 생성/관리, 결제 처리, 구독 상태 동기화 | API 버전 2024-06-20 |
| Stripe Customer Portal | 리다이렉트 | 결제 수단 관리, 인보이스 조회 (Out-of-scope) | Stripe에 위임 |
| Inquiry License Server | REST API | Enterprise License Key 검증, Feature Flag 조회 | Production/Staging 분리 |
| Redis | 인메모리 데이터 스토어 | License 검증 결과 캐싱 | TTL 기반 캐시 관리 |

### 6.2 API 명세

#### 6.2.1 Stripe Checkout 세션 생성

| 항목 | 내용 |
|------|------|
| 엔드포인트 | 내부 API (서버 -> Stripe API) |
| 메서드 | POST |
| 요청 파라미터 | mode=subscription, trial_period_days=15, allow_promotion_codes=true, billing_address_collection=required, automatic_tax.enabled=true, tax_id_collection.enabled=true, success_url, cancel_url |
| 응답 | Stripe Checkout Session URL |

#### 6.2.2 Stripe Webhook 수신

| 항목 | 내용 |
|------|------|
| 엔드포인트 | POST /api/webhooks/stripe |
| 처리 이벤트 | checkout.session.completed, invoice.finalized, customer.subscription.deleted |
| 인증 | Stripe Webhook 서명 검증 |
| 응답 | 200 OK (성공), 400 Bad Request (서명 검증 실패) |

#### 6.2.3 License 검증 API

| 항목 | 내용 |
|------|------|
| 엔드포인트 | POST https://ee.formbricks.com/api/licenses/check (Production), POST https://staging.ee.formbricks.com/api/licenses/check (Staging) |
| Timeout | 5초 |
| 재시도 | 최대 3회, 지수 백오프, 429/502/503/504에서만 재시도 |
| 요청 | License Key |
| 응답 | 라이선스 상태, Feature Flags (14개), 만료일 |

---

## 7. 비기능 요구사항

### 7.1 성능 요구사항

| ID | 요구사항 | 측정 기준 |
|----|---------|----------|
| NFR-B02 | 라이선스 검증은 Memory Cache 히트 시 1ms 이내에 응답 | Memory Cache TTL: 1분 |
| NFR-B02 | Redis Cache 히트 시 10ms 이내에 응답 | Redis Cache TTL: 24시간 |
| NFR-B02 | License Server API 호출 시 5초 이내에 응답 (Timeout) | API Timeout: 5초 |

### 7.2 보안 요구사항

| ID | 요구사항 |
|----|---------|
| NFR-B03 | License Key는 해시 처리하여 캐시 키로 사용한다 (평문 저장 금지). |
| NFR-B03 | Stripe Secret Key는 환경변수로 관리하며, 코드나 로그에 노출하지 않는다. |
| NFR-B05 | Stripe Webhook 수신 시 서명 검증을 반드시 수행한다. |

### 7.3 가용성 요구사항

| ID | 요구사항 |
|----|---------|
| NFR-B01 | License Server 장애 시 3일간 Grace Period를 적용하여 기존 라이선스 상태를 유지한다. |
| NFR-B04 | License Server API 호출 실패 시 최대 3회 재시도한다 (지수 백오프). 재시도 대상 HTTP 코드: 429, 502, 503, 504. |
| NFR-B05 | Stripe Webhook 이벤트 처리의 멱등성을 보장하여, 이벤트 중복 수신 시에도 데이터 정합성을 유지한다. |

---

## 8. 제약사항 및 가정

### 8.1 기술적 제약사항

| 항목 | 내용 |
|------|------|
| Stripe API 버전 | 2024-06-20 고정 |
| License Server API Timeout | 5초 |
| Memory Cache TTL | 1분 |
| Redis 의존성 | Redis 서버가 가동 중이어야 License 캐싱이 정상 동작한다 |
| 재시도 대상 HTTP 코드 | 429, 502, 503, 504만 재시도 |

### 8.2 비즈니스 제약사항

| 항목 | 내용 |
|------|------|
| Cloud 요금제 | Free, Startup, Custom 3단계만 지원 |
| SAML SSO | Cloud 환경에서는 항상 비활성 (Self-hosted 전용) |
| Custom 플랜 | 영업팀을 통한 개별 협의로만 가입 가능 |
| 무료 체험 | Startup 플랜에 한해 15일 제공 |
| 환불 | Out-of-scope (Stripe에서 직접 처리) |

### 8.3 가정사항

| 항목 | 내용 |
|------|------|
| Stripe 가용성 | Stripe 서비스가 정상 운영 중이라고 가정한다. |
| License Server | License Server의 API 응답 형식은 변경되지 않는다고 가정한다. |
| Redis 가용성 | Redis 서버가 항상 가동 중이라고 가정한다. Redis 장애 시 Memory Cache만으로 동작하나, 캐시 지속성은 보장되지 않는다. |
| 환경 구분 | 시스템이 Cloud/Self-hosted 환경을 명확히 식별할 수 있다고 가정한다 (환경변수 또는 설정 기반). |

---

## 9. 부록

### 9.1 요구사항 추적 매트릭스 (RTM)

| 요구사항 ID | 요구사항명 | 기능 명세 ID | 기능명 | 수용 기준 ID |
|------------|----------|------------|--------|-------------|
| FR-048-01 | 요금제 구조 | F-029-01 | 요금제 구조 관리 | AC-029-01, AC-029-07, AC-029-12 |
| FR-048-02 | Stripe 결제 통합 | F-029-02 | Stripe 결제 통합 | AC-029-01, AC-029-02, AC-029-03 |
| FR-048-03 | Enterprise License 시스템 | F-029-03 | Enterprise License 시스템 | AC-029-04, AC-029-05, AC-029-06, AC-029-10, AC-029-15 |
| FR-048-04 | Cloud/Self-hosted 기능 게이팅 | F-029-04 | Cloud/Self-hosted 기능 게이팅 | AC-029-07, AC-029-08, AC-029-09, AC-029-11, AC-029-12 |
| FR-044-01 | 브랜딩 관리 | F-029-05 | 설문 브랜딩 제거 | AC-029-07, AC-029-08, AC-029-09, AC-029-14 |
| FR-044-01 | 브랜딩 관리 | F-029-06 | 이메일 로고 커스터마이징 | AC-029-13 |
| FR-044-01 | 브랜딩 관리 | F-029-07 | 파비콘 커스터마이징 | - |
| FR-048-05 | Organization Billing 데이터 모델 | F-029-08 | Organization Billing 데이터 모델 | AC-029-02, AC-029-03 |

### 9.2 수용 기준 추적 매트릭스

| AC-ID | 수용 기준 | 관련 기능 명세 | 검증 방법 |
|-------|----------|-------------|----------|
| AC-029-01 | Free 플랜 사용자가 Startup 플랜 구독 시 15일 무료 체험이 시작된다 | F-029-01, F-029-02 | Checkout 완료 후 Organization billing의 trial 상태 확인 |
| AC-029-02 | Checkout 완료 후 Organization의 billing 정보가 Startup 플랜으로 업데이트된다 | F-029-02, F-029-08 | checkout.session.completed Webhook 수신 후 billing JSON 검증 |
| AC-029-03 | 구독 취소 시 Organization의 billing 정보가 Free 플랜으로 다운그레이드된다 | F-029-02, F-029-08 | customer.subscription.deleted Webhook 수신 후 billing JSON 검증 |
| AC-029-04 | Enterprise License가 없는 상태에서 contacts 기능 접근 시 적절한 제한이 적용된다 | F-029-03, F-029-04 | no-license 상태에서 contacts=false 확인, 기능 접근 차단 검증 |
| AC-029-05 | License 서버 장애 시 3일간 기존 라이선스 상태가 유지된다 (Grace Period) | F-029-03 | License Server 접근 불가 상태에서 Redis 이전 결과 캐시로 동작 확인 |
| AC-029-06 | Grace Period 만료 후 라이선스가 비활성화되고 기본값이 적용된다 | F-029-03 | 3일 경과 후 Feature Flag=false, 프로젝트 제한=3 확인 |
| AC-029-07 | Cloud에서 Free 플랜 사용자는 브랜딩 제거가 불가능하다 | F-029-04, F-029-05 | Free 플랜에서 브랜딩 토글 비활성화 상태 확인 |
| AC-029-08 | Cloud에서 Startup 이상 플랜 사용자는 브랜딩을 제거할 수 있다 | F-029-04, F-029-05 | Startup 플랜에서 브랜딩 토글 ON/OFF 정상 동작 확인 |
| AC-029-09 | Self-hosted에서 브랜딩 제거 flag가 활성화된 라이선스로 브랜딩을 제거할 수 있다 | F-029-04, F-029-05 | removeBranding=true인 라이선스에서 브랜딩 토글 정상 동작 확인 |
| AC-029-10 | 14개 Enterprise Feature Flag가 각각 독립적으로 제어된다 | F-029-03 | 개별 Flag 활성/비활성 시 해당 기능만 영향받는지 확인 |
| AC-029-11 | SAML SSO는 Cloud 환경에서 항상 비활성화된다 | F-029-04 | Cloud 환경에서 SAML 관련 권한 확인 함수가 항상 false 반환 확인 |
| AC-029-12 | Custom 플랜 전용 기능은 Cloud에서 Custom 플랜이 아니면 비활성이다 | F-029-04 | Free/Startup 플랜에서 다국어 설문, 접근 제어, 사용량 할당 비활성 확인 |
| AC-029-13 | 이메일 로고를 설정하면 알림 이메일에 커스텀 로고가 표시된다 | F-029-06 | logoUrl 설정 후 이메일 발송 시 커스텀 로고 렌더링 확인 |
| AC-029-14 | 링크 설문 브랜딩을 false로 설정하면 링크 설문에서 Inquiry 로고가 숨겨진다 | F-029-05 | linkSurveyBranding=false 설정 후 링크 설문 페이지에서 로고 미표시 확인 |
| AC-029-15 | 라이선스 키가 유효하지 않으면 invalid_license 상태가 반환된다 | F-029-03 | 잘못된 License Key로 검증 시 invalid_license 상태 반환 확인 |

### 9.3 변경 이력

| 버전 | 일자 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| v1.0 | 2026-02-21 | 최초 작성 | - |
