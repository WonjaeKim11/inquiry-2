# FSD-015 다국어 설문 공유 패키지 multilingual 모듈

## Overview
다국어 설문 기능을 위한 공유 패키지 multilingual 모듈을 구현했다. 이 모듈은 `packages/survey-builder-config` 내에 위치하며, 서버/클라이언트 양쪽에서 사용할 수 있는 다국어 관련 타입, 스키마, 유틸리티, 검증 함수를 제공한다.

기존 `I18nString`(단순 Record<string, string>)과 달리, 새로운 `TI18nString` 타입은 `default` 키를 명시적으로 요구하여 기본 언어 텍스트가 항상 존재하도록 보장한다. RTL 언어 감지, ISO 639-1 언어 코드 목록, 번역 완료 검증 등 다국어 설문에 필요한 모든 기반 기능을 포함한다.

## Changed Files

### 생성된 파일
- `packages/survey-builder-config/src/lib/multilingual/types.ts` — TI18nString, SurveyLanguage, SurveyLanguageConfig 타입 정의 + Zod 스키마
- `packages/survey-builder-config/src/lib/multilingual/constants.ts` — RTL 언어 코드 상수, 최대 언어 수 제한
- `packages/survey-builder-config/src/lib/multilingual/iso-language-codes.ts` — ISO 639-1 주요 언어 코드 84개 목록
- `packages/survey-builder-config/src/lib/multilingual/rtl-detector.ts` — RTL 언어 판별 및 텍스트 방향 감지 유틸
- `packages/survey-builder-config/src/lib/multilingual/i18n-string.utils.ts` — TI18nString 조작 유틸 (정규화, 키 추가, 번역 제거, 로컬라이즈 텍스트 조회)
- `packages/survey-builder-config/src/lib/multilingual/validator.ts` — TI18nString 검증, SurveyLanguage 배열 검증, 번역 완료 검증
- `packages/survey-builder-config/src/lib/multilingual/index.ts` — barrel export

### 수정된 파일
- `packages/survey-builder-config/src/index.ts` — multilingual 모듈 re-export 추가

## Major Changes

### 1. TI18nString 타입 시스템
기존 `I18nString = Record<string, string>`에서 `default` 키를 필수로 요구하는 강화된 타입:
```typescript
export type TI18nString = { default: string; [languageCode: string]: string };
```
Zod 스키마로 런타임 검증도 지원하며, `z.object({ default: z.string() }).catchall(z.string())` 패턴을 사용한다.

### 2. SurveyLanguage 배열 검증
- default=true 항목이 정확히 1개인지 검증
- languageId 중복 불가 검증
- 최대 50개 언어 제한
- 기본 언어는 반드시 enabled=true

### 3. RTL 감지
- `isRtlLanguage(code)`: 언어 코드 기반 RTL 판별 (ar, he, fa, ur, ps, sd, ug, yi)
- `detectTextDirection(text)`: 유니코드 문자 비율로 텍스트 방향 감지

### 4. 번역 완료 검증
`validateTranslationCompleteness`는 설문 데이터 객체를 재귀적으로 탐색하여 모든 TI18nString 필드에 대해 활성 언어의 번역이 존재하는지 검증한다.

## How to use it

```typescript
import {
  normalizeToI18nString,
  addLanguageKey,
  getLocalizedText,
  isRtlLanguage,
  detectTextDirection,
  validateSurveyLanguages,
  validateTranslationCompleteness,
  ti18nStringSchema,
} from '@inquiry/survey-builder-config';

// 기존 string을 TI18nString으로 변환
const headline = normalizeToI18nString('안녕하세요');
// => { default: '안녕하세요' }

// 언어 키 추가
const withKo = addLanguageKey(headline, 'ko');
// => { default: '안녕하세요', ko: '' }

// 로컬라이즈 텍스트 조회
getLocalizedText({ default: 'Hello', ko: '안녕하세요' }, 'ko');
// => '안녕하세요'

// RTL 판별
isRtlLanguage('ar-SA'); // => true
isRtlLanguage('ko');    // => false

// 텍스트 방향 감지
detectTextDirection('مرحبا'); // => 'rtl'

// SurveyLanguage 배열 검증
validateSurveyLanguages([
  { languageId: 'lang1', default: true, enabled: true },
  { languageId: 'lang2', default: false, enabled: true },
]);
// => { valid: true, errors: [] }

// Zod 스키마 검증
ti18nStringSchema.parse({ default: 'Hello', ko: '안녕하세요' });
```

## Related Components/Modules
- `packages/survey-builder-config/src/lib/types.ts` — 기존 I18nString 타입 (하위 호환성 유지)
- 향후 서버/클라이언트의 다국어 설문 기능에서 이 모듈의 타입과 유틸리티를 사용할 예정

## Precautions
- `TI18nString`과 기존 `I18nString`은 별개의 타입이다. 기존 코드는 `I18nString`을 계속 사용하되, 새로운 다국어 설문 기능에서는 `TI18nString`을 사용해야 한다.
- `ISO_LANGUAGE_CODES`에 84개 언어가 포함되어 있으나, 필요시 추가 가능하다.
- `detectTextDirection`은 유니코드 문자 비율 기반이므로, 숫자/기호만 포함된 텍스트는 'ltr'로 판별된다.
- `validateTranslationCompleteness`는 `default` 키가 string인 모든 중첩 객체를 TI18nString으로 간주하므로, 다른 용도의 `default` 키가 있는 구조에서는 오탐 가능성이 있다.
