'use client';

import { useTranslation } from 'react-i18next';
import { Button } from '@inquiry/client-ui';
import type { FilterItem, FilterResource } from '@inquiry/shared-segment';
import { resetFilterForResource } from '@inquiry/shared-segment';
import { FilterTypeSelector } from './filter-type-selector';
import { OperatorSelector } from './operator-selector';
import { ValueInput } from './value-input';

interface FilterItemRowProps {
  filter: FilterItem;
  envId: string;
  onUpdate: (updates: Partial<FilterItem>) => void;
  onDelete: () => void;
  onAddBelow: () => void;
  onCreateGroup: () => void;
}

/**
 * 단일 필터 리프 노드 행.
 * 타입 선택, 연산자 선택, 값 입력, 액션 버튼을 수평으로 배치한다.
 */
export function FilterItemRow({
  filter,
  envId,
  onUpdate,
  onDelete,
  onAddBelow,
  onCreateGroup,
}: FilterItemRowProps) {
  const { t } = useTranslation('translation');

  /** 리소스 유형 변경 시 관련 필드를 초기화 */
  const handleResourceChange = (resource: FilterResource) => {
    const reset = resetFilterForResource(filter, resource);
    onUpdate({
      resource: reset.resource,
      operator: reset.operator,
      filterType: reset.filterType,
      deviceType: reset.deviceType,
      attributeKey: undefined,
      segmentId: undefined,
      value: undefined,
      timeUnit: undefined,
    });
  };

  return (
    <div className="flex items-center gap-2 py-1 px-2 rounded bg-muted/30">
      {/* 리소스/속성/세그먼트/디바이스 유형 선택 */}
      <FilterTypeSelector
        resource={filter.resource}
        attributeKey={filter.attributeKey}
        filterType={filter.filterType}
        segmentId={filter.segmentId}
        deviceType={filter.deviceType}
        envId={envId}
        onResourceChange={handleResourceChange}
        onAttributeChange={(key, type) =>
          onUpdate({ attributeKey: key, filterType: type })
        }
        onSegmentChange={(id) => onUpdate({ segmentId: id })}
        onDeviceChange={(type) => onUpdate({ deviceType: type })}
      />

      {/* 연산자 선택: device/segment 외 리소스 */}
      {filter.resource !== 'device' && filter.resource !== 'segment' && (
        <OperatorSelector
          resource={filter.resource}
          filterType={filter.filterType}
          operator={filter.operator}
          onChange={(op) => onUpdate({ operator: op })}
        />
      )}

      {/* 연산자 선택: segment 리소스 (userIsIn / userIsNotIn) */}
      {filter.resource === 'segment' && (
        <OperatorSelector
          resource="segment"
          operator={filter.operator}
          onChange={(op) => onUpdate({ operator: op })}
        />
      )}

      {/* 값 입력 (타입에 따라 다형성) */}
      <ValueInput filter={filter} onChange={(updates) => onUpdate(updates)} />

      {/* 액션 버튼: 추가/그룹화/삭제 */}
      <div className="flex items-center gap-1 ml-auto shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddBelow}
          title={t('segment.filter.add_below')}
          className="h-7 w-7 p-0"
        >
          +
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCreateGroup}
          title={t('segment.filter.create_group')}
          className="h-7 w-7 p-0"
        >
          {'{ }'}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          title={t('segment.filter.remove')}
          className="h-7 w-7 p-0 text-destructive"
        >
          x
        </Button>
      </div>
    </div>
  );
}
