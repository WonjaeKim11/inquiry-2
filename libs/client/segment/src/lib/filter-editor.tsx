'use client';

import { useState, useCallback, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@inquiry/client-ui';
import type { FilterItem } from '@inquiry/shared-segment';
import {
  createEmptyFilter,
  addFilterBelow,
  deleteFilter,
  toggleConnector,
  updateFilter,
  createGroupFromFilter,
} from '@inquiry/shared-segment';
import { FilterGroup } from './filter-group.js';

interface FilterEditorProps {
  /** 현재 필터 배열 */
  filters: FilterItem[];
  /** 필터 변경 콜백 */
  onChange: (filters: FilterItem[]) => void;
  /** 환경 ID (속성 키/세그먼트 조회용) */
  envId: string;
}

/**
 * 재귀적 필터 트리 편집기.
 * 필터 추가/삭제/수정/그룹화/connector 토글을 지원한다.
 * 모든 상태 변경은 shared-segment의 순수 함수를 통해 수행한다.
 */
export function FilterEditor({ filters, onChange, envId }: FilterEditorProps) {
  const { t } = useTranslation('translation');
  const baseId = useId();
  const [counter, setCounter] = useState(0);

  /** 고유 ID 생성 (React useId + 증가 카운터 조합) */
  const generateId = useCallback(() => {
    setCounter((c) => c + 1);
    return `${baseId}-filter-${counter + 1}`;
  }, [baseId, counter]);

  /** 필터 추가 (최상위 또는 특정 필터 아래) */
  const handleAddFilter = useCallback(
    (afterId?: string) => {
      const newFilter = createEmptyFilter(generateId());
      if (!afterId || filters.length === 0) {
        onChange([...filters, newFilter]);
      } else {
        onChange(addFilterBelow(filters, afterId, newFilter));
      }
    },
    [filters, onChange, generateId]
  );

  /** 필터 삭제 */
  const handleDeleteFilter = useCallback(
    (filterId: string) => {
      onChange(deleteFilter(filters, filterId));
    },
    [filters, onChange]
  );

  /** connector 토글 (AND ↔ OR) */
  const handleToggleConnector = useCallback(
    (filterId: string) => {
      onChange(toggleConnector(filters, filterId));
    },
    [filters, onChange]
  );

  /** 필터 업데이트 (특정 필드만 병합) */
  const handleUpdateFilter = useCallback(
    (filterId: string, updates: Partial<FilterItem>) => {
      onChange(updateFilter(filters, filterId, updates));
    },
    [filters, onChange]
  );

  /** 그룹 생성 - 기존 필터를 그룹의 첫 자식으로 래핑 */
  const handleCreateGroup = useCallback(
    (filterId: string) => {
      const groupId = generateId();
      const newChild = createEmptyFilter(generateId());
      onChange(createGroupFromFilter(filters, filterId, groupId, newChild));
    },
    [filters, onChange, generateId]
  );

  return (
    <div className="space-y-2">
      {filters.length === 0 ? (
        /* 필터가 없을 때 빈 상태 안내 */
        <div className="py-8 text-center">
          <p className="text-muted-foreground mb-4">
            {t('segment.filter.empty')}
          </p>
          <Button variant="outline" size="sm" onClick={() => handleAddFilter()}>
            {t('segment.filter.add')}
          </Button>
        </div>
      ) : (
        <>
          {/* 필터 트리 재귀 렌더링 */}
          <FilterGroup
            filters={filters}
            depth={0}
            envId={envId}
            onAddFilter={handleAddFilter}
            onDeleteFilter={handleDeleteFilter}
            onToggleConnector={handleToggleConnector}
            onUpdateFilter={handleUpdateFilter}
            onCreateGroup={handleCreateGroup}
          />
          {/* 마지막 필터 아래에 새 필터 추가 버튼 */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddFilter(filters[filters.length - 1]?.id)}
            className="mt-2"
          >
            {t('segment.filter.add')}
          </Button>
        </>
      )}
    </div>
  );
}
