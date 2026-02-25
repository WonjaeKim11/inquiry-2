# FSD-027 Phase 4: Survey-Segment 통합

## Overview
Phase 1~3에서 구축된 Segment 모델 및 서버 모듈을 Survey 서비스와 통합하는 단계이다. Prisma 스키마에서 Survey 모델의 기존 `segment Json?` 필드가 이미 `segmentId String?` + `segment Segment? @relation(...)` FK로 변경되어 있으므로, 이를 Survey CRUD 로직에 반영하여 설문 생성/수정 시 세그먼트를 연결하거나 해제할 수 있도록 한다.

## Changed Files

| 파일 | 역할 |
|------|------|
| `libs/server/survey/src/lib/dto/create-survey.dto.ts` | CreateSurveySchema에 `segmentId` 필드 추가 |
| `libs/server/survey/src/lib/dto/update-survey.dto.ts` | UpdateSurveySchema에 `segmentId`를 nullable로 확장하여 세그먼트 해제 지원 |
| `libs/server/survey/src/lib/services/survey.service.ts` | createSurvey/updateSurvey 메서드에 segmentId 처리 로직 추가 |

## Major Changes

### 1. CreateSurveySchema에 segmentId 추가

설문 생성 시 세그먼트를 연결할 수 있도록 optional 필드를 추가했다.

```typescript
segmentId: z.string().optional(),
```

### 2. UpdateSurveySchema에 nullable segmentId 확장

`CreateSurveySchema.partial()`에서는 segmentId가 `string | undefined`만 가능하므로, `.extend()`를 통해 `string | null | undefined`로 확장하여 세그먼트 해제(null 설정)를 허용한다.

```typescript
export const UpdateSurveySchema = CreateSurveySchema.partial().extend({
  segmentId: z.string().nullable().optional(),
});
```

- `segmentId: "clxxx..."` -> 세그먼트 연결
- `segmentId: null` -> 세그먼트 해제
- `segmentId` 미전달 -> 기존 값 유지

### 3. Survey 서비스 수정

**createSurvey**: dto에서 segmentId가 전달되면 Prisma create data에 포함한다.

```typescript
...(dto.segmentId !== undefined && { segmentId: dto.segmentId }),
```

**updateSurvey**: dto에서 segmentId가 전달되면 updateData에 추가한다. null 값도 허용하여 세그먼트 해제가 가능하다.

```typescript
if (dto.segmentId !== undefined) updateData['segmentId'] = dto.segmentId;
```

## How to use it

### 설문 생성 시 세그먼트 연결

```bash
POST /api/v1/environments/:envId/surveys
{
  "name": "사용자 만족도 조사",
  "type": "link",
  "segmentId": "clxxx_segment_id"
}
```

### 설문 수정 시 세그먼트 연결

```bash
PATCH /api/v1/surveys/:surveyId
{
  "segmentId": "clxxx_new_segment_id"
}
```

### 설문에서 세그먼트 해제

```bash
PATCH /api/v1/surveys/:surveyId
{
  "segmentId": null
}
```

## Related Components/Modules

- `packages/db/prisma/schema.prisma` - Survey 모델에 `segmentId` FK 및 `segment Segment?` 릴레이션 정의 (Phase 1에서 완료)
- `libs/server/segment/` - Segment CRUD 서버 모듈 (Phase 2~3에서 구현)
- `libs/server/survey/src/lib/dto/` - Survey DTO 스키마 (본 Phase에서 수정)
- `libs/server/survey/src/lib/services/survey.service.ts` - Survey CRUD 서비스 (본 Phase에서 수정)

## Precautions

- segmentId로 존재하지 않는 세그먼트 ID를 전달하면 Prisma FK 제약조건에 의해 에러가 발생한다. 프론트엔드에서 유효한 세그먼트 목록에서만 선택하도록 해야 한다.
- Prisma 스키마에서 `onDelete: SetNull`로 설정되어 있으므로, 세그먼트가 삭제되면 해당 설문의 segmentId가 자동으로 null로 변경된다.
- 현재는 segmentId의 존재 여부를 서비스 레벨에서 별도 검증하지 않는다. 필요 시 SegmentService를 주입하여 유효성 검사를 추가할 수 있다.
