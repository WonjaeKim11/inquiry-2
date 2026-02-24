# Phase 2B: 설문 편집기 공유 컴포넌트 구현

## Overview
설문 편집기(`@inquiry/client-survey-editor`)에서 여러 편집 패널에 걸쳐 재사용되는 4개의 공유 컴포넌트를 구현한다. 다국어 텍스트 입력, 옵션 전환, 삭제 확인 모달, 파일(이미지) URL 입력 기능을 제공하며, 모든 사용자 대면 문자열은 i18next로 관리한다.

## Changed Files

### 생성된 파일
- `libs/client/survey-editor/src/lib/components/shared/LocalizedInput.tsx` - 다국어 텍스트 입력 컴포넌트. `I18nString` 타입 값을 관리하며 `selectedLanguage`에 따라 해당 언어 텍스트를 입력/표시한다.
- `libs/client/survey-editor/src/lib/components/shared/OptionsSwitch.tsx` - 세그먼트 전환기 컴포넌트. 제네릭 타입 `<T extends string>`을 사용하여 타입 안전한 옵션 전환 UI를 제공한다.
- `libs/client/survey-editor/src/lib/components/shared/ConfirmDeleteDialog.tsx` - 삭제 확인 모달 컴포넌트. `@inquiry/client-ui`의 Dialog 프리미티브 기반으로 구현한다.
- `libs/client/survey-editor/src/lib/components/shared/FileUploadInput.tsx` - 파일 URL 입력 컴포넌트. 초기에는 URL 직접 입력 방식으로 구현하고, 추후 실제 파일 업로드로 교체 예정이다.

### 수정된 파일
- `libs/client/survey-editor/src/index.ts` - 4개 공유 컴포넌트를 barrel export에 추가
- `apps/client/src/app/i18n/locales/en-US/translation.json` - `surveyEditor.shared` 네임스페이스 번역 키 추가
- `apps/client/src/app/i18n/locales/ko-KR/translation.json` - 한국어 번역 추가
- `apps/client/src/app/i18n/locales/ja-JP/translation.json` - 일본어 번역 추가
- `apps/client/src/app/i18n/locales/de-DE/translation.json` - 독일어 번역 추가
- `apps/client/src/app/i18n/locales/es-ES/translation.json` - 스페인어 번역 추가
- `apps/client/src/app/i18n/locales/fr-FR/translation.json` - 프랑스어 번역 추가
- `apps/client/src/app/i18n/locales/hu-HU/translation.json` - 헝가리어 번역 추가
- `apps/client/src/app/i18n/locales/pt-BR/translation.json` - 브라질 포르투갈어 번역 추가
- `apps/client/src/app/i18n/locales/nl-NL/translation.json` - 네덜란드어 번역 추가
- `apps/client/src/app/i18n/locales/pt-PT/translation.json` - 포르투갈어 번역 추가
- `apps/client/src/app/i18n/locales/ro-RO/translation.json` - 루마니아어 번역 추가
- `apps/client/src/app/i18n/locales/ru-RU/translation.json` - 러시아어 번역 추가
- `apps/client/src/app/i18n/locales/sv-SE/translation.json` - 스웨덴어 번역 추가
- `apps/client/src/app/i18n/locales/zh-Hans-CN/translation.json` - 중국어 간체 번역 추가
- `apps/client/src/app/i18n/locales/zh-Hant-TW/translation.json` - 중국어 번체 번역 추가

## Major Changes

### 1. LocalizedInput - 다국어 텍스트 입력

`useEditorUI()` 훅에서 `editorConfig.selectedLanguage`를 읽어 현재 편집 중인 언어를 파악하고, `I18nString` 객체에서 해당 언어의 텍스트를 표시/편집한다.

```typescript
// 현재 언어의 텍스트 값. 'default' 키를 폴백으로 사용
const currentValue = value?.[language] ?? value?.['default'] ?? '';

// 변경 시 기존 객체를 복사 후 현재 언어 값만 갱신
const handleChange = useCallback(
  (text: string) => {
    const updated: I18nString = { ...(value ?? {}), [language]: text };
    onChange(updated);
  },
  [value, language, onChange]
);
```

- `multiline` prop으로 `Input`/`Textarea` 전환
- `maxLength` 지정 시 글자 수 카운터 표시

### 2. OptionsSwitch - 세그먼트 전환기

TypeScript 제네릭 `<T extends string>`을 사용하여 타입 안전성을 보장한다.

```typescript
// 사용 예시: Ending Card 유형 전환
<OptionsSwitch<'endScreen' | 'redirectToUrl'>
  value={ending.type}
  onChange={(type) => updateEndingType(type)}
  options={[
    { value: 'endScreen', label: 'End Screen' },
    { value: 'redirectToUrl', label: 'Redirect' },
  ]}
/>
```

- 선택된 옵션은 `bg-background text-foreground shadow-sm` 스타일
- 미선택 옵션은 `text-muted-foreground hover:text-foreground` 스타일
- `disabled` 상태에서 `cursor-not-allowed opacity-50` 적용

### 3. ConfirmDeleteDialog - 삭제 확인 모달

`@inquiry/client-ui`의 Dialog 컴포넌트 기반으로 `destructive` 변형 버튼을 사용한다.

- 확인 시 `onConfirm()` 호출 후 자동으로 모달 닫힘
- `loading` prop으로 삭제 진행 중 버튼 비활성화
- `confirmLabel`로 삭제 버튼 텍스트 커스터마이즈 가능

### 4. FileUploadInput - 파일 URL 입력

`lucide-react`의 `ImageIcon`을 입력 필드 왼쪽에 배치하고, URL이 있을 때 `X` 버튼으로 제거 가능하다.

- 빈 문자열 입력 시 `undefined`를 전달하여 값 초기화
- `aria-label`로 접근성 보장

### 5. i18n 번역 키 (15개 로케일)

`surveyEditor.shared` 네임스페이스 하위에 4개 키를 추가:
- `cancel` - 취소 버튼 라벨
- `confirmDelete` - 삭제 확인 버튼 라벨
- `imageUrlPlaceholder` - 이미지 URL 입력 플레이스홀더
- `removeImage` - 이미지 제거 버튼 접근성 라벨

## How to use it

```typescript
import {
  LocalizedInput,
  OptionsSwitch,
  ConfirmDeleteDialog,
  FileUploadInput,
} from '@inquiry/client-survey-editor';

// 다국어 텍스트 입력
<LocalizedInput
  value={headline}
  onChange={setHeadline}
  label="Headline"
  placeholder="Enter headline..."
  maxLength={100}
/>

// 여러 줄 입력
<LocalizedInput
  value={description}
  onChange={setDescription}
  label="Description"
  multiline
/>

// 옵션 전환
<OptionsSwitch
  value={endingType}
  onChange={setEndingType}
  options={[
    { value: 'endScreen', label: t('ending.type_end_screen') },
    { value: 'redirectToUrl', label: t('ending.type_redirect') },
  ]}
/>

// 삭제 확인
<ConfirmDeleteDialog
  open={showDeleteDialog}
  onOpenChange={setShowDeleteDialog}
  title="Delete Ending"
  description="Are you sure you want to delete this ending?"
  onConfirm={handleDeleteEnding}
/>

// 이미지 URL 입력
<FileUploadInput
  value={imageUrl}
  onChange={setImageUrl}
  label="Image"
/>
```

## Related Components/Modules

- `@inquiry/client-ui` - Button, Input, Label, Textarea, Dialog 등 UI 프리미티브 제공
- `@inquiry/survey-builder-config` - `I18nString` 타입 정의
- `useEditorUI()` 훅 - `editorConfig.selectedLanguage`로 현재 편집 언어 접근
- `packages/shared-i18n` - i18n 인프라 (react-i18next)
- Layout 컴포넌트 (`SurveyEditorLayout`, `SurveyMenuBar`, `EditorTabs`) - 편집기 레이아웃 구조에서 공유 컴포넌트를 사용

## Precautions

- `FileUploadInput`은 현재 URL 직접 입력 방식만 지원한다. 실제 파일 업로드 기능은 후속 작업에서 구현 예정이다.
- `LocalizedInput`은 `value`가 `undefined`일 때 빈 객체 `{}`에서 시작하므로, 처음 사용 시 `'default'` 키가 자동으로 생성되지 않는다. 현재 선택된 언어 키로만 값이 저장된다.
- `OptionsSwitch`는 2개 이상의 옵션도 지원하지만, 주 용도는 2가지 옵션 전환이다.
- `ConfirmDeleteDialog`의 `handleConfirm`은 `onConfirm()`을 동기적으로 호출한 후 모달을 닫는다. 비동기 삭제의 경우 `loading` prop을 활용하여 처리 상태를 관리해야 한다.
