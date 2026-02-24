# FSD-015 Phase 3-A: Language 컨트롤러 라이선스 가드 + Survey.languages 연쇄 정리

## Overview
Language 컨트롤러의 CUD(Create/Update/Delete) 엔드포인트에 `multiLanguage` 라이선스 가드를 적용하여 유료 기능 접근을 제어한다. 또한 Language 삭제 시 해당 Language를 참조하는 Survey.languages JSON 필드에서 연쇄적으로 참조를 제거하여 데이터 정합성을 보장한다.

## Changed Files
- `libs/server/project/src/lib/controllers/language.controller.ts` - Language 컨트롤러에 LicenseGuard 및 RequireLicense 데코레이터 추가
- `libs/server/project/src/lib/services/language.service.ts` - deleteLanguage 메서드에 Survey.languages 연쇄 정리 로직 추가

## Major Changes

### 1. Language 컨트롤러 라이선스 가드 적용
`@inquiry/server-license`에서 `RequireLicense`와 `LicenseGuard`를 import하여 CUD 엔드포인트에 적용하였다.

- **POST** `projects/:projectId/languages` (create) - `@UseGuards(LicenseGuard)` + `@RequireLicense('multiLanguage')` 추가
- **PATCH** `languages/:languageId` (update) - `@UseGuards(LicenseGuard)` + `@RequireLicense('multiLanguage')` 추가
- **DELETE** `languages/:languageId` (remove) - `@UseGuards(LicenseGuard)` + `@RequireLicense('multiLanguage')` 추가
- **GET** `projects/:projectId/languages` (findByProject) - 라이선스 가드 없음 (무료 플랜에서도 조회 허용)

```typescript
@Post('projects/:projectId/languages')
@UseGuards(LicenseGuard)
@RequireLicense('multiLanguage')
@UsePipes(new ZodValidationPipe(CreateLanguageSchema))
@HttpCode(HttpStatus.CREATED)
async create(...) { ... }
```

### 2. Survey.languages 연쇄 정리
Language 삭제 후, 해당 프로젝트의 모든 Survey를 조회하여 `languages` JSON 필드에서 삭제된 languageId를 참조하는 항목을 필터링 제거한다.

```typescript
// Language 삭제 → Survey.languages에서 해당 languageId 참조 제거
const surveys = await this.prisma.survey.findMany({
  where: { projectId: existing.projectId },
  select: { id: true, languages: true },
});

for (const survey of surveys) {
  const langs = (survey.languages ?? []) as Array<{
    languageId: string;
    default: boolean;
    enabled: boolean;
  }>;
  const filtered = langs.filter((l) => l.languageId !== languageId);
  if (filtered.length !== langs.length) {
    await this.prisma.survey.update({
      where: { id: survey.id },
      data: { languages: filtered as any },
    });
  }
}
```

데이터 흐름:
1. Language 레코드 삭제 (`prisma.language.delete`)
2. 동일 프로젝트의 모든 Survey 조회
3. 각 Survey의 `languages` JSON 배열에서 삭제된 languageId 필터링
4. 변경된 Survey만 업데이트
5. 감사 로그 기록

## How to use it

### 라이선스 가드 동작
`multiLanguage` 라이선스가 없는 플랜에서 CUD 요청 시 403 Forbidden 응답이 반환된다:
```json
{
  "statusCode": 403,
  "message": "이 기능은 현재 플랜(free)에서 사용할 수 없습니다. 업그레이드가 필요합니다."
}
```

GET 조회는 라이선스 없이도 정상 동작한다:
```
GET /api/projects/:projectId/languages  -> 200 OK (라이선스 무관)
```

### 연쇄 정리 동작
Language 삭제 API 호출 시 자동으로 Survey.languages에서 해당 참조가 제거된다. 별도 API 호출 불필요.

## Related Components/Modules
- `libs/server/license/src/lib/license.guard.ts` - LicenseGuard 및 RequireLicense 데코레이터 정의
- `libs/server/license/src/lib/license.service.ts` - 라이선스 기능 검증 로직 (hasFeature)
- Prisma Survey 모델 - `languages` 필드는 Json 타입으로, `Array<{ languageId, default, enabled }>` 구조

## Precautions
- Survey.languages는 Prisma의 Json 타입이므로 타입 안전성이 런타임에만 보장된다 (`as any` 캐스팅 사용)
- 연쇄 정리는 트랜잭션이 아닌 순차 처리로 구현되어 있어, 대량의 Survey가 있는 경우 처리 시간이 길어질 수 있다
- GET 엔드포인트는 의도적으로 라이선스 가드가 없으므로, 무료 플랜 사용자도 언어 목록을 조회할 수 있다
