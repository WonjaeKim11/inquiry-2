> ⚠️ @coltorapps/builder 기반 재작성 (2026-02-22)

# 기능 구현 계획: 설문 편집기 UX (FS-010) -- @coltorapps/builder 기반

## 1. 명세서 분석 요약

### 1.1 핵심 요구사항

| 기능 ID | 기능명 | 설명 | 우선순위 |
|---------|--------|------|---------|
| FN-010-01 | 편집기 레이아웃 | SurveyMenuBar + 메인 편집 영역(2/3) + 실시간 프리뷰(1/3) 3분할 레이아웃. md(768px) 미만 시 프리뷰 숨김 | 필수 |
| FN-010-02 | 편집기 탭 전환 | 4개 탭(Elements, Styling, Settings, Follow-Ups). CX 모드 시 Settings 숨김, 스타일 오버라이드 미허용 시 Styling 숨김 | 필수 |
| FN-010-03 | SurveyMenuBar | 설문 이름 인라인 편집, 자동 저장 표시기, Save as Draft / Publish / Update 버튼. 발행 시 유효성 검증 | 필수 |
| FN-010-04 | Block 구조 관리 | Block 추가/삭제/복제/이동, Block 이름 자동 넘버링("Block {N}"), 최소 1개 Element 유지 | 필수 |
| FN-010-05 | Block Logic 편집 | ConditionGroup 기반 조건부 로직 편집. calculate/requireAnswer/jumpToBlock 3가지 액션. Fallback 설정 | 필수 |
| FN-010-06 | Elements View | 다국어 설정 > Welcome Card > Block 목록 > Ending Cards > Hidden Fields > Survey Variables 순서 배치 | 필수 |
| FN-010-07 | 드래그 앤 드롭 | Block/Element/Ending Card 순서 변경. @dnd-kit 기반 (PointerSensor, closestCorners, verticalListSortingStrategy) | 필수 |
| FN-010-08 | Welcome Card 편집 | 7가지 속성(enabled, headline, subtitle, fileUrl, buttonLabel, showResponseCount, timeToFinish). 버튼 라벨 48자 제한 | 필수 |
| FN-010-09 | Ending Card 관리 | endScreen/redirectToUrl 2유형. OptionsSwitch 전환, 추가/삭제/드래그 앤 드롭. Recall 지원 | 필수 |
| FN-010-10 | BlockCard 렌더링 | Block Header(접기/펼치기, 드래그 핸들, 메뉴) + Body(Element 목록) + 설정(Logic, Labels). 15가지 Element Type별 Form 매핑 | 필수 |
| FN-010-11 | Element ID 편집 | 영문/숫자/하이픈/언더스코어 패턴, 금지 ID, 중복 검사. Draft 또는 isDraft=true인 Element만 편집 가능 | 필수 |
| FN-010-12 | Hidden Fields 카드 | enabled 토글, Field ID 추가/삭제, ID 유효성 검증(금지 ID, 패턴, 중복) | 필수 |
| FN-010-13 | Survey Variables 카드 | number/text 변수 추가/편집/삭제, Logic 참조 경고 | 필수 |
| FN-010-14 | Validation Rules 편집기 | Element 유형별 적용 가능 규칙 필터링, AND/OR 로직, Address/ContactInfo 필드 선택 | 필수 |
| FN-010-15 | Settings View | 배포 방식, 트리거, 응답 옵션, 재접촉, 배치, 타겟팅 6개 설정 카드 | 필수 |
| FN-010-16 | Styling View | 폼 스타일, 로고, 배경(애니메이션/색상/이미지) 설정. Unsplash 이미지 검색 통합 | 선택 |
| FN-010-17 | 실시간 프리뷰 | app: modal / link: fullwidth 모드. 활성 Element 자동 스크롤. 선택 언어 반영 | 필수 |

### 1.2 비기능 요구사항

| NFR ID | 항목 | 요구사항 |
|--------|------|---------|
| NFR-010-01 | 자동 저장 성능 | Builder Store의 이벤트 구독을 활용한 자동 저장. `onEntityAdded`/`onEntityUpdated`/`onEntityDeleted` 이벤트 감시 + debounce |
| NFR-010-02 | 애니메이션 | 목록 변경(Block/Element/Ending) 시 부드러운 애니메이션 제공 |
| NFR-010-03 | 반응형 | md(768px) 브레이크포인트에서 프리뷰 패널 숨김 |
| NFR-010-04 | 접근성 | 접기/펼치기 컴포넌트에 aria-expanded 상태 반영 |
| NFR-010-05 | UX 안전장치 | 삭제 전 확인 모달, Logic 참조 중 삭제 시 경고 토스트 |
| NFR-010-06 | 실시간 프리뷰 | Builder Store 데이터 변경을 `useBuilderStoreData`로 구독하여 프리뷰에 실시간 반영 |
| NFR-010-07 | 선택적 리렌더링 | `useBuilderStoreData`의 `shouldUpdate` 옵션으로 Entity별 최소 리렌더링 보장 |

### 1.3 명세서 내 모호한 점 및 해석

| 항목 | 모호한 점 | 해석/결정 |
|------|----------|----------|
| 상태 관리 전략 | 편집기의 전역 상태 관리 방식이 명세에 정의되지 않음 | **`@coltorapps/builder`의 `useBuilderStore` 훅이 핵심 상태관리를 담당한다.** Block/Element 데이터는 Builder Schema(entities + root)로 관리하고, WelcomeCard/Endings/HiddenFields/Variables/편집기 UI 상태(activeTab, activeElementId 등)는 별도 `EditorUIContext`로 관리한다 |
| WelcomeCard/Ending/HiddenFields/Variables의 Builder Entity 포함 여부 | Builder Schema 내부 Entity로 관리할지, 외부 별도 상태로 관리할지 | **Builder Schema 외부 상태로 관리한다.** 이유: (1) WelcomeCard는 단일 인스턴스로 Entity의 다수 인스턴스 패턴과 맞지 않음, (2) HiddenFields/Variables는 UI에 렌더링되지 않는 메타데이터이므로 Builder의 Entity 렌더링 파이프라인에 적합하지 않음, (3) Ending Cards는 Block 계층 외부에 독립 배치되므로 root 구조에 혼재시키면 DnD 로직이 복잡해짐 |
| 드래그 앤 드롭 라이브러리 | 명세에서 "포인터 센서", "closestCorners" 등 용어 사용 | `@dnd-kit/core` + `@dnd-kit/sortable`을 사용한다. Builder Store의 `setData`를 통한 immutable 업데이트와 통합한다 |
| 다국어 설정 카드 | 상세 동작이 FS-015에 위임 | 설문 언어 목록 표시와 편집 언어 선택 드롭다운의 최소 UI만 구현한다 |
| Follow-Ups 탭 | 내부 컨텐츠 미정의 | 레이아웃과 탭 전환만 구현. Pro 배지 + "Coming Soon" 플레이스홀더 |
| Settings View 6개 카드 | 각 카드의 내부 속성이 FSD-016~FSD-020에 분산 | 6개 카드의 외형(접기/펼치기)과 기본 설문 유형 전환만 구현 |
| Styling View 상세 | CSS 속성 상세가 명세 범위에서 제외 | 폼 스타일/로고/배경의 기본 UI 프레임만 구현 |
| Element 추가 시 유형 선택 UI | 구체적 동작 미정의 | 드롭다운으로 15가지 Element 유형 목록을 표시하고, 선택 시 `builderStore.addEntity`로 기본값 Entity를 추가한다 |
| 프리뷰 컴포넌트 | 프리뷰 렌더링 엔진 존재 여부 불명확 | `useInterpreterStore`를 사용하여 Builder Schema를 실시간으로 해석하는 프리뷰를 구현한다. 초기에는 읽기 전용 심플 프리뷰로 시작하고, 설문 응답 런타임 엔진(FSD-021) 구현 후 완전한 인터랙티브 프리뷰로 교체 |
| CTA 버튼/설정 바로가기 | 구체적 UI 위치/형태 미명시 | 메뉴바 우측에 Settings 아이콘 버튼을 배치하여 Settings 탭으로 전환 |

### 1.4 암묵적 요구사항

| 항목 | 설명 |
|------|------|
| @coltorapps/builder 패키지 도입 | `@coltorapps/builder` (core) + `@coltorapps/builder-react` (React 바인딩) 설치. Survey Builder 정의 필요 |
| Survey Builder 정의 (packages/survey-builder/) | Block Entity, 15가지 Element Entity, 각 Attribute 정의, Builder 생성. CUID 기반 ID 생성 설정 |
| @dnd-kit 라이브러리 도입 | `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` 패키지 설치 |
| shadcn/ui 추가 컴포넌트 | Switch, Tabs, DropdownMenu, Dialog, Collapsible, Select, Tooltip, Toast 등 추가 도입 |
| EditorUIContext (보조 상태) | Builder Store가 관리하지 않는 편집기 UI 상태(activeTab, activeElementId, autoSaveStatus, invalidElements, editorConfig)를 위한 경량 Context |
| SurveyMetaContext (비-Entity 데이터) | WelcomeCard, Endings, HiddenFields, Variables 등 Builder Schema 외부 데이터를 위한 별도 Context |
| FS-008/009/012/013 선행 의존 | Survey 모델, Element 스키마, 로직 유틸리티, 변수/히든 필드 유틸리티가 사전에 구현되어야 함 |
| 편집기 라우트 생성 | `apps/client/src/app/[lng]/surveys/[surveyId]/edit/page.tsx` 라우트 필요 |
| 파일 업로드 서비스 연동 | Welcome Card/Ending Card 이미지 업로드를 위한 파일 업로드 기능 필요 |
| i18n 번역 키 대량 추가 | 편집기 UI의 모든 라벨, 플레이스홀더, 버튼, 오류 메시지, 토스트 메시지 번역 키 추가 (150+ 키) |

---

## 2. 기술 설계

### 2.1 아키텍처 개요

본 기능은 **@coltorapps/builder 기반 클라이언트 중심 UI 구현**이다. 기존 계획의 Context + useReducer 패턴을 Builder Store로 대체하여, Entity CRUD/순서변경/속성편집을 라이브러리 내장 메서드로 처리한다.

**핵심 아키텍처 결정: 3계층 상태 관리**

```
계층 1: Builder Store (useBuilderStore)
  - Block Entity, Element Entity (15종)의 CRUD, 속성 편집, 순서 변경
  - Schema 구조: { entities: { [id]: { type, attributes, parentId, children } }, root: [...blockIds] }
  - Block은 root 레벨 Entity, Element는 Block의 자식 Entity

계층 2: SurveyMetaContext (useReducer)
  - WelcomeCard, Endings[], HiddenFields, Variables[] 등 Builder Schema 외부 데이터
  - 설문 이름, 상태(draft/inProgress 등), 유형(app/link) 등 Survey 메타데이터

계층 3: EditorUIContext (useState/useReducer)
  - activeTab, activeElementId, autoSaveStatus, invalidElements
  - editorConfig (isCxMode, isStyleOverrideAllowed, selectedLanguage)
  - expandedBlockIds
```

**디렉터리 구조:**

```
packages/survey-builder/                     # [신규] Survey Builder 정의 (core, 서버/클라이언트 공유)
├── src/
│   ├── index.ts                             # 퍼블릭 API 엑스포트
│   ├── builder.ts                           # createBuilder 호출 (surveyBuilder 인스턴스)
│   ├── attributes/                          # 재사용 가능한 Attribute 정의
│   │   ├── headline.ts                      # LocalizedString 제목
│   │   ├── required.ts                      # 필수 여부 boolean
│   │   ├── placeholder.ts                   # 플레이스홀더 텍스트
│   │   ├── button-label.ts                  # 버튼 라벨 (48자 제한)
│   │   ├── description.ts                   # 설명/부제목
│   │   ├── shuffle.ts                       # 셔플 여부
│   │   ├── choices.ts                       # 선택지 배열
│   │   ├── scale-range.ts                   # 척도 범위 (NPS, Rating)
│   │   ├── sub-fields.ts                    # 서브 필드 설정 (Address, ContactInfo)
│   │   ├── file-config.ts                   # 파일 업로드 설정
│   │   ├── matrix-config.ts                 # 행렬 설정
│   │   ├── validation-rules.ts              # ValidationRule[]
│   │   ├── element-id.ts                    # 커스텀 Element ID
│   │   ├── is-draft.ts                      # isDraft 플래그
│   │   └── index.ts                         # 전체 Attribute 엑스포트
│   └── entities/                            # Entity 정의
│       ├── block.entity.ts                  # Block Entity (children: Element들)
│       ├── open-text.entity.ts              # openText Element
│       ├── multiple-choice.entity.ts        # multipleChoiceSingle/Multi
│       ├── nps.entity.ts                    # NPS
│       ├── cta.entity.ts                    # CTA
│       ├── rating.entity.ts                 # Rating
│       ├── consent.entity.ts                # Consent
│       ├── picture-selection.entity.ts      # PictureSelection
│       ├── date.entity.ts                   # Date
│       ├── file-upload.entity.ts            # FileUpload
│       ├── cal.entity.ts                    # Cal
│       ├── matrix.entity.ts                 # Matrix
│       ├── address.entity.ts                # Address
│       ├── ranking.entity.ts                # Ranking
│       ├── contact-info.entity.ts           # ContactInfo
│       └── index.ts                         # 전체 Entity 엑스포트

libs/client/survey-editor/                   # [신규] 설문 편집기 클라이언트 라이브러리
├── src/
│   ├── index.ts                             # 퍼블릭 API 엑스포트
│   └── lib/
│       ├── context/
│       │   ├── editor-ui.context.tsx         # 편집기 UI 상태 Context (탭, 활성 요소 등)
│       │   ├── survey-meta.context.tsx       # Survey 메타데이터 Context (WelcomeCard, Endings 등)
│       │   └── types.ts                     # Context 타입 정의
│       ├── hooks/
│       │   ├── use-editor-ui.ts             # EditorUI Context 접근 훅
│       │   ├── use-survey-meta.ts           # SurveyMeta Context 접근 훅
│       │   ├── use-auto-save.ts             # Builder Store 이벤트 기반 자동 저장 훅
│       │   ├── use-survey-publish.ts        # 발행 유효성 검증 + 발행 훅
│       │   └── use-active-element.ts        # 활성 Element ID 관리 훅
│       ├── components/
│       │   ├── layout/
│       │   │   ├── SurveyEditorLayout.tsx   # 3분할 레이아웃 컨테이너
│       │   │   ├── SurveyMenuBar.tsx        # 상단 메뉴바
│       │   │   └── EditorTabs.tsx           # 4탭 전환 컴포넌트
│       │   ├── elements-view/
│       │   │   ├── ElementsView.tsx         # Elements 탭 메인 뷰 (BuilderEntities 사용)
│       │   │   ├── LanguageSettingsCard.tsx  # 다국어 설정 카드
│       │   │   ├── WelcomeCardEditor.tsx    # Welcome Card 편집기 (SurveyMetaContext)
│       │   │   ├── BuilderCanvas.tsx        # DndContext + SortableContext + BuilderEntities 래핑
│       │   │   ├── BlockComponent.tsx       # createEntityComponent(blockEntity) 기반 Block 카드
│       │   │   ├── BlockHeader.tsx          # Block 헤더 (드래그 핸들, 메뉴)
│       │   │   ├── BlockSettings.tsx        # Block 설정 (Labels, Logic, Fallback)
│       │   │   ├── BlockLogicEditor.tsx     # Block Logic 편집 UI
│       │   │   ├── EndingCardEditor.tsx     # Ending Card 편집기 (SurveyMetaContext)
│       │   │   ├── EndingCardList.tsx       # Ending Card 목록 + DnD
│       │   │   ├── HiddenFieldsCard.tsx     # Hidden Fields 편집기 (SurveyMetaContext)
│       │   │   ├── SurveyVariablesCard.tsx  # Survey Variables 편집기 (SurveyMetaContext)
│       │   │   ├── ElementComponent.tsx     # Element 공통 래퍼 (createEntityComponent 기반)
│       │   │   ├── ElementCardMenu.tsx      # Element 카드 메뉴 (복제/삭제/이동)
│       │   │   ├── ElementIdEditor.tsx      # Element ID 편집 UI
│       │   │   ├── ValidationRulesEditor.tsx # Validation Rules 편집 UI
│       │   │   ├── AddElementButton.tsx     # Element 추가 (builderStore.addEntity 호출)
│       │   │   └── entity-components/       # 15가지 Element Type별 Builder 컴포넌트
│       │   │       ├── OpenTextComponent.tsx
│       │   │       ├── MultipleChoiceComponent.tsx
│       │   │       ├── NPSComponent.tsx
│       │   │       ├── CTAComponent.tsx
│       │   │       ├── RatingComponent.tsx
│       │   │       ├── ConsentComponent.tsx
│       │   │       ├── PictureSelectionComponent.tsx
│       │   │       ├── DateComponent.tsx
│       │   │       ├── FileUploadComponent.tsx
│       │   │       ├── CalComponent.tsx
│       │   │       ├── MatrixComponent.tsx
│       │   │       ├── AddressComponent.tsx
│       │   │       ├── RankingComponent.tsx
│       │   │       ├── ContactInfoComponent.tsx
│       │   │       └── index.ts             # Entity Type -> Component 매핑
│       │   ├── settings-view/
│       │   │   ├── SettingsView.tsx
│       │   │   ├── DeploymentCard.tsx
│       │   │   ├── TriggerCard.tsx
│       │   │   ├── ResponseOptionsCard.tsx
│       │   │   ├── RecontactCard.tsx
│       │   │   ├── PlacementCard.tsx
│       │   │   └── TargetingCard.tsx
│       │   ├── styling-view/
│       │   │   ├── StylingView.tsx
│       │   │   ├── FormStyleCard.tsx
│       │   │   ├── LogoCard.tsx
│       │   │   └── BackgroundCard.tsx
│       │   ├── follow-ups-view/
│       │   │   └── FollowUpsView.tsx
│       │   ├── preview/
│       │   │   ├── SurveyPreview.tsx        # useInterpreterStore 기반 프리뷰
│       │   │   ├── PreviewModal.tsx
│       │   │   └── PreviewFullwidth.tsx
│       │   └── shared/
│       │       ├── OptionsSwitch.tsx
│       │       ├── LocalizedInput.tsx
│       │       ├── FileUploadInput.tsx
│       │       ├── ConfirmDeleteDialog.tsx
│       │       └── AutoSaveIndicator.tsx
│       └── utils/
│           ├── schema-converter.ts          # Survey API 응답 <-> Builder Schema 변환
│           ├── id-validation.ts             # ID 유효성 검증 (금지 ID, 패턴, 중복)
│           ├── block-numbering.ts           # Block 이름 자동 넘버링
│           └── survey-validation.ts         # 발행 시 유효성 검증 (클라이언트)

apps/client/src/app/[lng]/surveys/
└── [surveyId]/
    └── edit/
        └── page.tsx                         # 설문 편집기 진입점
```

**데이터 흐름:**

```
[서버: Survey CRUD API (FS-008)]
       ^    |
       |    v
[schema-converter] ← Survey API 응답을 Builder Schema + Meta 데이터로 변환
       |
       ├──→ [useBuilderStore(surveyBuilder, { initialData: { schema } })]
       │         │
       │         ├── builderStore.addEntity()     ← Element/Block 추가
       │         ├── builderStore.deleteEntity()   ← Element/Block 삭제
       │         ├── builderStore.cloneEntity()    ← Element/Block 복제
       │         ├── builderStore.setEntityAttributeValue() ← 속성 편집
       │         ├── builderStore.setData()        ← DnD 순서 변경 (root/children 배열 업데이트)
       │         │
       │         ├──→ [BuilderEntities + createEntityComponent]
       │         │         ├── BlockComponent (root 레벨)
       │         │         │    └── ElementComponent (children)
       │         │         │         ├── OpenTextComponent
       │         │         │         ├── MultipleChoiceComponent
       │         │         │         └── ... (15종)
       │         │
       │         ├──→ [SurveyPreview] ← useBuilderStoreData로 실시간 구독
       │         │
       │         └──→ [useAutoSave] ← Store 이벤트 구독 (onEntityAdded, onEntityUpdated 등)
       │
       ├──→ [SurveyMetaContext]
       │         ├── welcomeCard, endings[], hiddenFields, variables[]
       │         ├── surveyName, surveyStatus, surveyType
       │         └── useAutoSave에서 함께 감시
       │
       └──→ [EditorUIContext]
                 ├── activeTab, activeElementId
                 ├── autoSaveStatus, invalidElements
                 └── editorConfig (isCxMode, isStyleOverrideAllowed, selectedLanguage)
```

**설계 근거:**

1. **Builder Store가 핵심 상태관리 대체**: 기존 계획의 `SurveyEditorContext + useReducer + 40+ 액션 타입`을 `useBuilderStore`의 내장 메서드(`addEntity`, `deleteEntity`, `cloneEntity`, `setEntityAttributeValue`, `setData`)로 대체한다. 이로 인해 커스텀 Reducer 코드 약 500줄이 제거되고, Entity CRUD 유틸리티 파일(`block-utils.ts`, `element-utils.ts`)이 불필요해진다.

2. **3계층 상태 분리**: Builder Store는 Block/Element의 구조적 데이터만 담당하고, WelcomeCard/Endings/HiddenFields/Variables 같은 비-Entity 데이터는 `SurveyMetaContext`에, 편집기 UI 전용 상태는 `EditorUIContext`에 분리한다. 이는 관심사 분리를 명확히 하면서도 Builder 라이브러리의 Entity/Schema 패턴을 자연스럽게 활용한다.

3. **createEntityComponent 기반 컴포넌트 자동 매핑**: 기존의 수동 `elementFormMap` + `BlockCard`/`BlockBody` 패턴 대신, `BuilderEntities` 컴포넌트가 Entity type별로 적절한 컴포넌트를 자동 렌더링한다. Block의 `children` 배열에 포함된 Element Entity들도 자동으로 중첩 렌더링된다.

4. **이벤트 기반 자동 저장**: 기존의 Ref 기반 10초 간격 폴링 대신, Builder Store의 이벤트 구독(`onEntityAdded`, `onEntityAttributeUpdated`, `onEntityDeleted` 등)과 SurveyMetaContext의 변경을 debounce하여 자동 저장을 트리거한다. 이 방식이 변경 감지 정확도가 높고 불필요한 저장 요청을 줄인다.

5. **CUID 기반 ID 생성**: Builder 정의에서 `generateEntityId`를 CUID 생성기로 설정하여, 명세의 CUID 요구사항을 Builder 레벨에서 해결한다.

6. **선택적 리렌더링**: `useBuilderStoreData`의 `shouldUpdate` 옵션을 활용하여, 각 컴포넌트가 자신에게 관련된 Entity 변경에만 반응하도록 최적화한다. 대규모 설문(수십 개 Element) 편집 시 성능 저하를 방지한다.

### 2.2 데이터 모델

#### 2.2.1 DB 스키마 변경

FS-010은 **순수 클라이언트 UI 구현**이므로 Prisma 스키마 변경 없음. 서버 측 설문 데이터 모델은 FS-008에서 이미 정의된 Survey 모델을 그대로 사용한다.

#### 2.2.2 Survey Builder Schema (Builder Store가 관리)

```typescript
// packages/survey-builder/src/builder.ts

import { createBuilder } from "@coltorapps/builder";
import { createId, isCuid } from "@paralleldrive/cuid2";
import { blockEntity } from "./entities/block.entity";
import { openTextEntity } from "./entities/open-text.entity";
import { multipleChoiceEntity } from "./entities/multiple-choice.entity";
// ... 15가지 Element Entity import

/**
 * Survey Builder 인스턴스.
 * Block을 root 레벨 Entity로, Element를 Block의 자식 Entity로 정의한다.
 * CUID 기반 ID 생성을 사용하여 명세의 CUID 요구사항을 충족한다.
 */
export const surveyBuilder = createBuilder({
  entities: [
    blockEntity,
    openTextEntity,
    multipleChoiceEntity,
    npsEntity,
    ctaEntity,
    ratingEntity,
    consentEntity,
    pictureSelectionEntity,
    dateEntity,
    fileUploadEntity,
    calEntity,
    matrixEntity,
    addressEntity,
    rankingEntity,
    contactInfoEntity,
  ],
  // CUID 기반 Entity ID 생성
  generateEntityId() {
    return createId();
  },
  validateEntityId(id) {
    if (!isCuid(id)) {
      throw new Error(`Invalid entity ID format: ${id}`);
    }
  },
  // Entity 계층 제약 조건
  entitiesExtensions: {
    block: {
      childrenAllowed: [
        "openText", "multipleChoiceSingle", "multipleChoiceMulti",
        "nps", "cta", "rating", "consent", "pictureSelection",
        "date", "fileUpload", "cal", "matrix", "address",
        "ranking", "contactInfo",
      ],
    },
    openText: { parentRequired: true, allowedParents: ["block"] },
    multipleChoiceSingle: { parentRequired: true, allowedParents: ["block"] },
    multipleChoiceMulti: { parentRequired: true, allowedParents: ["block"] },
    nps: { parentRequired: true, allowedParents: ["block"] },
    cta: { parentRequired: true, allowedParents: ["block"] },
    rating: { parentRequired: true, allowedParents: ["block"] },
    consent: { parentRequired: true, allowedParents: ["block"] },
    pictureSelection: { parentRequired: true, allowedParents: ["block"] },
    date: { parentRequired: true, allowedParents: ["block"] },
    fileUpload: { parentRequired: true, allowedParents: ["block"] },
    cal: { parentRequired: true, allowedParents: ["block"] },
    matrix: { parentRequired: true, allowedParents: ["block"] },
    address: { parentRequired: true, allowedParents: ["block"] },
    ranking: { parentRequired: true, allowedParents: ["block"] },
    contactInfo: { parentRequired: true, allowedParents: ["block"] },
  },
  // 스키마 수준 유효성 검증: 최소 1개 Block, 각 Block에 최소 1개 Element
  validateSchema(schema) {
    if (schema.root.length === 0) {
      throw new Error("설문에 최소 1개 Block이 필요합니다.");
    }
    for (const blockId of schema.root) {
      const block = schema.entities[blockId];
      if (!block?.children || block.children.length === 0) {
        throw new Error(`Block ${blockId}에 최소 1개 Element가 필요합니다.`);
      }
    }
    return schema;
  },
});
```

**Builder Schema 구조 예시:**

```typescript
// Builder Store가 관리하는 데이터
const builderSchema = {
  entities: {
    "block-cuid-1": {
      type: "block",
      attributes: {
        name: "Block 1",
        buttonLabel: { ko: "다음", en: "Next" },
        backButtonLabel: { ko: "이전", en: "Back" },
        logic: [],              // BlockLogic[]
        logicFallback: null,    // string | null
      },
      parentId: null,
      children: ["elem-cuid-1", "elem-cuid-2"],
    },
    "elem-cuid-1": {
      type: "openText",
      attributes: {
        headline: { ko: "이름을 입력하세요", en: "Enter your name" },
        required: true,
        placeholder: { ko: "이름", en: "Name" },
        inputType: "text",
        longAnswer: false,
        charLimit: null,
        validationRules: [],
        elementId: "elem-cuid-1",  // 커스텀 ID (편집 가능)
        isDraft: false,
      },
      parentId: "block-cuid-1",
    },
    // ... 더 많은 Entity들
  },
  root: ["block-cuid-1", "block-cuid-2"], // Block ID들만 root에 포함
};
```

#### 2.2.3 Survey Meta 상태 (SurveyMetaContext가 관리)

```typescript
// libs/client/survey-editor/src/lib/context/types.ts

/** Survey Meta 상태 - Builder Schema 외부 데이터 */
interface SurveyMetaState {
  /** 설문 ID */
  surveyId: string;
  /** 설문 이름 */
  surveyName: string;
  /** 설문 상태 */
  surveyStatus: "draft" | "inProgress" | "paused" | "completed";
  /** 설문 유형 */
  surveyType: "app" | "link";
  /** Welcome Card 데이터 */
  welcomeCard: WelcomeCard;
  /** Ending Cards 목록 */
  endings: EndingCard[];
  /** Hidden Fields 설정 */
  hiddenFields: { enabled: boolean; fieldIds: string[] };
  /** Survey Variables 목록 */
  variables: Variable[];
  /** 설문 스타일 설정 */
  styling: SurveyStyling;
  /** 설문 설정 (배포, 트리거, 응답 등) */
  settings: SurveySettings;
}

/** Survey Meta 액션 (Discriminated Union) */
type SurveyMetaAction =
  | { type: "UPDATE_SURVEY_NAME"; payload: string }
  | { type: "UPDATE_WELCOME_CARD"; payload: Partial<WelcomeCard> }
  | { type: "ADD_ENDING"; payload?: { type?: "endScreen" | "redirectToUrl" } }
  | { type: "DELETE_ENDING"; payload: { endingId: string } }
  | { type: "UPDATE_ENDING"; payload: { endingId: string; updates: Partial<EndingCard> } }
  | { type: "REORDER_ENDINGS"; payload: { activeId: string; overId: string } }
  | { type: "UPDATE_HIDDEN_FIELDS"; payload: Partial<{ enabled: boolean; fieldIds: string[] }> }
  | { type: "ADD_HIDDEN_FIELD"; payload: { fieldId: string } }
  | { type: "DELETE_HIDDEN_FIELD"; payload: { fieldId: string } }
  | { type: "ADD_VARIABLE"; payload: { type: "number" | "text" } }
  | { type: "UPDATE_VARIABLE"; payload: { variableId: string; updates: Partial<Variable> } }
  | { type: "DELETE_VARIABLE"; payload: { variableId: string } }
  | { type: "UPDATE_STYLING"; payload: Partial<SurveyStyling> }
  | { type: "UPDATE_SETTINGS"; payload: Partial<SurveySettings> };
```

#### 2.2.4 편집기 UI 상태 (EditorUIContext가 관리)

```typescript
// libs/client/survey-editor/src/lib/context/types.ts

/** 편집기 탭 유형 */
type EditorTab = "elements" | "styling" | "settings" | "followUps";

/** 자동 저장 상태 */
type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

/** 편집기 UI 상태 */
interface EditorUIState {
  activeTab: EditorTab;
  activeElementId: string | null;
  autoSaveStatus: AutoSaveStatus;
  invalidElements: string[];
  editorConfig: {
    isCxMode: boolean;
    isStyleOverrideAllowed: boolean;
    selectedLanguage: string;
  };
  expandedBlockIds: Set<string>;
}
```

### 2.3 API 설계

FS-010은 클라이언트 UI 구현이므로 신규 API를 정의하지 않는다. FS-008에서 정의한 기존 API를 사용한다.

**사용하는 API 목록 (FS-008에서 제공)**:

| 메서드 | 경로 | 용도 |
|--------|------|------|
| GET | `/surveys/:id` | 설문 데이터 로드 |
| PUT | `/surveys/:id` | 설문 데이터 저장 (자동 저장/수동 저장) |
| POST | `/surveys/:id/publish` | 설문 발행 (유효성 검증 포함) |

**Schema 변환 흐름**: API 응답의 Survey 객체를 Builder Schema + SurveyMeta로 분리하는 변환 함수가 필요하다.

```typescript
// libs/client/survey-editor/src/lib/utils/schema-converter.ts

/**
 * Survey API 응답을 Builder Schema + SurveyMeta로 분리한다.
 * - blocks[].elements[] 구조를 Builder의 flat entities + root/children 구조로 변환
 * - welcomeCard, endings, hiddenFields, variables는 SurveyMeta로 분리
 */
function surveyToBuilderData(survey: Survey): {
  schema: BuilderSchema;
  meta: SurveyMetaState;
} {
  const entities: Record<string, BuilderEntity> = {};
  const root: string[] = [];

  survey.blocks.forEach((block) => {
    entities[block.id] = {
      type: "block",
      attributes: {
        name: block.name,
        buttonLabel: block.buttonLabel,
        backButtonLabel: block.backButtonLabel,
        logic: block.logic,
        logicFallback: block.logicFallback,
      },
      parentId: null,
      children: block.elements.map((el) => el.id),
    };
    root.push(block.id);

    block.elements.forEach((element) => {
      entities[element.id] = {
        type: element.type,
        attributes: elementToAttributes(element),
        parentId: block.id,
      };
    });
  });

  return {
    schema: { entities, root },
    meta: {
      surveyId: survey.id,
      surveyName: survey.name,
      surveyStatus: survey.status,
      surveyType: survey.type,
      welcomeCard: survey.welcomeCard,
      endings: survey.endings,
      hiddenFields: survey.hiddenFields,
      variables: survey.variables,
      styling: survey.styling,
      settings: survey.settings,
    },
  };
}

/**
 * Builder Schema + SurveyMeta를 다시 Survey API 요청 형식으로 조합한다.
 * - 자동 저장/수동 저장 시 서버에 전송할 데이터 생성
 */
function builderDataToSurvey(
  schema: BuilderSchema,
  meta: SurveyMetaState
): Survey {
  // flat entities -> blocks[].elements[] 계층 구조로 복원
  // ...
}
```

### 2.4 주요 컴포넌트 설계

#### 2.4.1 편집기 최상위 (Builder Store + Context Provider)

```typescript
// apps/client/src/app/[lng]/surveys/[surveyId]/edit/page.tsx

/**
 * 설문 편집기 진입점.
 * Survey API에서 데이터를 로드하고, Builder Schema와 Meta 데이터로 분리하여
 * 각 Provider에 주입한다.
 */
async function SurveyEditPage({ params }: { params: { surveyId: string; lng: string } }) {
  const survey = await fetchSurvey(params.surveyId);
  const { schema, meta } = surveyToBuilderData(survey);

  return (
    <SurveyEditorShell initialSchema={schema} initialMeta={meta} />
  );
}

// "use client" 컴포넌트
function SurveyEditorShell({ initialSchema, initialMeta }) {
  const builderStore = useBuilderStore(surveyBuilder, {
    initialData: {
      schema: initialSchema,
      entitiesAttributesErrors: {},
      schemaError: null,
    },
    events: {
      onEntityAdded(event) { /* 자동 저장 트리거 */ },
      onEntityDeleted(event) { /* 자동 저장 트리거 */ },
      onEntityAttributeUpdated(event) { /* 자동 저장 트리거 */ },
    },
  });

  return (
    <EditorUIProvider>
      <SurveyMetaProvider initialMeta={initialMeta}>
        <SurveyEditorLayout builderStore={builderStore} />
      </SurveyMetaProvider>
    </EditorUIProvider>
  );
}
```

#### 2.4.2 useAutoSave 훅 (이벤트 기반 자동 저장)

```typescript
// libs/client/survey-editor/src/lib/hooks/use-auto-save.ts

/**
 * Builder Store 이벤트와 SurveyMeta 변경을 감시하여 자동 저장을 수행하는 훅.
 *
 * 기존 계획의 Ref 기반 10초 폴링 대신, 이벤트 기반 debounce 패턴을 사용한다.
 * - Builder Store: useBuilderStore의 events 옵션으로 변경 이벤트를 수신
 * - SurveyMeta: useEffect로 meta 상태 변경을 감시
 * - 변경 감지 시 debounce(10초)로 저장 요청을 배치 처리
 * - 탭 비활성/페이지 이탈 시 즉시 저장 (beforeunload, visibilitychange)
 */
function useAutoSave(
  builderStore: BuilderStoreInstance,
  meta: SurveyMetaState,
  dispatch: Dispatch<EditorUIAction>
) {
  const pendingSaveRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const triggerSave = useCallback(() => {
    if (pendingSaveRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      pendingSaveRef.current = true;
      dispatch({ type: "SET_AUTO_SAVE_STATUS", payload: "saving" });
      try {
        const schema = builderStore.getData().schema;
        const surveyData = builderDataToSurvey(schema, meta);
        await updateSurvey(meta.surveyId, surveyData);
        dispatch({ type: "SET_AUTO_SAVE_STATUS", payload: "saved" });
      } catch {
        dispatch({ type: "SET_AUTO_SAVE_STATUS", payload: "error" });
      } finally {
        pendingSaveRef.current = false;
      }
    }, 10_000);
  }, [builderStore, meta, dispatch]);

  // 페이지 이탈 시 즉시 저장
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        // 동기적 저장 시도 (sendBeacon)
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  return { triggerSave };
}
```

#### 2.4.3 BuilderCanvas (DnD + BuilderEntities 통합)

```typescript
// libs/client/survey-editor/src/lib/components/elements-view/BuilderCanvas.tsx

/**
 * DndContext와 BuilderEntities를 통합하는 캔버스 컴포넌트.
 *
 * Block 레벨 DnD: root 배열의 순서를 변경
 * Element 레벨 DnD: 각 Block의 children 배열의 순서를 변경
 *
 * @dnd-kit의 중첩 DndContext 패턴을 사용하여 Block/Element DnD를 구분한다.
 * Builder Store의 setData를 통한 immutable 업데이트로 순서 변경을 반영한다.
 */
function BuilderCanvas({ builderStore }: { builderStore: BuilderStoreInstance }) {
  const data = useBuilderStoreData(builderStore, {
    shouldUpdate: (events) =>
      events.some((e) =>
        e.name === "EntityAdded" || e.name === "EntityDeleted" ||
        e.name === "EntityCloned" || e.name === "DataSet"
      ),
  });

  const sensors = useSensors(useSensor(PointerSensor));

  // Block 순서 변경 핸들러
  function handleBlockDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = data.schema.root.indexOf(String(active.id));
    const newIndex = data.schema.root.indexOf(String(over.id));
    const newRoot = arrayMove(data.schema.root, oldIndex, newIndex);

    builderStore.setData({
      ...builderStore.getData(),
      schema: { ...builderStore.getData().schema, root: newRoot },
    });

    // Block 넘버링 갱신 (Block name 속성을 순서대로 업데이트)
    renumberBlocks(builderStore, newRoot);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleBlockDragEnd}
    >
      <SortableContext items={data.schema.root} strategy={verticalListSortingStrategy}>
        <BuilderEntities
          builderStore={builderStore}
          components={entityComponentMap}
        >
          {(entities) => <div className="space-y-4">{entities}</div>}
        </BuilderEntities>
      </SortableContext>
    </DndContext>
  );
}
```

#### 2.4.4 BlockComponent (createEntityComponent 기반)

```typescript
// libs/client/survey-editor/src/lib/components/elements-view/BlockComponent.tsx

import { createEntityComponent } from "@coltorapps/builder-react";
import { blockEntity } from "@inquiry/survey-builder";

/**
 * Block Entity를 렌더링하는 컴포넌트.
 * createEntityComponent를 사용하여 타입 안전한 entity 속성 접근을 보장한다.
 * children prop을 통해 자식 Element Entity들이 자동으로 렌더링된다.
 */
export const BlockComponent = createEntityComponent(
  blockEntity,
  ({ entity, entityId, children }) => {
    const { expandedBlockIds, toggleBlockExpand } = useEditorUI();

    const isExpanded = expandedBlockIds.has(entityId);

    return (
      <SortableItem id={entityId}>
        <div className="rounded-lg border bg-card">
          <BlockHeader
            entityId={entityId}
            name={entity.attributes.name}
            isExpanded={isExpanded}
            onToggle={() => toggleBlockExpand(entityId)}
          />
          {isExpanded && (
            <>
              {/* children: 자식 Element들이 BuilderEntities에 의해 자동 렌더링됨 */}
              <div className="p-4 space-y-3">
                <ElementDndContext entityId={entityId} builderStore={builderStore}>
                  {children}
                </ElementDndContext>
                <AddElementButton parentBlockId={entityId} />
              </div>
              <BlockSettings entityId={entityId} entity={entity} />
            </>
          )}
        </div>
      </SortableItem>
    );
  }
);
```

#### 2.4.5 Element 추가 (builderStore.addEntity 활용)

```typescript
// libs/client/survey-editor/src/lib/components/elements-view/AddElementButton.tsx

/**
 * Element 추가 버튼.
 * 15가지 Element 유형 목록을 드롭다운으로 표시하고,
 * 선택 시 builderStore.addEntity로 기본값 Entity를 Block의 자식으로 추가한다.
 *
 * 기존 계획의 Element Factory + dispatch(ADD_ELEMENT) 패턴이
 * builderStore.addEntity 단일 호출로 대체된다.
 */
function AddElementButton({ parentBlockId }: { parentBlockId: string }) {
  const builderStore = useBuilderStoreFromContext();
  const { t } = useTranslation();

  const handleAddElement = (elementType: string) => {
    const defaultAttributes = getDefaultAttributes(elementType);
    builderStore.addEntity({
      type: elementType,
      attributes: defaultAttributes,
      parentId: parentBlockId,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          {t("surveyEditor.block.addElement")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {ELEMENT_TYPES.map((type) => (
          <DropdownMenuItem key={type} onClick={() => handleAddElement(type)}>
            {t(`surveyEditor.element.types.${type}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

#### 2.4.6 실시간 프리뷰 (useInterpreterStore 기반)

```typescript
// libs/client/survey-editor/src/lib/components/preview/SurveyPreview.tsx

/**
 * 실시간 프리뷰 컨테이너.
 * useBuilderStoreData로 Builder Store의 현재 schema를 구독하고,
 * useInterpreterStore로 해석하여 응답자 관점의 설문을 렌더링한다.
 *
 * shouldUpdate를 사용하여 프리뷰에 영향을 주는 변경에만 반응한다.
 */
function SurveyPreview({ builderStore }: { builderStore: BuilderStoreInstance }) {
  const { activeElementId, editorConfig } = useEditorUI();
  const meta = useSurveyMeta();

  // Builder Store 데이터를 실시간 구독
  const builderData = useBuilderStoreData(builderStore);

  // Interpreter Store로 프리뷰 렌더링
  const interpreterStore = useInterpreterStore(
    surveyBuilder,
    builderData.schema
  );

  // 설문 유형에 따른 프리뷰 모드
  if (meta.surveyType === "app") {
    return <PreviewModal interpreterStore={interpreterStore} activeElementId={activeElementId} />;
  }
  return <PreviewFullwidth interpreterStore={interpreterStore} activeElementId={activeElementId} />;
}
```

### 2.5 기존 시스템에 대한 영향도 분석

| 영향받는 모듈 | 영향 유형 | 설명 |
|-------------|----------|------|
| `packages/survey-builder/` | **신규 생성** | Survey Builder 정의 (Entity, Attribute, Builder 인스턴스). 서버/클라이언트 공유 패키지 |
| `libs/client/survey/` (FS-008) | 의존 | 설문 API 클라이언트(survey-api.ts) 참조. FS-008에서 정의한 API 호출 함수를 그대로 사용 |
| `packages/shared-types/` (FS-012) | 의존 | Survey, Block, Element, BlockLogic, Variable, HiddenField 등 타입 참조 |
| `packages/survey-schema/` (FS-009) | **부분 대체** | Element 기본값과 유효성 검증이 Builder Attribute로 이전. Zod 스키마는 Attribute의 validate 메서드로 통합 |
| `libs/client/logic-engine/` (FS-012) | 의존 | 로직 유틸리티 함수(addLogicItem, deleteLogicItem 등), ConditionGroup UI 연동 |
| `packages/shared/` (FS-013) | 의존 | ID 유효성 검증, FORBIDDEN_IDS, Recall 파서/에디터 변환 유틸 |
| `libs/client/ui/` | 수정 | shadcn/ui 컴포넌트 추가 (Tabs, Switch, DropdownMenu, Dialog, Collapsible, Select, Toast 등) |
| `apps/client/package.json` | 수정 | `@coltorapps/builder`, `@coltorapps/builder-react`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@paralleldrive/cuid2` 추가 |
| `apps/client/src/app/i18n/locales/` | 수정 | ko/en 번역 파일에 편집기 관련 키 대량 추가 |
| `tsconfig.base.json` | 수정 | `@inquiry/survey-builder`, `@inquiry/client-survey-editor` 경로 별칭 추가 |

**기존 계획 대비 제거/대체되는 항목:**

| 기존 계획 항목 | 변경 | 이유 |
|--------------|------|------|
| `survey-editor.context.tsx` (Context + useReducer) | `useBuilderStore` + `EditorUIContext` + `SurveyMetaContext`로 분리 | Builder Store가 Entity CRUD 상태관리를 내장 |
| `survey-editor.reducer.ts` (40+ 액션 타입) | 삭제 | Block/Element 관련 액션이 `builderStore.addEntity/deleteEntity/cloneEntity/setEntityAttributeValue`로 대체. Meta 관련 액션만 경량 reducer로 유지 |
| `block-utils.ts`, `element-utils.ts`, `ending-utils.ts` | `block-utils.ts`, `element-utils.ts` 삭제 | Builder Store 내장 메서드가 Entity CRUD를 처리. `ending-utils.ts`는 SurveyMetaContext reducer 내부로 흡수 |
| `element-forms/index.ts` (수동 Type-Form 매핑) | `BuilderEntities` + `createEntityComponent` 자동 매핑으로 대체 | 컴포넌트 맵을 `BuilderEntities`에 전달하면 Entity type별 자동 라우팅 |

---

## 3. 구현 계획

### 3.1 작업 분해 구조 (WBS)

| No. | 태스크명 | 설명 | 의존 | 복잡도 | 예상 시간 |
|-----|---------|------|------|--------|----------|
| T-01 | 패키지 설치 및 프로젝트 설정 | `@coltorapps/builder`, `@coltorapps/builder-react`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@paralleldrive/cuid2` 설치. `packages/survey-builder/`, `libs/client/survey-editor/` 생성. tsconfig 경로 별칭 설정 | - | 낮음 | 2h |
| T-02 | shadcn/ui 컴포넌트 추가 | Tabs, Switch, DropdownMenu, Dialog, Collapsible, Select, Tooltip, Toast(Sonner) 도입 | T-01 | 낮음 | 2h |
| T-03 | Builder Attribute 정의 | headline, required, placeholder, buttonLabel, description, shuffle, choices, scaleRange, subFields, fileConfig, matrixConfig, validationRules, elementId, isDraft 등 재사용 가능한 Attribute 생성. Zod 기반 validate 메서드 포함 | T-01 | 높음 | 6h |
| T-04 | Block Entity 정의 | blockEntity: name, buttonLabel, backButtonLabel, logic, logicFallback Attribute로 구성. childrenAllowed 설정 | T-03 | 중간 | 2h |
| T-05 | 15가지 Element Entity 정의 | openText, multipleChoiceSingle/Multi, nps, cta, rating, consent, pictureSelection, date, fileUpload, cal, matrix, address, ranking, contactInfo Entity. 각각 parentRequired: true, allowedParents: ["block"] | T-03 | 높음 | 8h |
| T-06 | Survey Builder 인스턴스 생성 | createBuilder 호출. 모든 Entity 등록, CUID ID 생성, entitiesExtensions, validateSchema 설정 | T-04, T-05 | 중간 | 2h |
| T-07 | Schema 변환 유틸리티 | surveyToBuilderData (API 응답 -> Builder Schema + Meta), builderDataToSurvey (Builder Schema + Meta -> API 요청). 단위 테스트 포함 | T-06 | 높음 | 5h |
| T-08 | ID 유효성 검증 유틸리티 | validateElementId, validateHiddenFieldId (금지 ID, 패턴, 중복). packages/shared 재사용 | T-01 | 중간 | 2h |
| T-09 | Block 넘버링 유틸리티 | renumberBlocks: Builder Store의 root 배열 순서대로 Block name 속성을 "Block {N}" 형식으로 갱신 | T-06 | 낮음 | 1h |
| T-10 | 발행 유효성 검증 유틸리티 | validateSurveyForPublish: Builder Schema + Meta 기반 전체 스키마 검증 | T-07 | 중간 | 3h |
| T-11 | EditorUIContext | 편집기 UI 상태 Context (activeTab, activeElementId, autoSaveStatus, invalidElements, editorConfig, expandedBlockIds) | T-01 | 중간 | 2h |
| T-12 | SurveyMetaContext | WelcomeCard, Endings, HiddenFields, Variables 등 비-Entity 데이터 Context. 경량 reducer | T-01 | 중간 | 3h |
| T-13 | useAutoSave 훅 | Builder Store 이벤트 구독 + SurveyMeta 변경 감시. debounce 10초. 탭 비활성/이탈 감지 시 즉시 저장. 저장 중 중복 방지 | T-11, T-12 | 중간 | 4h |
| T-14 | useActiveElement 훅 | 활성 Element ID 관리, 프리뷰 스크롤 트리거 | T-11 | 낮음 | 1h |
| T-15 | 공유 컴포넌트: LocalizedInput | 다국어 텍스트 입력 컴포넌트. 선택 언어에 따라 입력/표시 전환 | T-02 | 중간 | 3h |
| T-16 | 공유 컴포넌트: OptionsSwitch | 2가지 옵션 전환 스위치 (Ending Card 유형 전환 등) | T-02 | 낮음 | 1h |
| T-17 | 공유 컴포넌트: FileUploadInput | 이미지/비디오 파일 업로드 입력 (png, jpeg, jpg, webp, heic) | T-02 | 중간 | 3h |
| T-18 | 공유 컴포넌트: ConfirmDeleteDialog | 삭제 확인 모달 (Dialog 기반) | T-02 | 낮음 | 1h |
| T-19 | 공유 컴포넌트: AutoSaveIndicator | 자동 저장 상태 표시 (idle/saving/saved/error) | T-02 | 낮음 | 1h |
| T-20 | 편집기 레이아웃 (FN-010-01) | SurveyEditorLayout: 3분할(MenuBar + Editor 2/3 + Preview 1/3). md 미만 프리뷰 숨김 | T-11, T-12 | 중간 | 3h |
| T-21 | SurveyMenuBar (FN-010-03) | 뒤로가기, 설문 이름 인라인 편집, AutoSaveIndicator, Save/Publish/Update 버튼 | T-20, T-19 | 중간 | 4h |
| T-22 | useSurveyPublish 훅 | 발행 유효성 검증(클라이언트), invalidElements 설정, 발행 API 호출 | T-10, T-11 | 중간 | 3h |
| T-23 | EditorTabs (FN-010-02) | 4탭 전환. CX 모드 시 Settings 숨김, 스타일 오버라이드 미허용 시 Styling 숨김. Follow-Ups Pro 배지 | T-20 | 낮음 | 2h |
| T-24 | Elements View 스켈레톤 (FN-010-06) | 구성 요소 배치 순서: 다국어 > Welcome > BuilderCanvas(Blocks) > Endings > Hidden > Variables | T-23 | 낮음 | 2h |
| T-25 | LanguageSettingsCard | 다국어 설정 최소 UI (현재 언어 표시, 언어 선택 드롭다운) | T-24 | 낮음 | 2h |
| T-26 | WelcomeCardEditor (FN-010-08) | 7속성 편집 폼. enabled Switch, headline, subtitle, fileUrl, buttonLabel(48자), showResponseCount(link만), timeToFinish. SurveyMetaContext 사용 | T-24, T-12, T-15 | 중간 | 4h |
| T-27 | BlockComponent (FN-010-10) | createEntityComponent(blockEntity) 기반. 접기/펼치기, 드래그 핸들(GripVertical), Block 이름, 메뉴(복제/삭제/이동). aria-expanded | T-06, T-24 | 중간 | 4h |
| T-28 | BlockHeader | Block 헤더 UI. 드래그 핸들, 접기/펼치기 아이콘, Block 이름, 메뉴 버튼. builderStore.deleteEntity/cloneEntity 호출 | T-27 | 중간 | 3h |
| T-29 | BlockSettings | 버튼 라벨/뒤로가기 버튼 라벨 편집(setEntityAttributeValue), Logic 편집 진입점, Fallback 설정 | T-27 | 중간 | 3h |
| T-30 | BuilderCanvas + Block DnD (FN-010-07) | DndContext + SortableContext + BuilderEntities 통합. Block 간 순서 변경, 자동 넘버링. builderStore.setData로 root 배열 업데이트 | T-27, T-09 | 높음 | 5h |
| T-31 | Element DnD (FN-010-07) | Block 내 Element 간 순서 변경. 중첩 DndContext. builderStore.setData로 children 배열 업데이트 | T-30 | 높음 | 4h |
| T-32 | ElementComponent (공통 래퍼) | Element 공통 래퍼. 카드 메뉴(복제/삭제/이동), 고급 설정 접기/펼치기. createEntityComponent 기반 | T-27 | 중간 | 3h |
| T-33 | AddElementButton | Element 유형 선택 드롭다운. 15가지 유형 목록, builderStore.addEntity 호출 | T-27 | 중간 | 2h |
| T-34 | Entity Component - openText | createEntityComponent(openTextEntity). 입력 유형, 장문/단문, 글자 수 제한, 플레이스홀더. setEntityAttributeValue 사용 | T-32 | 중간 | 3h |
| T-35 | Entity Component - multipleChoice | multipleChoiceSingle/Multi 공용. 선택지 CRUD, list/dropdown, Shuffle, Other 옵션 | T-32 | 높음 | 5h |
| T-36 | Entity Component - nps | 0-10 고정 척도, 하단/상단 레이블 | T-32 | 낮음 | 2h |
| T-37 | Entity Component - cta | 외부/내부 버튼, URL/라벨, dismissible | T-32 | 중간 | 2h |
| T-38 | Entity Component - rating | number/smiley/star, 3-10 범위, 색상 코딩 | T-32 | 중간 | 3h |
| T-39 | Entity Component - consent | 동의 레이블, 체크박스 | T-32 | 낮음 | 1h |
| T-40 | Entity Component - pictureSelection | 이미지 추가/삭제, 단일/복수 선택 | T-32 | 중간 | 3h |
| T-41 | Entity Component - date | 3가지 포맷 선택 | T-32 | 낮음 | 2h |
| T-42 | Entity Component - fileUpload | 단일/복수, 최대 크기, 허용 확장자 | T-32 | 중간 | 2h |
| T-43 | Entity Component - cal | Cal.com 사용자 이름 입력 | T-32 | 낮음 | 1h |
| T-44 | Entity Component - matrix | 행/열 CRUD, Shuffle 옵션 | T-32 | 높음 | 4h |
| T-45 | Entity Component - address | 6개 서브 필드 show/required/placeholder 제어 | T-32 | 중간 | 3h |
| T-46 | Entity Component - ranking | 선택지 CRUD, 2-25개 제한, Shuffle | T-32 | 중간 | 3h |
| T-47 | Entity Component - contactInfo | 5개 서브 필드 show/required 제어 | T-32 | 중간 | 3h |
| T-48 | Entity Component 매핑 (index.ts) | Entity type -> Component 매핑 객체 생성. BuilderEntities의 components prop에 전달 | T-34~T-47 | 낮음 | 1h |
| T-49 | ElementIdEditor (FN-010-11) | ID 편집 폼. 유효성 검증(금지 ID, 패턴, 중복, isDraft). builderStore.setEntityAttributeValue로 elementId 속성 변경 | T-32, T-08 | 중간 | 3h |
| T-50 | ValidationRulesEditor (FN-010-14) | Element 유형별 적용 가능 규칙 필터, 규칙 추가/삭제, AND/OR 토글, 파라미터 입력. setEntityAttributeValue로 validationRules 속성 변경 | T-32 | 높음 | 6h |
| T-51 | EndingCardEditor (FN-010-09) | endScreen/redirectToUrl 편집 폼. OptionsSwitch 유형 전환. SurveyMetaContext dispatch | T-24, T-12, T-16 | 중간 | 4h |
| T-52 | EndingCardList + DnD (FN-010-09) | Ending Card 목록, 추가/삭제, DnD 재정렬. 삭제 확인 모달. SurveyMetaContext dispatch | T-51, T-18 | 중간 | 3h |
| T-53 | BlockLogicEditor (FN-010-05) | 로직 아이템 CRUD. ConditionGroup UI, 액션 유형 선택, Target 입력. Fallback 드롭다운. setEntityAttributeValue로 logic/logicFallback 속성 변경 | T-29 | 높음 | 8h |
| T-54 | HiddenFieldsCard (FN-010-12) | enabled 토글, Field ID 추가/삭제, ID 유효성 검증. SurveyMetaContext dispatch | T-24, T-12, T-08 | 중간 | 3h |
| T-55 | SurveyVariablesCard (FN-010-13) | 변수 추가/편집/삭제. 유형 선택(number/text), 이름/값 입력. Logic 참조 경고. SurveyMetaContext dispatch | T-24, T-12 | 중간 | 3h |
| T-56 | Settings View (FN-010-15) | 6개 카드 레이아웃 (접기/펼치기). 배포 방식(link/app) 전환 최소 구현. SurveyMetaContext dispatch | T-23, T-12 | 중간 | 4h |
| T-57 | Styling View (FN-010-16) | 폼 스타일/로고/배경 3영역 레이아웃. 기본 UI 프레임만 구현 | T-23 | 낮음 | 3h |
| T-58 | Follow-Ups View | Pro 배지 표시 + "Coming Soon" 플레이스홀더 | T-23 | 낮음 | 1h |
| T-59 | SurveyPreview (FN-010-17) | useInterpreterStore 기반 프리뷰. app: modal / link: fullwidth 분기. 활성 Element 자동 스크롤 | T-20, T-06, T-14 | 중간 | 4h |
| T-60 | 프리뷰 렌더러 (최소 구현) | InterpreterEntities 기반 읽기 전용 프리뷰. 언어 반영 | T-59 | 높음 | 6h |
| T-61 | 편집기 라우트 페이지 | `[surveyId]/edit/page.tsx`. 설문 로드 + Schema 변환 + SurveyEditorShell 래핑 | T-06, T-07, T-11, T-12, T-20 | 중간 | 3h |
| T-62 | i18n 번역 키 추가 | ko/en 번역 파일에 편집기 관련 모든 키 추가 (150+ 키) | T-20~T-60 | 중간 | 4h |
| T-63 | 통합 테스트 | 편집기 전체 흐름 테스트: 로드 -> Schema 변환 -> 편집 -> 자동 저장 -> 발행 | 전체 | 높음 | 6h |

### 3.2 구현 순서 및 마일스톤

#### 마일스톤 1: Survey Builder 패키지 (T-01, T-03 ~ T-07)
**목표**: `@coltorapps/builder` 기반 Survey Builder 정의 완성. Attribute/Entity/Builder 인스턴스 + Schema 변환 유틸리티

```
T-01 패키지 설치 + 프로젝트 생성
  └─> T-03 Builder Attribute 정의 (Zod 기반)
        ├─> T-04 Block Entity 정의
        └─> T-05 15가지 Element Entity 정의
              └─> T-06 Survey Builder 인스턴스 생성
                    └─> T-07 Schema 변환 유틸리티 + 테스트
```

**검증 기준**: `surveyBuilder` 인스턴스가 생성되고, `addEntity`/`deleteEntity`/`cloneEntity`가 올바르게 동작하는 것을 단위 테스트로 확인. Schema 변환 함수(Survey <-> BuilderSchema+Meta)의 왕복 변환이 데이터를 보존하는 것을 확인.

#### 마일스톤 2: Context + 훅 + 유틸리티 (T-02, T-08 ~ T-14)
**목표**: 편집기 UI 인프라 완성. EditorUIContext, SurveyMetaContext, 자동 저장, 유효성 검증 유틸리티

```
T-02 shadcn/ui 컴포넌트 추가
T-08 ID 유효성 검증 유틸리티
T-09 Block 넘버링 유틸리티
T-10 발행 유효성 검증 유틸리티
T-11 EditorUIContext
T-12 SurveyMetaContext
  └─> T-13 useAutoSave 훅
  └─> T-14 useActiveElement 훅
```

**검증 기준**: EditorUIContext/SurveyMetaContext가 정상 동작. ID 검증 유틸리티 단위 테스트 통과. 자동 저장 훅이 Builder Store 이벤트에 반응하여 저장을 트리거.

#### 마일스톤 3: 레이아웃 + 메뉴바 + 공유 컴포넌트 (T-15 ~ T-25, T-61)
**목표**: 편집기 3분할 레이아웃, 메뉴바, 탭 전환, 공유 UI 컴포넌트 완성

```
T-15~T-19 공유 컴포넌트 (LocalizedInput, OptionsSwitch, FileUpload, ConfirmDelete, AutoSave)
  └─> T-20 편집기 레이아웃
        ├─> T-21 SurveyMenuBar
        │     └─> T-22 useSurveyPublish
        ├─> T-23 EditorTabs
        │     └─> T-24 Elements View 스켈레톤
        │           └─> T-25 LanguageSettingsCard
        └─> T-61 편집기 라우트 페이지
```

**검증 기준**: 브라우저에서 `/surveys/{id}/edit`로 접근 시 3분할 레이아웃이 렌더링되고, 4탭 전환이 동작. 설문 이름 편집과 자동 저장 표시기가 동작.

#### 마일스톤 4: Block 시스템 + DnD (T-26 ~ T-33)
**목표**: Block/Element 카드 렌더링, BuilderEntities 통합, 드래그 앤 드롭 완성

```
T-26 WelcomeCardEditor
T-27 BlockComponent (createEntityComponent)
  ├─> T-28 BlockHeader
  ├─> T-29 BlockSettings
  ├─> T-30 BuilderCanvas + Block DnD
  │     └─> T-31 Element DnD
  ├─> T-32 ElementComponent (공통 래퍼)
  └─> T-33 AddElementButton
```

**검증 기준**: BuilderEntities로 Block과 Element가 자동 렌더링. Block 추가/삭제/복제가 `builderStore.addEntity/deleteEntity/cloneEntity`로 동작. DnD로 Block과 Element 순서 변경 가능. Block 이름 자동 넘버링 확인.

#### 마일스톤 5: Element Entity 컴포넌트 (T-34 ~ T-50)
**목표**: 15가지 Element Type별 편집 컴포넌트, Element ID 편집, Validation Rules 편집기 완성

```
T-34~T-47 (15가지 Entity Component, 병렬 작업 가능)
T-48 Entity Component 매핑
T-49 ElementIdEditor
T-50 ValidationRulesEditor
```

**검증 기준**: 각 Element 유형을 추가하고 `setEntityAttributeValue`로 속성을 편집할 수 있음. Element ID 편집 시 유효성 검증이 동작. Validation Rules 추가/삭제가 동작.

#### 마일스톤 6: Ending + Logic + Hidden/Variables (T-51 ~ T-55)
**목표**: Ending Card 관리, Block Logic 편집, Hidden Fields, Variables 카드 완성

```
T-51 EndingCardEditor (SurveyMetaContext)
  └─> T-52 EndingCardList + DnD
T-53 BlockLogicEditor (setEntityAttributeValue로 logic 속성 편집)
T-54 HiddenFieldsCard (SurveyMetaContext)
T-55 SurveyVariablesCard (SurveyMetaContext)
```

**검증 기준**: Ending Card CRUD와 유형 전환이 동작. Block Logic 편집(조건/액션/Fallback)이 동작. Hidden Field/Variable 추가/삭제와 유효성 검증이 동작.

#### 마일스톤 7: Settings + Styling + Preview (T-56 ~ T-60)
**목표**: Settings/Styling View 기본 프레임, useInterpreterStore 기반 실시간 프리뷰 완성

```
T-56 Settings View
T-57 Styling View
T-58 Follow-Ups View
T-59 SurveyPreview (useInterpreterStore)
  └─> T-60 프리뷰 렌더러 (InterpreterEntities)
```

**검증 기준**: Settings/Styling 탭 전환 시 기본 UI 표시. useInterpreterStore 기반 프리뷰가 Builder Store 데이터 변경을 실시간 반영. app/link 모드별 프리뷰 형태 구분.

#### 마일스톤 8: i18n + 통합 테스트 (T-62 ~ T-63)
**목표**: 번역 키 완성, 전체 흐름 통합 테스트

```
T-62 i18n 번역 키
T-63 통합 테스트
```

**검증 기준**: ko/en 언어 전환 시 편집기 모든 UI 텍스트가 올바르게 표시. 설문 로드 -> Schema 변환 -> BuilderStore 초기화 -> 편집 -> 자동 저장 -> 발행 전체 흐름 동작.

### 3.3 파일 변경 계획

| 파일 경로 | 변경 유형 | 변경 요약 |
|-----------|----------|----------|
| `packages/survey-builder/project.json` | 생성 | Nx 패키지 프로젝트 설정 |
| `packages/survey-builder/src/index.ts` | 생성 | 퍼블릭 API 엑스포트 |
| `packages/survey-builder/src/builder.ts` | 생성 | surveyBuilder 인스턴스 (createBuilder 호출) |
| `packages/survey-builder/src/attributes/*.ts` | 생성 | 14+ 재사용 Attribute 정의 (Zod validate) |
| `packages/survey-builder/src/entities/*.ts` | 생성 | 1 Block + 15 Element Entity 정의 |
| `libs/client/survey-editor/project.json` | 생성 | Nx 라이브러리 프로젝트 설정 |
| `libs/client/survey-editor/src/index.ts` | 생성 | 퍼블릭 API 엑스포트 |
| `libs/client/survey-editor/src/lib/context/types.ts` | 생성 | EditorUIState, SurveyMetaState, 액션 타입 정의 |
| `libs/client/survey-editor/src/lib/context/editor-ui.context.tsx` | 생성 | EditorUI Context + Provider |
| `libs/client/survey-editor/src/lib/context/survey-meta.context.tsx` | 생성 | SurveyMeta Context + Provider + Reducer |
| `libs/client/survey-editor/src/lib/hooks/use-editor-ui.ts` | 생성 | EditorUI Context 접근 훅 |
| `libs/client/survey-editor/src/lib/hooks/use-survey-meta.ts` | 생성 | SurveyMeta Context 접근 훅 |
| `libs/client/survey-editor/src/lib/hooks/use-auto-save.ts` | 생성 | 이벤트 기반 자동 저장 훅 |
| `libs/client/survey-editor/src/lib/hooks/use-survey-publish.ts` | 생성 | 발행 유효성 검증/API 호출 훅 |
| `libs/client/survey-editor/src/lib/hooks/use-active-element.ts` | 생성 | 활성 Element 관리 훅 |
| `libs/client/survey-editor/src/lib/utils/schema-converter.ts` | 생성 | Survey API <-> Builder Schema 변환 |
| `libs/client/survey-editor/src/lib/utils/id-validation.ts` | 생성 | ID 유효성 검증 유틸리티 |
| `libs/client/survey-editor/src/lib/utils/block-numbering.ts` | 생성 | Block 이름 자동 넘버링 |
| `libs/client/survey-editor/src/lib/utils/survey-validation.ts` | 생성 | 발행 시 클라이언트 유효성 검증 |
| `libs/client/survey-editor/src/lib/components/layout/SurveyEditorLayout.tsx` | 생성 | 3분할 레이아웃 |
| `libs/client/survey-editor/src/lib/components/layout/SurveyMenuBar.tsx` | 생성 | 상단 메뉴바 |
| `libs/client/survey-editor/src/lib/components/layout/EditorTabs.tsx` | 생성 | 4탭 전환 |
| `libs/client/survey-editor/src/lib/components/elements-view/ElementsView.tsx` | 생성 | Elements 탭 메인 뷰 |
| `libs/client/survey-editor/src/lib/components/elements-view/LanguageSettingsCard.tsx` | 생성 | 다국어 설정 카드 |
| `libs/client/survey-editor/src/lib/components/elements-view/WelcomeCardEditor.tsx` | 생성 | Welcome Card 편집기 |
| `libs/client/survey-editor/src/lib/components/elements-view/BuilderCanvas.tsx` | 생성 | DnD + BuilderEntities 통합 캔버스 |
| `libs/client/survey-editor/src/lib/components/elements-view/BlockComponent.tsx` | 생성 | createEntityComponent(blockEntity) Block 카드 |
| `libs/client/survey-editor/src/lib/components/elements-view/BlockHeader.tsx` | 생성 | Block 헤더 |
| `libs/client/survey-editor/src/lib/components/elements-view/BlockSettings.tsx` | 생성 | Block 설정 |
| `libs/client/survey-editor/src/lib/components/elements-view/BlockLogicEditor.tsx` | 생성 | Block Logic 편집 |
| `libs/client/survey-editor/src/lib/components/elements-view/EndingCardEditor.tsx` | 생성 | Ending Card 편집기 |
| `libs/client/survey-editor/src/lib/components/elements-view/EndingCardList.tsx` | 생성 | Ending Card 목록 |
| `libs/client/survey-editor/src/lib/components/elements-view/HiddenFieldsCard.tsx` | 생성 | Hidden Fields 카드 |
| `libs/client/survey-editor/src/lib/components/elements-view/SurveyVariablesCard.tsx` | 생성 | Survey Variables 카드 |
| `libs/client/survey-editor/src/lib/components/elements-view/ElementComponent.tsx` | 생성 | Element 공통 래퍼 (createEntityComponent) |
| `libs/client/survey-editor/src/lib/components/elements-view/ElementCardMenu.tsx` | 생성 | Element 메뉴 |
| `libs/client/survey-editor/src/lib/components/elements-view/ElementIdEditor.tsx` | 생성 | Element ID 편집 |
| `libs/client/survey-editor/src/lib/components/elements-view/ValidationRulesEditor.tsx` | 생성 | Validation Rules 편집기 |
| `libs/client/survey-editor/src/lib/components/elements-view/AddElementButton.tsx` | 생성 | Element 추가 버튼 |
| `libs/client/survey-editor/src/lib/components/elements-view/entity-components/*.tsx` | 생성 | 15가지 Entity Component (createEntityComponent 기반) |
| `libs/client/survey-editor/src/lib/components/elements-view/entity-components/index.ts` | 생성 | Entity Type -> Component 매핑 |
| `libs/client/survey-editor/src/lib/components/settings-view/*.tsx` | 생성 | Settings 탭 (7파일) |
| `libs/client/survey-editor/src/lib/components/styling-view/*.tsx` | 생성 | Styling 탭 (4파일) |
| `libs/client/survey-editor/src/lib/components/follow-ups-view/FollowUpsView.tsx` | 생성 | Follow-Ups 탭 |
| `libs/client/survey-editor/src/lib/components/preview/SurveyPreview.tsx` | 생성 | useInterpreterStore 프리뷰 |
| `libs/client/survey-editor/src/lib/components/preview/PreviewModal.tsx` | 생성 | app modal 프리뷰 |
| `libs/client/survey-editor/src/lib/components/preview/PreviewFullwidth.tsx` | 생성 | link fullwidth 프리뷰 |
| `libs/client/survey-editor/src/lib/components/shared/*.tsx` | 생성 | 공유 컴포넌트 (5파일) |
| `apps/client/src/app/[lng]/surveys/[surveyId]/edit/page.tsx` | 생성 | 편집기 라우트 페이지 |
| `apps/client/package.json` | 수정 | @coltorapps/builder, @coltorapps/builder-react, @dnd-kit/*, @paralleldrive/cuid2 추가 |
| `apps/client/src/app/i18n/locales/ko/translation.json` | 수정 | 편집기 번역 키 추가 |
| `apps/client/src/app/i18n/locales/en/translation.json` | 수정 | 편집기 번역 키 추가 |
| `libs/client/ui/src/components/ui/tabs.tsx` | 생성 | shadcn/ui Tabs |
| `libs/client/ui/src/components/ui/switch.tsx` | 생성 | shadcn/ui Switch |
| `libs/client/ui/src/components/ui/dropdown-menu.tsx` | 생성 | shadcn/ui DropdownMenu |
| `libs/client/ui/src/components/ui/dialog.tsx` | 생성 | shadcn/ui Dialog |
| `libs/client/ui/src/components/ui/collapsible.tsx` | 생성 | shadcn/ui Collapsible |
| `libs/client/ui/src/components/ui/select.tsx` | 생성 | shadcn/ui Select |
| `libs/client/ui/src/components/ui/tooltip.tsx` | 생성 | shadcn/ui Tooltip |
| `libs/client/ui/src/components/ui/sonner.tsx` | 생성 | shadcn/ui Sonner(Toast) |
| `tsconfig.base.json` | 수정 | `@inquiry/survey-builder`, `@inquiry/client-survey-editor` 경로 별칭 추가 |

---

## 4. 리스크 및 완화 전략

| 리스크 | 영향 | 확률 | 완화 전략 |
|--------|------|------|----------|
| @coltorapps/builder와 React 19 호환성 | 높음 | 낮음 | @coltorapps/builder-react는 React의 기본 API(useState, useEffect, useRef)만 사용하므로 React 19와 호환 가능. 초기 POC에서 useBuilderStore + BuilderEntities의 기본 동작을 검증한 후 본격 개발 진행 |
| Builder Schema <-> Survey API 데이터 변환 복잡성 | 높음 | 중간 | schema-converter의 왕복 변환(Survey -> BuilderSchema -> Survey)이 데이터를 보존하는지를 철저히 단위 테스트. 특히 Block 내 Element 순서, 중첩 Attribute(LocalizedString, choices 배열 등)의 변환 정확성 검증 |
| WelcomeCard/Endings/Variables의 Builder 외부 관리 복잡성 | 중간 | 중간 | Builder Store와 SurveyMetaContext 간 데이터 일관성이 자동 저장 시 보장되어야 함. schema-converter의 `builderDataToSurvey` 함수가 양쪽 데이터를 정확히 합치는지 검증. 필요시 SurveyMeta 변경도 Builder Store 이벤트와 동일한 debounce 파이프라인으로 자동 저장 |
| 중첩 DnD (Block 간 + Block 내 Element) 복잡성 | 높음 | 중간 | Builder Store의 `setData` 메서드로 immutable하게 root/children 배열을 업데이트. 드래그 시작 시 어떤 레벨의 DnD인지 명확히 구분하는 로직 필요. @dnd-kit의 중첩 DndContext 패턴 사용 |
| 15가지 Element Entity/Component 개발 볼륨 | 중간 | 높음 | 병렬 작업 가능. 공통 Attribute(headline, required, placeholder)를 재사용하여 Entity 정의 중복 최소화. createEntityComponent 패턴으로 컴포넌트 구조 통일. multipleChoice, matrix 등 복잡한 유형은 별도 스프린트로 분리 가능 |
| @coltorapps/builder의 Schema 구조 제약 | 중간 | 중간 | Builder의 flat entities + root/children 구조가 기존 Survey API의 blocks[].elements[] 중첩 구조와 다름. schema-converter가 이 변환을 정확히 수행해야 함. Block Logic, ValidationRules 같은 복합 데이터는 Entity Attribute로 관리 |
| 프리뷰 렌더링 성능 (useInterpreterStore) | 중간 | 중간 | useBuilderStoreData의 shouldUpdate로 프리뷰가 관련 변경에만 반응하도록 최적화. 프리뷰 컴포넌트를 React.memo로 감싸고, InterpreterStore 재생성을 최소화 |
| FS-008/009/012/013 미구현 상태에서 개발 시작 | 높음 | 높음 | 구현 순서 가이드에서 FS-010은 5단계이므로 선행 구현이 완료된 후 시작. 초기에는 Mock 데이터와 인터페이스 기반으로 작업 가능하도록 타입을 먼저 정의 |
| 파일 업로드 서비스 미구현 | 중간 | 높음 | Welcome Card/Ending Card 이미지는 초기에 URL 직접 입력으로 대체. FileUploadInput 컴포넌트는 인터페이스만 정의하고 실제 업로드 로직은 서비스 구현 후 연동 |
| i18n 번역 키 150+ 개 관리 | 낮음 | 높음 | 네임스페이스를 `surveyEditor`로 분리. 키 명명 규칙을 일관되게 유지 (컴포넌트명.속성). 각 컴포넌트 구현 시 해당 키를 함께 추가하여 누락 방지 |

---

## 5. 테스트 전략

### 5.1 단위 테스트

| 테스트 대상 | 테스트 내용 | 파일 경로 |
|------------|-----------|----------|
| Builder Attributes | 각 Attribute의 Zod validate 메서드가 올바른 타입을 반환하고, 유효하지 않은 값에 에러를 발생시키는지 | `packages/survey-builder/src/attributes/__tests__/*.spec.ts` |
| Builder Entities | Entity 정의가 올바른 Attribute를 포함하고, parentRequired/childrenAllowed가 정확한지 | `packages/survey-builder/src/entities/__tests__/*.spec.ts` |
| Survey Builder | addEntity: Block 추가 시 root에 포함, Element 추가 시 부모 Block의 children에 포함. deleteEntity: 자식 포함 삭제. cloneEntity: 새 CUID 할당. validateSchema: 최소 1 Block, 각 Block 최소 1 Element | `packages/survey-builder/src/__tests__/builder.spec.ts` |
| schema-converter.ts | surveyToBuilderData: API 응답을 flat entities + root로 변환. builderDataToSurvey: 역변환으로 원본 복원. 왕복 변환 무손실 검증 | `libs/client/survey-editor/src/lib/utils/__tests__/schema-converter.spec.ts` |
| id-validation.ts | validateElementId: 금지 ID, 패턴(/^[a-zA-Z0-9_-]+$/), 중복(Element/Ending/HiddenField). validateHiddenFieldId: 동일 규칙 | `libs/client/survey-editor/src/lib/utils/__tests__/id-validation.spec.ts` |
| block-numbering.ts | renumberBlocks: Builder Store의 root 순서대로 "Block {N}" 형식으로 갱신 | `libs/client/survey-editor/src/lib/utils/__tests__/block-numbering.spec.ts` |
| survey-validation.ts | validateSurveyForPublish: Builder Schema + Meta 기반 17개 규칙 검증 | `libs/client/survey-editor/src/lib/utils/__tests__/survey-validation.spec.ts` |
| SurveyMeta Reducer | 모든 Meta 액션 타입별 상태 변경 검증: Ending CRUD, HiddenField CRUD, Variable CRUD, WelcomeCard 업데이트 | `libs/client/survey-editor/src/lib/context/__tests__/survey-meta.reducer.spec.ts` |

### 5.2 통합 테스트

| 테스트 시나리오 | 검증 내용 |
|---------------|----------|
| 편집기 초기 로드 | 설문 데이터 로드 -> schema-converter -> useBuilderStore(initialData) -> 3분할 레이아웃 표시 -> Elements 탭 활성 |
| 탭 전환 | 4탭 전환 동작. CX 모드 시 Settings 숨김. 스타일 오버라이드 미허용 시 Styling 숨김 |
| Block CRUD (Builder Store) | addEntity(block) -> root에 추가 + 넘버링. deleteEntity(block) -> root에서 제거 + children 자동 삭제 + 넘버링 갱신. cloneEntity(block) -> 새 ID + 자식 복제 |
| Element CRUD (Builder Store) | addEntity(element, parentId) -> 부모 Block의 children에 추가. deleteEntity(element) -> children에서 제거. cloneEntity(element) -> 같은 Block 내 복제 |
| 속성 편집 (setEntityAttributeValue) | headline 변경 -> Entity 속성 업데이트 -> 프리뷰 실시간 반영 |
| Welcome Card 편집 (SurveyMetaContext) | enabled 토글 -> 폼 표시/숨김. headline 입력. buttonLabel 48자 제한 |
| Ending Card 관리 (SurveyMetaContext) | 추가 -> 기본 endScreen. 유형 전환 -> OptionsSwitch. 삭제 -> 확인 모달 -> Logic 참조 경고 |
| DnD + Builder Store | Block DnD -> setData로 root 배열 순서 변경 + 넘버링. Element DnD -> setData로 children 배열 순서 변경 |
| 자동 저장 (이벤트 기반) | 편집 후 Builder Store 이벤트 발생 -> 10초 debounce -> PUT 요청. 변경 없으면 요청 없음. 저장 중 중복 방지 |
| 발행 유효성 검증 | 유효하지 않은 설문 발행 시도 -> invalidElements 설정 -> 해당 카드 빨간색 표시 -> 발행 차단 |

### 5.3 E2E 테스트 (해당 시)

| 시나리오 | 검증 내용 |
|---------|----------|
| 설문 편집 -> 자동 저장 -> 발행 전체 흐름 | 설문 목록에서 편집 진입 -> 질문 추가/수정 -> 10초 후 자동 저장 API 호출 확인 -> Publish 클릭 -> 유효성 검증 통과 -> 설문 상태 inProgress로 전환 |
| 프리뷰 실시간 반영 | 질문 텍스트 수정(setEntityAttributeValue) -> useBuilderStoreData를 통해 프리뷰에 변경된 텍스트 표시 -> 언어 변경 -> 프리뷰 언어 반영 |
| Schema 변환 무결성 | 설문 로드 -> Builder Store 편집 -> 저장 -> API 재요청 -> 데이터가 편집한 대로 정확히 보존 |

---

## 6. 제약사항 및 향후 개선

### 6.1 알려진 제약사항

| 항목 | 제약 내용 |
|------|----------|
| 서버 API 의존 | FS-008의 Survey CRUD API가 구현되어야 실제 데이터 로드/저장이 가능. Mock API로 개발 가능하나 통합 검증은 FS-008 완료 후 |
| Schema 변환 오버헤드 | Survey API의 중첩 구조와 Builder의 flat entities 구조 간 변환이 매 저장/로드 시 필요. 대규모 설문에서 변환 성능 모니터링 필요 |
| WelcomeCard/Endings Builder 외부 관리 | Builder Store와 SurveyMetaContext 간 데이터 일관성을 수동으로 보장해야 함. 자동 저장 시 양쪽 데이터를 합치는 로직 필요 |
| 파일 업로드 미구현 | Welcome Card/Ending Card 이미지 업로드는 파일 스토리지 서비스가 필요. 초기에는 URL 직접 입력으로 대체 |
| 프리뷰 완전성 | useInterpreterStore 기반 프리뷰는 설문 응답 런타임 엔진(FSD-021)이 구현되어야 인터랙티브 프리뷰가 가능. 초기에는 읽기 전용 |
| Settings/Styling 미완성 | 각 카드의 상세 속성 편집은 해당 FSD 구현 시 완성 |
| Follow-Ups 미구현 | 탭 내부 컨텐츠는 FSD-022에서 구현 |
| Undo/Redo 미지원 | Builder Store의 이벤트 히스토리를 활용한 Undo/Redo는 향후 구현 가능 |

### 6.2 향후 개선 가능성

| 항목 | 개선 내용 |
|------|----------|
| WelcomeCard/Endings Entity화 | Builder 라이브러리의 Entity 패턴에 더 익숙해지면, WelcomeCard와 Endings를 Builder Entity로 통합하여 단일 데이터 소스로 관리 검토 |
| Undo/Redo | Builder Store의 이벤트 스트림을 활용하여 Ctrl+Z/Ctrl+Y 지원. onEntityAdded/Deleted/Updated 이벤트 역연산 |
| Element 간 Block 이동 (Cross-container DnD) | @dnd-kit의 multi-container DnD 패턴과 Builder Store의 Entity reparenting으로 구현 가능 |
| Builder Store 이벤트 기반 협업 편집 | Builder Store의 이벤트를 WebSocket으로 브로드캐스트하여 실시간 협업 편집 지원 |
| 키보드 단축키 | 자주 사용하는 편집 동작에 키보드 단축키 바인딩 |
| 스마트 복제 | cloneEntity 후 내부 Logic 참조(Block ID, Element ID)를 새 ID로 자동 갱신 |
| 성능 최적화 고도화 | shouldUpdate 조건을 더 정밀하게 설정하여 대규모 설문(100+ Element) 편집 시 성능 보장 |

---

## 7. i18n 고려사항

편집기 UI에서 사용하는 모든 user-facing 문자열은 i18next를 통해 관리한다. 네임스페이스는 기존 `translation.json`의 `surveyEditor` 키 하위에 구성한다.

### 7.1 추가/수정 필요한 번역 키 (주요 항목)

```json
{
  "surveyEditor": {
    "menuBar": {
      "backToSurveys": "설문 목록으로 돌아가기",
      "saveAsDraft": "초안 저장",
      "publish": "발행",
      "update": "업데이트",
      "autoSave": {
        "saving": "저장 중...",
        "saved": "저장됨",
        "error": "저장 실패"
      }
    },
    "tabs": {
      "elements": "Elements",
      "styling": "Styling",
      "settings": "Settings",
      "followUps": "Follow-Ups",
      "proBadge": "Pro"
    },
    "block": {
      "blockName": "Block {{number}}",
      "addElement": "새 Element 추가",
      "addBlock": "새 Block 추가",
      "menu": {
        "duplicate": "복제",
        "delete": "삭제",
        "moveUp": "위로 이동",
        "moveDown": "아래로 이동"
      },
      "settings": {
        "buttonLabel": "버튼 라벨",
        "backButtonLabel": "뒤로가기 버튼 라벨",
        "logic": "조건부 로직",
        "fallback": "Fallback"
      }
    },
    "welcomeCard": {
      "title": "Welcome Card",
      "enabled": "활성화",
      "headline": "제목",
      "subtitle": "부제목",
      "fileUrl": "이미지/비디오",
      "buttonLabel": "버튼 라벨",
      "showResponseCount": "응답 수 표시",
      "timeToFinish": "완료 예상 시간 표시",
      "validation": {
        "headlineRequired": "활성화 시 제목은 필수입니다.",
        "buttonLabelMaxLength": "버튼 라벨은 48자를 초과할 수 없습니다."
      }
    },
    "ending": {
      "title": "Ending Card",
      "addEnding": "Ending Card 추가",
      "endScreen": "종료 화면",
      "redirectToUrl": "URL 리다이렉트",
      "headline": "제목",
      "subtitle": "부제목",
      "buttonLabel": "버튼 라벨",
      "buttonLink": "버튼 링크",
      "showButton": "CTA 버튼 표시",
      "redirectUrl": "리다이렉트 URL",
      "redirectLabel": "라벨 (내부 관리용)",
      "confirmDelete": "이 Ending Card를 삭제하시겠습니까?",
      "usedInLogic": "이 Ending Card는 Logic에서 사용 중입니다.",
      "usedInQuota": "이 Ending Card는 Quota에서 사용 중입니다."
    },
    "element": {
      "advancedSettings": "고급 설정",
      "elementId": "Element ID",
      "elementIdSave": "저장",
      "elementIdPlaceholder": "영문, 숫자, 하이픈, 언더스코어",
      "validation": {
        "forbiddenId": "이 ID는 사용할 수 없습니다.",
        "invalidPattern": "영문, 숫자, 하이픈, 언더스코어만 허용됩니다.",
        "noSpaces": "공백을 포함할 수 없습니다.",
        "duplicateElement": "다른 Element와 ID가 중복됩니다.",
        "duplicateEnding": "Ending Card와 ID가 중복됩니다.",
        "duplicateHiddenField": "Hidden Field와 ID가 중복됩니다."
      },
      "types": {
        "openText": "텍스트 입력",
        "multipleChoiceSingle": "단일 선택",
        "multipleChoiceMulti": "복수 선택",
        "nps": "NPS",
        "cta": "CTA",
        "rating": "평점",
        "consent": "동의",
        "pictureSelection": "이미지 선택",
        "date": "날짜",
        "fileUpload": "파일 업로드",
        "cal": "일정 예약",
        "matrix": "행렬",
        "address": "주소",
        "ranking": "순위",
        "contactInfo": "연락처"
      }
    },
    "hiddenFields": {
      "title": "Hidden Fields",
      "enabled": "활성화",
      "addField": "Field 추가",
      "fieldIdPlaceholder": "Field ID 입력"
    },
    "variables": {
      "title": "Survey Variables",
      "addVariable": "변수 추가",
      "name": "변수 이름",
      "type": "유형",
      "value": "기본값",
      "number": "숫자",
      "text": "텍스트",
      "usedInLogic": "이 변수는 Logic에서 사용 중입니다."
    },
    "validationRules": {
      "title": "유효성 검증 규칙",
      "addRule": "규칙 추가",
      "ruleType": "규칙 유형",
      "ruleValue": "값",
      "logic": {
        "and": "AND",
        "or": "OR"
      }
    },
    "logic": {
      "addLogic": "로직 추가",
      "condition": "조건",
      "action": "액션",
      "actionTypes": {
        "calculate": "계산",
        "requireAnswer": "필수 응답",
        "jumpToBlock": "Block 이동"
      },
      "fallback": {
        "label": "Fallback Block",
        "placeholder": "선택..."
      }
    },
    "preview": {
      "title": "프리뷰"
    },
    "settings": {
      "deployment": "배포 방식",
      "trigger": "트리거",
      "responseOptions": "응답 옵션",
      "recontact": "재접촉",
      "placement": "배치",
      "targeting": "타겟팅"
    },
    "styling": {
      "formStyle": "폼 스타일",
      "logo": "로고",
      "background": "배경"
    },
    "followUps": {
      "comingSoon": "준비 중입니다."
    },
    "publish": {
      "validationFailed": "발행 유효성 검증에 실패했습니다. 오류를 수정해주세요."
    },
    "common": {
      "cancel": "취소",
      "confirm": "확인",
      "delete": "삭제",
      "duplicate": "복제",
      "save": "저장"
    }
  }
}
```
