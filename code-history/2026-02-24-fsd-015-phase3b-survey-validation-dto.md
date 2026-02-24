# FSD-015 Phase 3-B: Survey 검증 6단계 추가 + DTO 강화 + App Module + tsconfig 수정

## Overview
FSD-015 다국어(Multilingual) 기능의 Phase 3-B로, 설문 발행 전 검증 파이프라인에 6단계 "다국어 번역 완료 검증"을 추가하고, 설문 생성 DTO의 `languages` 필드를 강타입 스키마로 강화하며, `MultilingualModule`을 서버 앱 모듈에 등록하는 통합 작업이다.

기존 5단계(스키마/비즈니스/로직/변수/쿼터) 검증에 이어, 활성 언어가 2개 이상일 때 모든 TI18nString 필드의 번역 누락을 감지하여 미번역 설문이 발행되는 것을 방지한다.

## Changed Files

| 파일 | 역할 |
|------|------|
| `libs/server/survey/src/lib/services/survey-validation.service.ts` | 6단계 다국어 번역 완료 검증 메서드(`validateMultilingual`) 추가 |
| `libs/server/survey/src/lib/dto/create-survey.dto.ts` | `languages` 필드를 `surveyLanguageArraySchema`로 강화, `showLanguageSwitch` 필드 추가 |
| `apps/server/src/app/app.module.ts` | `MultilingualModule` import 및 등록 |
| `apps/server/tsconfig.app.json` | multilingual 라이브러리 TypeScript 프로젝트 참조 추가 |
| `apps/server/package.json` | `@inquiry/server-multilingual` workspace 의존성 추가 |

## Major Changes

### 1. 6단계 다국어 번역 완료 검증 (survey-validation.service.ts)

`validateForPublish()` 메서드에 6단계 호출을 추가하고, `validateMultilingual()` private 메서드를 구현했다.

검증 흐름:
1. `survey.languages` 배열이 2개 이상인지 확인 (1개 이하면 스킵)
2. `validateSurveyLanguages()`로 SurveyLanguage 구조 검증
3. 활성(enabled) 언어가 2개 이상인지 확인
4. DB Language 테이블에서 언어 코드(code) 조회
5. 기본 언어를 제외한 활성 언어 코드 추출
6. `validateTranslationCompleteness()`로 schema/welcomeCard/endings의 번역 완료 확인
7. 누락 번역이 있으면 최대 5건까지 상세 메시지와 함께 `BadRequestException` 발생

순환 의존 방지를 위해 `@inquiry/server-multilingual`을 import하지 않고, `@inquiry/survey-builder-config`에서 직접 검증 함수를 import한다. DB 조회는 기존 `ServerPrismaService`를 활용한다.

```typescript
// 번역 완료 검증
const result = validateTranslationCompleteness(
  surveyData as Record<string, unknown>,
  enabledCodes
);

if (!result.valid) {
  const missing = result.missingTranslations.slice(0, 5);
  const msgs = missing.map(
    (m) => `"${m.field}" 필드의 "${m.language}" 번역 누락`
  );
  throw new BadRequestException(
    `번역이 완료되지 않았습니다: ${msgs.join(', ')}`
  );
}
```

### 2. DTO 강화 (create-survey.dto.ts)

- `languages` 필드: `z.unknown().optional()` -> `surveyLanguageArraySchema.optional()`로 변경하여 타입 안전성 확보
- `showLanguageSwitch` 필드: `z.boolean().optional()` 새로 추가 (언어 전환 UI 표시 여부)

### 3. App Module 등록 (app.module.ts)

`MultilingualModule`을 서버의 루트 `AppModule`에 등록하여 다국어 관련 서비스를 DI 컨테이너에서 사용할 수 있게 했다.

### 4. tsconfig 참조 추가 (tsconfig.app.json)

TypeScript 프로젝트 참조에 `libs/server/multilingual/tsconfig.lib.json`을 추가하여 빌드 의존성 그래프에 포함시켰다.

### 5. workspace 의존성 추가 (package.json)

`@inquiry/server-multilingual: "workspace:*"`를 서버 앱의 dependencies에 추가하여 pnpm workspace 해석이 가능하도록 했다.

## How to use it

설문 발행 시 기존 API를 그대로 호출하면 자동으로 6단계 검증이 적용된다.

다국어 설정이 활성화된 설문에서 번역이 누락된 경우:
```
POST /api/v1/surveys/:id/publish

Response 400:
{
  "statusCode": 400,
  "message": "번역이 완료되지 않았습니다: \"headline\" 필드의 \"ja\" 번역 누락, \"subheader\" 필드의 \"ko\" 번역 누락"
}
```

설문 생성 DTO의 `languages` 필드는 이제 `SurveyLanguage[]` 스키마로 검증된다:
```json
{
  "name": "다국어 설문",
  "languages": [
    { "languageId": "lang-1", "default": true, "enabled": true },
    { "languageId": "lang-2", "default": false, "enabled": true }
  ],
  "showLanguageSwitch": true
}
```

## Related Components/Modules

- `@inquiry/survey-builder-config` - `validateSurveyLanguages`, `validateTranslationCompleteness`, `surveyLanguageArraySchema`, `SurveyLanguage` 타입 제공
- `@inquiry/server-multilingual` - MultilingualModule (App Module에 등록)
- `@inquiry/server-prisma` - Language 테이블 조회를 위한 PrismaService
- `libs/server/survey` - SurveyValidationService가 속한 모듈
- FSD-015 Phase 3-A (`2026-02-24-fsd-015-phase3a-language-license-guard-cascade.md`) - 선행 단계

## Precautions

- 검증 함수(`validateSurveyLanguages`, `validateTranslationCompleteness`)는 `@inquiry/survey-builder-config`에서 직접 import하여 `@inquiry/server-multilingual`과의 순환 의존을 방지한다
- `SurveyLanguage` 타입은 `import type`으로 type-only import를 사용한다
- 번역 누락 오류 메시지는 최대 5건까지만 표시하고, 초과분은 "외 N건"으로 요약한다
- 활성 언어가 1개 이하이거나 languages 배열이 비어있으면 검증을 건너뛴다
