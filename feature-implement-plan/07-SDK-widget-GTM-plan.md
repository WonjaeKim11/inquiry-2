# 기능 구현 계획: SDK, 위젯 & GTM 통합 (FS-007)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

본 명세서(FS-007)는 Inquiry JS SDK의 전체 클라이언트 사이드 런타임을 정의한다. 구현 순서상 7단계("배포/노출 채널")의 첫 번째 항목이며, 3단계(FS-024 REST API) Client API 위에 구축되는 **독립 NPM 패키지**이다.

**핵심 기능 10개:**

| 기능 ID | 기능명 | 우선순위 | 의존 대상 |
|---------|--------|---------|----------|
| FN-07-01 | SDK 초기화 및 구성 | 필수 | Client API(FS-024), Environment/Project 모델(FS-006) |
| FN-07-02 | 위젯 배치 및 표시 | 필수 | FN-07-01, FN-07-05 |
| FN-07-03 | 외부 클릭 닫기 | 필수 | FN-07-02 |
| FN-07-04 | 설문별 프로젝트 설정 오버라이드 | 필수 | FN-07-01, Survey 모델(FS-008) |
| FN-07-05 | 위젯 렌더링 | 필수 | FN-07-01, FN-07-02, FN-07-04 |
| FN-07-06 | No-Code Action 감지 | 필수 | FN-07-01, ActionClass 모델(FS-006) |
| FN-07-07 | GTM 통합 | 필수 | FN-07-01 (SDK 초기화의 대체 진입점) |
| FN-07-08 | 에러 상태 관리 | 필수 | FN-07-01 |
| FN-07-09 | 정리 처리 (tearDown/로그아웃) | 필수 | FN-07-08, FN-07-10 |
| FN-07-10 | 설문 닫기 | 필수 | FN-07-02, FN-07-05 |

### 1.2 비기능 요구사항

| 분류 | 요구사항 | 현재 상태 |
|------|---------|----------|
| 성능 | 설문 로딩 2초 이내, UMD+ESM 번들, CDN 제공 | 미구현 (SDK 자체가 없음) |
| 보안 | CSP nonce 지원, Shadow DOM 스타일 격리, reCAPTCHA 스팸 방지 | 미구현 |
| 가용성 | 에러 상태 10분 후 자동 재시도, 디버그 모드 즉시 재시도 | 미구현 |
| SPA 지원 | history.pushState/replaceState 래핑으로 라우팅 변경 감지 | 미구현 |
| 동시 실행 방지 | 설문 실행 중 플래그로 한 번에 하나의 설문만 표시 | 미구현 |
| 캐싱 | LocalStorage `formbricks-js` 키 기반, 만료 시각 관리 | 미구현 |
| 번들 크기 | 설문 패키지는 외부 스크립트로 동적 로드 (코드 스플리팅) | 미구현 |

### 1.3 명세서 내 모호한 부분 및 해석

| 번호 | 모호한 부분 | 제안 해석 |
|------|-----------|----------|
| 1 | SDK의 빌드 타겟과 번들러가 명시되지 않음 (UMD+ESM만 언급) | **Rollup** (또는 tsup)을 사용하여 UMD/ESM 이중 빌드. Rollup은 라이브러리 번들링에 최적화되어 있으며 tree-shaking이 우수하다. 프로젝트의 Nx 워크스페이스 내에서 `packages/sdk` 패키지로 관리한다 |
| 2 | "설문 패키지"(surveys package)가 SDK 코어와 별개 번들인지 불명확. "설문 스크립트를 동적으로 삽입하여 로드"라고 언급 | SDK를 2단계로 분리한다: (1) `@inquiry/js-sdk` - 초기화/상태 관리/Action 감지, (2) `@inquiry/surveys` - 설문 UI 렌더링. SDK 코어가 Surveys 패키지를 동적 `<script>` 삽입으로 로드하여 초기 번들 크기를 최소화한다 |
| 3 | "증분 동기화"(Incremental Sync)의 구체적 프로토콜 미정의. "변경된 데이터만 조회"가 delta인지 timestamp 기반인지 불명확 | 서버가 Environment State에 `expiresAt`을 포함하므로, 만료 전에는 캐시를 그대로 사용하고 만료 시 전체 재조회하는 방식으로 해석. 진정한 delta sync는 향후 개선 사항으로 분류한다 |
| 4 | LocalStorage Legacy 포맷(환경 상태/개인 상태)의 구체적 키 이름과 구조 미정의 | 초기 구현에서는 Legacy 마이그레이션을 스텁으로 구현하고, 실제 레거시 데이터가 존재하는 시점(운영 환경 이후)에 구체화한다. 신규 프로젝트이므로 레거시 데이터가 없을 것으로 가정한다 |
| 5 | 설문 필터링 조건이 명세서에 구체적으로 나열되지 않음 (FS-019 타겟팅/트리거에 위임된 것으로 추정) | SDK 내에서 기본 필터링만 구현한다: 상태가 `inProgress`인 설문, 표시 이력/응답 이력 기반 중복 방지, recontactDays 준수. 세그먼트/타겟팅 기반 고급 필터는 FS-019에서 확장한다 |
| 6 | Shadow DOM 내부에서 설문 UI를 렌더링할 때 React 사용 여부 미정의 | Surveys 패키지는 **Preact** 또는 **경량 React** 번들을 사용하여 Shadow DOM 내에서 독립적으로 렌더링한다. 호스트 앱의 React와 충돌을 방지한다. 단, 초기 구현에서는 Vanilla JS/DOM 기반으로 시작하고 향후 Preact로 전환할 수 있다 |
| 7 | reCAPTCHA 사이트 키가 Environment State에 포함되나, reCAPTCHA 검증 흐름의 상세가 FS-007에 없음 | SDK는 reCAPTCHA 스크립트 로딩과 토큰 획득만 담당하고, 검증은 서버(FS-020 스팸 방지)에서 처리한다. SDK에서는 `grecaptcha.execute()`로 토큰을 획득하여 응답 제출 시 포함시킨다 |
| 8 | `formbricks-js` LocalStorage 키 사용 - "Inquiry" 브랜드와의 불일치 | 기능 명세서 제약사항에 `formbricks-js`가 고정 값으로 명시되어 있으므로 그대로 사용한다. 하위 호환성을 위한 의도적 결정으로 해석한다 |

### 1.4 암묵적 요구사항

| 번호 | 암묵적 요구사항 | 도출 근거 |
|------|--------------|----------|
| 1 | **NPM 패키지 빌드 파이프라인** | SDK는 외부 웹 앱에 삽입되는 독립 패키지이므로, UMD+ESM 빌드, 소스맵, 타입 정의 파일 생성 파이프라인이 필요하다 |
| 2 | **CDN 호스팅 전략** | SDK 스크립트를 외부에서 `<script>` 태그로 로드하려면 CDN 또는 정적 호스팅 경로가 필요하다. 초기에는 서버의 정적 파일 서빙으로 대체 가능 |
| 3 | **Client API 엔드포인트 구현** | SDK가 호출하는 4개 서버 API (`/environment`, `/user`, `/displays`, `/responses`)가 FS-024에서 정의되었으나 아직 미구현 상태일 수 있다. SDK와 병행하여 최소한의 Client API 스텁을 구현해야 한다 |
| 4 | **타입 정의 공유 패키지** | EnvironmentState, UserState, Survey, ActionClass 등의 타입을 서버와 SDK 양쪽에서 공유해야 한다. `packages/shared-types`(기존 계획) 활용이 필요하다 |
| 5 | **설문 UI 컴포넌트 패키지** | SDK가 동적으로 로드하는 "설문 패키지"는 설문 폼 렌더링, 응답 수집, 스타일링을 담당하는 별도 패키지이다 |
| 6 | **테스트 환경 구성** | SDK는 브라우저 환경에서 동작하므로 jsdom 또는 Playwright 기반 테스트 환경이 필요하다 |
| 7 | **디버그 모드 진입 방법** | 명세에 디버그 모드 언급이 있으나 활성화 방법 미정의. URL 파라미터(`?inquiry_debug=true`) 또는 콘솔 API(`window.__inquiry_debug = true`)로 활성화하는 방식을 채택한다 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

SDK는 모노레포 내 독립 패키지로 관리하되, 빌드 산출물은 외부 웹 앱에서 사용되는 독립 번들이다.

```
packages/
├── js-sdk/                          # [신규] SDK 코어 패키지
│   ├── src/
│   │   ├── index.ts                 # 퍼블릭 API 엑스포트
│   │   ├── core/
│   │   │   ├── config.ts            # Singleton 설정 관리
│   │   │   ├── initialize.ts        # SDK 초기화 메인 로직
│   │   │   ├── api-client.ts        # Inquiry 서버 HTTP 클라이언트
│   │   │   └── logger.ts            # 로그 레벨 관리 (debug/info/warn/error)
│   │   ├── state/
│   │   │   ├── environment-state.ts # EnvironmentState 관리
│   │   │   ├── user-state.ts        # UserState 관리
│   │   │   ├── storage.ts           # LocalStorage 영속화 (formbricks-js)
│   │   │   └── migration.ts         # Legacy 포맷 마이그레이션
│   │   ├── actions/
│   │   │   ├── action-handler.ts    # Action 이벤트 디스패처
│   │   │   ├── page-url.ts          # Page URL 변경 감지
│   │   │   ├── click.ts             # Click 이벤트 감지
│   │   │   ├── exit-intent.ts       # Exit Intent 감지
│   │   │   ├── scroll.ts            # 50% Scroll 감지
│   │   │   └── no-code-matcher.ts   # URL 필터/선택자 매칭 엔진
│   │   ├── widget/
│   │   │   ├── widget-manager.ts    # 위젯 렌더링/닫기 관리
│   │   │   ├── container.ts         # DOM 컨테이너 생성/제거
│   │   │   ├── survey-renderer.ts   # 설문 패키지 로딩 및 렌더링 위임
│   │   │   └── placement.ts         # 배치/오버레이/모드 결정 로직
│   │   ├── survey/
│   │   │   ├── survey-filter.ts     # 설문 필터링 (표시 조건 평가)
│   │   │   └── override-resolver.ts # 설문별 프로젝트 설정 오버라이드 해석
│   │   ├── error/
│   │   │   ├── error-handler.ts     # 에러 상태 관리 (10분 쿨다운)
│   │   │   └── teardown.ts          # 정리 처리 (상태 리셋)
│   │   └── types/
│   │       ├── sdk-config.ts        # SDKConfig 타입
│   │       ├── environment.ts       # EnvironmentState, ProjectConfig 타입
│   │       ├── user.ts              # UserState 타입
│   │       ├── survey.ts            # Survey, SurveyOverride 타입
│   │       ├── action-class.ts      # ActionClass, URLFilter 타입
│   │       └── options.ts           # SDK 초기화 옵션 타입
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsup.config.ts               # UMD+ESM 이중 빌드 설정
│   └── __tests__/
│       ├── initialize.test.ts
│       ├── actions/
│       ├── widget/
│       └── state/
│
├── surveys/                         # [신규] 설문 UI 렌더링 패키지
│   ├── src/
│   │   ├── index.ts                 # 퍼블릭 렌더링 함수 엑스포트
│   │   ├── render-survey.ts         # 설문 렌더링 메인 함수
│   │   ├── components/              # 설문 UI 컴포넌트 (Shadow DOM 내)
│   │   │   ├── survey-container.ts  # 최상위 컨테이너
│   │   │   ├── question-renderer.ts # 질문 유형별 렌더링
│   │   │   └── branding.ts          # Inquiry 브랜딩 표시
│   │   ├── styles/
│   │   │   ├── base.css             # 기본 스타일 (Shadow DOM 삽입용)
│   │   │   ├── overlay.css          # 오버레이 스타일 (none/light/dark)
│   │   │   └── placement.css        # 배치별 위치 스타일
│   │   └── types/
│   │       └── render-options.ts    # 렌더링 옵션 타입
│   ├── package.json
│   ├── tsup.config.ts               # UMD+ESM 빌드
│   └── __tests__/
│
├── shared-types/                    # [신규 또는 기존] 서버/클라이언트 공유 타입
│   └── src/
│       ├── sdk/
│       │   ├── environment-state.ts
│       │   ├── user-state.ts
│       │   ├── action-class.ts
│       │   └── project-config.ts
│       └── index.ts
```

**핵심 아키텍처 결정:**

1. **패키지 분리**: SDK 코어(`@inquiry/js-sdk`)와 설문 UI(`@inquiry/surveys`)를 분리하여 초기 로딩 크기를 최소화한다. SDK 코어는 ~15KB(gzip), 설문 패키지는 사용자 행동 트리거 시에만 동적 로드한다.

2. **빌드 도구 선택: tsup**: Rollup 기반의 TypeScript 번들러인 tsup을 사용한다. ESM/CJS/UMD 다중 포맷 출력, 타입 정의 자동 생성, tree-shaking을 지원하며 설정이 간단하다. 프로젝트에서 이미 swc를 사용하므로 호환성이 좋다.

3. **Shadow DOM 기반 스타일 격리**: 설문 위젯은 Shadow DOM 내에서 렌더링되어 호스트 페이지 CSS와 완전히 격리된다. 스타일은 CSS-in-JS가 아닌 정적 CSS를 Shadow DOM에 삽입하는 방식으로 CSP 호환성을 확보한다.

4. **Singleton 패턴**: SDK 설정은 모듈 스코프 변수로 Singleton 관리된다. `window.__inquiry_sdk`에 인스턴스를 노출하여 GTM 등 외부에서의 접근을 허용한다.

5. **호스트 앱 프레임워크 비의존**: SDK는 프레임워크 비의존(framework-agnostic) 순수 TypeScript로 구현하여 React, Vue, Angular 등 모든 환경에서 사용 가능하다.

### 2.2 데이터 모델

SDK는 서버의 DB 모델을 직접 사용하지 않지만, 서버 Client API에서 응답하는 데이터 구조를 TypeScript 타입으로 정의해야 한다. 이 타입들은 `packages/shared-types` 또는 SDK 내 `types/` 디렉토리에 정의한다.

**SDKConfig (LocalStorage `formbricks-js` 키에 저장):**

```typescript
interface SDKConfig {
  environmentId: string;
  appUrl: string;
  environmentState: EnvironmentState;
  userState: UserState;
  filteredSurveys: Survey[];
  status: 'success' | { type: 'error'; expiresAt: number }; // Date는 timestamp로 직렬화
}
```

**EnvironmentState:**

```typescript
interface EnvironmentState {
  expiresAt: number; // Unix timestamp (ms)
  surveys: Survey[];
  actionClasses: ActionClass[];
  project: ProjectConfig;
  recaptchaSiteKey: string | null;
}
```

**ProjectConfig:**

```typescript
interface ProjectConfig {
  id: string;
  recontactDays: number;
  clickOutsideClose: boolean;
  overlay: 'none' | 'light' | 'dark';
  placement: Placement;
  inAppSurveyBranding: boolean;
  styling: Record<string, unknown>;
}

type Placement = 'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight' | 'center';
type Overlay = 'none' | 'light' | 'dark';
```

**UserState:**

```typescript
interface UserState {
  expiresAt: number | null;
  userId: string | null;
  contactId: string | null;
  segments: string[];
  displays: Array<{ surveyId: string; createdAt: number }>;
  responses: string[];
  lastDisplayAt: number | null;
  language: string | undefined;
}
```

**ActionClass:**

```typescript
interface ActionClass {
  id: string;
  type: 'pageUrl' | 'click' | 'exitIntent' | 'fiftyPercentScroll';
  key?: string;
  noCodeConfig?: NoCodeConfig;
}

interface NoCodeConfig {
  type: ActionClass['type'];
  urlFilters?: URLFilter[];
  connector?: 'or' | 'and';
  cssSelector?: string;
  innerHtml?: string;
}

interface URLFilter {
  value: string;
  rule: 'exactMatch' | 'contains' | 'startsWith' | 'endsWith' | 'notMatch' | 'notContains';
}
```

**SurveyOverride:**

```typescript
interface SurveyOverride {
  brandColor?: string;          // HEX Color (#RRGGBB)
  highlightBorderColor?: string; // HEX Color
  placement?: Placement;
  clickOutsideClose?: boolean;
  overlay?: Overlay;
}
```

**Prisma 스키마 변경: 없음.** FS-007은 순수 클라이언트 사이드 SDK이므로 DB 스키마 변경이 필요하지 않다. 서버 API(Client API)는 FS-024에서 이미 정의되어 있다.

### 2.3 API 설계

SDK가 호출하는 서버 API (FS-024 Client API에서 정의, SDK 관점에서의 인터페이스 명세):

| API | Method | Path | 설명 | 인증 |
|-----|--------|------|------|------|
| 환경 상태 조회 | GET | `/api/v1/client/{environmentId}/environment` | EnvironmentState 반환 | 인증 불필요 |
| 사용자 상태 업데이트 | POST | `/api/v1/client/{environmentId}/user` | UserState 업데이트/생성 | 인증 불필요 |
| 설문 표시 기록 | POST | `/api/v1/client/{environmentId}/displays` | Display 레코드 생성 | 인증 불필요 |
| 설문 응답 기록 | POST | `/api/v1/client/{environmentId}/responses` | Response 레코드 생성/업데이트 | 인증 불필요 |

**SDK 퍼블릭 API (호스트 앱에서 호출):**

```typescript
// 기본 초기화
inquiry.init({
  environmentId: string;
  appUrl: string;
});

// 식별된 사용자 초기화
inquiry.init({
  environmentId: string;
  appUrl: string;
  userId: string;
  attributes?: Record<string, string>;
});

// 사용자 식별 (초기화 후)
inquiry.setUserId(userId: string): void;

// 사용자 속성 설정
inquiry.setAttributes(attributes: Record<string, string>): void;

// 수동 Action 트리거
inquiry.track(actionName: string): void;

// 로그아웃/정리
inquiry.logout(): void;

// SDK 리셋
inquiry.reset(): void;
```

### 2.4 주요 컴포넌트 설계

#### 2.4.1 Singleton Config Manager (`core/config.ts`)

```typescript
// 모듈 스코프 Singleton
let sdkConfig: SDKConfig | null = null;
let isInitialized = false;
let isSurveyRunning = false;

export function getConfig(): SDKConfig | null { return sdkConfig; }
export function setConfig(config: SDKConfig): void { sdkConfig = config; persistToStorage(config); }
export function isReady(): boolean { return isInitialized; }
export function setSurveyRunning(running: boolean): void { isSurveyRunning = running; }
export function isSurveyActive(): boolean { return isSurveyRunning; }
```

#### 2.4.2 초기화 흐름 (`core/initialize.ts`)

```
init(options)
  |
  +-> 디버그 모드 확인 -> logger 설정
  |
  +-> Legacy 마이그레이션 확인
  |
  +-> 이미 초기화 상태? -> 스킵
  |
  +-> 에러 상태 확인 -> 만료 여부 / 디버그 모드
  |
  +-> 필수 필드 검증 (environmentId, appUrl)
  |
  +-> LocalStorage에서 캐시 로드 -> 만료 여부 확인
  |     |
  |     +-> 유효한 캐시: 캐시 사용 (증분 동기화 스킵)
  |     +-> 만료/없음: 서버에서 전체 조회
  |
  +-> GET /environment -> EnvironmentState
  |
  +-> userId 존재? -> POST /user -> UserState
  |
  +-> 설문 필터링 실행
  |
  +-> No-Code Action 리스너 등록
  |
  +-> 초기화 완료 플래그 = true
  |
  +-> LocalStorage에 저장
```

#### 2.4.3 No-Code Action 감지 시스템 (`actions/`)

4가지 이벤트 감지기를 독립 모듈로 구현:

- **PageURL**: `hashchange`, `popstate`, custom `pushstate`/`replacestate`, `load` 이벤트 리스너. `history.pushState`와 `history.replaceState`를 Proxy 패턴으로 래핑하여 SPA 라우팅 변경을 감지한다.
- **Click**: `document` 레벨 `click` 이벤트. `event.target`에서 CSS 선택자와 innerHTML을 추출하여 ActionClass 정의와 매칭한다.
- **Exit Intent**: `document.body`의 `mouseleave` 이벤트. `event.clientY <= 0`으로 상단 이탈을 감지하고, 추가 URL 필터를 검증한다.
- **50% Scroll**: `window`의 `scroll` 이벤트. `(scrollTop / (scrollHeight - clientHeight)) >= 0.5`로 판정하며, 스크롤 위치가 0으로 돌아가기 전까지 재트리거를 차단한다.

#### 2.4.4 URL 필터 매칭 엔진 (`actions/no-code-matcher.ts`)

```typescript
function matchUrlFilter(currentUrl: string, filter: URLFilter): boolean {
  switch (filter.rule) {
    case 'exactMatch': return currentUrl === filter.value;
    case 'contains': return currentUrl.includes(filter.value);
    case 'startsWith': return currentUrl.startsWith(filter.value);
    case 'endsWith': return currentUrl.endsWith(filter.value);
    case 'notMatch': return currentUrl !== filter.value;
    case 'notContains': return !currentUrl.includes(filter.value);
  }
}

function matchUrlFilters(currentUrl: string, filters: URLFilter[], connector: 'or' | 'and'): boolean {
  if (connector === 'or') return filters.some(f => matchUrlFilter(currentUrl, f));
  return filters.every(f => matchUrlFilter(currentUrl, f));
}
```

#### 2.4.5 위젯 렌더링 시스템 (`widget/`)

```
설문 트리거
  |
  +-> isSurveyActive()? -> true이면 차단
  |
  +-> 표시 확률 검증 (Math.random() < displayPercentage / 100)
  |
  +-> Hidden Fields 값 처리
  |
  +-> 다국어 언어 코드 결정
  |
  +-> 딜레이 적용 (delay > 0 ? setTimeout)
  |
  +-> 설문 패키지 로드 (동적 <script> 삽입, 캐시 확인)
  |
  +-> 오버라이드 설정 해석 (survey override > project default)
  |
  +-> Shadow DOM 컨테이너 생성
  |
  +-> renderSurvey() 호출 (콜백: onDisplay, onResponse, onClose)
  |
  +-> setSurveyRunning(true)
```

#### 2.4.6 Shadow DOM 컨테이너 (`widget/container.ts`)

```typescript
function createWidgetContainer(nonce?: string): ShadowRoot {
  // 기존 컨테이너 제거
  const existing = document.getElementById('formbricks-modal-container');
  if (existing) existing.remove();

  // 새 컨테이너 생성
  const container = document.createElement('div');
  container.id = 'formbricks-modal-container';
  document.body.appendChild(container);

  // Shadow DOM 생성
  const shadow = container.attachShadow({ mode: 'open' });

  // 스타일 삽입 (CSP nonce 적용)
  const style = document.createElement('style');
  if (nonce) style.nonce = nonce;
  style.textContent = getWidgetStyles();
  shadow.appendChild(style);

  return shadow;
}
```

### 2.5 기존 시스템에 대한 영향 분석

| 영향 대상 | 영향 내용 | 영향 수준 |
|----------|---------|----------|
| `pnpm-workspace.yaml` | `packages/js-sdk`, `packages/surveys` 워크스페이스 추가 | 낮음 |
| `packages/shared-types/` | SDK와 서버 공유 타입 패키지 생성 (이미 다른 계획서에서 예정) | 낮음 (신규 생성) |
| FS-024 Client API | SDK가 호출하는 4개 엔드포인트의 구현이 선행되어야 함 | 높음 (선행 의존) |
| FS-006 Environment/Project | Environment, Project, ActionClass 모델이 필요 | 높음 (선행 의존) |
| FS-008 Survey 모델 | 설문 데이터 구조(blocks, welcomeCard, endings 등)가 정의되어야 함 | 높음 (선행 의존) |
| `apps/server/` | CDN 역할의 정적 파일 서빙 경로 추가 가능 (`/sdk/v1/inquiry.umd.js`) | 낮음 |
| `apps/client/` | 관리 대시보드에 SDK 설치 가이드 페이지 추가 (향후) | 낮음 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존 | 복잡도 | 예상 시간 |
|-----|--------|------|------|--------|----------|
| T-01 | 패키지 스캐폴딩 (`packages/js-sdk`) | pnpm workspace, tsconfig, tsup 빌드 설정, package.json 생성 | 없음 | 낮음 | 2h |
| T-02 | 패키지 스캐폴딩 (`packages/surveys`) | 설문 UI 렌더링 패키지 초기 구조 | 없음 | 낮음 | 2h |
| T-03 | 공유 타입 정의 (`packages/shared-types/src/sdk/`) | EnvironmentState, UserState, ActionClass, ProjectConfig, Survey, SurveyOverride 타입 | 없음 | 중간 | 3h |
| T-04 | Logger 모듈 | 로그 레벨 관리 (debug/info/warn/error), 디버그 모드 감지 | T-01 | 낮음 | 1h |
| T-05 | LocalStorage 영속화 모듈 | `formbricks-js` 키로 읽기/쓰기/삭제, JSON 직렬화/역직렬화, 접근 불가 시 메모리 폴백 | T-01, T-03 | 중간 | 2h |
| T-06 | Legacy 마이그레이션 스텁 | 레거시 포맷 감지 및 신규 포맷 변환 (초기에는 스텁) | T-05 | 낮음 | 1h |
| T-07 | Singleton Config Manager | SDK 설정 Singleton, 초기화 플래그, 설문 실행 플래그 관리 | T-03, T-05 | 중간 | 2h |
| T-08 | API Client | Inquiry 서버 HTTP 통신 (fetch 기반), 에러 핸들링, 타임아웃 | T-03 | 중간 | 3h |
| T-09 | 에러 상태 관리 | 에러 상태 전환, 10분 쿨다운, 디버그 모드 바이패스, LocalStorage 저장 | T-07, T-04 | 중간 | 2h |
| T-10 | SDK 초기화 메인 로직 | init() 함수 - 검증, 캐시 로드, 서버 조회, 설정 구성, 리스너 등록 | T-04~T-09 | 높음 | 5h |
| T-11 | 설문 필터링 엔진 | 상태(inProgress) 필터, 표시 이력/응답 이력 중복 방지, recontactDays 체크 | T-07, T-03 | 중간 | 3h |
| T-12 | URL 필터 매칭 엔진 | 6종 규칙(exactMatch/contains/startsWith/endsWith/notMatch/notContains), or/and 커넥터 | T-03 | 중간 | 2h |
| T-13 | Page URL Action 감지 | hashchange, popstate, pushstate, replacestate, load 이벤트 리스너, history API 래핑 | T-12 | 높음 | 4h |
| T-14 | Click Action 감지 | document 레벨 click 리스너, CSS 선택자/innerHTML 매칭 | T-12 | 중간 | 2h |
| T-15 | Exit Intent Action 감지 | body mouseleave 리스너, Y좌표 검증, URL 필터 추가 검증 | T-12 | 중간 | 2h |
| T-16 | 50% Scroll Action 감지 | window scroll 리스너, 스크롤 비율 계산, 재트리거 차단 로직 | T-12 | 중간 | 2h |
| T-17 | Action 이벤트 디스패처 | 4가지 감지기 통합, ActionClass 조건 매칭 -> 설문 트리거 연결 | T-13~T-16, T-11 | 높음 | 3h |
| T-18 | 오버라이드 설정 해석기 | Survey Override > Project Default 우선순위 적용 (placement, overlay, clickOutsideClose, colors) | T-03 | 낮음 | 1h |
| T-19 | Shadow DOM 컨테이너 관리 | 컨테이너 생성/제거, Shadow DOM 생성, 스타일 삽입, CSP nonce | T-01 | 중간 | 3h |
| T-20 | 배치/오버레이/모드 결정 로직 | 5종 placement, 3종 overlay, modal/fullwidth 표시 모드 CSS 클래스 매핑 | T-19 | 중간 | 2h |
| T-21 | 설문 패키지 동적 로더 | script 태그 동적 삽입, 로드 완료 콜백, 에러 처리, 캐시 체크 | T-19 | 중간 | 3h |
| T-22 | 위젯 렌더링 메인 로직 | 표시 확률, Hidden Fields, 다국어 매칭, 딜레이, 렌더링 호출, 콜백 연결 | T-17~T-21 | 높음 | 5h |
| T-23 | 외부 클릭 닫기 | overlay/빈 영역 클릭 감지, clickOutsideClose 설정 확인 후 설문 닫기 | T-22 | 낮음 | 1h |
| T-24 | 설문 닫기 처리 | DOM 컨테이너 제거, 필터 재계산, 실행 플래그 리셋 | T-22, T-11 | 낮음 | 1h |
| T-25 | 정리 처리 (tearDown/logout) | UserState 리셋, 필터 재계산, 활성 설문 닫기 | T-24, T-07 | 낮음 | 1h |
| T-26 | 퍼블릭 API 엑스포트 | init(), setUserId(), setAttributes(), track(), logout(), reset() | T-10, T-22, T-25 | 중간 | 2h |
| T-27 | GTM 통합 지원 | window 글로벌 변수 노출, UMD 빌드에서의 namespace 설정, GTM 태그 템플릿 문서화 | T-26 | 낮음 | 2h |
| T-28 | Surveys 패키지 - 기본 렌더링 | Shadow DOM 내에서 설문 폼 렌더링 (Welcome Card, 질문, Ending), 스타일 적용 | T-02, T-19 | 높음 | 8h |
| T-29 | Surveys 패키지 - 콜백 연결 | onDisplay (서버 표시 기록), onResponse (서버 응답 기록), onClose (설문 닫기) | T-28, T-08 | 중간 | 3h |
| T-30 | 단위 테스트 - 코어 | Config, Storage, Migration, ErrorHandler, SurveyFilter 테스트 | T-07~T-11 | 중간 | 4h |
| T-31 | 단위 테스트 - 액션 감지 | URLMatcher, PageURL, Click, ExitIntent, Scroll 각 모듈 테스트 | T-12~T-17 | 중간 | 4h |
| T-32 | 단위 테스트 - 위젯 | Container, OverrideResolver, Placement, WidgetManager 테스트 | T-18~T-24 | 중간 | 4h |
| T-33 | 통합 테스트 - 초기화 E2E | init() -> 서버 조회 -> 상태 저장 -> 리스너 등록 전체 흐름 (jsdom) | T-26 | 높음 | 4h |
| T-34 | 통합 테스트 - 트리거 E2E | Action 감지 -> 설문 필터 -> 위젯 렌더링 전체 흐름 (jsdom) | T-26 | 높음 | 4h |
| T-35 | 빌드/배포 파이프라인 | tsup 빌드, Nx 타겟 설정, CDN 배포 스크립트 (초기에는 정적 서빙) | T-01, T-02 | 중간 | 3h |

### 3.2 구현 순서 및 마일스톤

#### 마일스톤 1: 패키지 기반 구축 (T-01~T-03, T-35)
**목표**: SDK 패키지 스캐폴딩 완료, 빌드 파이프라인 동작 확인
**검증**: `pnpm build`로 빈 UMD/ESM 번들 생성 확인
**예상 소요**: 1일

#### 마일스톤 2: SDK 코어 - 상태 관리 (T-04~T-09)
**목표**: Logger, Storage, Config, ErrorHandler 등 핵심 인프라 완성
**검증**: 단위 테스트로 LocalStorage 읽기/쓰기, 에러 상태 쿨다운 검증
**예상 소요**: 2일

#### 마일스톤 3: SDK 초기화 (T-10~T-11)
**목표**: `inquiry.init()` 호출 시 서버에서 상태를 조회하고 LocalStorage에 저장하는 전체 흐름 동작
**검증**: Mock 서버를 사용한 초기화 흐름 테스트, 설문 필터링 결과 확인
**예상 소요**: 1.5일

#### 마일스톤 4: No-Code Action 감지 (T-12~T-17)
**목표**: 4가지 이벤트 유형의 감지 및 ActionClass 매칭 동작
**검증**: jsdom에서 이벤트 시뮬레이션으로 각 Action 유형별 트리거 확인
**예상 소요**: 2일

#### 마일스톤 5: 위젯 시스템 (T-18~T-25)
**목표**: 설문 트리거 시 Shadow DOM 컨테이너에 위젯 렌더링, 배치/오버레이 적용, 외부 클릭 닫기, 설문 닫기 동작
**검증**: DOM에 위젯 컨테이너가 올바르게 생성/제거되는지 확인, 배치별 CSS 검증
**예상 소요**: 2.5일

#### 마일스톤 6: 퍼블릭 API 및 GTM (T-26~T-27)
**목표**: 외부에서 호출 가능한 `inquiry.init()`, `inquiry.track()`, `inquiry.logout()` 등 퍼블릭 API 완성, GTM Custom HTML 태그 지원
**검증**: UMD 번들을 HTML 페이지에 삽입하여 `window.inquiry.init()` 호출 동작 확인
**예상 소요**: 1일

#### 마일스톤 7: 설문 UI 패키지 (T-28~T-29)
**목표**: Shadow DOM 내에서 기본 설문 렌더링 동작, 서버 콜백(Display/Response) 연결
**검증**: 설문 표시 -> 응답 입력 -> 제출 -> 닫기 전체 흐름 동작
**예상 소요**: 2일

#### 마일스톤 8: 테스트 완성 (T-30~T-34)
**목표**: 단위/통합 테스트 커버리지 확보
**검증**: 전체 테스트 스위트 통과, 주요 시나리오 커버리지 80% 이상
**예상 소요**: 3일

**총 예상 소요: 약 15일 (3주)**

### 3.3 파일 변경 계획

| 파일 경로 | 변경 유형 | 변경 내용 요약 |
|----------|---------|--------------|
| `pnpm-workspace.yaml` | 수정 | `packages/*` 항목이 이미 있으므로 추가 불필요 (확인만) |
| `packages/js-sdk/package.json` | 생성 | `@inquiry/js-sdk` 패키지 정의, tsup 의존성 |
| `packages/js-sdk/tsconfig.json` | 생성 | TypeScript 설정 (target: ES2020, module: ESNext) |
| `packages/js-sdk/tsup.config.ts` | 생성 | UMD+ESM 이중 빌드, 소스맵, 타입 생성 설정 |
| `packages/js-sdk/src/index.ts` | 생성 | 퍼블릭 API 엑스포트 (init, track, logout, reset 등) |
| `packages/js-sdk/src/core/config.ts` | 생성 | Singleton 설정 관리 |
| `packages/js-sdk/src/core/initialize.ts` | 생성 | SDK 초기화 메인 로직 |
| `packages/js-sdk/src/core/api-client.ts` | 생성 | HTTP 클라이언트 (fetch 래퍼) |
| `packages/js-sdk/src/core/logger.ts` | 생성 | 로그 레벨 관리 |
| `packages/js-sdk/src/state/environment-state.ts` | 생성 | EnvironmentState 관리 |
| `packages/js-sdk/src/state/user-state.ts` | 생성 | UserState 관리 |
| `packages/js-sdk/src/state/storage.ts` | 생성 | LocalStorage 영속화 |
| `packages/js-sdk/src/state/migration.ts` | 생성 | Legacy 포맷 마이그레이션 |
| `packages/js-sdk/src/actions/action-handler.ts` | 생성 | Action 이벤트 디스패처 |
| `packages/js-sdk/src/actions/page-url.ts` | 생성 | Page URL 감지 (history 래핑) |
| `packages/js-sdk/src/actions/click.ts` | 생성 | Click 이벤트 감지 |
| `packages/js-sdk/src/actions/exit-intent.ts` | 생성 | Exit Intent 감지 |
| `packages/js-sdk/src/actions/scroll.ts` | 생성 | 50% Scroll 감지 |
| `packages/js-sdk/src/actions/no-code-matcher.ts` | 생성 | URL 필터/선택자 매칭 엔진 |
| `packages/js-sdk/src/widget/widget-manager.ts` | 생성 | 위젯 렌더링/닫기 관리 |
| `packages/js-sdk/src/widget/container.ts` | 생성 | Shadow DOM 컨테이너 |
| `packages/js-sdk/src/widget/survey-renderer.ts` | 생성 | 설문 패키지 동적 로딩/렌더링 |
| `packages/js-sdk/src/widget/placement.ts` | 생성 | 배치/오버레이/모드 결정 |
| `packages/js-sdk/src/survey/survey-filter.ts` | 생성 | 설문 필터링 엔진 |
| `packages/js-sdk/src/survey/override-resolver.ts` | 생성 | 오버라이드 설정 해석 |
| `packages/js-sdk/src/error/error-handler.ts` | 생성 | 에러 상태 관리 |
| `packages/js-sdk/src/error/teardown.ts` | 생성 | 정리 처리 |
| `packages/js-sdk/src/types/sdk-config.ts` | 생성 | SDKConfig 타입 |
| `packages/js-sdk/src/types/environment.ts` | 생성 | EnvironmentState, ProjectConfig 타입 |
| `packages/js-sdk/src/types/user.ts` | 생성 | UserState 타입 |
| `packages/js-sdk/src/types/survey.ts` | 생성 | Survey, SurveyOverride 타입 |
| `packages/js-sdk/src/types/action-class.ts` | 생성 | ActionClass, URLFilter 타입 |
| `packages/js-sdk/src/types/options.ts` | 생성 | SDK 초기화 옵션 타입 |
| `packages/surveys/package.json` | 생성 | `@inquiry/surveys` 패키지 정의 |
| `packages/surveys/tsconfig.json` | 생성 | TypeScript 설정 |
| `packages/surveys/tsup.config.ts` | 생성 | UMD+ESM 빌드 설정 |
| `packages/surveys/src/index.ts` | 생성 | renderSurvey 함수 엑스포트 |
| `packages/surveys/src/render-survey.ts` | 생성 | 설문 렌더링 메인 함수 |
| `packages/surveys/src/components/survey-container.ts` | 생성 | 설문 UI 컨테이너 |
| `packages/surveys/src/components/question-renderer.ts` | 생성 | 질문 유형별 렌더링 |
| `packages/surveys/src/components/branding.ts` | 생성 | 브랜딩 표시 |
| `packages/surveys/src/styles/base.css` | 생성 | 기본 스타일 |
| `packages/surveys/src/styles/overlay.css` | 생성 | 오버레이 스타일 (none/light/dark) |
| `packages/surveys/src/styles/placement.css` | 생성 | 배치별 위치 스타일 |
| `packages/surveys/src/types/render-options.ts` | 생성 | 렌더링 옵션 타입 |
| `tsconfig.base.json` | 수정 | `paths`에 `@inquiry/js-sdk`, `@inquiry/surveys` 별칭 추가 (필요 시) |
| `packages/js-sdk/__tests__/` | 생성 | 코어/액션/위젯 단위 테스트 파일들 |
| `packages/surveys/__tests__/` | 생성 | 설문 렌더링 테스트 파일들 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 발생 확률 | 완화 전략 |
|--------|------|----------|----------|
| **선행 의존(FS-024 Client API)이 미구현 상태** | SDK가 호출할 서버 엔드포인트가 없어 통합 테스트 불가 | 높음 | Mock Server를 사용한 개발/테스트 환경 구축. `packages/js-sdk/__mocks__/api-client.ts`에 Mock 응답 정의. Client API 구현 완료 시 통합 전환 |
| **선행 의존(FS-006, FS-008 모델)이 미구현 상태** | EnvironmentState, Survey 등의 실제 데이터 구조가 확정되지 않을 수 있음 | 높음 | 타입 인터페이스를 먼저 정의하고, 실제 모델 확정 시 타입만 업데이트. SDK는 서버 응답을 그대로 소비하므로 인터페이스만 일치하면 문제 없음 |
| **history.pushState 래핑이 다른 라이브러리와 충돌** | React Router, Vue Router 등이 동일한 래핑을 사용할 경우 무한 루프 또는 이벤트 누락 | 중간 | `__inquiry_patched` 플래그로 이중 래핑 방지. 래핑 전 원본 함수를 보존하여 teardown 시 복원. 충돌 감지 로깅 추가 |
| **Shadow DOM 호환성 문제** | 일부 구형 브라우저에서 Shadow DOM 미지원 | 낮음 | Shadow DOM 미지원 시 일반 `<div>` 컨테이너로 폴백. CSS 격리는 고유 class prefix로 최소 보장 |
| **번들 크기 초과** | SDK 코어 + 의존성이 예상보다 커질 수 있음 | 중간 | 외부 의존성 최소화 (fetch, DOM API만 사용). tree-shaking 확인. 번들 크기 모니터링 (target: gzipped 15KB 이하) |
| **LocalStorage 용량 제한** | 환경에 수십 개 설문이 있을 경우 5MB 제한에 도달 가능 | 낮음 | 필요한 필드만 저장 (설문 데이터 중 렌더링에 필요한 최소 데이터만). 용량 초과 시 메모리 전용 모드로 폴백 |
| **CSP(Content Security Policy) 제한** | 호스트 앱의 CSP가 인라인 스크립트/스타일을 차단 | 중간 | nonce 기반 스크립트/스타일 삽입 지원. SDK 초기화 시 nonce 옵션을 받아 모든 동적 삽입 요소에 적용 |
| **GTM 태그 실행 타이밍** | GTM 태그가 늦게 실행되어 초기 페이지 로드 시의 No-Code Action을 놓침 | 중간 | 초기화 완료 후 현재 URL에 대해 즉시 Page URL Action 검사 수행. 놓친 이벤트는 SDK 특성상 불가피함을 문서화 |

---

## 5. 테스트 전략

### 5.1 단위 테스트

테스트 프레임워크: **Vitest** (TypeScript 기반, ESM 네이티브 지원, jsdom 환경 내장)

| 테스트 대상 | 테스트 케이스 | 우선순위 |
|-----------|------------|---------|
| `storage.ts` | LocalStorage 읽기/쓰기/삭제, JSON 직렬화/역직렬화, 접근 불가 시 메모리 폴백 | 높음 |
| `config.ts` | Singleton 생성/업데이트, 초기화 플래그, 설문 실행 플래그 | 높음 |
| `error-handler.ts` | 에러 상태 전환, 10분 쿨다운 타이머, 디버그 모드 바이패스 | 높음 |
| `no-code-matcher.ts` | 6종 URL 필터 규칙별 매칭, or/and 커넥터, CSS 선택자 매칭, innerHTML 매칭 | 높음 |
| `survey-filter.ts` | 상태 필터링, 표시 이력 중복 방지, 응답 이력 중복 방지, recontactDays | 높음 |
| `override-resolver.ts` | 오버라이드 존재 시 우선 적용, 없으면 기본값 사용, 부분 오버라이드 | 중간 |
| `placement.ts` | 5종 placement CSS 매핑, 3종 overlay 매핑, modal/fullwidth 모드 결정 | 중간 |
| `api-client.ts` | 성공 응답 파싱, 에러 응답 처리, 타임아웃, 네트워크 실패 | 중간 |
| `migration.ts` | Legacy 포맷 감지, 마이그레이션 변환 | 낮음 |

### 5.2 통합 테스트

| 테스트 시나리오 | 범위 | 검증 포인트 |
|--------------|------|-----------|
| **초기화 전체 흐름** | init() -> API Client -> Storage -> Config | 서버 조회 -> 상태 저장 -> 초기화 완료 플래그 확인 |
| **초기화 + 캐시 로드** | init() -> Storage (캐시 존재) | 유효한 캐시 사용 시 서버 요청 없이 초기화 완료 |
| **초기화 + 에러 복구** | init() -> 서버 실패 -> 에러 상태 -> 10분 후 재시도 | 에러 상태 진입/유지/만료 확인 |
| **Action 감지 -> 설문 트리거** | Page URL 변경 -> ActionClass 매칭 -> 설문 필터 -> 위젯 렌더링 | URL 변경 시 매칭된 설문이 렌더링되는지 확인 |
| **설문 렌더링 -> 닫기** | 위젯 생성 -> 외부 클릭 -> 설문 닫기 -> 플래그 리셋 | DOM 컨테이너 생성/제거, 실행 플래그 상태 변화 |
| **동시 실행 방지** | 설문 표시 중 -> 새 Action 트리거 | 새 설문 렌더링이 차단되는지 확인 |
| **GTM 통합** | window.inquiry.init() 호출 (UMD 빌드) | 글로벌 변수를 통한 초기화 동작 확인 |

### 5.3 E2E 테스트 (향후)

SDK의 E2E 테스트는 실제 브라우저 환경이 필요하므로, Playwright를 사용한다.

| 테스트 시나리오 | 설명 |
|--------------|------|
| SDK 스크립트 로드 + 초기화 | HTML 페이지에 SDK 스크립트를 삽입하고 `inquiry.init()` 호출 |
| Page URL 트리거 -> 설문 표시 | SPA 네비게이션 시뮬레이션 -> 설문 위젯 표시 확인 |
| Click 트리거 -> 설문 표시 | 특정 요소 클릭 -> 설문 위젯 표시 확인 |
| Exit Intent -> 설문 표시 | 마우스를 뷰포트 상단 밖으로 이동 -> 설문 위젯 표시 확인 |
| 50% Scroll -> 설문 표시 | 50% 스크롤 도달 -> 설문 위젯 표시 확인 |
| 설문 응답 제출 | 설문 표시 -> 응답 입력 -> 제출 -> 서버에 기록 확인 |
| GTM 태그 통합 | GTM Custom HTML 태그를 통한 SDK 초기화 및 설문 트리거 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 항목 | 설명 |
|------|------|
| 고정 식별자 | `formbricks-modal-container`(DOM ID), `formbricks-js`(LocalStorage), `formbricks-recaptcha-script`(reCAPTCHA) - 명세서 제약사항에 의해 고정 |
| 동시 설문 제한 | 한 번에 하나의 설문만 표시 가능 |
| LocalStorage 의존 | 영속화에 LocalStorage를 사용하므로, 비활성화된 환경에서는 페이지 새로고침 시 상태가 초기화됨 |
| 선행 의존성 | FS-024(Client API), FS-006(Environment/Project), FS-008(Survey) 구현이 선행되어야 통합 동작 가능. Mock 기반으로 병행 개발은 가능 |
| 설문 UI 완성도 | 초기 구현의 설문 UI(`packages/surveys`)는 최소 기능만 포함. 전체 질문 유형 렌더링은 FS-009 구현 이후 확장 |
| 설문 필터링 범위 | 초기 구현은 기본 필터링(상태, 표시/응답 이력, recontactDays)만 포함. 세그먼트/타겟팅 기반 고급 필터는 FS-019에서 확장 |
| 브라우저 호환성 | Shadow DOM, ES2020+를 요구하므로 IE11 미지원 |

### 6.2 향후 개선 가능 항목

| 항목 | 설명 |
|------|------|
| React/Vue/Angular Wrapper | 프레임워크별 래퍼 패키지 (`@inquiry/react`, `@inquiry/vue`) 제공으로 DX 향상 |
| 진정한 증분 동기화 | 서버에서 delta(변경분)만 내려받는 프로토콜 구현으로 초기화 시간 단축 |
| Service Worker 캐싱 | Service Worker를 활용한 오프라인 지원 및 SDK 스크립트 캐싱 |
| CDN 배포 자동화 | NPM publish 시 자동 CDN 배포 (unpkg, jsdelivr) |
| A/B 테스트 통합 | SDK 레벨에서 설문 A/B 테스트 지원 |
| Custom Events API | 호스트 앱에서 SDK 이벤트(설문 표시/닫기/응답 등)를 구독할 수 있는 이벤트 버스 |
| 설문 프리로드 | 높은 확률로 트리거될 설문을 미리 로드하여 표시 지연 시간 최소화 |
| Preact 마이그레이션 | Surveys 패키지를 Preact 기반으로 전환하여 풍부한 UI 및 작은 번들 크기 달성 |

---

## 7. i18n 고려사항

SDK 자체는 외부 웹 앱에 삽입되는 독립 패키지이므로, 프로젝트의 react-i18next 시스템과는 무관하다. 하지만 다음 항목에서 i18n이 관련된다:

| 항목 | 설명 |
|------|------|
| 설문 다국어 매칭 | SDK는 `UserState.language`와 설문의 언어 목록을 비교하여 적절한 언어 코드를 결정. 2개 이상 언어가 설정된 설문에서만 동작 |
| 관리 대시보드 SDK 설치 가이드 | 향후 관리 대시보드에 SDK 설치 가이드 페이지를 추가할 때 ko/en 번역 필요 |
| GTM 태그 문서 | GTM Custom HTML 태그 작성 가이드 - 기술 문서이므로 영문만으로 충분 |
| Surveys 패키지 UI 텍스트 | 설문 UI의 기본 텍스트(제출 버튼, 필수 표시 등)는 설문 데이터의 다국어 값을 사용. SDK 자체 하드코딩 문자열은 최소화 |

**SDK 설치 가이드 페이지 추가 시 필요한 번역 키 (향후 구현):**

```
sdk.install.title: "SDK 설치 가이드" / "SDK Installation Guide"
sdk.install.step1: "스크립트 추가" / "Add Script"
sdk.install.step2: "초기화 코드 삽입" / "Insert Initialization Code"
sdk.install.environmentId: "환경 ID" / "Environment ID"
sdk.install.appUrl: "앱 URL" / "App URL"
sdk.install.gtm.title: "GTM 통합" / "GTM Integration"
sdk.install.gtm.description: "Google Tag Manager를 통한 설문 배포" / "Survey deployment via Google Tag Manager"
```
