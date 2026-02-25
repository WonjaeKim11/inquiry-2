# FSD-026 Contact Management - Phase 4: CSV Import

## Overview
CSV 파일을 업로드하여 연락처를 대량으로 가져오는 기능을 구현한다.
기존 연락처와의 중복 처리를 위해 3가지 전략(skip, update, overwrite)을 지원하며,
CSV 컬럼의 데이터 타입을 자동 탐지하고, 누락된 속성 키를 자동으로 생성한다.

## Changed Files

### 새로 생성한 파일
- `libs/server/contact/src/lib/services/duplicate-strategy.service.ts` - 중복 처리 전략 서비스 (skip/update/overwrite)
- `libs/server/contact/src/lib/services/csv-import.service.ts` - CSV Import 전체 파이프라인 서비스
- `libs/server/contact/src/lib/dto/csv-import.dto.ts` - CSV Import 요청 검증 Zod 스키마

### 수정한 파일
- `libs/server/contact/src/lib/controllers/contact.controller.ts` - POST /import 엔드포인트 추가
- `libs/server/contact/src/lib/contact.module.ts` - DuplicateStrategyService, CsvImportService 등록
- `libs/server/contact/src/index.ts` - 새 서비스/DTO export 추가
- `libs/server/contact/package.json` - csv-parse, @nestjs/platform-express 의존성 추가
- `libs/server/audit-log/src/lib/audit-log.types.ts` - contact.csv_imported 액션, contact 대상 타입 추가
- `apps/server/package.json` - @types/multer devDependency 추가
- `package.json` - csv-parse, @types/multer 루트 의존성 추가

## Major Changes

### CSV Import 파이프라인 (csv-import.service.ts)
8단계 파이프라인으로 CSV Import를 처리한다:
1. `parseCsv()` - csv-parse/sync로 CSV 파싱 (columns: true, trim, cast: false)
2. `validateRecords()` - 빈 파일, 최대 레코드 수(10,000), email/userId 중복 검증
3. `seedDefaultKeys()` - email, userId, firstName, lastName 기본 키 보장
4. 메타데이터 추출 - email/userId 값, CSV 컬럼명 추출
5. DB 병렬 조회 - `Promise.all()`로 keyMap, existingByEmail, existingByUserId 동시 조회
6. `createMissingKeys()` - CSV 컬럼 중 DB에 없는 키를 TypeDetectorService로 타입 탐지 후 자동 생성
7. `processRecord()` - 레코드별 중복 전략 적용 + 속성 값 upsert
8. 결과 집계 및 감사 로그 기록

```typescript
// 레코드 처리 시 Lookup Map 업데이트로 후속 레코드 중복 감지
if (email) existingByEmail.set(email, contactId);
if (recordUserId) existingByUserId.set(recordUserId, contactId);
```

### 중복 처리 전략 (duplicate-strategy.service.ts)
- **skip**: 기존 연락처가 있으면 무시
- **update**: 기존 속성 유지 + CSV 값으로 upsert
- **overwrite**: 기존 속성 전부 삭제 후 CSV 값으로 대체

### 컨트롤러 엔드포인트
```typescript
@Post('import')
@ContactMinRole('ADMIN')
@UseInterceptors(FileInterceptor('file'))
async importCsv(...)
```
- `POST /environments/:envId/contacts/import`
- multipart/form-data로 file 필드에 CSV, duplicateStrategy 필드로 전략 지정
- `:id` 라우트보다 앞에 배치하여 라우트 충돌 방지

## How to use it

### API 요청 예시
```bash
curl -X POST http://localhost:3000/environments/{envId}/contacts/import \
  -H "Authorization: Bearer {jwt_token}" \
  -F "file=@contacts.csv" \
  -F "duplicateStrategy=update"
```

### CSV 파일 형식
```csv
email,userId,firstName,lastName,customField
user1@example.com,uid001,John,Doe,value1
user2@example.com,uid002,Jane,Smith,value2
```

### 응답 예시
```json
{
  "created": 2,
  "updated": 0,
  "skipped": 0,
  "errors": 0
}
```

## Related Components/Modules
- `ContactAttributeService` - 속성 키 CRUD, seedDefaultKeys, upsertAttributeValue, getKeyMap
- `TypeDetectorService` - CSV 컬럼 데이터 타입 자동 탐지 (determineColumnType)
- `AuditLogService` - contact.csv_imported 감사 로그 기록
- `ContactAccessGuard` / `ContactMinRole('ADMIN')` - ADMIN 이상만 Import 가능

## Precautions
- 최대 10,000 레코드까지 지원 (MAX_CSV_RECORDS 상수)
- CSV 파일 내 email/userId 중복은 파싱 단계에서 즉시 거부됨
- safe identifier 규칙(`/^[a-zA-Z][a-zA-Z0-9_]*$/`)에 맞지 않는 CSV 컬럼명은 건너뜀
- 레코드별 순차 처리이므로 대량 데이터에서는 응답 시간이 길어질 수 있음 (향후 배치 처리 개선 가능)
- overwrite 전략 사용 시 기존 속성 값이 완전히 삭제되므로 주의 필요
