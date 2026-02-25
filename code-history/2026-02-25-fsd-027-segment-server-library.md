# FSD-027 세그먼트/필터 시스템 Phase 2 + 3: 서버 라이브러리 + 서비스 + 컨트롤러

## Overview
FSD-027 세그먼트/필터 시스템의 Phase 2(서버 라이브러리 스캐폴딩)와 Phase 3(서비스/컨트롤러)를 구현했다.
Phase 1에서 준비된 Prisma 스키마(Segment 모델)와 shared-segment 패키지(타입/연산자/유틸리티)를 기반으로,
서버에서 세그먼트 CRUD, 복제, 필터 초기화, 필터 트리 검증, Prisma 쿼리 변환 기능을 제공한다.

## Changed Files

### 신규 생성
- `libs/server/segment/package.json` - 패키지 설정 (workspace 의존성 포함)
- `libs/server/segment/tsconfig.json` - TypeScript 프로젝트 참조 설정
- `libs/server/segment/tsconfig.lib.json` - 라이브러리 빌드 설정
- `libs/server/segment/src/index.ts` - 공개 API 배럴 익스포트
- `libs/server/segment/src/lib/constants/segment.constants.ts` - 필터 깊이/개수 제한 상수
- `libs/server/segment/src/lib/interfaces/segment.types.ts` - SegmentWithSurveyCount 타입 정의
- `libs/server/segment/src/lib/guards/segment-access.guard.ts` - 세그먼트 접근 제어 가드 + SegmentMinRole 데코레이터
- `libs/server/segment/src/lib/dto/create-segment.dto.ts` - 세그먼트 생성 Zod 스키마
- `libs/server/segment/src/lib/dto/update-segment.dto.ts` - 세그먼트 수정 Zod 스키마
- `libs/server/segment/src/lib/dto/segment-query.dto.ts` - 세그먼트 조회 쿼리 Zod 스키마
- `libs/server/segment/src/lib/validators/filter-tree.validator.ts` - 필터 트리 구조 검증기
- `libs/server/segment/src/lib/services/filter-query.service.ts` - 필터 트리 -> Prisma where 절 변환 서비스
- `libs/server/segment/src/lib/services/segment.service.ts` - 세그먼트 CRUD + 복제 + 리셋 + 순환참조 탐지
- `libs/server/segment/src/lib/controllers/segment.controller.ts` - REST API 컨트롤러
- `libs/server/segment/src/lib/segment.module.ts` - NestJS 모듈 정의

### 수정
- `apps/server/src/app/app.module.ts` - SegmentModule import 추가
- `apps/server/package.json` - @inquiry/server-segment 의존성 추가
- `apps/server/tsconfig.app.json` - server-segment tsconfig.lib.json 참조 추가
- `tsconfig.json` - 루트 프로젝트 참조에 libs/server/segment 추가
- `libs/server/audit-log/src/lib/audit-log.types.ts` - segment 관련 AuditAction/AuditTarget 추가

## Major Changes

### 1. SegmentAccessGuard (접근 제어)
ContactAccessGuard 패턴을 따라 구현했다. `envId` 경로 파라미터에서 환경 -> 프로젝트 -> 조직을 추적하고, 조직 멤버십 역할을 확인한다.

```typescript
// 역할 계층: OWNER(40) > ADMIN(30) > BILLING(20) > MEMBER(10)
@SegmentMinRole('ADMIN')  // OWNER 또는 ADMIN만 접근 가능
@SegmentMinRole('MEMBER') // 모든 멤버 접근 가능
```

### 2. FilterTreeValidator (필터 트리 검증)
재귀적으로 필터 배열을 순회하며 다음을 검증한다:
- 최대 중첩 깊이 10 (MAX_FILTER_DEPTH)
- 최대 필터 수 50 (MAX_FILTERS_PER_SEGMENT)
- 리프 노드의 리소스-연산자 조합 유효성 (attribute/segment/device 각각의 허용 연산자)
- 모든 필터의 id, connector 필수 확인

### 3. FilterQueryService (Prisma 쿼리 변환)
필터 트리를 Prisma Contact where 절로 변환한다. EAV(Entity-Attribute-Value) 모델 기반 쿼리를 생성한다:
- **문자열**: equals, doesNotEqual, contains, doesNotContain, startsWith, endsWith (대소문자 무시)
- **숫자**: equals, doesNotEqual, lessThan, lessEqual, greaterThan, greaterEqual
- **날짜**: isBefore, isAfter, isExactly, isToday, isYesterday, isWithinLast, isNotWithinLast
- **특수**: isSet/isNotSet (값 존재 여부), device 타입, segment 포함/제외

### 4. SegmentService (CRUD + 순환참조 탐지)
- **생성/수정**: 필터 검증 + 제목 유니크 확인 + 순환참조 DFS 탐지
- **삭제**: 연결된 설문이 있으면 차단 (surveys count 확인)
- **복제**: "Copy of {title}" / "Copy of {title} (n)" 형식의 자동 제목 생성
- **리셋**: 필터를 빈 배열로 초기화
- **순환참조 탐지**: DFS로 segment 리소스 필터가 자기 자신이나 이미 방문한 세그먼트를 참조하는지 확인

### 5. REST API 엔드포인트

| Method | Path | 역할 | 설명 |
|--------|------|------|------|
| POST | /environments/:envId/segments | ADMIN | 세그먼트 생성 |
| GET | /environments/:envId/segments | MEMBER | 목록 조회 |
| GET | /environments/:envId/segments/:segmentId | MEMBER | 단건 조회 |
| PUT | /environments/:envId/segments/:segmentId | ADMIN | 수정 |
| DELETE | /environments/:envId/segments/:segmentId | ADMIN | 삭제 |
| POST | /environments/:envId/segments/:segmentId/clone | ADMIN | 복제 |
| POST | /environments/:envId/segments/:segmentId/reset | ADMIN | 필터 초기화 |

## How to use it

### 세그먼트 생성
```bash
POST /environments/{envId}/segments
Authorization: Bearer {jwt_token}

{
  "title": "VIP 고객",
  "description": "구매 금액 100만원 이상 고객",
  "isPrivate": false,
  "filters": [
    {
      "id": "f1",
      "connector": "and",
      "resource": "attribute",
      "filterType": "number",
      "attributeKey": "totalPurchase",
      "operator": "greaterEqual",
      "value": 1000000
    }
  ]
}
```

### 세그먼트 복제
```bash
POST /environments/{envId}/segments/{segmentId}/clone
Authorization: Bearer {jwt_token}
```

### 필터 초기화
```bash
POST /environments/{envId}/segments/{segmentId}/reset
Authorization: Bearer {jwt_token}
```

### 서비스 내부 사용 (다른 모듈에서)
```typescript
import { SegmentService, FilterQueryService } from '@inquiry/server-segment';

// 세그먼트 조회 후 필터를 Prisma where 절로 변환
const segment = await segmentService.findById(segmentId);
const where = filterQueryService.buildWhereClause(segment.filters as FilterItem[]);
const contacts = await prisma.contact.findMany({ where });
```

## Related Components/Modules
- **@inquiry/shared-segment**: 필터 타입 정의, 연산자 매핑, 날짜 유틸, 필터 트리 유틸리티
- **@inquiry/server-contact**: 동일한 가드/컨트롤러 패턴 참조, EAV 모델 공유
- **@inquiry/server-audit-log**: 감사 로그 이벤트 기록 (segment.created/updated/deleted/cloned/reset)
- **@inquiry/server-license**: contacts 라이선스 기능 게이팅
- **@inquiry/server-core**: ApiExceptionFilter, ZodValidationPipe 공유
- **Prisma Segment 모델**: environmentId_title 유니크 인덱스, surveys 관계

## Precautions
- 필터 트리의 segment 리소스 조건은 FilterQueryService에서 빈 객체를 반환한다. 세그먼트 포함/제외 평가는 서비스 레이어에서 별도로 처리해야 한다.
- 순환참조 탐지는 DB에서 참조 세그먼트의 필터를 재귀적으로 조회하므로, 깊은 참조 체인에서 쿼리 수가 증가할 수 있다.
- `contacts` 라이선스가 없으면 모든 세그먼트 API가 차단된다.
- person 리소스 필터는 향후 행동 데이터 통합 시 구현 예정이다.
