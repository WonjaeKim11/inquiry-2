# FS-021 응답 관리/부분 응답 핵심 아키텍처 결정

> @coltorapps/builder 기반 재작성 (2026-02-22)

## @coltorapps/builder 통합 핵심 (기존 대비 변경)
- 응답 수집 런타임: useInterpreterStore(surveyBuilder, surveySchema)로 구동
- 부분 응답 복원: initialData.entitiesValues로 기존 저장된 값 한 줄 복원
- 클라이언트 검증: interpreterStore.validateEntitiesValues() (Entity validate 메서드 자동 실행)
- 서버 이중 검증: validateEntitiesValues(data, surveyBuilder, schema) (finished=true 시)
- 질문 렌더링: InterpreterEntities + createEntityComponent 패턴
- 조건부 스킵: Entity의 shouldBeProcessed가 false이면 렌더링+검증 자동 제외
- 응답 데이터 구조: { [entityId]: value } flat map (기존 Record<string, ResponseValue>와 동일)
- TTC 추적: onEntityValueUpdated 이벤트 구독 -> 시간 측정
- 자동 저장: onEntityValueUpdated + debounce(2초)

## 신규 패키지/컴포넌트
- packages/survey-builder/: surveyBuilder + Entity + Attribute 정의 (서버/클라이언트 공유)
- SurveyInterpreter 컴포넌트: useInterpreterStore + InterpreterEntities + 제출 폼
- use-survey-interpreter 훅: useInterpreterStore 래퍼 (TTC + 자동저장 + 검증)
- Entity Interpreter 컴포넌트: openText, rating, multipleChoice 등 (createEntityComponent)

## DB 모델 (변경 없음)
- Response: 완전 모델 (FS-014/024 스텁에서 확장), contactId FK(nullable), environmentId FK
- Tag: environmentId FK, (name, environmentId) 유니크
- ResponseTag: 복합PK [responseId, tagId]
- 인덱스: [surveyId], [surveyId, finished], [environmentId], [contactId], [createdAt]

## 서버 아키텍처 (변경: validateEntitiesValues 통합)
- `libs/server/response/`: ResponseModule, ResponseService, ResponseFilterService
- `libs/server/tag/`: TagModule, TagService, TagController
- 2개 컨트롤러: ResponseClientController(인증 불필요), ResponseController(JWT 필수)
- ResponseService.create()/update(): finished=true 시 validateEntitiesValues() 서버 검증
- 필터 엔진: 22가지 연산자 -> Prisma WHERE 변환, entityId 기반 JSON path 필터

## 클라이언트 아키텍처 (변경: builder-react 기반)
- `libs/client/response/`: 컴포넌트, 훅, API, 유틸, interpreters/
- 카드 뷰: ResponseCard(헤더/바디/풋터), ResponseCardList(Load More) -- 변경 없음
- 테이블 뷰: TanStack Table + dnd-kit -- 변경 없음
- 순수 함수: isValidResponseValue(), buildSkipGroups() -- 변경 없음 (entityId 사용)

## 변경 없는 영역 (기존 계획 유지)
- 응답 목록 조회/필터/태그/삭제: 서버 CRUD, builder와 무관
- 카드/테이블 뷰 UI: 응답 렌더링, builder와 무관
- 메타데이터/부분응답 시각화: builder와 무관

## 구현 순서 (7개 마일스톤)
1. 데이터 계층 + Survey Builder (Prisma + packages/survey-builder + Entity/Attribute 정의)
2. 서버 API 코어 (ResponseService + validateEntitiesValues 서버 검증)
3. 태그 API
4. 서버 테스트 + 권한
5. 클라이언트 응답 수집 (useInterpreterStore + Entity Interpreters + SurveyInterpreter)
6. 클라이언트 응답 관리 UI
7. 페이지 조립 + i18n + 통합 테스트
