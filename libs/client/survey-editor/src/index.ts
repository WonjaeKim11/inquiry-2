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

// Layout Components
export { SurveyEditorLayout } from './lib/components/layout/SurveyEditorLayout';
export { SurveyMenuBar } from './lib/components/layout/SurveyMenuBar';
export { EditorTabs } from './lib/components/layout/EditorTabs';

// Shared Components
export { AutoSaveIndicator } from './lib/components/shared/AutoSaveIndicator';
export { LocalizedInput } from './lib/components/shared/LocalizedInput';
export { OptionsSwitch } from './lib/components/shared/OptionsSwitch';
export { ConfirmDeleteDialog } from './lib/components/shared/ConfirmDeleteDialog';
export { FileUploadInput } from './lib/components/shared/FileUploadInput';

// Elements View Components
export { ElementsView } from './lib/components/elements-view/ElementsView';
export { BuilderCanvas } from './lib/components/elements-view/BuilderCanvas';
export { BlockComponent } from './lib/components/elements-view/BlockComponent';
export { BlockHeader } from './lib/components/elements-view/BlockHeader';
export { BlockSettings } from './lib/components/elements-view/BlockSettings';
export { BlockLogicEditor } from './lib/components/elements-view/BlockLogicEditor';
export { ValidationRulesEditor } from './lib/components/elements-view/ValidationRulesEditor';
export { ElementComponent } from './lib/components/elements-view/ElementComponent';
export { ElementCardMenu } from './lib/components/elements-view/ElementCardMenu';
export { AddElementButton } from './lib/components/elements-view/AddElementButton';
export { DEFAULT_ELEMENT_ATTRS } from './lib/components/elements-view/AddElementButton';
export { LanguageSettingsCard } from './lib/components/elements-view/LanguageSettingsCard';
export { WelcomeCardEditor } from './lib/components/elements-view/WelcomeCardEditor';
export { EndingCardEditor } from './lib/components/elements-view/EndingCardEditor';
export { EndingCardList } from './lib/components/elements-view/EndingCardList';
export { HiddenFieldsCard } from './lib/components/elements-view/HiddenFieldsCard';
export { SurveyVariablesCard } from './lib/components/elements-view/SurveyVariablesCard';
export { entityComponentMap } from './lib/components/elements-view/entity-components/index';
export {
  BuilderStoreProvider,
  useBuilderStoreContext,
} from './lib/components/elements-view/BuilderStoreContext';

// Settings View Components
export { SettingsView } from './lib/components/settings-view/SettingsView';
export { DeploymentCard } from './lib/components/settings-view/DeploymentCard';
export { TriggerCard } from './lib/components/settings-view/TriggerCard';
export { ResponseOptionsCard } from './lib/components/settings-view/ResponseOptionsCard';
export { RecontactCard } from './lib/components/settings-view/RecontactCard';
export { PlacementCard } from './lib/components/settings-view/PlacementCard';
export { TargetingCard } from './lib/components/settings-view/TargetingCard';

// Styling View Components
export { StylingView } from './lib/components/styling-view/StylingView';

// Follow-Ups View Components
export { FollowUpsView } from './lib/components/follow-ups-view/FollowUpsView';

// Preview Components
export { SurveyPreview } from './lib/components/preview/SurveyPreview';
export { PreviewModal } from './lib/components/preview/PreviewModal';
export { PreviewFullwidth } from './lib/components/preview/PreviewFullwidth';
