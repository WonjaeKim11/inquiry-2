# FSD-016 Phase 4A: 기본 Entity 컴포넌트 5종 구현

## Overview
설문 에디터의 기본 Entity 컴포넌트 5종(OpenText, Consent, CTA, Date, Cal)을 구현했다.
기존 placeholder 컴포넌트를 실제 편집 UI가 포함된 컴포넌트로 교체하여,
사용자가 각 질문 유형의 속성을 직접 편집할 수 있게 했다.

각 컴포넌트는 `createEntityComponent`를 사용해 타입 안전하게 생성되며,
`BuilderStoreContext`를 통해 `builderStore.setEntityAttribute`를 호출하여 속성 값을 변경한다.
모든 사용자 노출 문자열은 i18next `t()` 함수로 래핑되어 15개 로케일을 지원한다.

## Changed Files

### 신규 파일
- `libs/client/survey-editor/src/lib/components/elements-view/entity-components/OpenTextComponent.tsx` - 자유 텍스트 입력 질문 편집기 (headline, placeholder, inputType, longAnswer, charLimit)
- `libs/client/survey-editor/src/lib/components/elements-view/entity-components/ConsentComponent.tsx` - 동의/약관 확인 질문 편집기 (headline, label, required)
- `libs/client/survey-editor/src/lib/components/elements-view/entity-components/CTAComponent.tsx` - CTA 안내 화면 편집기 (headline, buttonLabel, buttonUrl, dismissible)
- `libs/client/survey-editor/src/lib/components/elements-view/entity-components/DateComponent.tsx` - 날짜 입력 질문 편집기 (headline, dateFormat)
- `libs/client/survey-editor/src/lib/components/elements-view/entity-components/CalComponent.tsx` - Cal.com 일정 예약 질문 편집기 (headline, calUserName, calHost)

### 수정 파일
- `libs/client/survey-editor/src/lib/components/elements-view/entity-components/index.tsx` - 5개 placeholder를 실제 컴포넌트로 교체
- `apps/client/src/app/i18n/locales/en-US/translation.json` - 영어 i18n 키 추가 (surveyEditor.element 섹션)
- `apps/client/src/app/i18n/locales/ko-KR/translation.json` - 한국어 i18n 키 추가
- `apps/client/src/app/i18n/locales/ja-JP/translation.json` - 일본어 i18n 키 추가
- `apps/client/src/app/i18n/locales/de-DE/translation.json` - 독일어 i18n 키 추가
- `apps/client/src/app/i18n/locales/es-ES/translation.json` - 스페인어 i18n 키 추가
- `apps/client/src/app/i18n/locales/fr-FR/translation.json` - 프랑스어 i18n 키 추가
- `apps/client/src/app/i18n/locales/zh-Hans-CN/translation.json` - 중국어 간체 i18n 키 추가
- `apps/client/src/app/i18n/locales/zh-Hant-TW/translation.json` - 중국어 번체 i18n 키 추가
- `apps/client/src/app/i18n/locales/pt-BR/translation.json` - 브라질 포르투갈어 i18n 키 추가
- `apps/client/src/app/i18n/locales/pt-PT/translation.json` - 포르투갈어 i18n 키 추가
- `apps/client/src/app/i18n/locales/nl-NL/translation.json` - 네덜란드어 i18n 키 추가
- `apps/client/src/app/i18n/locales/ru-RU/translation.json` - 러시아어 i18n 키 추가
- `apps/client/src/app/i18n/locales/sv-SE/translation.json` - 스웨덴어 i18n 키 추가
- `apps/client/src/app/i18n/locales/ro-RO/translation.json` - 루마니아어 i18n 키 추가
- `apps/client/src/app/i18n/locales/hu-HU/translation.json` - 헝가리어 i18n 키 추가

### 버그 수정 (기존 코드)
- `libs/client/survey-editor/src/lib/components/elements-view/BlockLogicEditor.tsx` - `setEntityAttributeValue` -> `setEntityAttribute` 메서드명 오류 수정, 미사용 `GripVertical` import 제거
- `libs/client/survey-editor/src/lib/components/elements-view/entity-components/MultipleChoiceComponent.tsx` - 미사용 `Switch` import 제거

## Major Changes

### 컴포넌트 구조 패턴
각 Entity 컴포넌트는 동일한 패턴을 따른다:

```typescript
export const OpenTextComponent = createEntityComponent(
  openTextEntity,
  ({ entity }) => {
    const { builderStore } = useBuilderStoreContext();
    const entityId = entity.id;
    const attrs = entity.attributes;

    const handleHeadlineChange = useCallback(
      (value: I18nString) => {
        builderStore.setEntityAttribute(entityId, 'headline', value);
      },
      [builderStore, entityId]
    );

    return (
      <ElementComponent
        entityId={entityId}
        entityType="openText"
        typeLabel={t('surveyEditor.element.types.openText', 'Open Text')}
        advancedSettings={/* 고급 설정 UI */}
      >
        {/* 기본 설정 UI */}
      </ElementComponent>
    );
  }
);
```

### 데이터 흐름
1. `entity.attributes`에서 현재 속성 값을 읽어 UI에 표시
2. 사용자가 입력을 변경하면 `useCallback`으로 감싼 핸들러가 호출됨
3. 핸들러에서 `builderStore.setEntityAttribute(entityId, attributeName, newValue)` 호출
4. BuilderStore가 상태를 업데이트하고 컴포넌트가 리렌더링됨

### ElementComponent 래퍼 활용
- `children`: 기본 설정 (headline, placeholder 등 항상 표시)
- `advancedSettings`: 고급 설정 (접기/펼치기 토글로 표시)

## How to use it

Entity 컴포넌트는 `entityComponentMap`에 등록되어 `BuilderEntities`에서 자동으로 사용된다.
개발자가 직접 호출할 필요 없이, 설문 에디터에서 해당 타입의 Entity를 추가하면 자동으로 렌더링된다.

```typescript
// entity-components/index.tsx에서 자동 등록
export const entityComponentMap = {
  openText: OpenTextComponent,
  consent: ConsentComponent,
  cta: CTAComponent,
  date: DateComponent,
  cal: CalComponent,
  // ... 기타 컴포넌트
};
```

## Related Components/Modules

- `ElementComponent` (래퍼) - 카드 UI, 활성 상태 관리, 고급 설정 토글
- `BuilderStoreContext` - builderStore 인스턴스를 Context로 전달
- `LocalizedInput` - I18nString 입력 컴포넌트 (다국어 텍스트 편집)
- `FileUploadInput` - URL 입력 컴포넌트 (이미지/비디오 URL)
- `@inquiry/client-ui` - Switch, Select, Input, Label 등 UI 프리미티브
- `@inquiry/survey-builder-config` - Entity 정의 및 속성 타입
- `@coltorapps/builder-react` - `createEntityComponent` 팩토리

## Precautions

- `entity.attributes`에서 I18nString 타입 속성에 접근할 때 `as I18nString | undefined` 캐스팅이 필요하다. 이는 `@coltorapps/builder`의 제네릭 추론 한계로 인한 것이다.
- `builderStore`의 `setEntityAttribute` 메서드는 타입이 `any`로 되어 있어 속성 이름 오타에 런타임 에러가 발생할 수 있다.
- CTA 컴포넌트의 `buttonUrl` 속성은 `string | null | undefined`를 지원하므로 빈 값 처리 시 `null`로 변환해야 한다.
- Cal 컴포넌트의 `calHost` 속성도 동일하게 `string | null | undefined`를 지원한다.
