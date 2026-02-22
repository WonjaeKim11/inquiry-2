# @coltorapps/builder Patterns for Inquiry Project

## Core Concepts
- useBuilderStore: React 컴포넌트에서 Builder Store 생성 (lifecycle 관리)
- initialData: 기존 스키마 로드 시 사용 ({ schema, entitiesAttributesErrors, schemaError })
- Store 메서드: addEntity, deleteEntity, cloneEntity, setEntityAttributeValue, setData
- 이벤트: onEntityAdded, onEntityDeleted, onEntityCloned, onEntityAttributeUpdated, onDataSet

## React Integration
- BuilderEntities: Entity type -> Component 자동 매핑 (components prop)
- createEntityComponent: 타입 안전한 Entity 렌더링 컴포넌트 생성
- createAttributeComponent: 타입 안전한 Attribute 편집 컴포넌트 생성
- useBuilderStoreData: Store 데이터 구독 (shouldUpdate로 선택적 리렌더링)

## DnD Integration
- @dnd-kit과 Builder Store 통합: setData로 immutable root/children 업데이트
- arrayMove 사용, 직접 배열 mutation 금지

## Schema Structure
- flat entities map + root array
- parent-child: parentId + children 양방향 일관성 필수
- CUID 기반 ID: generateEntityId/validateEntityId를 builder에서 설정

## Survey-Specific Decisions
- Block = root Entity, Element = Block의 child Entity
- WelcomeCard/Endings/HiddenFields/Variables = Builder 외부 (SurveyMetaContext)
- 이유: 단일 인스턴스(WelcomeCard), 메타데이터(HiddenFields/Variables), 독립 배치(Endings)
- Schema 변환: surveyToBuilderData / builderDataToSurvey (왕복 무손실 필수)
- 프리뷰: useInterpreterStore로 실시간 렌더링
