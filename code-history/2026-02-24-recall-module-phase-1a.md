# Recall Module Phase 1-A

## Overview
Recall 모듈은 설문 텍스트 내에서 `#recall:id/fallback:value#` 패턴을 파싱하고, 실제 값으로 치환하며, 에디터 UI와 저장 형식 간 변환을 처리하는 핵심 기능이다. 이전 질문의 응답, 변수, 히든 필드 값을 설문 텍스트에 동적으로 삽입할 수 있게 해준다.

Phase 1-A에서는 6개의 핵심 모듈 파일과 2개의 타입/배럴 파일, 총 8개 파일을 구현했다.

## Changed Files

### 생성된 파일
- `packages/survey-builder-config/src/lib/recall/types/recall.types.ts` - RecallInfo, RecallContext, RecallItem 인터페이스 및 Zod 스키마 정의
- `packages/survey-builder-config/src/lib/recall/types/index.ts` - 타입 모듈 배럴 export
- `packages/survey-builder-config/src/lib/recall/recall-parser.ts` - recall 텍스트 파싱 함수 4개 (getFirstRecallId, getAllRecallIds, getFallbackValue, getAllRecallInfo)
- `packages/survey-builder-config/src/lib/recall/recall-resolver.ts` - recall 태그를 실제 값으로 치환하는 resolveRecalls 함수
- `packages/survey-builder-config/src/lib/recall/recall-formatter.ts` - 날짜 서수 포매팅, 배열 연결, 텍스트 축약, nbsp 치환 유틸리티
- `packages/survey-builder-config/src/lib/recall/recall-editor.ts` - 에디터 표시용(@라벨)과 저장 형식(#recall:...#) 간 양방향 변환
- `packages/survey-builder-config/src/lib/recall/recall-safety.ts` - 중첩 recall 방지, HTML 태그 제거(XSS), 빈 fallback 검증
- `packages/survey-builder-config/src/lib/recall/index.ts` - recall 모듈 배럴 export

### 수정된 파일
- `packages/survey-builder-config/src/index.ts` - recall 모듈 전체 re-export 추가

## Major Changes

### 1. Recall 패턴 및 파싱 (recall-parser.ts)
정규식 `/#recall:([a-zA-Z0-9_-]+)\/fallback:(.*?)#/g`를 사용하여 텍스트에서 recall 태그를 파싱한다. NFR-013-04 요구사항에 따라 매번 `new RegExp`로 생성하여 `lastIndex` 문제를 방지하며, `while` 루프에서 `regex.exec()` null 시 즉시 중단한다.

```typescript
// 사용 예시
getFirstRecallId('질문: #recall:q1/fallback:이름#님 안녕하세요'); // 'q1'
getAllRecallIds('안녕 #recall:q1/fallback:이름# #recall:q2/fallback:나이#'); // ['q1', 'q2']
getFallbackValue('안녕 #recall:q1/fallback:기본값#', 'q1'); // '기본값'
```

### 2. Recall 치환 (recall-resolver.ts)
`resolveRecalls(text, context)` 함수는 4단계 우선순위로 값을 조회한다:
1. 변수 (variables) - 가장 높은 우선순위
2. 응답 데이터 (responseData)
3. 히든 필드 (hiddenFieldValues)
4. fallback 텍스트 - 모든 소스에서 찾지 못한 경우

배열 응답은 쉼표로 연결하고, ISO 날짜는 서수 포매팅(예: "1st January 2024")으로 변환한다.

### 3. 포매팅 유틸리티 (recall-formatter.ts)
- `formatDateValue(dateStr)` - ISO 날짜를 서수 포매팅 ("2024-01-01" -> "1st January 2024")
- `formatArrayValue(values)` - 배열을 쉼표 구분 문자열로 변환
- `truncateText(text, maxLength)` - 25자 초과 텍스트를 "앞10자...뒤10자" 형태로 축약
- `replaceNbsp(text)` - `&nbsp;` 및 `\u00A0`을 일반 공백으로 치환

### 4. 에디터 변환 (recall-editor.ts)
- `recallToEditor(text, items)` - 저장 형식 `#recall:q1/fallback:이름#`을 에디터 표시 `@질문1` 형태로 변환
- `editorToRecall(text, items)` - 에디터 표시 `@질문1`을 저장 형식으로 역변환. 긴 라벨을 먼저 매칭하여 부분 매칭을 방지하고, HTML 태그를 제거하여 XSS를 방지한다.

### 5. 안전 처리 (recall-safety.ts)
- `sanitizeNestedRecall(label)` - 중첩 recall 태그를 "___" 플레이스홀더로 대체하여 무한 재귀 방지 (NFR-013-05)
- `stripHtmlTags(text)` - `<script>` 등 HTML 태그를 제거하여 XSS 방지
- `validateFallbacks(text)` - 빈 fallback을 가진 recall ID를 탐지하여 경고 대상 식별

## How to use it

```typescript
import {
  getFirstRecallId,
  getAllRecallInfo,
  resolveRecalls,
  recallToEditor,
  editorToRecall,
  validateFallbacks,
} from '@inquiry/survey-builder-config';

// 1. 텍스트에서 recall 정보 파싱
const text = '#recall:q1/fallback:응답자#님, #recall:v_score/fallback:점수#점입니다.';
const infos = getAllRecallInfo(text);
// [{ id: 'q1', fallback: '응답자' }, { id: 'v_score', fallback: '점수' }]

// 2. 실제 값으로 치환
const resolved = resolveRecalls(text, {
  variables: [{ id: 'v_score', name: 'score', type: 'number', value: 85 }],
  responseData: { q1: '홍길동' },
  hiddenFieldValues: {},
});
// '홍길동님, 85점입니다.'

// 3. 에디터 <-> 저장 형식 변환
const items = [
  { id: 'q1', label: '이름 질문', type: 'element' as const },
];
const editorText = recallToEditor('#recall:q1/fallback:이름#님', items);
// '@이름 질문님'
const storedText = editorToRecall('@이름 질문님', items);
// '#recall:q1/fallback:#님'

// 4. 빈 fallback 경고 검출
const warnings = validateFallbacks('#recall:q1/fallback:# #recall:q2/fallback:기본값#');
// ['q1'] (q1만 빈 fallback)
```

## Related Components/Modules
- `packages/survey-builder-config/src/lib/types.ts` - SurveyVariable 타입 (RecallContext.variables와 연관)
- `packages/survey-builder-config/src/lib/logic/` - 조건부 로직 엔진 (recall 값을 조건 평가에 활용 가능)
- 에디터 UI (향후 구현) - recallToEditor/editorToRecall로 표시/저장 형식 변환
- 설문 렌더링 엔진 (향후 구현) - resolveRecalls로 실시간 recall 치환

## Precautions
- 정규식은 매번 `new RegExp()`로 생성하여 `lastIndex` 상태 공유 문제를 방지해야 한다 (NFR-013-04)
- `editorToRecall()`은 항상 HTML 태그를 제거하므로, HTML이 필요한 경우 별도 처리가 필요하다
- 날짜 포매팅은 UTC 기준이므로 타임존에 따라 날짜가 다를 수 있다
- `recallItemSchema`는 logic 모듈의 `logicItemSchema`와 이름이 유사하지만 완전히 다른 스키마이다
- Phase 1-B에서 테스트 코드 및 추가 검증 로직이 구현될 예정이다
