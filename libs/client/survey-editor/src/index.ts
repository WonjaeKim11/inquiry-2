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
