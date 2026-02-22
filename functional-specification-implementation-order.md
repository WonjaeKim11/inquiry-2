# Functional Specification 구현 순서 가이드

- 작성일: 2026-02-22
- 기준 디렉토리: `functional-specification/`
- 목적: 기능 간 의존관계를 반영해 재작업을 최소화하는 구현 순서 제안

## 1단계: 공통 기준/게이팅

1. `functional-specification/99-non-functional-interface-appendix.md`
2. `functional-specification/29-subscription-billing-branding.md`
3. `functional-specification/05-audit-log.md`
4. `functional-specification/30-admin-UI-multilingual.md`

이유: 전역 NFR, 라이선스 플래그, 감사로그, i18n 기반을 먼저 고정.

## 2단계: 인증/테넌시 코어

1. `functional-specification/01-signup-login-session.md`
2. `functional-specification/02-2FA-SSO.md`
3. `functional-specification/03-organization-management.md`
4. `functional-specification/04-member-invite-RBAC.md`
5. `functional-specification/06-project-environment.md`

이유: 이후 대부분 기능이 User/Org/Environment 컨텍스트를 전제로 동작.

## 3단계: API 베이스라인

1. `functional-specification/24-REST-API-headless.md`

이유: SDK, Headless, 통합 기능의 공통 진입점 확보.

## 4단계: 설문 도메인 코어(모델/런타임)

1. `functional-specification/08-survey-creation-type-lifecycle.md`
2. `functional-specification/09-question-type-catalog.md`
3. `functional-specification/12-conditional-logic-engine.md`
4. `functional-specification/13-variables-hidden-fields-recall.md`
5. `functional-specification/14-quota-management.md`

이유: 편집기/배포/응답 기능의 핵심 도메인을 먼저 안정화.

## 5단계: 설문 UX 확장

1. `functional-specification/11-styling-theme-background.md`
2. `functional-specification/15-multilingual-survey.md`
3. `functional-specification/10-survey-editor-UX.md`

이유: 코어 모델 확정 후 UX를 올려야 재작업 감소.

## 6단계: 연락처/세그먼트

1. `functional-specification/26-contact-management.md`
2. `functional-specification/27-segment-filter.md`

이유: 세그먼트 평가가 연락처/속성 데이터에 의존.

## 7단계: 배포/노출 채널

1. `functional-specification/07-SDK-widget-GTM.md`
2. `functional-specification/20-user-identification-spam-prevention.md`
3. `functional-specification/16-link-share-embed.md`
4. `functional-specification/18-access-control-prefill.md`
5. `functional-specification/17-single-use-personal-link.md`
6. `functional-specification/19-targeting-trigger-reexposure.md`

이유: SDK/식별/링크/접근제어 기반 위에 타게팅 로직을 얹는 순서가 안전.

## 8단계: 응답 처리/자동화/분석

1. `functional-specification/21-response-management-partial-response.md`
2. `functional-specification/22-response-pipeline-follow-up-email.md` (코어 트리거)
3. `functional-specification/23-webhook-connector.md`
4. `functional-specification/22-response-pipeline-follow-up-email.md` (외부 통합/후속 메일 완성)
5. `functional-specification/28-response-notification.md`
6. `functional-specification/25-analytics-summary-export.md`

이유: 응답 저장이 선행되어야 파이프라인, 알림, 분석 완성 가능.

## 실행 권장 방식

- 각 단계마다 얇은 E2E를 먼저 통과:
  - 가입 -> 조직/환경 생성 -> 설문 발행 -> 응답 제출 -> 응답 조회
- 단계 완료 기준:
  - 스키마/도메인 로직 테스트 통과
  - API 계약 테스트 통과
  - 대표 사용자 플로우 E2E 1개 이상 통과
