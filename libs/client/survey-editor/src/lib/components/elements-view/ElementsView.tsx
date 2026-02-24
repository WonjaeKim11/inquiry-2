'use client';

import type { BuilderStore } from '@coltorapps/builder';
import { LanguageSettingsCard } from './LanguageSettingsCard';
import { BuilderCanvas } from './BuilderCanvas';
import { WelcomeCardEditor } from './WelcomeCardEditor';
import { EndingCardList } from './EndingCardList';
import { HiddenFieldsCard } from './HiddenFieldsCard';
import { SurveyVariablesCard } from './SurveyVariablesCard';

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
 * 각 섹션은 SurveyMetaContext를 통해 Builder Schema 외부 데이터를 관리한다.
 */
export function ElementsView({ builderStore }: ElementsViewProps) {
  return (
    <div className="space-y-6">
      {/* 다국어 설정 카드 */}
      <LanguageSettingsCard />

      {/* Welcome Card 편집기 */}
      <WelcomeCardEditor />

      {/* Builder Canvas - Blocks + Elements */}
      <BuilderCanvas builderStore={builderStore} />

      {/* Ending Cards 목록 (DnD 정렬 + 추가/삭제) */}
      <EndingCardList />

      {/* Hidden Fields 편집기 */}
      <HiddenFieldsCard />

      {/* Survey Variables 편집기 */}
      <SurveyVariablesCard />
    </div>
  );
}
