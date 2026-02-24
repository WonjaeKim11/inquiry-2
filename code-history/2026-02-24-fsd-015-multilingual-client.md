# FSD-015 다국어 설문 클라이언트 사이드 구현

## Overview

FSD-015 다국어 설문 기능의 클라이언트 사이드 구현을 완료하였다. 서버 사이드 100% 완료 상태에서, 클라이언트 측 다국어 라이브러리(`@inquiry/client-multilingual`)를 새로 생성하고, 설문 에디터 페이지에 통합하며, 서버 버그를 수정하고, 15개 로케일의 i18n 키를 보강하였다.

**작업 범위**: 클라이언트 타입 확장, 서버 버그 수정, 클라이언트 multilingual 라이브러리(훅 + 컴포넌트), 설문 에디터 통합, i18n 보강
**제외 범위**: 응답자 LanguageSwitch, ?lang= 파라미터 (설문 응답 페이지 미구현)

## Changed Files

### Phase 1: 타입 확장 + 서버 버그 수정 (2 파일 수정)
- `libs/client/survey/src/lib/types.ts` — `SurveyDetail`에 `languages`, `showLanguageSwitch` 필드 추가, `UpdateSurveyInput`에 동일 필드 옵셔널 추가
- `libs/server/survey/src/lib/services/survey.service.ts` — `updateSurvey()`에 `showLanguageSwitch` 필드 업데이트 누락 수정

### Phase 2: 클라이언트 multilingual 라이브러리 (11 파일 신규)
- `libs/client/multilingual/package.json` — `@inquiry/client-multilingual` 패키지 정의 (6개 workspace 의존성)
- `libs/client/multilingual/tsconfig.json` — TypeScript 프로젝트 루트 설정
- `libs/client/multilingual/tsconfig.lib.json` — 빌드 설정 (JSX, DOM, 6개 프로젝트 참조)
- `libs/client/multilingual/src/index.ts` — barrel export (타입, 훅, 컴포넌트)
- `libs/client/multilingual/src/lib/types.ts` — `LanguageWithConfig`, `EditingLanguageContext`, `TranslationStatus` 타입
- `libs/client/multilingual/src/lib/hooks/use-survey-languages.ts` — 설문 다국어 설정 관리 훅
- `libs/client/multilingual/src/lib/hooks/use-rtl.ts` — RTL 방향성 감지 훅
- `libs/client/multilingual/src/lib/components/multi-language-card.tsx` — 다국어 설정 카드 (4가지 상태 분기)
- `libs/client/multilingual/src/lib/components/remove-translations-dialog.tsx` — 번역 제거 확인 다이얼로그
- `libs/client/multilingual/src/lib/components/editor-language-selector.tsx` — 에디터 헤더 언어 선택 드롭다운
- `libs/client/multilingual/src/lib/components/translation-status-badge.tsx` — 번역 상태 Badge

### Phase 3: 설문 에디터 통합 (3 파일 수정)
- `apps/client/src/app/[lng]/projects/[projectId]/environments/[envId]/surveys/[surveyId]/edit/page.tsx` — MultiLanguageCard, EditorLanguageSelector 통합
- `apps/client/package.json` — `@inquiry/client-multilingual` 의존성 추가
- `apps/client/tsconfig.json` — multilingual 프로젝트 참조 추가

### Phase 4: i18n 보강 (15 파일 수정)
- `apps/client/src/app/i18n/locales/{en-US,ko-KR,ja-JP,de-DE,es-ES,fr-FR,hu-HU,pt-BR,nl-NL,pt-PT,ro-RO,ru-RU,sv-SE,zh-Hans-CN,zh-Hant-TW}/translation.json` — `multilingual` 섹션에 10개 키 추가

## Major Changes

### 1. 클라이언트 타입 확장

`SurveyDetail`과 `UpdateSurveyInput`에 다국어 관련 필드를 추가하여 서버 응답과 클라이언트 타입을 일치시켰다.

```typescript
// SurveyDetail에 추가
languages: SurveyLanguage[];
showLanguageSwitch: boolean | null;

// UpdateSurveyInput에 추가
languages?: SurveyLanguage[];
showLanguageSwitch?: boolean;
```

### 2. 서버 버그 수정

`survey.service.ts`의 `updateSurvey()`에서 `showLanguageSwitch` 필드 업데이트가 누락되어 있었다. `dto.languages` 처리 다음에 한 줄 추가:

```typescript
if (dto.showLanguageSwitch !== undefined)
  updateData['showLanguageSwitch'] = dto.showLanguageSwitch;
```

### 3. useSurveyLanguages 훅

프로젝트 언어와 설문 언어 설정을 결합하여 `LanguageWithConfig[]`을 생성하고, 기본 언어 변경/토글/추가/제거/showLanguageSwitch 등의 액션을 제공한다.

```typescript
const {
  projectLanguages,
  languagesWithConfig,
  loading,
  setDefaultLanguage,
  toggleLanguage,
  addLanguageToSurvey,
  removeAllTranslations,
  setShowLanguageSwitch,
} = useSurveyLanguages(projectId, survey, onUpdate);
```

### 4. MultiLanguageCard 4가지 상태 분기

| 상태 | 조건 | 렌더링 |
|------|------|--------|
| 라이선스 미보유 | `plan === 'free'` | 업그레이드 프롬프트 |
| 언어 0개 | `projectLanguages.length === 0` | 설정 페이지 링크 |
| 언어 1개 | `projectLanguages.length === 1` | 추가 안내 + 설정 링크 |
| 정상 | `projectLanguages.length >= 2` | 기본 언어 Select + 보조 Switch + showLanguageSwitch 토글 + 비활성화 |

### 5. 설문 에디터 통합

에디터 페이지에 `handleMultilingualUpdate` 콜백을 추가하여, 다국어 설정 변경 시 `updateSurvey()` API를 직접 호출하고 `refetch()`로 최신 상태를 반영한다. 헤더에 `EditorLanguageSelector`, 하단에 `MultiLanguageCard`를 배치한다.

### 6. i18n 키 10개 보강 (15개 로케일)

`card_title`, `upgrade_prompt`, `no_project_languages`, `add_more_languages`, `go_to_settings`, `editing_language`, `disable_multilingual`, `disable_confirm`, `disable_confirm_title`, `removing`

## How to use it

### 다국어 설정 카드
```tsx
import { MultiLanguageCard } from '@inquiry/client-multilingual';

<MultiLanguageCard
  projectId={projectId}
  survey={surveyDetail}
  onUpdate={async (data) => {
    await updateSurvey(surveyId, data);
    await refetch();
  }}
  lng={locale}
/>
```

### 에디터 언어 선택기
```tsx
import { EditorLanguageSelector, useSurveyLanguages } from '@inquiry/client-multilingual';
import type { EditingLanguageContext } from '@inquiry/client-multilingual';

const [editingCtx, setEditingCtx] = useState<EditingLanguageContext | null>(null);
const { languagesWithConfig } = useSurveyLanguages(projectId, survey, onUpdate);

<EditorLanguageSelector
  languages={languagesWithConfig}
  editingContext={editingCtx}
  onSelectLanguage={setEditingCtx}
/>
```

### RTL 감지
```tsx
import { useRtl } from '@inquiry/client-multilingual';

const { isRtl, dir } = useRtl('ar');
// isRtl: true, dir: 'rtl'
```

## Related Components/Modules

- `@inquiry/survey-builder-config` — `SurveyLanguage`, `isRtlLanguage` 등 공유 타입/유틸리티
- `@inquiry/client-project` — `ProjectLanguage` 타입, `LanguageManager` 컴포넌트 (프로젝트 설정)
- `@inquiry/client-survey` — `SurveyDetail`, `UpdateSurveyInput`, `updateSurvey` API
- `@inquiry/client-organization` — `useOrganization` 훅 (라이선스 체크)
- `@inquiry/client-core` — `apiFetch` API 호출 유틸리티
- `@inquiry/client-ui` — UI 컴포넌트 (Card, Badge, Dialog, Select, Switch 등)
- `libs/server/survey/src/lib/services/survey.service.ts` — 서버 설문 서비스 (버그 수정)
- `libs/server/multilingual` — 서버 다국어 모듈

## Precautions

- `translationStatus`는 현재 `enabled` 여부로만 `complete`/`incomplete`를 판단한다. 실제 번역 텍스트 완성도 기반 판단은 후속 작업에서 구현 예정.
- `MultiLanguageCard`의 라이선스 체크는 `billing.plan === 'free'`만 차단한다. 플랜 체계 변경 시 수정 필요.
- 응답자 측 LanguageSwitch 컴포넌트와 `?lang=` 파라미터는 설문 응답 페이지 구현 시 추가 예정.
- `useSurveyLanguages`가 에디터 페이지와 `MultiLanguageCard` 내부에서 각각 호출되어 프로젝트 언어 API가 2회 호출된다. 성능 이슈 발생 시 Context로 통합 가능.
