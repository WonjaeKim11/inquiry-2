# FSD-027 Phase 5: 클라이언트 세그먼트 라이브러리 + UI 컴포넌트

## Overview
세그먼트/필터 시스템의 클라이언트 측 구현으로, `@inquiry/client-segment` 워크스페이스 패키지를 새로 생성했다.
Phase 1~3에서 완료된 서버 API(`/environments/:envId/segments`)와 `@inquiry/shared-segment` 패키지의 순수 함수를 활용하여,
세그먼트 CRUD + 재귀 필터 편집기 UI를 React 19 컴포넌트로 구현했다.

`@inquiry/client-ui`에 Table/AlertDialog 컴포넌트가 존재하지 않으므로, 세그먼트 목록은 네이티브 HTML 테이블로,
삭제 확인은 기존 Dialog 컴포넌트를 활용하여 구현했다.

15개 로케일에 대한 i18n 번역 키를 모두 추가했다.

## Changed Files

### 신규 생성 (라이브러리 scaffolding)
- `libs/client/segment/package.json` - 패키지 정의 (`@inquiry/client-segment`)
- `libs/client/segment/tsconfig.json` - 프로젝트 레퍼런스 설정
- `libs/client/segment/tsconfig.lib.json` - 라이브러리 빌드 설정 (JSX, bundler 모듈 해상도)

### 신규 생성 (소스 코드)
- `libs/client/segment/src/index.ts` - barrel export (컴포넌트, API, 스키마)
- `libs/client/segment/src/lib/segment-api.ts` - REST API 함수 7개 (CRUD + clone + reset)
- `libs/client/segment/src/lib/schemas/segment.schema.ts` - Zod 폼 검증 스키마
- `libs/client/segment/src/lib/segment-list.tsx` - 세그먼트 목록 테이블 (네이티브 HTML table)
- `libs/client/segment/src/lib/segment-form.tsx` - 세그먼트 생성/수정 공용 폼
- `libs/client/segment/src/lib/filter-editor.tsx` - 핵심 필터 트리 편집기 (상태 소유자)
- `libs/client/segment/src/lib/filter-group.tsx` - 재귀 그룹 렌더링
- `libs/client/segment/src/lib/filter-item-row.tsx` - 단일 필터 리프 노드 행
- `libs/client/segment/src/lib/filter-type-selector.tsx` - 리소스/속성/세그먼트/디바이스 선택
- `libs/client/segment/src/lib/operator-selector.tsx` - 연산자 드롭다운 (타입별 필터링)
- `libs/client/segment/src/lib/value-input.tsx` - 다형성 값 입력 (문자열/숫자/날짜/범위)
- `libs/client/segment/src/lib/connector-toggle.tsx` - AND/OR 토글 버튼
- `libs/client/segment/src/lib/delete-segment-dialog.tsx` - 삭제 확인 다이얼로그 (Dialog 기반)
- `libs/client/segment/src/lib/enterprise-gate.tsx` - Enterprise 라이선스 게이트

### 수정 (앱 등록)
- `apps/client/package.json` - `@inquiry/client-segment`, `@inquiry/shared-segment` 의존성 추가
- `apps/client/tsconfig.json` - `libs/client/segment`, `packages/shared-segment` 레퍼런스 추가
- `tsconfig.json` (루트) - `libs/client/segment` 레퍼런스 추가

### 수정 (i18n - 15개 로케일)
- `apps/client/src/app/i18n/locales/en-US/translation.json` - `segment` 섹션 추가
- `apps/client/src/app/i18n/locales/ko-KR/translation.json` - `segment` 섹션 추가 (한국어)
- `apps/client/src/app/i18n/locales/de-DE/translation.json` - `segment` 섹션 추가 (독일어)
- `apps/client/src/app/i18n/locales/es-ES/translation.json` - `segment` 섹션 추가 (스페인어)
- `apps/client/src/app/i18n/locales/fr-FR/translation.json` - `segment` 섹션 추가 (프랑스어)
- `apps/client/src/app/i18n/locales/hu-HU/translation.json` - `segment` 섹션 추가 (헝가리어)
- `apps/client/src/app/i18n/locales/ja-JP/translation.json` - `segment` 섹션 추가 (일본어)
- `apps/client/src/app/i18n/locales/nl-NL/translation.json` - `segment` 섹션 추가 (네덜란드어)
- `apps/client/src/app/i18n/locales/pt-BR/translation.json` - `segment` 섹션 추가 (브라질 포르투갈어)
- `apps/client/src/app/i18n/locales/pt-PT/translation.json` - `segment` 섹션 추가 (유럽 포르투갈어)
- `apps/client/src/app/i18n/locales/ro-RO/translation.json` - `segment` 섹션 추가 (루마니아어)
- `apps/client/src/app/i18n/locales/ru-RU/translation.json` - `segment` 섹션 추가 (러시아어)
- `apps/client/src/app/i18n/locales/sv-SE/translation.json` - `segment` 섹션 추가 (스웨덴어)
- `apps/client/src/app/i18n/locales/zh-Hans-CN/translation.json` - `segment` 섹션 추가 (간체 중국어)
- `apps/client/src/app/i18n/locales/zh-Hant-TW/translation.json` - `segment` 섹션 추가 (번체 중국어)

## Major Changes

### API 계층 (`segment-api.ts`)
`apiFetch`를 사용하여 세그먼트 REST API 7개를 래핑한다. 기존 `contact-api.ts` 패턴을 따른다:
```typescript
fetchSegments(envId)     // GET    /environments/:envId/segments
fetchSegment(envId, id)  // GET    /environments/:envId/segments/:id
createSegment(envId, input)  // POST
updateSegment(envId, id, input) // PUT
deleteSegment(envId, id) // DELETE
cloneSegment(envId, id)  // POST .../clone
resetSegment(envId, id)  // POST .../reset
```

### 필터 편집기 아키텍처 (`filter-editor.tsx`)
- `FilterEditor`가 상태 소유자 역할 — 외부에서 `filters` 배열과 `onChange` 콜백을 전달받음
- 모든 상태 변경은 `@inquiry/shared-segment`의 순수 함수 호출로 수행:
  - `createEmptyFilter()`, `addFilterBelow()`, `deleteFilter()`
  - `toggleConnector()`, `updateFilter()`, `createGroupFromFilter()`
- `FilterGroup` → `FilterItemRow` 재귀 구조로 무한 중첩 가능

### UI 컴포넌트 적응
- Table 미존재 → 네이티브 `<table>` + Tailwind CSS 클래스로 동일한 스타일 구현
- AlertDialog 미존재 → `Dialog` + `DialogFooter`에 취소/삭제 `Button` 배치로 대체

## How to use it

```tsx
import {
  SegmentList,
  SegmentForm,
  FilterEditor,
  EnterpriseGate,
  fetchSegments,
  createSegment,
  updateSegment,
} from '@inquiry/client-segment';

// 세그먼트 목록 표시
<SegmentList
  envId="env-abc123"
  onNavigateCreate={() => router.push('/segments/new')}
  onNavigateEdit={(id) => router.push(`/segments/${id}`)}
/>

// 세그먼트 생성 폼
<SegmentForm
  mode="create"
  onSubmit={async (values) => {
    await createSegment(envId, values);
  }}
  onCancel={() => router.back()}
/>

// 필터 편집기 (세그먼트 수정 페이지에서)
const [filters, setFilters] = useState<FilterItem[]>(segment.filters);
<FilterEditor
  filters={filters}
  onChange={setFilters}
  envId="env-abc123"
/>
```

## Related Components/Modules
- `@inquiry/shared-segment` — 타입, 연산자, 순수 함수 (서버/클라이언트 공유)
- `@inquiry/client-contact` — `fetchAttributeKeys`, `AttributeKey` 타입 (필터 속성 선택에 사용)
- `@inquiry/client-core` — `apiFetch` HTTP 클라이언트
- `@inquiry/client-ui` — Button, Input, Select, Dialog, Badge, DropdownMenu 등 shadcn 기반 컴포넌트

## Precautions
- `@inquiry/client-ui`에 Table, AlertDialog 컴포넌트가 없어 네이티브 HTML과 Dialog로 대체 구현함. 향후 해당 컴포넌트 추가 시 마이그레이션 권장.
- FilterEditor의 ID 생성은 `useId()` + 카운터 조합으로 클라이언트 사이드에서만 유효한 임시 ID. 서버 저장 시 서버가 실제 ID를 부여함.
- 필터 편집기의 속성 키/세그먼트 목록은 리소스 유형 변경 시 매번 API를 호출하므로, 대량 데이터 시 캐싱 레이어 도입을 고려해야 함.
