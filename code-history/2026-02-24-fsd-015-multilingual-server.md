# FSD-015 다국어 설문 서버 사이드 구현

## Overview

FSD-015 다국어 설문(Multi-Language Surveys)의 서버 사이드를 구현했다.
설문에 여러 언어를 설정하고, 발행 시 번역 완료 여부를 검증하며, Enterprise 라이선스로 접근을 제어하는 기능을 추가한다.

기존 FSD-008(설문 CRUD), FSD-012(조건부 로직), FSD-013(변수/히든필드/리콜), FSD-014(쿼터 관리) 패턴을 따라 공유 패키지(타입/유틸/검증) + 서버 모듈(NestJS) + 서버 통합(가드/검증/DTO) 구조로 구현했다.

## Changed Files

### Phase 1: 공유 패키지 — multilingual 모듈 (7 신규 + 2 수정)
| 파일 | 역할 |
|------|------|
| `packages/survey-builder-config/src/lib/multilingual/types.ts` | `TI18nString`, `SurveyLanguage`, `SurveyLanguageConfig` 타입 + Zod 스키마 |
| `packages/survey-builder-config/src/lib/multilingual/constants.ts` | RTL 언어 코드 상수, 최대 언어 수 제한 |
| `packages/survey-builder-config/src/lib/multilingual/iso-language-codes.ts` | ISO 639-1 언어 코드 84개 목록 |
| `packages/survey-builder-config/src/lib/multilingual/rtl-detector.ts` | `isRtlLanguage()`, `detectTextDirection()` 유틸 |
| `packages/survey-builder-config/src/lib/multilingual/i18n-string.utils.ts` | `normalizeToI18nString()`, `addLanguageKey()` 등 TI18nString 조작 유틸 |
| `packages/survey-builder-config/src/lib/multilingual/validator.ts` | `validateTI18nString()`, `validateSurveyLanguages()`, `validateTranslationCompleteness()` 검증 |
| `packages/survey-builder-config/src/lib/multilingual/index.ts` | barrel export |
| `packages/survey-builder-config/src/index.ts` | multilingual 모듈 re-export 추가 |

### Phase 2: 서버 multilingual 모듈 (6 신규)
| 파일 | 역할 |
|------|------|
| `libs/server/multilingual/package.json` | `@inquiry/server-multilingual` 패키지 정의 |
| `libs/server/multilingual/tsconfig.json` | 프로젝트 레퍼런스 (composite) |
| `libs/server/multilingual/tsconfig.lib.json` | 빌드 설정 |
| `libs/server/multilingual/src/index.ts` | barrel export |
| `libs/server/multilingual/src/lib/multilingual.module.ts` | NestJS 모듈 (MultilingualValidationService 제공) |
| `libs/server/multilingual/src/lib/multilingual-validation.service.ts` | DB 참조 무결성 + 번역 완료 검증 서비스 |

### Phase 3-A: Language 라이선스 가드 + 삭제 확장 (2 수정)
| 파일 | 역할 |
|------|------|
| `libs/server/project/src/lib/controllers/language.controller.ts` | POST/PATCH/DELETE에 `@RequireLicense('multiLanguage')` 가드 추가 |
| `libs/server/project/src/lib/services/language.service.ts` | `deleteLanguage()`에 Survey.languages 연쇄 정리 로직 추가 |

### Phase 3-B: Survey 검증 + DTO + App Module (4 수정)
| 파일 | 역할 |
|------|------|
| `libs/server/survey/src/lib/services/survey-validation.service.ts` | 발행 검증 6단계 다국어 번역 완료 검증 추가 |
| `libs/server/survey/src/lib/dto/create-survey.dto.ts` | `languages` 필드를 `surveyLanguageArraySchema`로 강화, `showLanguageSwitch` 추가 |
| `apps/server/src/app/app.module.ts` | `MultilingualModule` import 추가 |
| `apps/server/tsconfig.app.json` | multilingual tsconfig reference 추가 |

### Phase 3-C: i18n 번역 (15 수정)
| 파일 | 역할 |
|------|------|
| `apps/client/src/app/i18n/locales/*/translation.json` (15개) | `multilingual` 최상위 키 추가 |

## Major Changes

### 1. TI18nString 타입 — "default" 키 필수 다국어 문자열

```typescript
// 기존 I18nString: Record<string, string> — 어떤 키든 허용
// 새 TI18nString: default 키 필수 — 하위 호환성 보장
type TI18nString = { default: string; [languageCode: string]: string };
```

`normalizeToI18nString()`으로 기존 단일 언어 string을 자동 변환:
```typescript
normalizeToI18nString("질문 텍스트") // → { default: "질문 텍스트" }
```

### 2. SurveyLanguage 구조 — Survey.languages JSON 배열

```typescript
interface SurveyLanguage {
  languageId: string;  // Language 테이블 ID
  default: boolean;    // 정확히 1개만 true
  enabled: boolean;    // true인 언어만 응답자에게 노출
}
```

Zod 스키마로 구조 검증: default 유일성, languageId 중복 불가, 기본 언어 enabled 필수.

### 3. 발행 검증 6단계 — 다국어 번역 완료 검증

`SurveyValidationService.validateForPublish()`에 6단계 추가:
1. 활성 언어가 2개 이상인 경우에만 동작
2. `SurveyLanguage[]` 구조 검증
3. Language 테이블에서 활성 언어 코드 조회
4. 기본 언어를 제외한 활성 언어에 대해 번역 완료 확인
5. TI18nString 필드를 재귀적으로 탐색하여 누락된 번역 검출
6. 최대 5건의 상세 오류 메시지 반환

### 4. Language 삭제 시 Survey.languages 연쇄 정리

Language 삭제 → 해당 프로젝트의 모든 Survey에서 삭제된 languageId를 참조하는 SurveyLanguage 항목을 자동 제거하여 참조 무결성을 유지한다.

### 5. RTL 언어 자동 감지

- `isRtlLanguage(code)`: 언어 코드 기반 판별 (ar, he, fa, ur, ps, sd, ug, yi)
- `detectTextDirection(text)`: Unicode Bidi 문자 비율로 텍스트 방향 감지

## How to use it

### 언어 설정 CRUD (Enterprise 라이선스 필요)
```
POST /api/projects/:projectId/languages   → 언어 생성 (라이선스 필요)
GET  /api/projects/:projectId/languages   → 언어 목록 조회 (라이선스 불필요)
PATCH /api/languages/:languageId          → 언어 수정 (라이선스 필요)
DELETE /api/languages/:languageId         → 언어 삭제 (라이선스 필요)
```

### 설문 DTO — languages 필드
```json
{
  "name": "설문 이름",
  "languages": [
    { "languageId": "clxyz123", "default": true, "enabled": true },
    { "languageId": "clxyz456", "default": false, "enabled": true }
  ],
  "showLanguageSwitch": true
}
```

### 공유 패키지 유틸리티 사용
```typescript
import {
  normalizeToI18nString,
  addLanguageKey,
  getLocalizedText,
  isRtlLanguage,
  validateTranslationCompleteness,
} from '@inquiry/survey-builder-config';
```

## Related Components/Modules

| 모듈 | 관계 |
|------|------|
| `@inquiry/survey-builder-config` | 공유 타입/유틸/검증 함수 — 서버/클라이언트 공용 |
| `@inquiry/server-multilingual` | NestJS 서버 모듈 — DB 참조 무결성 검증 |
| `@inquiry/server-license` | `LicenseGuard` + `@RequireLicense('multiLanguage')` |
| `@inquiry/server-project` | LanguageController/Service — 라이선스 가드 + 삭제 연쇄 정리 |
| `@inquiry/server-survey` | SurveyValidationService 6단계 — 번역 완료 검증 |
| Prisma Language 모델 | Language 테이블 참조 (projectId_code 고유) |
| Prisma Survey 모델 | Survey.languages (Json), Survey.showLanguageSwitch (Boolean?) |

## Precautions

- **Prisma 스키마 변경 없음**: Survey.languages(Json), Survey.showLanguageSwitch(Boolean?), Response.language(String?), Language 모델이 이미 존재. 마이그레이션 불필요.
- **하위 호환성**: 기존 단일 언어 설문(string 타입)은 `normalizeToI18nString()`으로 자동 변환 가능.
- **순환 의존 방지**: SurveyValidationService는 `@inquiry/survey-builder-config`에서 직접 import하여 `@inquiry/server-multilingual` 의존 없이 검증 수행.
- **클라이언트 미구현**: 이 구현은 서버 사이드만 포함. 클라이언트 UI(언어 관리 패널, 번역 에디터, 언어 전환기 등)는 별도 세션에서 구현 예정.
- **Enterprise 라이선스**: 언어 생성/수정/삭제는 `multiLanguage` 기능 라이선스 필요. 조회(GET)는 무료.
