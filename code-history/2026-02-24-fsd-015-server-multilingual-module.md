# FSD-015 서버 다국어(Multilingual) 모듈 구현

## Overview
설문의 다국어 설정에 대한 서버 측 검증 로직을 NestJS 모듈로 구현한다. `@inquiry/survey-builder-config` 패키지에서 제공하는 다국어 검증 유틸리티(`validateSurveyLanguages`, `validateTranslationCompleteness`)를 활용하여 DB 참조 무결성 검증과 발행 시 번역 완료 검증을 수행하는 서비스를 제공한다. 기존 `libs/server/quota/` 모듈 패턴을 그대로 따른다.

## Changed Files

| 파일 | 역할 |
|------|------|
| `libs/server/multilingual/package.json` | 패키지 메타데이터 및 workspace 의존성 선언 |
| `libs/server/multilingual/tsconfig.json` | 프로젝트 레퍼런스를 포함한 루트 tsconfig |
| `libs/server/multilingual/tsconfig.lib.json` | 라이브러리 빌드용 tsconfig (선언 파일 생성) |
| `libs/server/multilingual/src/index.ts` | 모듈 공개 API (barrel export) |
| `libs/server/multilingual/src/lib/multilingual.module.ts` | NestJS `MultilingualModule` 정의 |
| `libs/server/multilingual/src/lib/multilingual-validation.service.ts` | `MultilingualValidationService` - 다국어 검증 비즈니스 로직 |

## Major Changes

### MultilingualValidationService

두 가지 핵심 검증 메서드를 제공한다:

**1. `validateSurveyLanguagesWithDb(surveyId, languages)`**
- `SurveyLanguage[]` 구조 검증 (default 유일성, languageId 중복 불가 등)을 `validateSurveyLanguages()`에 위임
- Language 테이블 참조 무결성 검증: 모든 `languageId`가 DB에 존재하는지 `prisma.language.findMany()`로 확인
- 검증 실패 시 `BadRequestException` throw

```typescript
// Language 테이블 참조 무결성 검증
const languageIds = languages.map((l) => l.languageId);
const dbLanguages = await this.prisma.language.findMany({
  where: { id: { in: languageIds } },
  select: { id: true },
});
const foundIds = new Set(dbLanguages.map((l) => l.id));
const missingIds = languageIds.filter((id) => !foundIds.has(id));
```

**2. `validateTranslationForPublish(surveyData, languages)`**
- 단일 언어(배열 길이 0 또는 1)는 스킵
- `validateTranslationCompleteness()`에 위임하여 모든 TI18nString 필드의 활성 언어 번역 완료 여부 확인
- 최대 5개까지 누락 번역 정보를 에러 메시지에 포함

### MultilingualModule

```typescript
@Module({
  providers: [MultilingualValidationService],
  exports: [MultilingualValidationService],
})
export class MultilingualModule {}
```

- `ServerPrismaModule`은 `@Global()`이므로 별도 import 불필요
- 다른 모듈에서 `MultilingualModule`을 import하면 `MultilingualValidationService`를 DI로 주입 가능

## How to use it

### 모듈 등록
```typescript
import { MultilingualModule } from '@inquiry/server-multilingual';

@Module({
  imports: [MultilingualModule],
})
export class SurveyModule {}
```

### 서비스 주입 및 사용
```typescript
import { MultilingualValidationService } from '@inquiry/server-multilingual';

@Injectable()
export class SurveyService {
  constructor(
    private readonly multilingualValidation: MultilingualValidationService
  ) {}

  async updateSurveyLanguages(surveyId: string, languages: SurveyLanguage[]) {
    // DB 참조 무결성 포함 검증
    await this.multilingualValidation.validateSurveyLanguagesWithDb(
      surveyId, languages
    );
    // ... 저장 로직
  }

  publishSurvey(surveyData: Record<string, unknown>, languages: SurveyLanguage[]) {
    // 번역 완료 검증
    this.multilingualValidation.validateTranslationForPublish(
      surveyData, languages
    );
    // ... 발행 로직
  }
}
```

## Related Components/Modules

- **`@inquiry/survey-builder-config`**: `validateSurveyLanguages`, `validateTranslationCompleteness`, `SurveyLanguage` 타입 제공
- **`@inquiry/server-prisma`**: `ServerPrismaService`를 통한 Language 테이블 접근 (`@Global()` 모듈)
- **`libs/server/quota/`**: 동일한 NestJS 모듈 패턴의 참조 구현
- **`packages/db/prisma/schema.prisma`**: Language 모델 (id, code, alias, projectId)

## Precautions

- `validateTranslationForPublish`의 `enabledCodes`는 현재 빈 배열로 초기화되어 있다. 실제 사용 시에는 Language 테이블에서 활성 언어의 `code`를 조회한 후 이 메서드를 호출하거나, 향후 DB 조회를 포함하는 확장 메서드를 추가해야 한다.
- `.js` 확장자 import는 NestJS ESM 패턴을 따른 것으로, `tsconfig.base.json`의 `module: "nodenext"` 설정과 호환된다.
