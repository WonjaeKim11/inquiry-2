'use client';

import { useTranslation } from 'react-i18next';
import type { BuilderStore } from '@coltorapps/builder';
import { LanguageSettingsCard } from './LanguageSettingsCard';
import { BuilderCanvas } from './BuilderCanvas';

interface ElementsViewProps {
  /** @coltorapps/builder-react의 builderStore 인스턴스 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builderStore: BuilderStore<any>;
}

/**
 * Elements 탭 메인 뷰.
 * 다국어 설정 -> Welcome Card -> Builder Canvas (Blocks + Elements) ->
 * Ending Cards -> Hidden Fields -> Variables 순서로 배치한다.
 *
 * WelcomeCardEditor, EndingCardList, HiddenFieldsCard, SurveyVariablesCard는
 * Phase 5에서 구현하므로, 현재는 placeholder div를 렌더링한다.
 */
export function ElementsView({ builderStore }: ElementsViewProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* 다국어 설정 카드 */}
      <LanguageSettingsCard />

      {/* Welcome Card - Phase 5에서 WelcomeCardEditor로 교체 */}
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t('surveyEditor.welcomeCard.title', 'Welcome Card')}
        </h3>
      </div>

      {/* Builder Canvas - Blocks + Elements */}
      <BuilderCanvas builderStore={builderStore} />

      {/* Ending Cards - Phase 5에서 EndingCardList로 교체 */}
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t('surveyEditor.ending.title', 'Ending Cards')}
        </h3>
      </div>

      {/* Hidden Fields - Phase 5에서 HiddenFieldsCard로 교체 */}
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t('surveyEditor.hiddenFields.title', 'Hidden Fields')}
        </h3>
      </div>

      {/* Survey Variables - Phase 5에서 SurveyVariablesCard로 교체 */}
      <div className="rounded-lg border p-4">
        <h3 className="text-sm font-medium text-muted-foreground">
          {t('surveyEditor.variables.title', 'Variables')}
        </h3>
      </div>
    </div>
  );
}
