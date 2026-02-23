# 스킵된 기능 목록

이 문서는 1단계(공통 기준/게이팅 인프라) 구현 시 의도적으로 스킵한 기능을 기록합니다.

## FSD-029: Stripe 빌링 / Whitelabel 브랜딩

### 스킵된 항목

| 항목 | 설명 | 사유 |
|------|------|------|
| Stripe 결제 연동 | 구독/결제 처리, Webhook, 고객 포털 | 외부 서비스 의존성이 높아 인프라 기반 완료 후 별도 구현 |
| 빌링 UI | 구독 관리, 결제 내역, 플랜 변경 화면 | Stripe 연동 완료 후 진행 |
| Whitelabel 브랜딩 | 조직별 로고, 색상, 커스텀 도메인 | 빌링 시스템과 연계되어 함께 구현 예정 |
| StripeEvent 모델 | Webhook 이벤트 저장 Prisma 모델 | Stripe 연동 시 추가 |

### 구현 완료된 관련 항목

| 항목 | 설명 | 구현 위치 |
|------|------|----------|
| License/Feature Flag 시스템 | 플랜별 기능 게이팅 (hard/soft/capacity) | `libs/server/license/` |
| LicenseService | Memory→Redis 캐시 계층, 라이선스 키 검증 | `libs/server/license/src/lib/license.service.ts` |
| FeatureGatingService | 3단계 게이팅 패턴 | `libs/server/license/src/lib/feature-gating.service.ts` |
| LicenseGuard | `@RequireLicense('feature')` 데코레이터 | `libs/server/license/src/lib/license.guard.ts` |
| BILLING 역할 | MembershipRole에 BILLING 추가 | `packages/db/prisma/schema.prisma` |

### 추후 구현 시 참고 사항

1. **Prisma 스키마 변경 필요**
   - Organization 모델에 billing 관련 필드 추가 (stripeCustomerId, subscriptionId 등)
   - StripeEvent 모델 신규 추가 (idempotency key, 이벤트 타입, 처리 상태)
   - Whitelabel 관련 필드 추가 (brandColor, logoUrl, customDomain)

2. **패키지 설치 필요**
   - `stripe` (Stripe Node.js SDK)
   - `@stripe/stripe-js` (클라이언트)

3. **기존 License 시스템 연동**
   - LicenseService의 `parseLicenseKey()` → Stripe Subscription API 호출로 대체
   - FeatureGatingService의 플랜별 한도를 Stripe Product metadata에서 조회
   - Redis 캐시 계층은 그대로 활용

4. **환경변수 추가**
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PUBLISHABLE_KEY`
