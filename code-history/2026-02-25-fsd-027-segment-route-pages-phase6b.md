# FSD-027 Phase 6B: 세그먼트 라우트 페이지

## Overview
세그먼트/필터 시스템의 Phase 6B로, 세그먼트 관리를 위한 Next.js 라우트 페이지 3종(목록/생성/수정)을 구현했다. Phase 1~5에서 준비된 서버 API, 클라이언트 라이브러리(`@inquiry/client-segment`), i18n을 결합하여 사용자가 실제로 세그먼트를 관리할 수 있는 UI 페이지를 제공한다. 또한, 기존 `@inquiry/client-segment` 및 `@inquiry/shared-segment` 패키지의 `.js` 확장자 import 문제를 수정하여 Turbopack 빌드 호환성을 확보했다.

## Changed Files

### 생성된 파일
- `apps/client/src/app/[lng]/projects/[projectId]/environments/[envId]/segments/page.tsx` - 세그먼트 목록 메인 페이지. SegmentList 컴포넌트를 렌더링하고 생성/수정 페이지로의 라우터 네비게이션을 제공한다.
- `apps/client/src/app/[lng]/projects/[projectId]/environments/[envId]/segments/new/page.tsx` - 세그먼트 생성 페이지. SegmentForm과 FilterEditor를 2열 그리드로 배치하여 기본정보와 필터를 동시에 편집한다.
- `apps/client/src/app/[lng]/projects/[projectId]/environments/[envId]/segments/[segmentId]/edit/page.tsx` - 세그먼트 수정 페이지. 기존 세그먼트를 fetchSegment로 로드한 후 수정 가능하게 한다.
- `code-history/2026-02-25-fsd-027-segment-route-pages-phase6b.md` - 본 문서

### 수정된 파일 (i18n 키 추가 - 15개 로케일)
- `apps/client/src/app/i18n/locales/en-US/translation.json`
- `apps/client/src/app/i18n/locales/ko-KR/translation.json`
- `apps/client/src/app/i18n/locales/de-DE/translation.json`
- `apps/client/src/app/i18n/locales/es-ES/translation.json`
- `apps/client/src/app/i18n/locales/fr-FR/translation.json`
- `apps/client/src/app/i18n/locales/hu-HU/translation.json`
- `apps/client/src/app/i18n/locales/ja-JP/translation.json`
- `apps/client/src/app/i18n/locales/nl-NL/translation.json`
- `apps/client/src/app/i18n/locales/pt-BR/translation.json`
- `apps/client/src/app/i18n/locales/pt-PT/translation.json`
- `apps/client/src/app/i18n/locales/ro-RO/translation.json`
- `apps/client/src/app/i18n/locales/ru-RU/translation.json`
- `apps/client/src/app/i18n/locales/sv-SE/translation.json`
- `apps/client/src/app/i18n/locales/zh-Hans-CN/translation.json`
- `apps/client/src/app/i18n/locales/zh-Hant-TW/translation.json`

### 수정된 파일 (Turbopack 호환성 - .js 확장자 제거)
- `libs/client/segment/src/index.ts` - barrel export의 `.js` 확장자를 확장자 없는 형태로 변경
- `libs/client/segment/src/lib/segment-list.tsx` - 내부 import `.js` 확장자 제거
- `libs/client/segment/src/lib/segment-form.tsx` - 내부 import `.js` 확장자 제거
- `libs/client/segment/src/lib/filter-editor.tsx` - 내부 import `.js` 확장자 제거
- `libs/client/segment/src/lib/filter-group.tsx` - 내부 import `.js` 확장자 제거
- `libs/client/segment/src/lib/filter-item-row.tsx` - 내부 import `.js` 확장자 제거
- `libs/client/segment/src/lib/filter-type-selector.tsx` - 내부 import `.js` 확장자 제거
- `libs/client/segment/src/lib/delete-segment-dialog.tsx` - 내부 import `.js` 확장자 제거
- `packages/shared-segment/src/index.ts` - barrel export `.js` 확장자 제거
- `packages/shared-segment/src/evaluate-segment.ts` - 내부 import `.js` 확장자 제거
- `packages/shared-segment/src/date-utils.ts` - 내부 import `.js` 확장자 제거
- `packages/shared-segment/src/filter-utils.ts` - 내부 import `.js` 확장자 제거
- `packages/shared-segment/src/operators.ts` - 내부 import `.js` 확장자 제거

## Major Changes

### 1. 세그먼트 목록 페이지 (segments/page.tsx)
기존 contacts 페이지 패턴을 참조하여 `use(params)`로 라우트 매개변수를 추출하고, `SegmentList` 컴포넌트에 라우터 네비게이션 콜백을 주입한다.

```tsx
<SegmentList
  envId={envId}
  onNavigateCreate={() => router.push(`${basePath}/new`)}
  onNavigateEdit={(segmentId) => router.push(`${basePath}/${segmentId}/edit`)}
/>
```

### 2. 세그먼트 생성 페이지 (segments/new/page.tsx)
SegmentForm과 FilterEditor를 2열 그리드(`lg:grid-cols-2`)로 배치한다. 필터 상태는 `useState<FilterItem[]>`로 페이지 레벨에서 관리하며, 폼 제출 시 폼 값과 필터를 병합하여 `createSegment` API를 호출한다.

### 3. 세그먼트 수정 페이지 (segments/[segmentId]/edit/page.tsx)
`useEffect`로 기존 세그먼트를 `fetchSegment`로 로드하고, 로딩/에러/정상 3개 상태를 분기 렌더링한다. 수정 완료 시 `updateSegment` API를 호출하고 목록으로 복귀한다.

### 4. i18n 키 추가 (15개 로케일)
라우트 페이지에서 사용하는 5개 키를 15개 로케일 모두에 추가했다:
- `segment.title` - 메인 페이지 제목
- `segment.description` - 메인 페이지 설명
- `segment.form.details` - 세부 정보 섹션 제목
- `segment.filter.title` - 필터 섹션 제목
- `segment.errors.not_found` - 세그먼트 미발견 에러

### 5. Turbopack 빌드 호환성 수정
`@inquiry/client-segment`와 `@inquiry/shared-segment` 패키지의 모든 상대 import에서 `.js` 확장자를 제거했다. Turbopack은 `.js` 확장자로 `.tsx`/`.ts` 파일을 찾지 못하는 문제가 있었으며, `moduleResolution: "bundler"` 설정에서는 확장자 없는 import가 올바르게 동작한다.

## How to use it

세그먼트 관리 페이지에 접근하는 경로:
- 목록: `/{lng}/projects/{projectId}/environments/{envId}/segments`
- 생성: `/{lng}/projects/{projectId}/environments/{envId}/segments/new`
- 수정: `/{lng}/projects/{projectId}/environments/{envId}/segments/{segmentId}/edit`

## Related Components/Modules
- `@inquiry/client-segment` - SegmentList, SegmentForm, FilterEditor UI 컴포넌트 및 API 함수
- `@inquiry/shared-segment` - FilterItem 타입, 필터 유틸리티 함수
- `@inquiry/client-contact` - fetchAttributeKeys (FilterTypeSelector에서 속성 키 조회용)
- `apps/client/src/app/i18n/locales/*/translation.json` - 15개 로케일 번역 파일

## Precautions
- `segment.form.create`와 `segment.form.edit` 키는 페이지 제목과 버튼 라벨에 공용으로 사용된다. 값을 "Create Segment" / "Edit Segment"으로 변경했으므로 SegmentForm 내부 버튼과 SegmentList 드롭다운 메뉴에도 동일한 텍스트가 표시된다.
- `.js` 확장자 제거는 `moduleResolution: "bundler"` 환경에서만 유효하며, `nodenext` 환경에서는 `.js` 확장자가 필요할 수 있다. 현재 이 라이브러리들은 `bundler` 모드로 설정되어 있으므로 문제없다.
