# Feature Plans Detail

## FS-014 쿼터 관리 핵심 아키텍처 결정
- DB 모델: Quota(별도 테이블) + ResponseQuota(N:M 연결, 복합PK [responseId, quotaId])
- 서버: `libs/server/quota/` (QuotaModule, QuotaService, QuotaEvaluationService)
- 클라이언트: `libs/client/quota/` (hooks, api, zod schemas)
- 로직 엔진 공유: `packages/logic-engine/` (FS-012에서 추출, 서버+클라이언트 공용)
- Enterprise 가드: QuotaFeatureGuard 스텁 -> FS-029 RequireFeature('quotas') 교체
- 평가: 서버 사이드 $transaction, 에러 시 shouldEndSurvey: false
- Response 스텁: FS-021 선행으로 최소 모델 생성
- 인덱스: [quotaId, status] (카운트 최적화), [surveyId, name] (유니크)
- 동시성: skipDuplicates(createMany) + upsert(screenedOut)
- 선행: FS-008(Survey), FS-012(로직엔진), FS-029(라이선스), FS-021(Response스텁)

## FS-015 다국어 설문 핵심 아키텍처 결정
- SurveyLanguage: 별도 Prisma 테이블 아닌 Survey.languages Json 필드에 저장
- TI18nString: Record<string, string>, "default" 키 필수
- 하위 호환: normalizeToI18nString()으로 기존 string 자동 변환
- RTL: 8개 언어 코드, base code 추출, Bidi 유니코드 판별
- 라이선스: multiLanguage 플래그, @RequireFeature 가드
- 번역 관리: 클라이언트 주도, 서버는 검증만
- 신규: libs/server/multilingual, libs/client/multilingual
- Language 모델: FS-006에서 정의됨, Prisma 변경 없음

## FS-024 REST API 핵심 아키텍처 결정
- 신규 라이브러리 4개: common, api-key, client-api, management-api
- API Key 인증: x-api-key 헤더 -> bcrypt 비교 -> 인증 객체 주입 (Passport와 독립)
- 권한 3단계: READ < WRITE < MANAGE (계층적, 상위가 하위 포함)
- API Key v2 형식: "fbk_" + base64url(randomBytes(32)), bcrypt cost 12
- Client API: 인증 불필요, environmentId 기반 스코핑
- 버전 라우팅: NestJS RouterModule로 /api/v1/, /api/v2/ 분리
- 표준 에러 응답: { error: { code, message, details } }
- Rate Limiting: namespace별 (environmentId/apiKeyId) 분당 100건
- Headless 모드: Client API 구현으로 자동 충족 (별도 서버 코드 불필요)

## FS-006 프로젝트/환경 핵심 아키텍처 결정
- Prisma ID: Project/ActionClass/Language -> cuid(2), Environment -> cuid()
- Project 생성: $transaction으로 Project+Environment(prod/dev) 원자적 생성
- 환경 격리: Environment ID 기반 9종 데이터 격리 (Survey, Contact, ActionClass 등)
- 권한 역추적: actionClassId -> environmentId -> projectId -> organizationId -> Membership
- ActionClass: code(key 필수) vs noCode(noCodeConfig 필수), type 변경 불가
- Project 삭제: DB-level ON DELETE CASCADE

## FS-011 스타일링/테마/배경 핵심 아키텍처 결정
- DB 변경 없음: 기존 Project.styling(Json) + Survey.styling(Json) 필드 활용
- 공유 스키마: `packages/survey-schema/src/styling/` (zod 스키마, 유틸, 상수)
- 클라이언트 라이브러리: `libs/client/styling/` (편집 UI, 훅, 컴포넌트)
- 스타일 해석 엔진: 5단계 우선순위 순수 함수 (클라이언트/서버 양쪽 사용 가능)
- 배경/로고: Link Survey 전용, App Survey에서는 UI 섹션 숨김

## FS-027 세그먼트 필터 핵심 아키텍처 결정
- Segment 모델: environmentId FK, filters Json (FilterItem[] 재귀 트리), title+environmentId 유니크
- Survey.segment Json? -> Survey.segmentId String? FK로 변경 (1:N 관계)
- Private: title=surveyId, isPrivate=true, upsert, cascade 삭제
- 순환 참조: DFS + visited Set 재귀 탐지
- 공유 패키지: `packages/shared/src/segment/`

## FS-007 SDK/위젯/GTM 핵심 아키텍처 결정
- 순수 클라이언트 사이드 SDK: DB 스키마 변경 없음, 서버 코드 변경 없음
- 2개 독립 패키지: `packages/js-sdk` (코어), `packages/surveys` (설문 UI)
- 빌드: tsup으로 UMD+ESM 이중 빌드, CDN 배포 가능
- Shadow DOM 기반 스타일 격리, CSP nonce 지원
- 선행 의존: FS-024 Client API, FS-006 Environment/Project, FS-008 Survey

## FS-026 연락처 관리 핵심 아키텍처 결정
- DB 모델: Contact, ContactAttributeKey, ContactAttributeValue, PersonalizedLink
- email: ContactAttributeKey default 속성(isUnique: true)으로 관리
- Default 속성 키 4개: userId, email, firstName, lastName
- Typed Storage: value(문자열) + numberValue(Float?) + dateValue(DateTime?)

## FS-010 설문 편집기 UX 핵심 아키텍처 결정
- 순수 클라이언트 UI 구현 (DB 스키마 변경 없음, 서버 코드 변경 없음)
- 상태 관리: React Context + useReducer (외부 의존 없음)
- 편집기 라이브러리: `libs/client/survey-editor/`
- DnD: @dnd-kit/core + @dnd-kit/sortable

## FS-009 질문 유형 카탈로그 아키텍처
- Element는 Survey.blocks JSON 필드 내에 중첩 저장 (별도 DB 테이블 X)
- 타입: `packages/shared-types`, Zod 스키마: `packages/survey-schema`
- Element: z.discriminatedUnion('type', [...]) 패턴, 15가지 type
- Validation: 24가지 RuleType, and/or 논리, ElementType별 적용 가능 Rule 매핑

## FS-013 변수/히든 필드/리콜 아키텍처
- 독립 API 없음: Survey CRUD API(FSD-008) 통해 관리
- variables: Json 배열 (Discriminated Union: NumberVariable | TextVariable)
- hiddenFields: Json 객체 ({ enabled: boolean, fieldIds: string[] })
- Recall 패턴: `#recall:{id}/fallback:{value}#`, 클라이언트 사이드 파싱/치환
- 공유 유틸리티: `packages/shared`

## FS-018 접근 제어 / 프리필 핵심 아키텍처 결정
- 서버: `libs/server/link-survey/` (LinkSurveyModule, 공개 API - 인증 불필요)
- 클라이언트: `libs/client/link-survey/` (PinGate, EmailVerificationGate, SurveyClosedMessage)
- 프리필 엔진: `packages/shared/src/prefill/` (클라이언트 전용 순수 함수)
- API: POST verify-pin, POST send-verification-email, GET verify-email
- PIN: 4자리 숫자, OTP UI, 자동 검증, 2초 초기화, 재시도 무제한
- 이메일 인증: JWT 토큰 24시간, 3상태(not-verified/verified/fishy)
- 프리필 검증: 7가지 Element 타입별, 오류 격리, 라벨+OptionID 이중 매칭
- Response 스텁: 이메일 중복 확인용 최소 모델
- 선행: FS-008(Survey), FS-009(Element), FS-016(Link Survey 페이지), FS-021(Response 스텁)
- shadcn/ui: input-otp 컴포넌트 추가 필요

## FS-017 싱글유즈 및 개인 링크 핵심 아키텍처 결정
- 서버: `libs/server/single-use/` + `libs/server/personal-link/` (2개 독립 모듈)
- 클라이언트: `libs/client/single-use/` + `libs/client/personal-link/`
- 암호화: EncryptionService (AES-256-GCM V2 + CBC V1 레거시 호환), SingleUseModule에서 export
- Single-use: CUID2 기반 ID, singleUse Json 필드(Survey에 이미 존재), DB 저장 없음(stateless)
- Personal Link: stateless JWT(HS256) + AES-256-GCM 이중 암호화, DB 저장 없음
- FS-026 PersonalizedLink 모델과 병립: FS-026은 HMAC 기반, FS-017은 JWT 기반(서로 독립)
- Response 최소 스텁: id, surveyId, finished, singleUseId, contactId (FS-021 확장 예정)
- 환경변수: ENCRYPTION_KEY (AES-256 + JWT 서명 공용, hex 인코딩)
- 페이지 라우트: /s/[surveyId] (suId 쿼리), /c/[token] (Personal Link 전용)
- Enterprise 가드: @RequireFeature('contacts') (Personal Link만)
- 선행: FS-008(Survey), FS-026(Contact), FS-029(License), FS-016(Link Survey 페이지)

## FS-022 응답 파이프라인/Follow-Up 핵심 아키텍처 결정
- 3개 서버 모듈: `libs/server/pipeline/`, `libs/server/webhook-dispatch/`, `libs/server/follow-up/`
- 1개 클라이언트 모듈: `libs/client/follow-up/` (설정 모달, 목록, hooks)
- 파이프라인 오케스트레이션: PipelineService.trigger() 서비스 간 직접 호출 (별도 HTTP X)
- 이벤트 3종: responseCreated(웹훅만), responseUpdated(웹훅만), responseFinished(전체)
- 에러 격리: 개별 작업 실패가 전체 파이프라인 중단시키지 않음 (try-catch + 로깅)
- 병렬: Promise.allSettled (웹훅 + 알림 이메일)
- 내부 인증: InternalSecretGuard, x-pipeline-secret 헤더, crypto.timingSafeEqual
- Webhook: Standard Webhooks (webhook-id UUID v7, webhook-timestamp, webhook-signature v1,{HMAC-SHA256 base64})
- 웹훅 매칭: environmentId + triggers 포함 + surveyIds 매칭 (빈 배열=전체)
- 웹훅 타임아웃: 5초
- Follow-Up 설정: Survey.followUps Json 필드 (배열), 개별 ID는 UUID v4
- FollowUpResult: 별도 Prisma 모델, (responseId, followUpId) 유니크
- Follow-Up 권한: Cloud+Custom 또는 Self-hosted (IS_CLOUD_INSTANCE 환경변수)
- Follow-Up Rate Limit: DB 기반 고정 윈도우 (조직당 시간당 50건), Redis 마이그레이션 예정
- Follow-Up 이메일: Recall 태그 치환 + HTML Sanitization(7태그) + Storage URL 절대경로 + 법적 고지
- 수신자 결정: 직접 이메일 / 응답 데이터 키 추출 / ContactInfo 배열[2]
- autoComplete: 응답 수 >= 목표 -> Survey status "completed" + AuditLog (userType: "system")
- Integration: 스텁만 (FS-023에서 완성), IntegrationHandler 인터페이스 정의
- Webhook 모델: 스텁 (FS-023에서 완성)
- 환경변수: PIPELINE_SECRET
- 선행: FS-008(Survey), FS-021(Response), FS-023(Webhook CRUD), FS-028(알림), FS-029(License)
- 구현 순서: 8단계(응답 처리/자동화/분석)의 2번째 모듈

## FS-023 웹훅 및 커넥터 핵심 아키텍처 결정
- DB 모델: Webhook(CUID, environmentId FK), Integration(type+envId 유니크), IntegrationConfig(integrationId+surveyId 유니크)
- Enum: WebhookSource(user/zapier/make/n8n/activepieces), WebhookTrigger(responseCreated/Updated/Finished), IntegrationType(googleSheets/slack/airtable/notion)
- 서버: `libs/server/webhook/` (WebhookModule, WebhookService, WebhookDispatchService, WebhookSigningService)
- 서버: `libs/server/integration/` (IntegrationModule, IntegrationService, IntegrationDispatchService, 4개 Provider)
- 클라이언트: `libs/client/webhook/` (폼, 목록, 시크릿 모달, 삭제 대화상자, 설문 선택)
- 클라이언트: `libs/client/integration/` (통합 카드, 설정 UI, 데이터 매핑)
- 시크릿: "whsec_" + base64(32bytes CSPRNG), DB 평문 저장(서명에 원문 필요), API select 제외
- 서명: Standard Webhooks HMAC-SHA256, "v1,{base64}" 형식, webhook-id(UUID v7), webhook-timestamp(Unix초)
- 이벤트: @nestjs/event-emitter(EventEmitter2), fire-and-forget, Promise.allSettled 병렬
- URL 검증: HTTPS 필수, 연속 슬래시 금지, TLD 2자+, Discord 차단 (순수 함수)
- 네이티브 통합: responseFinished만, OAuth 2.0, 메타데이터 줄바꿈 포맷, Notion 7타입 변환
- 자동화 커넥터: FS-024 Management API 엔드포인트 재사용, source 필드 추가 허용
- 타임아웃: 5초 고정, @nestjs/axios HttpModule
- 재시도: 초기 미구현 (향후 Bull/BullMQ 큐 도입 시 추가)
- 선행: FS-006(Environment), FS-008(Survey), FS-021(Response), FS-024(Management API)
- 구현 순서: 8단계(응답 처리/자동화/분석)의 3번째 모듈
- 5개 마일스톤: 데이터+CRUD -> 발송엔진 -> Management API -> 클라이언트 UI -> 네이티브 통합
- 환경변수: GOOGLE_SHEETS_CLIENT_ID/SECRET, SLACK_CLIENT_ID/SECRET, AIRTABLE_CLIENT_ID/SECRET, NOTION_CLIENT_ID/SECRET

## FS-025 분석/요약/내보내기 핵심 아키텍처 결정
- DB 변경 없음: Response, Survey, Display, Quota 등 기존 모델 조회 전용
- 서버: `libs/server/analytics/` (AnalyticsModule, SummaryService, ExportService, DropOffService)
- 클라이언트: `libs/client/analytics/` (컴포넌트 40+, 순수 함수 계산기, 내보내기 유틸, SVG 차트)
- 데이터 로딩: Cursor 기반 페이지네이션 (Summary 5,000건, Export 3,000건 배치)
- 병렬 처리: Display Count+Quotas 병렬 조회, Meta+Summary+Drop-off 병렬 계산
- Drop-off: packages/logic-engine 사용하여 서버에서 조건 분기 시뮬레이션
- 내보내기: 서버=JSON 데이터 반환, 클라이언트=CSV/XLSX 변환(xlsx/SheetJS 라이브러리)
- CSV: UTF-8 BOM, text/csv; XLSX: Base64->바이너리, Object URL 즉시 해제
- 차트: SVG 커스텀 (HalfCircle게이지, ProgressBar, BarChart), 외부 라이브러리 없음
- NPS: Promoter(9-10)/Passive(7-8)/Detractor(0-6)/Dismissed, 투명도 선형 보간
- CSAT: Range별 만족 기준 매핑 (3/4/5/6/7/10), 소수점 2자리
- 질문 유형: 14종(+HiddenFields) Summary 컴포넌트, 샘플 50건 제한
- 필터: FS-021 ResponseFilterService 재사용
- 권한: OWNER/ADMIN = owner/manager, MEMBER = project read (내보내기)
- 선행: FS-021(Response), FS-008(Survey), FS-014(Quota), FS-012(로직엔진), FS-006(Environment)
- 구현 순서: 8단계(응답 처리/자동화/분석) 마지막 모듈

## FS-028 응답 알림(Notification) 핵심 아키텍처 결정
- DB 변경: User.notificationSettings Json? 필드 추가 (별도 테이블 X)
- NotificationSettings = { alert: Record<surveyId, boolean>, unsubscribedOrganizationIds: string[] }
- 서버: `libs/server/notification/` (NotificationModule, NotificationService, NotificationEmailService)
- 클라이언트: `libs/client/notification/` (페이지, 토글 컴포넌트, 훅)
- Pipeline 인증: CronSecretGuard (x-cron-secret 헤더, crypto.timingSafeEqual)
- 이메일 발송: Promise.allSettled 병렬, 개별 실패 격리, locale별 템플릿
- 자동 구독: SurveyService.create() 후 NotificationService.autoSubscribeOnSurveyCreation() fire-and-forget
- 구독 해제: 이메일 Unsubscribe 링크 -> 알림 설정 페이지 ?surveyId=xxx&unsubscribe=true -> alert[surveyId]=false
- 낙관적 업데이트: 클라이언트 토글 시 UI 즉시 반영, API 실패 시 롤백
- 환경변수: CRON_SECRET
- 페이지 라우트: /[lng]/settings/notifications
- 선행: FS-006(Project/Env), FS-008(Survey), FS-021(Response), FS-022(Pipeline), FS-004(Membership)
- 구현 순서: 8단계(응답 처리/자동화/분석)의 5번째 모듈
