# FS 상세 아키텍처 메모

## FS-010 설문 편집기 UX 핵심 아키텍처 결정
- 상태 관리: Zustand store (surveyEditorStore)
- 컴포넌트 계층: EditorShell > LeftPanel/CenterCanvas/RightPanel
- 배치: FS-010 구현 시 다른 FS의 편집기 컴포넌트를 통합
- Undo/Redo: immer 기반 패치 기록
- 선행: FS-008, FS-009

## FS-019 타게팅/트리거/재노출 핵심 아키텍처 결정
- Survey-ActionClass: SurveyTrigger 중간 테이블 (복합PK [surveyId, actionClassId])
- Display 모델: 별도 테이블 (surveyId, contactId?, environmentId, createdAt)
- SDK 필터링 파이프라인: trigger 매칭 -> segment -> displayOption -> recontactDays -> displayPercentage
- 4개 순수 함수 checker: displayOption, recontactDays, segment, displayPercentage
- TimerManager: delay/autoClose 타이머 중앙 관리 (Map 기반)
- CSPRNG: crypto.getRandomValues() 사용, Math.random() 폴백
- recontactDays: 전역 기준 (마지막 '모든 설문' 표시 일시)
- surveyOverrides: Json 필드 5가지 (brandColor, highlightBorderColor, placement, clickOutsideClose, overlay)
- 서버: libs/server/targeting/ (DisplayController, DisplayService, SegmentEvaluationService)
- 클라이언트: libs/client/targeting/ (에디터 설정 컴포넌트 11개)
- Client API sync 확장: actionClasses, userSegmentIds, displays, responses 포함
- 선행: FS-006, FS-008, FS-024, FS-027, FS-007
- 7단계 구현: 배포/노출 채널 단계 마지막 항목
