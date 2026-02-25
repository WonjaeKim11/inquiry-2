'use client';

import type { FilterItem } from '@inquiry/shared-segment';
import { FilterItemRow } from './filter-item-row';
import { ConnectorToggle } from './connector-toggle';

interface FilterGroupProps {
  filters: FilterItem[];
  depth: number;
  envId: string;
  onAddFilter: (afterId?: string) => void;
  onDeleteFilter: (filterId: string) => void;
  onToggleConnector: (filterId: string) => void;
  onUpdateFilter: (filterId: string, updates: Partial<FilterItem>) => void;
  onCreateGroup: (filterId: string) => void;
}

/**
 * 필터 그룹 렌더링 컴포넌트 (재귀).
 * children이 있는 필터는 들여쓰기하여 재귀 렌더링한다.
 */
export function FilterGroup({
  filters,
  depth,
  envId,
  onAddFilter,
  onDeleteFilter,
  onToggleConnector,
  onUpdateFilter,
  onCreateGroup,
}: FilterGroupProps) {
  return (
    <div
      className={
        depth > 0 ? 'ml-6 pl-4 border-l-2 border-muted space-y-1' : 'space-y-1'
      }
    >
      {filters.map((filter, index) => (
        <div key={filter.id}>
          {/* 두 번째 필터부터 AND/OR connector 표시 */}
          {index > 0 && (
            <ConnectorToggle
              connector={filter.connector}
              onToggle={() => onToggleConnector(filter.id)}
            />
          )}

          {/* 자식이 있으면 그룹으로 재귀 렌더링, 없으면 리프 행 렌더링 */}
          {filter.children && filter.children.length > 0 ? (
            <FilterGroup
              filters={filter.children}
              depth={depth + 1}
              envId={envId}
              onAddFilter={onAddFilter}
              onDeleteFilter={onDeleteFilter}
              onToggleConnector={onToggleConnector}
              onUpdateFilter={onUpdateFilter}
              onCreateGroup={onCreateGroup}
            />
          ) : (
            <FilterItemRow
              filter={filter}
              envId={envId}
              onUpdate={(updates) => onUpdateFilter(filter.id, updates)}
              onDelete={() => onDeleteFilter(filter.id)}
              onAddBelow={() => onAddFilter(filter.id)}
              onCreateGroup={() => onCreateGroup(filter.id)}
            />
          )}
        </div>
      ))}
    </div>
  );
}
