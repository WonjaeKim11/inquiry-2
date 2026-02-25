# FSD-027 세그먼트/필터 (Segment/Filter) 구현

## Overview
- Master Implementation Plan Stage 6의 두 번째 작업으로, 연락처를 속성/행동/디바이스 조건으로 그룹화하는 재귀적 필터 트리 기반 세그먼트 시스템을 구현했다.
- FSD-026 Contact Management에서 구축한 ContactAttributeKey/Value (EAV 패턴)를 기반으로, 22종 연산자와 4종 필터 리소스(attribute, person, segment, device)를 지원하는 동적 필터링 시스템이다.
- Survey 모델과 FK 관계를 맺어, 설문에 특정 세그먼트를 연결하여 대상 연락처를 필터링할 수 있다.

## Changed Files

### 신규 생성 (~45개)

**공유 패키지** (`packages/shared-segment/`)
| 파일 | 역할 |
|------|------|
| `package.json` | `@inquiry/shared-segment` 패키지 정의 |
| `tsconfig.json`, `tsconfig.lib.json` | 빌드 설정 |
| `src/index.ts` | barrel export |
| `src/types.ts` | FilterItem, FilterConnector, FilterResource, FilterOperator 등 핵심 타입 22종 |
| `src/operators.ts` | 연산자 enum, 데이터타입별 연산자 매핑, VALUE_LESS_OPERATORS |
| `src/date-utils.ts` | subtractTimeUnit, addTimeUnit, startOfDay, endOfDay, isSameDay, toUTCDateString |
| `src/filter-utils.ts` | 13개 순수 함수 (addFilterBelow, createGroupFromFilter, moveFilter, deleteFilter, toggleConnector 등) |
| `src/evaluate-segment.ts` | 세그먼트 평가 엔진 (연락처 속성 기반 조건 평가) |

**서버 라이브러리** (`libs/server/segment/`)
| 파일 | 역할 |
|------|------|
| `package.json` | `@inquiry/server-segment` 패키지 정의 |
| `tsconfig.json`, `tsconfig.lib.json` | 빌드 설정 |
| `src/index.ts` | barrel export |
| `src/lib/segment.module.ts` | NestJS 모듈 (컨트롤러, 서비스, 가드 등록) |
| `src/lib/constants/segment.constants.ts` | MAX_FILTER_DEPTH=10, MAX_FILTERS_PER_SEGMENT=50 |
| `src/lib/interfaces/segment.types.ts` | SegmentWithSurveyCount 타입 |
| `src/lib/guards/segment-access.guard.ts` | 환경 접근 + 역할 검증 가드 (SegmentMinRole 데코레이터) |
| `src/lib/dto/create-segment.dto.ts` | Zod 스키마: title, description, isPrivate, filters, environmentId |
| `src/lib/dto/update-segment.dto.ts` | Zod 스키마: 부분 업데이트 (title, description, isPrivate, filters) |
| `src/lib/dto/segment-query.dto.ts` | Zod 스키마: environmentId 쿼리 |
| `src/lib/validators/filter-tree.validator.ts` | 필터 트리 구조 검증 (깊이/개수/타입-연산자 조합) |
| `src/lib/services/filter-query.service.ts` | 필터 트리 → Prisma Contact EAV where 절 변환 |
| `src/lib/services/segment.service.ts` | CRUD + clone + reset + 순환참조 DFS 탐지 |
| `src/lib/controllers/segment.controller.ts` | 7개 REST 엔드포인트 |

**클라이언트 라이브러리** (`libs/client/segment/`)
| 파일 | 역할 |
|------|------|
| `package.json` | `@inquiry/client-segment` 패키지 정의 |
| `tsconfig.json`, `tsconfig.lib.json` | 빌드 설정 |
| `src/index.ts` | barrel export |
| `src/lib/segment-api.ts` | apiFetch 래퍼 7개 API 함수 |
| `src/lib/schemas/segment.schema.ts` | Zod 폼 검증 스키마 |
| `src/lib/segment-list.tsx` | 세그먼트 테이블 (title, description, survey count, visibility) |
| `src/lib/segment-form.tsx` | title + description + isPrivate 폼 (create/edit 공용) |
| `src/lib/filter-editor.tsx` | 핵심 필터 트리 편집기 (state owner) |
| `src/lib/filter-group.tsx` | 재귀 그룹 렌더링 (들여쓰기 + border) |
| `src/lib/filter-item-row.tsx` | 단일 필터 리프 (타입/연산자/값 + 액션 버튼) |
| `src/lib/filter-type-selector.tsx` | 리소스 유형 + 하위 선택 (attribute key, segment, device) |
| `src/lib/operator-selector.tsx` | 데이터타입별 연산자 드롭다운 |
| `src/lib/value-input.tsx` | 다형성 입력 (text/number/date/dual-date) |
| `src/lib/connector-toggle.tsx` | AND/OR 토글 버튼 |
| `src/lib/delete-segment-dialog.tsx` | 삭제 확인 다이얼로그 |
| `src/lib/enterprise-gate.tsx` | Enterprise 라이선스 안내 |

**라우트 페이지** (3개)
| 파일 | 역할 |
|------|------|
| `apps/client/src/app/[lng]/.../segments/page.tsx` | 세그먼트 목록 메인 |
| `apps/client/src/app/[lng]/.../segments/new/page.tsx` | 세그먼트 생성 (SegmentForm + FilterEditor) |
| `apps/client/src/app/[lng]/.../segments/[segmentId]/edit/page.tsx` | 세그먼트 수정 |

### 수정 (~22개)
| 파일 | 변경 내용 |
|------|----------|
| `packages/db/prisma/schema.prisma` | Segment 모델 추가, Survey FK 변경 (segment Json? → segmentId String?), Environment에 segments 관계 추가 |
| `apps/server/src/app/app.module.ts` | SegmentModule import 추가 |
| `apps/server/package.json` | `@inquiry/server-segment` 의존성 추가 |
| `apps/server/tsconfig.app.json` | segment 참조 추가 |
| `apps/client/package.json` | `@inquiry/client-segment`, `@inquiry/shared-segment` 의존성 추가 |
| `apps/client/tsconfig.json` | segment, shared-segment 참조 추가 |
| `tsconfig.json` (루트) | 3개 reference 추가 (shared-segment, server-segment, client-segment) |
| `libs/server/survey/src/lib/dto/create-survey.dto.ts` | segmentId 필드 추가 |
| `libs/server/survey/src/lib/dto/update-survey.dto.ts` | segmentId nullable 필드 추가 |
| `libs/server/survey/src/lib/services/survey.service.ts` | create/update에서 segmentId 처리 |
| `libs/server/audit-log/src/lib/audit-log.types.ts` | segment 관련 액션/타겟 추가 |
| 15개 `translation.json` | segment.* 네임스페이스 추가 (~80개 키) |

## Major Changes

### 1. 재귀적 필터 트리 구조 (FilterItem)

필터 시스템의 핵심 데이터 구조. 트리의 각 노드는 리프(조건) 또는 그룹(자식 포함)이다.

```typescript
interface FilterItem {
  id: string;                    // 고유 식별자
  connector: 'and' | 'or';      // 같은 레벨 필터 결합 방식
  resource: 'attribute' | 'person' | 'segment' | 'device';
  operator?: FilterOperator;     // 22종 연산자
  value?: string | number;       // 비교 값
  attributeKey?: string;         // 속성 키 (attribute 리소스)
  filterType?: 'string' | 'number' | 'date';
  segmentId?: string;            // 대상 세그먼트 (segment 리소스)
  deviceType?: DeviceType;       // 디바이스 유형 (device 리소스)
  children?: FilterItem[];       // 중첩 그룹 (재귀)
}
```

### 2. 순수 함수 기반 필터 트리 조작 (filter-utils)

모든 트리 변경은 불변 순수 함수로 처리하여, React 상태 관리와 자연스럽게 통합된다:
- `addFilterBelow()` — 특정 위치 아래에 필터 삽입
- `createGroupFromFilter()` — 필터를 그룹으로 감싸기
- `deleteFilter()` — 삭제 + 빈 그룹 자동 제거 + 단일 자식 그룹 언래핑
- `toggleConnector()` — AND ↔ OR 전환
- `updateFilter()` — 부분 업데이트

### 3. 필터 → Prisma 쿼리 변환 (FilterQueryService)

EAV 패턴의 ContactAttributeValue 테이블을 대상으로, 필터 트리를 Prisma `where` 절로 변환:
- 문자열: `equals/contains/startsWith/endsWith` → `{ attributeValues: { some: { value: { contains: ... } } } }`
- 숫자: `lessThan/greaterEqual` 등 → `{ attributeValues: { some: { numberValue: { lt: ... } } } }`
- 날짜: `isWithinLast/isToday` 등 → 날짜 범위 계산 후 `dateValue` 비교

### 4. 순환참조 DFS 탐지

세그먼트가 다른 세그먼트를 필터로 참조할 때, 순환참조를 방지하기 위해 DFS 방문 집합으로 탐지:

```typescript
private async detectCircularReference(
  environmentId: string,
  currentSegmentId: string | null,
  filters: FilterItem[],
  visited: Set<string> = new Set()
): Promise<void> {
  // 자기 참조 및 간접 순환참조 모두 탐지
}
```

### 5. 클라이언트 필터 에디터 아키텍처

- `FilterEditor` — 단일 `useState<FilterItem[]>`로 상태 관리 (state owner)
- `FilterGroup` — 재귀 렌더링 (depth 기반 들여쓰기)
- `FilterItemRow` — 리프 노드 (타입 선택 → 연산자 선택 → 값 입력)
- `FilterTypeSelector` — attribute 선택 시 `@inquiry/client-contact`의 `fetchAttributeKeys` 재사용

## How to use it

### API 엔드포인트

| Method | Path | 최소 역할 | 설명 |
|--------|------|-----------|------|
| `POST` | `/environments/:envId/segments` | ADMIN | 세그먼트 생성 |
| `GET` | `/environments/:envId/segments` | MEMBER | 목록 조회 |
| `GET` | `/environments/:envId/segments/:segmentId` | MEMBER | 단건 조회 |
| `PUT` | `/environments/:envId/segments/:segmentId` | ADMIN | 수정 |
| `DELETE` | `/environments/:envId/segments/:segmentId` | ADMIN | 삭제 |
| `POST` | `/environments/:envId/segments/:segmentId/clone` | ADMIN | 복제 |
| `POST` | `/environments/:envId/segments/:segmentId/reset` | ADMIN | 필터 초기화 |

### 세그먼트 생성 예시

```bash
POST /environments/{envId}/segments
{
  "title": "Active Users",
  "description": "Last 30 days active users",
  "isPrivate": false,
  "filters": [
    {
      "id": "f1",
      "connector": "and",
      "resource": "attribute",
      "attributeKey": "lastLoginAt",
      "filterType": "date",
      "operator": "isWithinLast",
      "value": 30,
      "timeUnit": "day"
    },
    {
      "id": "f2",
      "connector": "and",
      "resource": "device",
      "operator": "isDevice",
      "deviceType": "desktop"
    }
  ],
  "environmentId": "{envId}"
}
```

### 설문에 세그먼트 연결

```bash
PUT /surveys/{surveyId}
{
  "segmentId": "{segmentId}"
}
```

### 클라이언트 라우트

- `/[lng]/projects/[projectId]/environments/[envId]/segments` — 목록
- `/[lng]/projects/[projectId]/environments/[envId]/segments/new` — 생성
- `/[lng]/projects/[projectId]/environments/[envId]/segments/[segmentId]/edit` — 수정

## Related Components/Modules

| 모듈 | 관계 |
|------|------|
| `@inquiry/server-contact` | ContactAttributeKey/Value EAV 패턴 — 필터 쿼리 대상 |
| `@inquiry/server-survey` | Survey.segmentId FK — 설문에 세그먼트 연결 |
| `@inquiry/server-license` | LicenseGuard — 'contacts' 라이선스 필요 |
| `@inquiry/server-audit-log` | 감사 로그 — segment.created/updated/deleted/cloned/reset |
| `@inquiry/client-contact` | fetchAttributeKeys — 필터 에디터에서 속성 키 목록 조회 |
| `@inquiry/client-ui` | shadcn 기반 UI 컴포넌트 (Button, Input, Select, Dialog 등) |

## Precautions

- **person 리소스**: 현재 스텁 구현. 향후 연락처 행동 데이터(설문 응답, 페이지 방문 등)와 통합 시 `evaluateSegment`의 person 평가 로직과 `FilterQueryService`의 person 쿼리 빌더를 구현해야 한다.
- **필터 깊이 제한**: MAX_FILTER_DEPTH=10, MAX_FILTERS_PER_SEGMENT=50. 복잡한 세그먼트 생성 시 제한에 주의.
- **순환참조 탐지**: 세그먼트 간 순환참조를 DFS로 탐지하지만, 동시 편집 시 race condition 가능성이 있다. 트랜잭션 기반 검증은 향후 개선 사항.
- **성능**: 대량 연락처(10만+) 환경에서 EAV 기반 필터 쿼리 성능은 인덱스와 쿼리 최적화가 필요할 수 있다.
- **Table 컴포넌트**: `@inquiry/client-ui`에 Table 컴포넌트가 없어 네이티브 HTML table + Tailwind CSS로 구현. 향후 UI 라이브러리에 Table 추가 시 마이그레이션 필요.
