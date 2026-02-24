'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings } from 'lucide-react';
import { useBuilderStoreData } from '@coltorapps/builder-react';
import type { LogicItem } from '@inquiry/survey-builder-config';
import { useBuilderStoreContext } from './BuilderStoreContext';
import { BlockLogicEditor } from './BlockLogicEditor';

interface BlockSettingsProps {
  /** Block Entity ID */
  entityId: string;
  /** 속성값 변경 콜백. 속성 이름과 새 값을 전달한다. */
  onAttributeChange: (attrName: string, value: unknown) => void;
}

/**
 * Block 설정 패널.
 *
 * Block entity의 logicItems, logicFallback 속성을 builderStore에서 읽어
 * BlockLogicEditor 컴포넌트에 전달한다.
 * 사용자는 조건부 로직 규칙과 폴백 블록을 시각적으로 편집할 수 있다.
 */
export function BlockSettings({
  entityId,
  onAttributeChange,
}: BlockSettingsProps) {
  const { t } = useTranslation();
  const { builderStore } = useBuilderStoreContext();

  /**
   * builderStore 데이터에서 현재 Block의 속성을 읽어온다.
   * useBuilderStoreData를 사용하여 반응형으로 구독한다.
   */
  const data = useBuilderStoreData(builderStore);

  /**
   * 현재 Block 엔티티의 속성을 추출한다.
   * schema.entities[entityId]에서 attributes를 읽는다.
   */
  const entityAttrs = useMemo(() => {
    const schemaAny = data?.schema as unknown as {
      entities?: Record<
        string,
        { type: string; attributes: Record<string, unknown> }
      >;
    };
    return schemaAny?.entities?.[entityId]?.attributes ?? {};
  }, [data, entityId]);

  /** 현재 Block에 설정된 logicItems 배열 (기본값: 빈 배열) */
  const logicItems = (entityAttrs.logicItems as LogicItem[] | undefined) ?? [];

  /** 모든 로직 조건 불일치 시 이동할 폴백 블록 ID (기본값: null) */
  const logicFallback =
    (entityAttrs.logicFallback as string | null | undefined) ?? null;

  return (
    <div className="space-y-3 border-t p-3">
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-2">
        <Settings className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">
          {t('surveyEditor.block.settings.title', 'Block Settings')}
        </span>
      </div>

      {/* Logic 편집기 */}
      <BlockLogicEditor
        entityId={entityId}
        logicItems={logicItems}
        logicFallback={logicFallback}
      />
    </div>
  );
}
