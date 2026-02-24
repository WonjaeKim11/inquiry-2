'use client';

import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';

interface BlockSettingsProps {
  /** Block Entity ID */
  entityId: string;
  /** 속성값 변경 콜백. 속성 이름과 새 값을 전달한다. */
  onAttributeChange: (attrName: string, value: unknown) => void;
}

/**
 * Block 설정 패널.
 * Block entity는 logicItemsAttribute, logicFallbackAttribute만 가지고 있으므로
 * 여기서는 Logic 편집 진입점만 제공한다.
 * 상세 Logic 편집 UI는 Phase 5에서 BlockLogicEditor로 교체 예정이다.
 */
export function BlockSettings({
  entityId,
  onAttributeChange,
}: BlockSettingsProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3 border-t p-3">
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {t('surveyEditor.block.settings.title', 'Block Settings')}
        </span>
      </div>

      {/* Logic 편집 진입점 - Phase 5에서 BlockLogicEditor로 교체 */}
      <div className="rounded-md border border-dashed p-3">
        <p className="text-xs text-muted-foreground">
          {t('surveyEditor.logic.title', 'Logic')}
        </p>
      </div>
    </div>
  );
}
