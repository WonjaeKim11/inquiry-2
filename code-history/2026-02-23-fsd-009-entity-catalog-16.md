# FSD-009 질문 유형 카탈로그 - 16개 Entity 구현

## Overview
FSD-009 질문 유형 카탈로그의 핵심 구현으로, 설문 빌더에서 사용할 수 있는 16개 Entity(1개 Block + 15개 Question)를 모두 정의한다. 기존에 block과 openText 2개만 존재하던 Entity를 전체 질문 유형으로 확장하여, 설문 빌더가 다양한 질문 유형을 지원할 수 있도록 한다. 각 Entity는 공통 속성(headline, required, subheader, imageUrl, videoUrl, isDraft)과 유형별 고유 속성을 조합하며, `@coltorapps/builder`의 `createEntity` API를 활용한다.

## Changed Files

### 신규 생성 (14개 Entity 파일)
- `packages/survey-builder-config/src/lib/entities/multiple-choice-single.entity.ts` - 단일 선택(라디오) 질문 Entity
- `packages/survey-builder-config/src/lib/entities/multiple-choice-multi.entity.ts` - 복수 선택(체크박스) 질문 Entity
- `packages/survey-builder-config/src/lib/entities/nps.entity.ts` - NPS(Net Promoter Score) 질문 Entity
- `packages/survey-builder-config/src/lib/entities/cta.entity.ts` - CTA(Call To Action) 질문 Entity (attributesExtensions 포함)
- `packages/survey-builder-config/src/lib/entities/rating.entity.ts` - 별점/척도 평가 질문 Entity
- `packages/survey-builder-config/src/lib/entities/consent.entity.ts` - 동의/약관 확인 질문 Entity
- `packages/survey-builder-config/src/lib/entities/picture-selection.entity.ts` - 이미지 선택 질문 Entity
- `packages/survey-builder-config/src/lib/entities/date.entity.ts` - 날짜 입력 질문 Entity
- `packages/survey-builder-config/src/lib/entities/file-upload.entity.ts` - 파일 업로드 질문 Entity
- `packages/survey-builder-config/src/lib/entities/cal.entity.ts` - Cal.com 일정 예약 질문 Entity
- `packages/survey-builder-config/src/lib/entities/matrix.entity.ts` - 행렬(그리드) 질문 Entity
- `packages/survey-builder-config/src/lib/entities/address.entity.ts` - 주소 입력 질문 Entity
- `packages/survey-builder-config/src/lib/entities/ranking.entity.ts` - 순위 매기기 질문 Entity
- `packages/survey-builder-config/src/lib/entities/contact-info.entity.ts` - 연락처 정보 수집 질문 Entity

### 수정 (4개 파일)
- `packages/survey-builder-config/src/lib/entities/open-text.entity.ts` - 전면 재작성: 공통 6속성 추가, charLimit cross-validation attributesExtensions 추가, parentRequired 설정
- `packages/survey-builder-config/src/lib/entities/index.ts` - 16개 Entity 전체 re-export
- `packages/survey-builder-config/src/lib/survey-builder.ts` - 16개 Entity 등록, entitiesExtensions parent-child 제약, FORBIDDEN_IDS 기반 ID 생성/검증, ELEMENT_ENTITY_NAMES 상수 export
- `packages/survey-builder-config/src/index.ts` - 16개 Entity 및 ELEMENT_ENTITY_NAMES barrel export 추가

### 변경 없음
- `packages/survey-builder-config/src/lib/entities/block.entity.ts` - 기존 유지 (로직 속성은 FS-012 범위)

## Major Changes

### 1. Entity 공통 패턴
모든 질문 Entity는 동일한 구조를 따른다:
- 6개 공통 속성: `headlineAttribute`, `requiredAttribute`, `subheaderAttribute`, `imageUrlAttribute`, `videoUrlAttribute`, `isDraftAttribute`
- `parentRequired: true` 설정으로 반드시 Block 내부에 위치해야 함
- 유형별 고유 속성 추가

### 2. attributesExtensions (속성 간 교차 검증)
두 Entity에서 `attributesExtensions`를 사용하여 속성 간 의존 관계를 검증한다:

**openText** - charLimit 교차 검증:
```typescript
attributesExtensions: {
  minLength: {
    validate(value, context) {
      const validated = context.validate(value);
      if (context.entity.attributes.charLimitEnabled && validated != null && context.entity.attributes.maxLength != null) {
        if (validated > context.entity.attributes.maxLength) {
          throw new Error('최소 길이는 최대 길이보다 작아야 합니다');
        }
      }
      return validated;
    },
  },
  // maxLength도 동일한 패턴으로 역방향 검증
}
```

**cta** - dismissible 교차 검증:
```typescript
attributesExtensions: {
  buttonUrl: {
    validate(value, context) {
      const validated = context.validate(value);
      if (context.entity.attributes.dismissible === true && !validated) {
        throw new Error('외부 버튼 활성화 시 버튼 URL은 필수입니다');
      }
      return validated;
    },
  },
  // buttonLabel도 dismissible === true일 때 필수 검증
}
```

### 3. surveyBuilder 확장
- 16개 Entity를 `entities` 배열에 등록
- `entitiesExtensions`에서 block은 모든 Element를 `childrenAllowed`로 허용
- 모든 Element는 `allowedParents: ['block']`으로 제한
- `ELEMENT_ENTITY_NAMES` 상수를 export하여 다른 모듈에서 재사용 가능
- `generateEntityId`에 FORBIDDEN_IDS 충돌 방지 루프 추가
- `validateEntityId`에 정규식 + FORBIDDEN_IDS + CUID 형식 다중 검증 추가

## How to use it

### Entity import
```typescript
import {
  blockEntity,
  openTextEntity,
  multipleChoiceSingleEntity,
  // ... 기타 Entity
  ELEMENT_ENTITY_NAMES,
} from '@inquiry/survey-builder-config';
```

### 빌더로 스키마 생성
```typescript
import { surveyBuilder } from '@inquiry/survey-builder-config';

const schema = surveyBuilder.validateSchema({
  entities: {
    'block-1': { type: 'block', attributes: {}, children: ['q-1'] },
    'q-1': { type: 'openText', attributes: { headline: { default: '이름을 입력하세요' } }, parentId: 'block-1' },
  },
  root: ['block-1'],
});
```

### ELEMENT_ENTITY_NAMES 활용
```typescript
import { ELEMENT_ENTITY_NAMES } from '@inquiry/survey-builder-config';

// 질문 유형 목록 렌더링, 필터링 등에 활용
ELEMENT_ENTITY_NAMES.forEach((name) => console.log(name));
// 'openText', 'multipleChoiceSingle', ... 'contactInfo'
```

## Related Components/Modules
- `packages/survey-builder-config/src/lib/attributes/` - 모든 Entity가 참조하는 속성(Attribute) 정의
- `packages/survey-builder-config/src/lib/types/` - LocalizedString, Choice, PictureChoice 등 속성에서 사용하는 타입
- `packages/survey-builder-config/src/lib/validation/` - validationConfigAttribute에서 사용하는 검증 엔진
- `packages/survey-builder-config/src/lib/constants/` - FORBIDDEN_IDS, ALLOWED_FILE_EXTENSIONS 등 상수
- `packages/survey-builder-config/src/lib/shuffle/` - shuffleOption 속성과 연계되는 셔플 로직

## Precautions
- `block.entity.ts`는 현재 속성이 없는 상태이며, 로직 관련 속성은 FS-012 범위에서 추가 예정
- `attributesExtensions`의 교차 검증은 `@coltorapps/builder`의 검증 흐름에 의존하므로, 빌더 라이브러리 버전 업데이트 시 호환성 확인 필요
- 모든 에러 메시지는 한국어로 작성되어 있으며, 추후 i18n 처리가 필요할 수 있음
- `ELEMENT_ENTITY_NAMES`는 `as const`로 선언되어 있어 타입 수준에서 엄격한 유니온 타입을 제공함
