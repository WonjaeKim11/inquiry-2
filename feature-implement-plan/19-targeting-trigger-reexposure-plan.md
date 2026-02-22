# 기능 구현 계획: 타게팅, 트리거 및 재노출 (FS-019)

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 우선순위 | 설명 |
|---------|--------|---------|------|
| FN-019-01 | ActionClass 타입 정의 및 관리 | 필수 | code/noCode 2가지 타입의 ActionClass CRUD. 설문 에디터에서 트리거 연결 |
| FN-019-02 | NoCode 이벤트 구성 | 필수 | click/pageView/exitIntent/fiftyPercentScroll 4가지 NoCode 이벤트 유형 설정. URL 필터 7가지 규칙 |
| FN-019-03 | Click 이벤트 평가 | 필수 | SDK에서 클릭 이벤트 캡처, CSS selector + innerHTML + URL 필터 AND 결합 매칭 |
| FN-019-04 | 설문 트리거 및 확률 기반 표시 | 필수 | CSPRNG 기반 확률 판정 (displayPercentage). Hidden Fields 처리 후 위젯 렌더링 요청 |
| FN-019-05 | 위젯 렌더링 및 상태 관리 | 필수 | 싱글톤 제약, 프로젝트 오버라이드 적용, delay 지연 렌더링, 표시 기록 생성 |
| FN-019-06 | 표시 옵션 (displayOption) 제어 | 필수 | displayOnce/displayMultiple/displaySome/respondMultiple 4가지 표시 옵션 평가 |
| FN-019-07 | 재접촉 대기일 설정 | 필수 | 설문 수준 > 프로젝트 수준 우선순위. null=respect, 0=ignore, 1~365=overwrite |
| FN-019-08 | Segment 기반 필터링 | 필수 | 서버에서 Segment 평가, Segment ID 배열로 SDK에 전달. 미식별 사용자는 Segment 필터 설문 제외 |
| FN-019-09 | Segment 필터 타입 및 연산자 | 필수 | attribute/person/segment/device 4가지 필터 유형. 22개 연산자. and/or 연결자 |
| FN-019-10 | 자동 닫기 (autoClose) | 필수 | 기본값 10초, 최소 1초. 사용자 상호작용 시 타이머 취소 |
| FN-019-11 | 표시 지연 (delay) | 필수 | 기본값 5초. 초->밀리초 변환. 타이머 정리 관리 |
| FN-019-12 | 확률 기반 표시 (displayPercentage) | 필수 | 기본값 50%, 범위 0.01~100, 소수점 2자리. CSPRNG 필수 |
| FN-019-13 | 프로젝트 수준 설문 오버라이드 | 필수 | 브랜드 색상, 강조 테두리 색상, placement, 외부 클릭 닫기, 오버레이 5가지 항목 |

### 1.2 비기능 요구사항

| 분류 | ID | 요구사항 |
|------|-----|---------|
| 성능 | NFR-029-01 | 동시 설문 표시 최대 1개 (싱글톤 제어) |
| 성능 | NFR-030-01 | 설문 필터링(displayOption, recontactDays)은 클라이언트에서 동기적으로 수행 (네트워크 호출 없음) |
| 보안 | NFR-029-02 | CSPRNG 기반 보안 난수 사용 (`crypto.getRandomValues()`) |
| 가용성 | NFR-029-03 | 지연/자동닫기 타이머 스택 관리, 설문 닫기 시 모든 타이머 정리 |
| 정밀도 | NFR-030-02 | 날짜 계산은 일 단위(Math.floor) |
| 서버 평가 | NFR-030-03 | Segment 평가는 서버에서 수행하여 Segment ID 배열로 클라이언트 전달 |

### 1.3 명세서 내 모호한 부분 및 해석

| 번호 | 모호한 부분 | 제안 해석 |
|------|-----------|----------|
| 1 | Survey-ActionClass 다대다 관계의 저장 방식 (DB 관계 테이블 vs JSON 필드) | FS-008에서 Survey 모델에 `triggers Json?` 필드가 정의되어 있으며, FS-006에서 `SurveyTrigger` 관계 테이블 언급이 있다. 명세서 5.2 엔티티 관계에서 `Survey (*) --- (*) ActionClass`로 명시되어 있으므로, **`SurveyTrigger` 중간 테이블**을 사용한다. 각 행은 (surveyId, actionClassId) 복합 PK를 가진다. |
| 2 | DisplayRecord와 ResponseRecord의 DB 모델 | 명세서에서 표시 기록과 응답 기록을 별도 엔티티로 정의한다. FS-021(응답 관리)에서 Response 모델이 정의될 예정이므로, **Display 모델만** 본 구현에서 생성한다. Response는 FS-021에서 정의한 모델을 참조한다. SDK 로컬 상태에서는 `{ surveyId, createdAt }` 배열로 관리한다. |
| 3 | Segment 평가 시점과 데이터 전달 방식 | 서버에서 Segment 평가 결과를 "Segment ID 배열"로 전달한다고 했으나, 구체적인 API 경로가 없다. FS-024(Client API)의 `/client/{environmentId}/in-app/sync` 응답에 `userSegmentIds: string[]`를 포함하는 방식으로 해석한다. |
| 4 | 설문 에디터 내 트리거/재노출 설정 UI의 정확한 위치 | 설문 에디터의 "설정" 패널 내에 별도 섹션으로 배치한다. FS-010(설문 편집기 UX) 구현과 통합된다. 본 구현에서는 독립적으로 동작하는 설정 컴포넌트를 생성하되, 에디터 통합은 FS-010에 위임한다. |
| 5 | recontactDays가 "마지막 설문 표시" 기준인지 "마지막 '해당' 설문 표시" 기준인지 | 명세서 4.7.4 단계 3에서 "사용자의 마지막 설문 표시 일시"라고 표현되어 있으므로, **모든 설문의 마지막 표시 일시**(전역 기준)로 해석한다. 특정 설문이 아닌 "어떤 설문이든" 표시된 마지막 시점 기준이다. |
| 6 | 프로젝트 오버라이드에서 placement의 구체적 enum 값 | FS-006에서 정의된 `WidgetPlacement` enum(bottomLeft, bottomRight, topLeft, topRight, center)을 사용한다. |
| 7 | SDK에서 표시 기록/응답 기록의 서버 동기화 시점 | 설문이 표시될 때 즉시 서버에 표시 기록을 POST하고, 로컬 배열에도 추가한다. fire-and-forget 패턴으로 네트워크 실패 시에도 로컬 기록은 유지한다. |

### 1.4 암묵적 요구사항

| 번호 | 암묵적 요구사항 | 도출 근거 |
|------|--------------|----------|
| 1 | **Display 모델 DB 스키마 추가** | 표시 기록(DisplayRecord)을 서버에 저장해야 하므로 Prisma Display 모델 필요 |
| 2 | **SurveyTrigger 중간 테이블 추가** | Survey와 ActionClass의 N:N 관계를 DB 레벨에서 관리 |
| 3 | **Survey 모델에 재노출 관련 필드 추가** | displayOption, displayLimit, recontactDays, autoClose, delay, displayPercentage, surveyOverrides 필드. FS-008에서 일부 정의되었으므로 누락 필드만 보충 |
| 4 | **Project 모델에 recontactDays 필드 추가** | 프로젝트 수준 재접촉 대기일 설정 (FS-006에서 이미 정의된 필드이므로 확인만 필요) |
| 5 | **Client API 동기화 응답 확장** | FS-024 Client API의 sync 응답에 ActionClass 목록, 사용자 Segment ID 배열, Display/Response 기록 포함 |
| 6 | **SDK survey-filter.ts 확장** | FS-007에서 기본 필터링만 구현한 survey-filter.ts를 displayOption, recontactDays, segment 필터로 확장 |
| 7 | **설문 에디터 트리거/재노출 설정 컴포넌트** | 설문 에디터 내 트리거 연결, 표시 옵션, 재접촉 대기일, autoClose, delay, displayPercentage 설정 UI |
| 8 | **Segment 평가 서비스 확장** | FS-027에서 구현한 Segment 평가 엔진을 Client API의 sync 응답에서 호출하여 사용자별 Segment ID 배열 생성 |
| 9 | **SDK 타이머 관리 모듈** | delay, autoClose 등 다수의 타이머를 중앙 관리하는 타이머 관리자 |
| 10 | **i18n 번역 키 추가** | 에디터 UI의 모든 라벨, 툴팁, 오류 메시지를 i18next로 관리 |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

본 기능은 **서버(에디터 API + Client API)**, **클라이언트(에디터 UI)**, **SDK(런타임 필터링/렌더링)** 세 영역에 걸쳐 구현된다.

```
[관리자 (설문 에디터)]
  apps/client/src/app/[lng]/
    └── (에디터 내 설문 설정 패널)
        ├── trigger-settings/              -- 트리거 설정 (ActionClass 연결)
        ├── display-settings/              -- 표시 옵션, 재접촉 대기일
        └── advanced-settings/             -- autoClose, delay, displayPercentage, 오버라이드

  libs/client/targeting/                   -- [신규] 타게팅/트리거/재노출 클라이언트 라이브러리
    ├── src/
    │   ├── index.ts
    │   └── lib/
    │       ├── components/
    │       │   ├── trigger-card.tsx               -- 트리거 설정 카드 (Link Survey 시 숨김)
    │       │   ├── action-class-selector.tsx       -- ActionClass 드롭다운 선택기
    │       │   ├── action-class-creator.tsx        -- 인라인 ActionClass 생성 폼
    │       │   ├── nocode-event-config.tsx         -- NoCode 이벤트 유형/조건 설정
    │       │   ├── url-filter-editor.tsx           -- URL 필터 추가/삭제/규칙 편집
    │       │   ├── display-option-card.tsx         -- 표시 옵션 라디오 그룹
    │       │   ├── recontact-days-card.tsx         -- 재접촉 대기일 설정 카드
    │       │   ├── auto-close-setting.tsx          -- 자동 닫기 토글 + 시간 입력
    │       │   ├── delay-setting.tsx               -- 표시 지연 토글 + 시간 입력
    │       │   ├── display-percentage-setting.tsx  -- 확률 기반 표시 토글 + 퍼센트 입력
    │       │   └── survey-override-card.tsx        -- 프로젝트 오버라이드 설정 카드
    │       ├── hooks/
    │       │   ├── use-action-classes.ts           -- ActionClass 목록 조회 훅
    │       │   └── use-trigger-settings.ts         -- 트리거/재노출 설정 관리 훅
    │       ├── api/
    │       │   └── targeting-api.ts                -- apiFetch 기반 API 클라이언트
    │       ├── schemas/
    │       │   ├── trigger-settings.schema.ts      -- 트리거 설정 zod 스키마
    │       │   ├── display-option.schema.ts        -- 표시 옵션 zod 스키마
    │       │   └── url-filter.schema.ts            -- URL 필터 zod 스키마
    │       └── types/
    │           └── targeting.types.ts              -- 클라이언트 타입 정의

[서버 (NestJS 11)]
  libs/server/project/                     -- [수정] ActionClass API 확장
    └── controllers/
        └── action-class.controller.ts     -- 기존 CRUD + 설문 트리거 연결 API

  libs/server/survey/                      -- [수정] Survey 재노출 관련 필드 CRUD
    └── survey.service.ts                  -- 트리거/재노출 설정 저장 로직

  libs/server/targeting/                   -- [신규] 타게팅 전용 서버 라이브러리
    ├── src/
    │   ├── index.ts
    │   └── lib/
    │       ├── targeting.module.ts                -- NestJS 모듈
    │       ├── display.controller.ts              -- Display 기록 API (/displays)
    │       ├── display.service.ts                 -- Display 기록 비즈니스 로직
    │       ├── segment-evaluation.service.ts      -- Client API용 Segment 평가 (FS-027 재사용)
    │       ├── dto/
    │       │   ├── create-display.dto.ts           -- Display 생성 DTO
    │       │   └── display-query.dto.ts            -- Display 조회 DTO
    │       └── validators/
    │           ├── display-option.validator.ts     -- displayOption 유효성 검증
    │           └── survey-override.validator.ts    -- 오버라이드 유효성 검증

[SDK (packages/js-sdk)]                    -- [수정] 필터링/렌더링 확장
  packages/js-sdk/src/
    ├── survey/
    │   ├── survey-filter.ts               -- [수정] 설문 필터링 로직 확장
    │   ├── display-option-checker.ts      -- [신규] displayOption 판정
    │   ├── recontact-days-checker.ts      -- [신규] recontactDays 판정
    │   ├── segment-checker.ts             -- [신규] Segment ID 기반 필터링
    │   └── display-percentage-checker.ts  -- [신규] CSPRNG 기반 확률 판정
    ├── widget/
    │   ├── widget-manager.ts              -- [수정] delay, autoClose 통합
    │   ├── timer-manager.ts               -- [신규] 타이머 중앙 관리
    │   └── override-resolver.ts           -- [수정] 오버라이드 해석 확장
    └── actions/
        ├── click.ts                       -- [수정] CSS selector/innerHTML 매칭 로직 확장
        └── no-code-matcher.ts             -- [수정] URL 필터 매칭 엔진 확장

[데이터베이스 (PostgreSQL + Prisma 7)]
  packages/db/prisma/schema.prisma         -- Display, SurveyTrigger 모델 추가
```

**데이터 흐름 (런타임):**

```
1. SDK 초기화 -> Client API sync 요청
2. 서버: Survey 목록(triggers 포함) + ActionClass 목록 + Segment 평가 결과(segmentIds) + Display/Response 기록 반환
3. SDK: 이벤트 감지 (Code Action track() / NoCode Action)
4. SDK: ActionClass 매칭 -> 연결된 Survey 식별
5. SDK: 설문 필터링 파이프라인 실행
   a. Segment 기반 필터링 (segmentIds 비교)
   b. displayOption 필터링 (표시/응답 기록 기반)
   c. recontactDays 필터링 (마지막 표시 일시 기반)
6. SDK: displayPercentage 확률 판정 (CSPRNG)
7. SDK: delay 대기
8. SDK: 위젯 렌더링 (프로젝트 오버라이드 적용)
9. SDK: 표시 기록 생성 (로컬 + 서버 동기화)
10. SDK: autoClose 타이머 시작
```

### 2.2 데이터 모델

#### 2.2.1 신규 Prisma 모델

```prisma
/// 설문 표시 기록. SDK에서 설문이 사용자에게 표시될 때마다 생성
model Display {
  id            String   @id @default(cuid())
  surveyId      String
  contactId     String?  // 식별된 사용자의 경우 Contact ID
  environmentId String
  createdAt     DateTime @default(now())

  survey      Survey      @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  contact     Contact?    @relation(fields: [contactId], references: [id], onDelete: SetNull)
  environment Environment @relation(fields: [environmentId], references: [id], onDelete: Cascade)

  @@index([surveyId])
  @@index([contactId])
  @@index([environmentId, createdAt])
  @@map("displays")
}

/// Survey-ActionClass 다대다 관계 중간 테이블
model SurveyTrigger {
  surveyId      String
  actionClassId String

  survey      Survey      @relation(fields: [surveyId], references: [id], onDelete: Cascade)
  actionClass ActionClass @relation(fields: [actionClassId], references: [id], onDelete: Cascade)

  @@id([surveyId, actionClassId])
  @@map("survey_triggers")
}
```

#### 2.2.2 Survey 모델 확장 필드 (FS-008에서 정의된 필드 보충)

```prisma
// Survey 모델에 추가/확인이 필요한 필드
model Survey {
  // ... 기존 필드 ...

  // 표시 옵션
  displayOption      String   @default("displayOnce")  // "displayOnce"|"displayMultiple"|"displaySome"|"respondMultiple"
  displayLimit       Int?                               // displaySome일 때 최대 표시 횟수
  displayPercentage  Float?                             // 확률 기반 표시 (0.01 ~ 100)

  // 재접촉/타이밍
  recontactDays      Int?                               // null=respect, 0=ignore, 1~365=overwrite
  autoClose          Int?                               // 자동 닫기 시간(초), null=비활성
  delay              Int      @default(0)               // 표시 지연(초)

  // 오버라이드
  surveyOverrides    Json?                              // { brandColor, highlightBorderColor, placement, clickOutsideClose, overlay }

  // 관계
  triggers  SurveyTrigger[]
  displays  Display[]
}
```

#### 2.2.3 Project 모델 확인 필드

```prisma
model Project {
  // FS-006에서 이미 정의된 필드 확인
  recontactDays Int?  // 프로젝트 수준 재접촉 대기일
  // placement, brandColor 등은 styling Json 필드 내에 포함
}
```

### 2.3 API 설계 (해당 시)

#### 2.3.1 관리 API (설문 에디터용)

ActionClass CRUD는 FS-006에서 구현 완료된 상태를 가정한다. 트리거 연결은 Survey 업데이트 API를 통해 처리한다.

**Survey 업데이트 시 트리거/재노출 관련 필드:**

```
PATCH /api/surveys/:surveyId
Content-Type: application/json

{
  "triggerActionClassIds": ["actionClassId1", "actionClassId2"],
  "displayOption": "displayOnce",
  "displayLimit": null,
  "recontactDays": null,
  "autoClose": 10,
  "delay": 5,
  "displayPercentage": 50.00,
  "surveyOverrides": {
    "brandColor": "#FF0000",
    "highlightBorderColor": null,
    "placement": "bottomRight",
    "clickOutsideClose": true,
    "overlay": false
  }
}
```

#### 2.3.2 Display 기록 API

```
POST /api/client/{environmentId}/displays
Content-Type: application/json

{
  "surveyId": "survey-cuid",
  "contactId": "contact-cuid-or-null"
}

Response: 201 Created
{
  "id": "display-cuid",
  "surveyId": "survey-cuid",
  "createdAt": "2026-02-22T00:00:00.000Z"
}
```

#### 2.3.3 Client API sync 응답 확장

```
GET /api/client/{environmentId}/in-app/sync?contactId=xxx

Response 200:
{
  "surveys": [
    {
      "id": "...",
      "triggers": [{ "actionClassId": "..." }],
      "displayOption": "displayOnce",
      "displayLimit": null,
      "recontactDays": null,
      "autoClose": 10,
      "delay": 5,
      "displayPercentage": 50.00,
      "surveyOverrides": { ... },
      "segmentId": "segment-cuid-or-null",
      // ... 기존 필드
    }
  ],
  "actionClasses": [
    { "id": "...", "type": "code", "key": "purchase", ... },
    { "id": "...", "type": "noCode", "noCodeConfig": { ... }, ... }
  ],
  "userSegmentIds": ["segment-cuid-1", "segment-cuid-2"],
  "displays": [
    { "surveyId": "...", "createdAt": "..." }
  ],
  "responses": [
    { "surveyId": "...", "createdAt": "..." }
  ],
  "project": {
    "recontactDays": 7,
    "styling": { ... }
  }
}
```

### 2.4 주요 컴포넌트 설계

#### 2.4.1 SDK 설문 필터링 파이프라인

```typescript
// packages/js-sdk/src/survey/survey-filter.ts

/**
 * 설문 필터링 파이프라인.
 * 이벤트 발생 시 트리거된 설문을 순차적으로 필터링하여
 * 최종 표시 대상 설문을 결정한다.
 */
export function filterSurveys(
  surveys: SurveyState[],
  actionClassId: string,
  context: FilterContext
): SurveyState | null {
  // 1. 트리거 매칭: 해당 ActionClass에 연결된 설문 필터
  const triggered = surveys.filter(s =>
    s.triggers.some(t => t.actionClassId === actionClassId)
  );

  // 2. 상태 필터: inProgress 설문만
  const active = triggered.filter(s => s.status === 'inProgress');

  // 3. Segment 기반 필터링
  const segmentFiltered = active.filter(s =>
    checkSegment(context.user, s)
  );

  // 4. displayOption 필터링
  const displayFiltered = segmentFiltered.filter(s =>
    checkDisplayOption(s, context.displays, context.responses)
  );

  // 5. recontactDays 필터링
  const recontactFiltered = displayFiltered.filter(s =>
    checkRecontactDays(s, context.project, context.lastDisplayAt)
  );

  // 첫 번째 통과 설문 반환 (동시 1개만)
  return recontactFiltered[0] || null;
}
```

#### 2.4.2 SDK 타이머 관리자

```typescript
// packages/js-sdk/src/widget/timer-manager.ts

/**
 * 설문 위젯의 delay/autoClose 타이머를 중앙 관리.
 * 설문 닫기 시 모든 관련 타이머를 일괄 정리한다.
 */
class TimerManager {
  private timers: Map<string, number> = new Map();

  /**
   * 지연 타이머 시작. delay 초 후 콜백 실행.
   * @returns 타이머 식별자
   */
  startDelay(surveyId: string, delaySec: number, callback: () => void): string {
    const key = `delay_${surveyId}`;
    const timerId = window.setTimeout(callback, delaySec * 1000);
    this.timers.set(key, timerId);
    return key;
  }

  /**
   * 자동 닫기 타이머 시작.
   * 사용자 상호작용 시 cancelAutoClose()로 취소.
   */
  startAutoClose(surveyId: string, autoCloseSec: number, callback: () => void): string {
    const key = `autoclose_${surveyId}`;
    const timerId = window.setTimeout(callback, autoCloseSec * 1000);
    this.timers.set(key, timerId);
    return key;
  }

  /** 특정 타이머 취소 */
  cancel(key: string): void {
    const timerId = this.timers.get(key);
    if (timerId !== undefined) {
      window.clearTimeout(timerId);
      this.timers.delete(key);
    }
  }

  /** 특정 설문의 모든 타이머 정리 */
  clearAllForSurvey(surveyId: string): void {
    for (const [key, timerId] of this.timers.entries()) {
      if (key.includes(surveyId)) {
        window.clearTimeout(timerId);
        this.timers.delete(key);
      }
    }
  }

  /** 모든 타이머 일괄 정리 */
  clearAll(): void {
    for (const timerId of this.timers.values()) {
      window.clearTimeout(timerId);
    }
    this.timers.clear();
  }
}
```

#### 2.4.3 displayPercentage CSPRNG 판정

```typescript
// packages/js-sdk/src/survey/display-percentage-checker.ts

/**
 * CSPRNG 기반 확률 판정.
 * displayPercentage가 null이면 항상 true 반환.
 * 소수점 2자리 정밀도 (0.01 ~ 100.00).
 */
export function checkDisplayPercentage(displayPercentage: number | null): boolean {
  if (displayPercentage === null) return true;

  // 범위 보정
  const clamped = Math.max(0.01, Math.min(100, displayPercentage));

  // CSPRNG 기반 보안 난수 생성 (0.00 ~ 100.00)
  let randomValue: number;
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    // 0 ~ 10000 범위로 매핑 후 소수점 2자리로 변환
    randomValue = (array[0]! % 10001) / 100;
  } else {
    // Fallback: Math.random() (보안 수준 낮음)
    console.warn('[Inquiry SDK] CSPRNG unavailable, falling back to Math.random()');
    randomValue = Math.round(Math.random() * 10000) / 100;
  }

  return randomValue <= clamped;
}
```

### 2.5 기존 시스템에 대한 영향 분석

| 모듈/패키지 | 영향 범위 | 변경 내용 |
|-------------|----------|----------|
| `packages/db` (Prisma) | 높음 | Display, SurveyTrigger 모델 추가. Survey 모델에 필드 추가 (FS-008에서 미포함된 항목 보충) |
| `packages/js-sdk` (SDK) | 높음 | survey-filter.ts 확장, 신규 checker 4개, timer-manager, widget-manager 수정 |
| `libs/server/survey` | 중간 | Survey CRUD에 triggers/재노출 필드 저장 로직 추가 |
| `libs/server/project` | 낮음 | ActionClass API는 FS-006에서 구현 완료 가정. 변경 최소화 |
| `libs/server/targeting` | 높음 | 신규 서버 라이브러리 (Display CRUD, Segment 평가 호출) |
| `libs/client/targeting` | 높음 | 신규 클라이언트 라이브러리 (에디터 UI 컴포넌트) |
| `packages/shared` | 낮음 | 공유 타입 (DisplayOption enum, UrlFilterRule enum 등) 추가 |
| `apps/client` | 낮음 | 설문 에디터 페이지에서 targeting 컴포넌트 import/배치 |
| FS-024 (Client API) | 중간 | sync 응답에 actionClasses, userSegmentIds, displays, responses 포함 |
| FS-027 (Segment) | 낮음 | evaluateSegment 함수를 Client API에서 호출하여 사용자별 Segment ID 배열 생성 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 작업명 | 설명 | 의존성 | 복잡도 | 예상 시간 |
|-----|--------|------|--------|--------|----------|
| T-01 | Prisma 스키마 확장 | Display, SurveyTrigger 모델 추가. Survey 모델에 재노출 관련 필드 추가 | FS-006, FS-008 | 중 | 2h |
| T-02 | DB 마이그레이션 실행 | 스키마 변경 반영 및 마이그레이션 생성 | T-01 | 하 | 0.5h |
| T-03 | 공유 타입 정의 | DisplayOption, UrlFilterRule, NoCodeEventType, SurveyOverride 등 enum/타입 정의 | - | 중 | 2h |
| T-04 | Display DTO 구현 | CreateDisplayDto, DisplayQueryDto (class-validator) | T-01 | 하 | 1h |
| T-05 | Display Service 구현 | Display CRUD 비즈니스 로직 (create, findBySurvey, findByContact) | T-01, T-04 | 중 | 3h |
| T-06 | Display Controller 구현 | POST/GET /displays 엔드포인트 | T-05 | 중 | 2h |
| T-07 | TargetingModule 생성 | NestJS 모듈 생성 및 DI 설정 | T-05, T-06 | 하 | 1h |
| T-08 | Survey Service 트리거/재노출 확장 | Survey CRUD에 triggerActionClassIds, displayOption 등 저장 로직 추가 | T-01 | 중 | 3h |
| T-09 | Survey 유효성 검증 확장 | displayOption/displayLimit, displayPercentage, recontactDays, autoClose 유효성 검증 | T-08 | 중 | 2h |
| T-10 | Segment 평가 서비스 통합 | Client API sync에서 사용자별 Segment 평가 호출 -> segmentIds 배열 생성 | FS-027 | 중 | 3h |
| T-11 | Client API sync 응답 확장 | sync 응답에 actionClasses, userSegmentIds, displays, responses, project 설정 포함 | T-06, T-10, FS-024 | 높 | 4h |
| T-12 | SDK 공유 타입 추가 | packages/js-sdk/src/types/ 에 FilterContext, DisplayRecord, ResponseRecord 등 타입 추가 | T-03 | 하 | 1h |
| T-13 | displayOption checker 구현 | checkDisplayOption() 순수 함수 구현 | T-12 | 중 | 2h |
| T-14 | recontactDays checker 구현 | checkRecontactDays() 순수 함수 구현 | T-12 | 중 | 2h |
| T-15 | segment checker 구현 | checkSegment() 순수 함수 구현 | T-12 | 하 | 1h |
| T-16 | displayPercentage checker 구현 | checkDisplayPercentage() CSPRNG 기반 순수 함수 구현 | T-12 | 중 | 2h |
| T-17 | survey-filter.ts 확장 | 필터링 파이프라인 통합 (trigger 매칭 + 4개 checker) | T-13~T-16 | 높 | 3h |
| T-18 | TimerManager 구현 | delay/autoClose 타이머 중앙 관리 클래스 | - | 중 | 2h |
| T-19 | widget-manager.ts 확장 | delay 지연 렌더링, autoClose 타이머 시작, 표시 기록 생성 통합 | T-17, T-18 | 높 | 4h |
| T-20 | click.ts/no-code-matcher.ts 확장 | CSS selector 분리 매칭, innerHTML 비교, URL 필터 연결자(and/or) 매칭 로직 강화 | FS-007 | 중 | 3h |
| T-21 | override-resolver.ts 확장 | 5가지 오버라이드 항목 해석 로직 (설문 > 프로젝트 우선순위) | - | 하 | 1.5h |
| T-22 | 클라이언트 zod 스키마 정의 | trigger-settings, display-option, url-filter 등 폼 검증 스키마 | T-03 | 중 | 2h |
| T-23 | trigger-card 컴포넌트 | ActionClass 선택/생성 + 트리거 연결 UI (Link Survey 숨김) | T-22 | 높 | 4h |
| T-24 | action-class-selector 컴포넌트 | Environment별 ActionClass 드롭다운 | T-23 | 중 | 2h |
| T-25 | nocode-event-config 컴포넌트 | NoCode 이벤트 유형 선택 + click 조건(CSS selector, innerHTML) + URL 필터 | T-23 | 높 | 4h |
| T-26 | url-filter-editor 컴포넌트 | URL 필터 추가/삭제, 7가지 규칙 선택, and/or 토글 | T-25 | 중 | 3h |
| T-27 | display-option-card 컴포넌트 | 4가지 표시 옵션 라디오 + displayLimit 입력 | T-22 | 중 | 2h |
| T-28 | recontact-days-card 컴포넌트 | respect/ignore/overwrite 3가지 라디오 + 일 수 입력 | T-22 | 중 | 2h |
| T-29 | auto-close/delay/displayPercentage 설정 컴포넌트 | 토글 + 값 입력 3종 세트 | T-22 | 중 | 2.5h |
| T-30 | survey-override-card 컴포넌트 | 5가지 오버라이드 항목 (프로젝트 설정/커스텀 토글) | T-22 | 중 | 3h |
| T-31 | targeting API 클라이언트 | apiFetch 기반 ActionClass 목록, Display 기록 API 호출 래퍼 | - | 하 | 1h |
| T-32 | i18n 번역 키 추가 (ko/en) | 에디터 UI의 모든 라벨, 툴팁, 오류 메시지 번역 키 | T-23~T-30 | 중 | 2h |
| T-33 | 서버 단위 테스트 | Display Service, Survey 트리거/재노출 검증, Segment 평가 통합 | T-05~T-11 | 중 | 4h |
| T-34 | SDK 단위 테스트 | 4개 checker, survey-filter 파이프라인, TimerManager | T-13~T-19 | 중 | 4h |
| T-35 | 클라이언트 컴포넌트 테스트 | 주요 UI 컴포넌트 렌더링/상호작용 테스트 | T-23~T-30 | 중 | 3h |
| T-36 | 통합 테스트 | E2E: 에디터 설정 -> sync 응답 -> SDK 필터링 -> 위젯 렌더링 | T-33~T-35 | 높 | 4h |

### 3.2 구현 순서 및 마일스톤

**마일스톤 1: DB 스키마 및 서버 기반 (T-01 ~ T-11)**

```
T-01 (Prisma 스키마) -> T-02 (마이그레이션)
T-03 (공유 타입) -- 병렬 --
T-04 (Display DTO) -> T-05 (Display Service) -> T-06 (Display Controller) -> T-07 (TargetingModule)
T-08 (Survey Service 확장) -> T-09 (Survey 유효성 검증)
T-10 (Segment 평가 통합) -- T-06, T-10 -> T-11 (Client API sync 확장)
```

검증 기준:
- Display CRUD API가 동작하고, Survey에 트리거/재노출 필드가 저장됨
- Client API sync 응답에 actionClasses, userSegmentIds, displays, responses가 포함됨
- 빌드 성공 후 커밋

**마일스톤 2: SDK 필터링 및 렌더링 엔진 (T-12 ~ T-21)**

```
T-12 (SDK 타입) -> T-13~T-16 (4개 checker, 병렬 가능) -> T-17 (survey-filter 통합)
T-18 (TimerManager) -> T-19 (widget-manager 확장)
T-20 (click/nocode 매칭 강화) -- 병렬 --
T-21 (override-resolver 확장) -- 병렬 --
```

검증 기준:
- SDK에서 설문 필터링 파이프라인이 올바르게 동작 (단위 테스트)
- delay/autoClose 타이머가 정상 관리됨
- displayPercentage CSPRNG 판정이 올바르게 동작
- 빌드 성공 후 커밋

**마일스톤 3: 에디터 UI 컴포넌트 (T-22 ~ T-32)**

```
T-22 (zod 스키마) -> T-23~T-30 (UI 컴포넌트, 부분 병렬)
T-31 (API 클라이언트) -- 병렬 --
T-32 (i18n) -- T-23~T-30 완료 후 --
```

검증 기준:
- 설문 에디터에서 트리거, 표시 옵션, 재접촉 대기일, autoClose, delay, displayPercentage 설정 가능
- Link Survey에서 트리거 카드가 숨겨짐
- 모든 UI 문자열이 i18n 처리됨
- 빌드 성공 후 커밋

**마일스톤 4: 테스트 및 통합 (T-33 ~ T-36)**

```
T-33 (서버 테스트) -- 병렬 -- T-34 (SDK 테스트)
T-35 (클라이언트 테스트) -> T-36 (통합 테스트)
```

검증 기준:
- 모든 주요 비즈니스 규칙의 단위 테스트 통과
- E2E: 설문 에디터에서 설정 -> SDK에서 설문 트리거 -> 필터링 -> 위젯 표시 플로우 동작
- 빌드 성공 후 최종 커밋

### 3.3 파일 변경 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|-----------|----------|----------|
| `packages/db/prisma/schema.prisma` | 수정 | Display, SurveyTrigger 모델 추가. Survey 모델에 재노출 필드 추가 |
| `packages/shared/src/targeting/types.ts` | 생성 | DisplayOption, UrlFilterRule, NoCodeEventType, SurveyOverride 등 공유 타입/enum |
| `packages/shared/src/targeting/constants.ts` | 생성 | autoClose 기본값(10), delay 기본값(5), displayPercentage 기본값(50) 등 상수 |
| `packages/shared/src/targeting/index.ts` | 생성 | 퍼블릭 API 엑스포트 |
| `libs/server/targeting/src/index.ts` | 생성 | 퍼블릭 API 엑스포트 |
| `libs/server/targeting/src/lib/targeting.module.ts` | 생성 | NestJS TargetingModule 정의 |
| `libs/server/targeting/src/lib/display.controller.ts` | 생성 | Display CRUD REST 엔드포인트 |
| `libs/server/targeting/src/lib/display.service.ts` | 생성 | Display 생성, 조회 비즈니스 로직 |
| `libs/server/targeting/src/lib/segment-evaluation.service.ts` | 생성 | Client API 용 사용자별 Segment 평가 (FS-027 evaluateSegment 호출) |
| `libs/server/targeting/src/lib/dto/create-display.dto.ts` | 생성 | Display 생성 DTO (class-validator) |
| `libs/server/targeting/src/lib/dto/display-query.dto.ts` | 생성 | Display 조회 쿼리 DTO |
| `libs/server/targeting/src/lib/validators/display-option.validator.ts` | 생성 | displayOption/displayLimit 유효성 검증 |
| `libs/server/targeting/src/lib/validators/survey-override.validator.ts` | 생성 | surveyOverrides 유효성 검증 |
| `libs/server/survey/src/lib/survey.service.ts` | 수정 | triggerActionClassIds 저장, 재노출 필드 CRUD 확장 |
| `libs/server/survey/src/lib/survey-validation.service.ts` | 수정 | displayOption/displayLimit, displayPercentage, recontactDays 검증 규칙 추가 |
| `libs/server/survey/src/lib/dto/update-survey.dto.ts` | 수정 | triggerActionClassIds, displayOption 등 필드 추가 |
| `packages/js-sdk/src/types/survey.ts` | 수정 | SurveyState에 재노출/트리거 필드 타입 추가 |
| `packages/js-sdk/src/types/action-class.ts` | 수정 | noCodeConfig 상세 타입 정의 |
| `packages/js-sdk/src/survey/survey-filter.ts` | 수정 | 필터링 파이프라인 확장 (trigger 매칭 + 4개 checker 통합) |
| `packages/js-sdk/src/survey/display-option-checker.ts` | 생성 | displayOption 판정 순수 함수 |
| `packages/js-sdk/src/survey/recontact-days-checker.ts` | 생성 | recontactDays 판정 순수 함수 |
| `packages/js-sdk/src/survey/segment-checker.ts` | 생성 | Segment ID 기반 필터링 순수 함수 |
| `packages/js-sdk/src/survey/display-percentage-checker.ts` | 생성 | CSPRNG 기반 확률 판정 순수 함수 |
| `packages/js-sdk/src/widget/timer-manager.ts` | 생성 | delay/autoClose 타이머 중앙 관리 클래스 |
| `packages/js-sdk/src/widget/widget-manager.ts` | 수정 | delay 지연, autoClose 시작, 표시 기록 생성, 싱글톤 관리 통합 |
| `packages/js-sdk/src/widget/override-resolver.ts` | 수정 | 5가지 오버라이드 항목 해석 확장 |
| `packages/js-sdk/src/actions/click.ts` | 수정 | CSS selector 분리(`.`/`#`) 매칭, innerHTML 비교 로직 추가 |
| `packages/js-sdk/src/actions/no-code-matcher.ts` | 수정 | URL 필터 7가지 규칙 + and/or 연결자 매칭 엔진 강화 |
| `libs/client/targeting/src/index.ts` | 생성 | 퍼블릭 API 엑스포트 |
| `libs/client/targeting/src/lib/components/trigger-card.tsx` | 생성 | 트리거 설정 카드 (Link Survey 숨김 처리 포함) |
| `libs/client/targeting/src/lib/components/action-class-selector.tsx` | 생성 | ActionClass 드롭다운 선택기 |
| `libs/client/targeting/src/lib/components/action-class-creator.tsx` | 생성 | 인라인 ActionClass 생성 폼 (code: key 입력, noCode: 유형 선택) |
| `libs/client/targeting/src/lib/components/nocode-event-config.tsx` | 생성 | NoCode 이벤트 유형 선택 + click 조건 설정 |
| `libs/client/targeting/src/lib/components/url-filter-editor.tsx` | 생성 | URL 필터 추가/삭제/규칙/값 편집 + and/or 토글 |
| `libs/client/targeting/src/lib/components/display-option-card.tsx` | 생성 | 4가지 표시 옵션 라디오 + displayLimit 입력 |
| `libs/client/targeting/src/lib/components/recontact-days-card.tsx` | 생성 | respect/ignore/overwrite 라디오 + 일 수 입력 |
| `libs/client/targeting/src/lib/components/auto-close-setting.tsx` | 생성 | autoClose 토글 + 시간(초) 입력 |
| `libs/client/targeting/src/lib/components/delay-setting.tsx` | 생성 | delay 토글 + 시간(초) 입력 |
| `libs/client/targeting/src/lib/components/display-percentage-setting.tsx` | 생성 | displayPercentage 토글 + 퍼센트 입력 |
| `libs/client/targeting/src/lib/components/survey-override-card.tsx` | 생성 | 5가지 오버라이드 프로젝트/커스텀 토글 |
| `libs/client/targeting/src/lib/hooks/use-action-classes.ts` | 생성 | ActionClass 목록 조회 훅 |
| `libs/client/targeting/src/lib/hooks/use-trigger-settings.ts` | 생성 | 트리거/재노출 설정 관리 훅 |
| `libs/client/targeting/src/lib/api/targeting-api.ts` | 생성 | apiFetch 기반 API 클라이언트 |
| `libs/client/targeting/src/lib/schemas/trigger-settings.schema.ts` | 생성 | 트리거 설정 zod 스키마 |
| `libs/client/targeting/src/lib/schemas/display-option.schema.ts` | 생성 | 표시 옵션 zod 스키마 |
| `libs/client/targeting/src/lib/schemas/url-filter.schema.ts` | 생성 | URL 필터 zod 스키마 |
| `libs/client/targeting/src/lib/types/targeting.types.ts` | 생성 | 클라이언트 타입 정의 |
| `apps/client/public/locales/ko/targeting.json` | 생성 | 한국어 번역 키 |
| `apps/client/public/locales/en/targeting.json` | 생성 | 영어 번역 키 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 확률 | 완화 전략 |
|--------|------|------|----------|
| **선행 의존 모듈 미구현** (FS-006 ActionClass, FS-008 Survey, FS-024 Client API, FS-027 Segment) | 높음 | 중간 | 각 선행 모듈의 최소 인터페이스(스텁)를 정의하여 독립적으로 개발 가능하게 한다. 실제 구현 시 스텁을 실제 모듈로 교체한다. 통합 테스트는 마일스톤 4에서 수행한다. |
| **SDK 번들 크기 증가** | 중간 | 중간 | 4개 checker는 순수 함수이므로 tree-shaking이 가능하다. TimerManager는 ~1KB 미만이다. 번들 사이즈 모니터링을 빌드 파이프라인에 추가한다. |
| **CSPRNG 미지원 브라우저** | 중간 | 낮음 | `crypto.getRandomValues()` 사용 불가 시 `Math.random()` 폴백으로 전환하되, 콘솔 경고를 출력한다. 모든 모던 브라우저(IE11+)에서 지원되므로 실제 발생 확률은 매우 낮다. |
| **타이머 메모리 누수** | 높음 | 중간 | TimerManager에서 타이머를 Map으로 중앙 관리하고, 설문 닫기/페이지 이동/tearDown 시 `clearAll()` 호출을 보장한다. `beforeunload` 이벤트에 cleanup 핸들러를 등록한다. |
| **Segment 평가 성능** | 중간 | 중간 | 서버에서 Segment 평가를 미리 수행하여 결과만 전달하므로 SDK 측 부담은 없다. 서버 측에서 Segment 평가 결과를 캐싱(요청 단위)하여 동일 요청 내 중복 평가를 방지한다. |
| **동시성 이슈 (싱글톤 설문)** | 중간 | 낮음 | `isSurveyRunning` 플래그를 설문 표시 전에 **즉시** 설정하고, 설문 닫기 시 해제한다. delay 대기 중에도 플래그를 유지하여 다른 설문이 끼어들지 못하게 한다. |
| **i18n 번역 누락** | 낮음 | 중간 | 개발 시 모든 사용자 대면 문자열을 `t()` 함수로 래핑하고, 빌드 시 번역 키 누락 경고를 활성화한다. ko/en 2개 언어 모두 검수한다. |

---

## 5. 테스트 전략

### 5.1 단위 테스트

**SDK Checker 테스트 (Jest/Vitest):**

| 테스트 대상 | 주요 테스트 케이스 |
|-------------|------------------|
| `checkDisplayOption()` | displayOnce: 표시 0회 -> true, 1회 -> false / displayMultiple: 응답 0건 -> true, 1건 -> false / displaySome: limit=3, 표시 2회 -> true, 3회 -> false, 응답 1건 -> false / respondMultiple: 항상 true / unknown -> false (에러 로그) |
| `checkRecontactDays()` | survey null + project null -> true / survey null + project 7 + lastDisplay 3일 전 -> false / survey null + project 7 + lastDisplay 8일 전 -> true / survey 0 (ignore) -> true / survey 3 + lastDisplay null -> true / 날짜 파싱 에러 -> false (보수적) |
| `checkSegment()` | segmentId null -> true / 미식별 + segmentId 있음 -> false / 식별 + segmentIds 비어있음 -> false / 식별 + segmentIds에 포함 -> true / 식별 + segmentIds에 미포함 -> false |
| `checkDisplayPercentage()` | null -> true / 100 -> true / 0.01 -> 대부분 false / 범위 보정: -1 -> 0.01로 보정, 200 -> 100으로 보정 / CSPRNG 사용 확인 |
| `TimerManager` | startDelay -> 콜백 실행 / startAutoClose -> 콜백 실행 / cancel -> 타이머 취소 / clearAllForSurvey -> 특정 설문 타이머만 정리 / clearAll -> 전체 정리 |
| `filterSurveys()` | 트리거 매칭 -> 비매칭 제외 / 파이프라인 순서대로 필터링 / 결과 없으면 null 반환 |

**서버 Service 테스트 (Jest):**

| 테스트 대상 | 주요 테스트 케이스 |
|-------------|------------------|
| `DisplayService.create()` | 정상 생성 / surveyId 미존재 -> 404 / contactId 미존재 -> 404 |
| `DisplayService.findBySurveyAndContact()` | 정상 조회 / 결과 없음 -> 빈 배열 |
| `SurveyService.updateTriggers()` | ActionClass ID 배열 저장/조회 / 중복 ID 무시 / 존재하지 않는 ActionClass ID -> 400 |
| `SurveyService.updateDisplayOption()` | displaySome + displayLimit 필수 검증 / displayOnce + displayLimit null 허용 / 유효하지 않은 displayOption -> 400 |

**클라이언트 컴포넌트 테스트 (React Testing Library):**

| 테스트 대상 | 주요 테스트 케이스 |
|-------------|------------------|
| `TriggerCard` | Link Survey 시 렌더링 안 됨 / App Survey 시 ActionClass 드롭다운 표시 |
| `DisplayOptionCard` | 4가지 라디오 전환 / displaySome 선택 시 displayLimit 입력 표시 / displayLimit 최소값 1 검증 |
| `RecontactDaysCard` | 3가지 라디오 전환 / overwrite 선택 시 일 수 입력 표시 / 범위 1~365 검증 |
| `NocodeEventConfig` | click 선택 시 CSS selector + innerHTML 표시 / 둘 다 미입력 시 에러 |
| `UrlFilterEditor` | 필터 추가/삭제 / 7가지 규칙 드롭다운 / and/or 토글 / matchesRegex 정규식 유효성 검증 |

### 5.2 통합 테스트

| 테스트 시나리오 | 검증 항목 |
|----------------|----------|
| **설문 에디터 트리거 설정 -> DB 저장 -> 조회** | Survey PATCH API로 triggerActionClassIds 저장 -> GET으로 조회 -> SurveyTrigger 테이블에 행 확인 |
| **Client API sync 응답 완전성** | sync API 호출 -> 응답에 surveys(트리거 포함), actionClasses, userSegmentIds, displays, responses 모두 포함 확인 |
| **SDK 필터링 파이프라인 E2E** | Mock sync 데이터로 SDK 초기화 -> Code Action track() 호출 -> 필터링 파이프라인 통과 -> 위젯 렌더링 확인 |
| **Display 기록 서버 동기화** | SDK에서 위젯 렌더링 -> Display POST API 호출 -> DB에 Display 행 생성 확인 |

### 5.3 E2E 테스트 (해당 시)

| 시나리오 | 검증 항목 |
|---------|----------|
| **Code Action 트리거 플로우** | 설문 에디터에서 code 트리거("purchase") 설정 -> SDK에서 `track("purchase")` 호출 -> 설문 위젯 표시 |
| **NoCode click 트리거 플로우** | noCode click 트리거(CSS selector `.btn-submit`) 설정 -> 해당 요소 클릭 -> 설문 위젯 표시 |
| **displayOnce 재노출 방지** | displayOnce 설문 1회 표시 후 -> 동일 트리거 재발생 -> 설문 미표시 확인 |
| **recontactDays 대기** | recontactDays=7 설정 -> 표시 후 3일 경과 시뮬레이션 -> 미표시 / 8일 경과 -> 표시 |
| **displayPercentage 확률** | displayPercentage=100 -> 항상 표시 / displayPercentage=0.01 -> 거의 미표시 (통계적 검증) |
| **싱글톤 제약** | 설문 A 표시 중 -> 설문 B 트리거 -> 설문 B 스킵 확인 |
| **autoClose 자동 닫기** | autoClose=3 설정 -> 설문 표시 후 3초 후 자동 닫힘 확인 / 사용자 상호작용 -> 타이머 취소 확인 |
| **delay 지연 렌더링** | delay=5 설정 -> 트리거 후 5초 대기 -> 설문 표시 확인 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 제약사항 | 설명 |
|---------|------|
| 선행 모듈 의존 | FS-006(ActionClass), FS-008(Survey), FS-024(Client API), FS-027(Segment) 구현이 선행되어야 한다. 이 모듈들이 미구현 상태라면 스텁 기반으로 개발하되, 통합 시 교체가 필요하다. |
| Link Survey 미지원 | 본 명세는 App Survey 전용이다. Link Survey의 배포/재노출은 FS-016에서 별도 처리된다. |
| 응답 데이터 미연동 | ResponseRecord는 FS-021에서 구현될 Response 모델에 의존한다. 현재는 SDK 로컬 상태(LocalStorage)에만 저장하고, FS-021 구현 후 서버 동기화를 연동한다. |
| 실시간 Segment 갱신 미지원 | Segment 평가 결과는 SDK 초기화(sync) 시점에만 갱신된다. 사용자 속성이 세션 중 변경되어도 Segment 소속이 즉시 갱신되지 않는다. |
| CSS selector 고급 매칭 미지원 | CSS selector 매칭은 `.`/`#` 기준 분리 후 개별 매칭만 지원한다. 복합 선택자(`.btn.primary > span`)의 완전한 CSS 매칭은 지원하지 않는다. |

### 6.2 향후 개선 가능 항목

| 개선 항목 | 설명 |
|----------|------|
| 실시간 Segment 갱신 | SDK에서 사용자 속성 변경 시 서버에 재평가를 요청하여 Segment 소속을 동적으로 갱신하는 메커니즘 도입 |
| Display 기록 배치 동기화 | 개별 POST 대신 배치로 Display 기록을 서버에 동기화하여 네트워크 호출 횟수를 줄이는 최적화 |
| 고급 트리거 조합 | ActionClass 간 AND/OR 조합 지원 (예: "페이지 뷰 AND 스크롤 50% 시 트리거") |
| displayPercentage 사용자별 일관성 | 동일 사용자에게 일관된 확률 결과를 제공하기 위한 사용자 ID 기반 해시 판정 (A/B 테스트 일관성) |
| Response 모델 통합 | FS-021 구현 후 SDK의 로컬 응답 기록을 서버 Response 모델과 연동하여 정확한 displayOption 판정 |
| 프로젝트 오버라이드 미리보기 | 설문 에디터에서 오버라이드 설정 시 실시간 미리보기 위젯 제공 |

---

## 7. i18n 고려사항 (Client UI 변경)

### 7.1 추가 필요 번역 키

**네임스페이스: `targeting`**

| 키 | 한국어 | 영어 |
|----|--------|------|
| `trigger.title` | 트리거 | Trigger |
| `trigger.description` | 설문을 표시할 이벤트를 선택하세요 | Select an event to show your survey |
| `trigger.addAction` | 트리거 추가 | Add trigger |
| `trigger.codeAction` | Code Action | Code Action |
| `trigger.noCodeAction` | No-Code Action | No-Code Action |
| `trigger.actionKey` | Action Key | Action Key |
| `trigger.actionKeyPlaceholder` | 예: purchase, signup_complete | e.g., purchase, signup_complete |
| `trigger.actionKeyHelp` | SDK에서 track("action-key")을 호출하여 트리거합니다 | Trigger by calling track("action-key") in the SDK |
| `trigger.duplicateKey` | 이 환경에서 이미 사용 중인 Action Key입니다 | This action key is already in use in this environment |
| `trigger.noCodeType` | 이벤트 유형 | Event type |
| `trigger.click` | 클릭 | Click |
| `trigger.pageView` | 페이지 뷰 | Page View |
| `trigger.exitIntent` | 이탈 의도 | Exit Intent |
| `trigger.fiftyPercentScroll` | 50% 스크롤 | 50% Scroll |
| `trigger.cssSelector` | CSS 선택자 | CSS Selector |
| `trigger.innerHTML` | Inner HTML | Inner HTML |
| `trigger.cssSelectorOrInnerHtml` | CSS 선택자 또는 Inner HTML 중 최소 1개를 입력하세요 | Enter at least one of CSS selector or Inner HTML |
| `urlFilter.title` | URL 필터 | URL Filters |
| `urlFilter.addFilter` | 필터 추가 | Add filter |
| `urlFilter.rule` | 규칙 | Rule |
| `urlFilter.value` | 값 | Value |
| `urlFilter.connector` | 연결자 | Connector |
| `urlFilter.exactMatch` | 정확히 일치 | Exact match |
| `urlFilter.contains` | 포함 | Contains |
| `urlFilter.startsWith` | 시작 | Starts with |
| `urlFilter.endsWith` | 끝 | Ends with |
| `urlFilter.notMatch` | 일치하지 않음 | Does not match |
| `urlFilter.notContains` | 포함하지 않음 | Does not contain |
| `urlFilter.matchesRegex` | 정규식 일치 | Matches regex |
| `urlFilter.invalidRegex` | 유효하지 않은 정규식 패턴입니다 | Invalid regex pattern |
| `displayOption.title` | 표시 옵션 | Display options |
| `displayOption.displayOnce` | 한 번만 표시 | Show only once |
| `displayOption.displayOnceDesc` | 한 번 표시된 후에는 다시 표시하지 않습니다 | Won't show again after being displayed once |
| `displayOption.displayMultiple` | 응답할 때까지 반복 표시 | Keep showing until responded |
| `displayOption.displayMultipleDesc` | 응답하기 전까지 트리거마다 반복 표시합니다 | Shows on every trigger until the user responds |
| `displayOption.displaySome` | 제한 횟수만큼 표시 | Show a limited number of times |
| `displayOption.displaySomeDesc` | 설정한 횟수까지 표시합니다 | Shows up to the configured number of times |
| `displayOption.respondMultiple` | 항상 표시 | Always show |
| `displayOption.respondMultipleDesc` | 응답 여부와 관계없이 항상 표시합니다 | Always shows regardless of response |
| `displayOption.displayLimit` | 최대 표시 횟수 | Maximum display count |
| `displayOption.displayLimitMin` | 최소 1회 이상이어야 합니다 | Must be at least 1 |
| `recontactDays.title` | 재접촉 대기일 | Recontact waiting days |
| `recontactDays.respect` | 프로젝트 설정 사용 | Use project setting |
| `recontactDays.respectDesc` | 프로젝트의 기본 재접촉 대기일을 따릅니다 | Follow the project's default recontact days |
| `recontactDays.ignore` | 대기 시간 무시 | Ignore waiting time |
| `recontactDays.ignoreDesc` | 대기 시간 없이 즉시 표시합니다 | Show immediately without waiting |
| `recontactDays.overwrite` | 커스텀 대기 시간 | Custom waiting time |
| `recontactDays.overwriteDesc` | 이 설문에 대한 커스텀 대기일을 설정합니다 | Set custom waiting days for this survey |
| `recontactDays.days` | 일 | days |
| `recontactDays.range` | 1~365일 범위로 입력하세요 | Enter a value between 1 and 365 |
| `autoClose.title` | 자동 닫기 | Auto close |
| `autoClose.description` | 사용자 상호작용 없이 자동으로 닫히는 시간을 설정합니다 | Set time to auto-close without user interaction |
| `autoClose.seconds` | 초 | seconds |
| `autoClose.minValue` | 최소 1초 이상이어야 합니다 | Must be at least 1 second |
| `delay.title` | 표시 지연 | Display delay |
| `delay.description` | 트리거 발생 후 설문이 표시되기까지 대기 시간을 설정합니다 | Set waiting time before showing the survey after trigger |
| `delay.seconds` | 초 | seconds |
| `displayPercentage.title` | 확률 기반 표시 | Percentage-based display |
| `displayPercentage.description` | 트리거 발생 시 설문이 표시될 확률을 설정합니다 | Set the probability of showing the survey when triggered |
| `displayPercentage.percent` | % | % |
| `displayPercentage.range` | 0.01~100 범위로 입력하세요 | Enter a value between 0.01 and 100 |
| `override.title` | 프로젝트 설정 오버라이드 | Project setting overrides |
| `override.useProjectSetting` | 프로젝트 설정 사용 | Use project setting |
| `override.useCustom` | 커스텀 설정 | Custom setting |
| `override.brandColor` | 브랜드 색상 | Brand color |
| `override.highlightBorderColor` | 강조 테두리 색상 | Highlight border color |
| `override.placement` | 위치 | Position |
| `override.clickOutsideClose` | 외부 클릭 시 닫기 | Close on outside click |
| `override.overlay` | 오버레이 | Overlay |
