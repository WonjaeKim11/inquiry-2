'use client';

import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useActiveElement } from '../../hooks/use-active-element';
import { ElementCardMenu } from './ElementCardMenu';

interface ElementComponentProps {
  /** Entity ID */
  entityId: string;
  /** Entity 타입 (openText, multipleChoiceSingle 등) */
  entityType: string;
  /** Element 타입 표시 라벨 */
  typeLabel: string;
  /** 기본 설정 영역 */
  children: ReactNode;
  /** 고급 설정 영역 (접기/펼치기). 전달 시 토글 UI가 표시된다. */
  advancedSettings?: ReactNode;
}

/**
 * Element 공통 래퍼 컴포넌트.
 * 카드 UI로 렌더링하며, 클릭 시 activeElementId를 설정한다.
 * 활성 상태인 경우 테두리 색상이 변경되어 시각적으로 구분된다.
 * 고급 설정 영역은 접기/펼치기 토글로 표시한다.
 */
export function ElementComponent({
  entityId,
  entityType,
  typeLabel,
  children,
  advancedSettings,
}: ElementComponentProps) {
  const { t } = useTranslation();
  const { activeElementId, toggleElement } = useActiveElement();
  const isActive = activeElementId === entityId;
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div
      className={`rounded-md border transition-colors ${
        isActive ? 'border-primary ring-1 ring-primary/20' : 'border-border'
      }`}
      onClick={(e) => {
        // DropdownMenu 등 내부 인터랙션 요소 클릭 시 전파 방지
        if ((e.target as HTMLElement).closest('[role="menu"]')) return;
        toggleElement(entityId);
      }}
    >
      {/* Element 헤더: 타입 라벨 + 메뉴 */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">
          {typeLabel}
        </span>
        <ElementCardMenu entityId={entityId} />
      </div>

      {/* 기본 설정 영역 */}
      <div className="px-3 pb-3">{children}</div>

      {/* 고급 설정 토글 (advancedSettings가 전달된 경우만 표시) */}
      {advancedSettings && (
        <div className="border-t">
          <button
            className="flex w-full items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              setShowAdvanced(!showAdvanced);
            }}
            aria-expanded={showAdvanced}
          >
            {showAdvanced ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {t('surveyEditor.element.advancedSettings', 'Advanced Settings')}
          </button>
          {showAdvanced && <div className="px-3 pb-3">{advancedSettings}</div>}
        </div>
      )}
    </div>
  );
}
