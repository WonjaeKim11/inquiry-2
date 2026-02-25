'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBuilderStoreData } from '@coltorapps/builder-react';
import type { BuilderStore } from '@coltorapps/builder';
import { RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, Button } from '@inquiry/client-ui';
import { useSurveyMeta } from '../../hooks/use-survey-meta';
import { useEditorUI } from '../../hooks/use-editor-ui';
import { PreviewModal } from './PreviewModal';
import { PreviewFullwidth } from './PreviewFullwidth';

interface SurveyPreviewProps {
  /** @coltorapps/builder-react의 BuilderStore 인스턴스 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builderStore: BuilderStore<any>;
}

/**
 * 설문 미리보기 메인 컨테이너.
 * builderStore의 schema를 구독하고, useSurveyMeta로 메타데이터(welcomeCard, endings, type)를 가져온다.
 * type이 'app'이면 모바일 프레임(PreviewModal), 'link'이면 전체 너비(PreviewFullwidth)로 렌더링한다.
 * RefreshCw 버튼으로 key를 변경하여 프리뷰를 강제 리마운트할 수 있다.
 *
 * @param builderStore - Builder Store 인스턴스
 */
export function SurveyPreview({ builderStore }: SurveyPreviewProps) {
  const { t } = useTranslation();
  const data = useBuilderStoreData(builderStore);
  const { type, welcomeCard, endings } = useSurveyMeta();
  const { activeElementId } = useEditorUI();
  const [refreshKey, setRefreshKey] = useState(0);

  const schema = data?.schema;
  const PreviewComponent = type === 'app' ? PreviewModal : PreviewFullwidth;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm font-medium">
          {t('surveyEditor.preview.title', 'Preview')}
        </CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setRefreshKey((k) => k + 1)}
          title={t('surveyEditor.preview.refreshPreview', 'Refresh Preview')}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <div key={refreshKey}>
        <PreviewComponent
          schema={schema}
          welcomeCard={welcomeCard}
          endings={endings}
          activeElementId={activeElementId}
        />
      </div>
    </Card>
  );
}
