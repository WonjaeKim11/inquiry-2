// Schema 변환 유틸리티
export type { SurveyMeta } from './lib/utils/schema-converter';
export {
  surveyToBuilderData,
  builderDataToSurvey,
} from './lib/utils/schema-converter';

// ID 검증 유틸리티
export {
  validateElementId,
  validateHiddenFieldIdForEditor,
} from './lib/utils/id-validation';

// Block 번호 매핑 유틸리티
export { getBlockLabels } from './lib/utils/block-numbering';

// 설문 발행 전 검증 유틸리티
export type { SurveyValidationResult } from './lib/utils/survey-validation';
export { validateSurveyForPublish } from './lib/utils/survey-validation';

// 편집기 Context 타입
export type {
  EditorTab,
  AutoSaveStatus,
  EditorConfig,
  EditorUIState,
  EditorUIAction,
  SurveyMetaState,
  SurveyMetaAction,
} from './lib/context/types';

// Context Providers
export { EditorUIProvider } from './lib/context/editor-ui.context';
export type { EditorUIContextValue } from './lib/context/editor-ui.context';
export { SurveyMetaProvider } from './lib/context/survey-meta.context';
export type { SurveyMetaContextValue } from './lib/context/survey-meta.context';

// Hooks
export { useEditorUI } from './lib/hooks/use-editor-ui';
export { useSurveyMeta } from './lib/hooks/use-survey-meta';
export { useEditorAutoSave } from './lib/hooks/use-editor-auto-save';
export { useSurveyPublish } from './lib/hooks/use-survey-publish';
export { useActiveElement } from './lib/hooks/use-active-element';
