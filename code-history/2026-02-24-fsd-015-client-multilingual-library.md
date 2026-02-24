# FSD-015 Phase 2: 클라이언트 다국어 라이브러리 생성

## Overview
FSD-015 다국어 설문 기능의 Phase 2로, 클라이언트 측 다국어 관리 라이브러리(`@inquiry/client-multilingual`)를 생성하였다. 이 라이브러리는 설문 에디터에서 다국어 설정을 관리하기 위한 타입, 훅, UI 컴포넌트를 제공한다. 서버 측 multilingual 모듈(Phase 1)과 survey-builder-config 공유 패키지에서 정의한 타입/유틸리티를 활용하며, 기존 client-survey, client-project, client-organization 라이브러리와 통합된다.

## Changed Files

### 패키지 설정 (3 파일)
- `libs/client/multilingual/package.json` — 패키지 메타데이터 및 의존성 정의 (workspace 내부 라이브러리 6개 참조)
- `libs/client/multilingual/tsconfig.json` — TypeScript 프로젝트 루트 설정 (tsconfig.lib.json 참조)
- `libs/client/multilingual/tsconfig.lib.json` — TypeScript 라이브러리 빌드 설정 (JSX, DOM 지원, 6개 프로젝트 참조)

### 타입 + barrel export (2 파일)
- `libs/client/multilingual/src/lib/types.ts` — `LanguageWithConfig`, `EditingLanguageContext`, `TranslationStatus` 타입 정의
- `libs/client/multilingual/src/index.ts` — barrel export (타입, 훅, 컴포넌트 통합 내보내기)

### 훅 (2 파일)
- `libs/client/multilingual/src/lib/hooks/use-survey-languages.ts` — 설문 다국어 설정 관리 훅 (프로젝트 언어 조회, 기본 언어 변경, 토글, 추가/제거)
- `libs/client/multilingual/src/lib/hooks/use-rtl.ts` — 언어 코드에 따른 RTL 방향성 감지 훅

### 컴포넌트 (4 파일)
- `libs/client/multilingual/src/lib/components/multi-language-card.tsx` — 설문 에디터 사이드바 다국어 설정 카드 (4가지 상태 처리)
- `libs/client/multilingual/src/lib/components/remove-translations-dialog.tsx` — 다국어 번역 전체 삭제 확인 다이얼로그
- `libs/client/multilingual/src/lib/components/editor-language-selector.tsx` — 설문 에디터 헤더 언어 선택 드롭다운
- `libs/client/multilingual/src/lib/components/translation-status-badge.tsx` — 번역 완료도 상태 Badge 컴포넌트

## Major Changes

### 1. 타입 시스템 (`types.ts`)
프로젝트 언어(`ProjectLanguage`)와 설문 언어 설정(`SurveyLanguage`)을 결합한 뷰 타입 `LanguageWithConfig`를 정의하여, 설문 에디터에서 각 언어의 상태(기본 여부, 활성화 여부, 번역 완료도)를 한눈에 파악할 수 있게 한다.

```typescript
export interface LanguageWithConfig {
  language: ProjectLanguage;
  surveyConfig: SurveyLanguage | null;
  isDefault: boolean;
  isEnabled: boolean;
  translationStatus: TranslationStatus;
}
```

### 2. 핵심 훅 (`useSurveyLanguages`)
- `apiFetch`로 `/projects/{projectId}/languages` 엔드포인트에서 프로젝트 언어 목록을 조회
- `useMemo`로 프로젝트 언어와 `survey.languages`를 결합하여 `LanguageWithConfig[]` 생성
- `setDefaultLanguage`, `toggleLanguage`, `addLanguageToSurvey`, `removeAllTranslations`, `setShowLanguageSwitch` 등의 액션을 `useCallback`으로 제공
- `onUpdate` 콜백을 통해 autoSave 흐름과 연결

### 3. MultiLanguageCard 컴포넌트
4가지 상태에 따른 분기 렌더링:
1. **라이선스 미보유** (free plan) → 업그레이드 프롬프트
2. **프로젝트 언어 0개** → 설정 페이지 링크
3. **프로젝트 언어 1개** → 안내 메시지 + 설정 링크
4. **정상 (언어 2개+)** → 기본 언어 Select + 보조 Switch + showLanguageSwitch 토글 + 비활성화 Button

## How to use it

### 다국어 설정 카드를 설문 에디터에 배치
```tsx
import { MultiLanguageCard } from '@inquiry/client-multilingual';

<MultiLanguageCard
  projectId={projectId}
  survey={surveyDetail}
  onUpdate={(data) => autoSave(data)}
  lng={locale}
/>
```

### 에디터 헤더에 언어 선택기 배치
```tsx
import { EditorLanguageSelector } from '@inquiry/client-multilingual';
import type { EditingLanguageContext } from '@inquiry/client-multilingual';

const [editingCtx, setEditingCtx] = useState<EditingLanguageContext | null>(null);

<EditorLanguageSelector
  languages={languagesWithConfig}
  editingContext={editingCtx}
  onSelectLanguage={setEditingCtx}
/>
```

### RTL 감지 훅 사용
```tsx
import { useRtl } from '@inquiry/client-multilingual';

const { isRtl, dir } = useRtl('ar');
// isRtl: true, dir: 'rtl'
```

## Related Components/Modules
- `@inquiry/survey-builder-config` — `SurveyLanguage`, `isRtlLanguage` 등 공유 타입/유틸리티
- `@inquiry/client-project` — `ProjectLanguage` 타입
- `@inquiry/client-survey` — `SurveyDetail`, `UpdateSurveyInput` 타입
- `@inquiry/client-organization` — `useOrganization` 훅 (라이선스 체크)
- `@inquiry/client-core` — `apiFetch` API 호출 유틸리티
- `@inquiry/client-ui` — UI 컴포넌트 (Card, Badge, Dialog, Select, Switch 등)
- `libs/server/multilingual` — 서버 측 다국어 모듈 (Phase 1)

## Precautions
- 현재 `translationStatus`는 단순히 `enabled` 여부로 `complete`/`incomplete`를 판단한다. 실제 번역 텍스트 완성도 기반 판단은 후속 작업에서 구현 예정이다.
- i18n 키(`multilingual.*`)가 아직 번역 리소스에 추가되지 않았을 수 있다. 후속 Phase에서 번역 키를 추가해야 한다.
- `MultiLanguageCard`의 라이선스 체크는 `currentOrganization.billing.plan`을 사용하며, free 플랜만 차단한다. 플랜 체계 변경 시 수정 필요하다.
