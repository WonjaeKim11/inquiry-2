import type { FilterItem, FilterConnector, FilterResource } from './types.js';

/**
 * 새로운 빈 필터 항목을 생성한다.
 * @param id - 고유 식별자
 * @param connector - 연결자 (기본: 'and')
 */
export function createEmptyFilter(
  id: string,
  connector: FilterConnector = 'and'
): FilterItem {
  return {
    id,
    connector,
    resource: 'attribute',
  };
}

/**
 * 필터 트리에서 특정 ID의 필터를 찾는다 (재귀 DFS).
 * @param filters - 필터 배열
 * @param targetId - 찾을 필터 ID
 * @returns 찾은 필터 또는 undefined
 */
export function findFilterById(
  filters: FilterItem[],
  targetId: string
): FilterItem | undefined {
  for (const filter of filters) {
    if (filter.id === targetId) return filter;
    if (filter.children) {
      const found = findFilterById(filter.children, targetId);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * 지정 필터 아래에 새 필터를 추가한다.
 * 같은 레벨(부모 배열)에 targetId 바로 다음 위치에 삽입한다.
 * @param filters - 필터 배열 (원본 불변)
 * @param targetId - 기준 필터 ID
 * @param newFilter - 추가할 새 필터
 * @returns 새 필터 배열
 */
export function addFilterBelow(
  filters: FilterItem[],
  targetId: string,
  newFilter: FilterItem
): FilterItem[] {
  const result: FilterItem[] = [];

  for (const filter of filters) {
    if (filter.id === targetId) {
      // 대상 필터 복사 후 바로 다음에 새 필터 삽입
      result.push({ ...filter });
      result.push(newFilter);
    } else if (filter.children) {
      // 자식 내에서 재귀적으로 탐색
      const newChildren = addFilterBelow(filter.children, targetId, newFilter);
      result.push({ ...filter, children: newChildren });
    } else {
      result.push({ ...filter });
    }
  }

  return result;
}

/**
 * 지정 필터를 포함하는 그룹을 생성한다.
 * targetId 필터를 그룹의 첫 번째 자식으로 만들고, newChild를 두 번째 자식으로 추가한다.
 * @param filters - 필터 배열
 * @param targetId - 그룹화할 필터 ID
 * @param groupId - 새 그룹의 ID
 * @param newChild - 그룹에 추가할 새 자식 필터
 * @returns 새 필터 배열
 */
export function createGroupFromFilter(
  filters: FilterItem[],
  targetId: string,
  groupId: string,
  newChild: FilterItem
): FilterItem[] {
  return filters.map((filter) => {
    if (filter.id === targetId) {
      return {
        id: groupId,
        connector: filter.connector,
        resource: filter.resource,
        children: [{ ...filter, connector: 'and' as const }, newChild],
      };
    }
    if (filter.children) {
      return {
        ...filter,
        children: createGroupFromFilter(
          filter.children,
          targetId,
          groupId,
          newChild
        ),
      };
    }
    return filter;
  });
}

/**
 * 필터를 다른 위치로 이동한다 (삭제 후 삽입).
 * @param filters - 필터 배열
 * @param filterId - 이동할 필터 ID
 * @param targetId - 이동 목표 위치 (이 필터 뒤에 삽입)
 * @returns 새 필터 배열
 */
export function moveFilter(
  filters: FilterItem[],
  filterId: string,
  targetId: string
): FilterItem[] {
  const toMove = findFilterById(filters, filterId);
  if (!toMove) return filters;

  const withoutFilter = deleteFilter(filters, filterId);
  return addFilterBelow(withoutFilter, targetId, toMove);
}

/**
 * 필터를 삭제한다 (재귀).
 * 그룹에서 마지막 자식이 삭제되면 그룹도 함께 삭제한다.
 * @param filters - 필터 배열
 * @param targetId - 삭제할 필터 ID
 * @returns 새 필터 배열
 */
export function deleteFilter(
  filters: FilterItem[],
  targetId: string
): FilterItem[] {
  const result: FilterItem[] = [];

  for (const filter of filters) {
    if (filter.id === targetId) continue;

    if (filter.children) {
      const newChildren = deleteFilter(filter.children, targetId);
      if (newChildren.length === 0) {
        // 빈 그룹 제거
        continue;
      }
      if (newChildren.length === 1) {
        // 자식이 1개면 그룹 해제 (언래핑)
        result.push({ ...newChildren[0], connector: filter.connector });
      } else {
        result.push({ ...filter, children: newChildren });
      }
    } else {
      result.push(filter);
    }
  }

  return result;
}

/**
 * 필터의 연결자(AND/OR)를 토글한다.
 * @param filters - 필터 배열
 * @param targetId - 대상 필터 ID
 * @returns 새 필터 배열
 */
export function toggleConnector(
  filters: FilterItem[],
  targetId: string
): FilterItem[] {
  return filters.map((filter) => {
    if (filter.id === targetId) {
      return {
        ...filter,
        connector: filter.connector === 'and' ? 'or' : 'and',
      };
    }
    if (filter.children) {
      return {
        ...filter,
        children: toggleConnector(filter.children, targetId),
      };
    }
    return filter;
  });
}

/**
 * 필터 항목을 업데이트한다 (병합).
 * @param filters - 필터 배열
 * @param targetId - 대상 필터 ID
 * @param updates - 업데이트할 필드들
 * @returns 새 필터 배열
 */
export function updateFilter(
  filters: FilterItem[],
  targetId: string,
  updates: Partial<FilterItem>
): FilterItem[] {
  return filters.map((filter) => {
    if (filter.id === targetId) {
      return { ...filter, ...updates };
    }
    if (filter.children) {
      return {
        ...filter,
        children: updateFilter(filter.children, targetId, updates),
      };
    }
    return filter;
  });
}

/**
 * 필터 트리의 깊이를 계산한다.
 * @param filters - 필터 배열
 * @param currentDepth - 현재 깊이 (기본: 1)
 * @returns 최대 깊이
 */
export function getFilterDepth(
  filters: FilterItem[],
  currentDepth: number = 1
): number {
  let maxDepth = currentDepth;
  for (const filter of filters) {
    if (filter.children) {
      const childDepth = getFilterDepth(filter.children, currentDepth + 1);
      if (childDepth > maxDepth) maxDepth = childDepth;
    }
  }
  return maxDepth;
}

/**
 * 필터 트리의 총 리프 노드 수를 계산한다.
 * @param filters - 필터 배열
 * @returns 리프 노드 수
 */
export function countFilters(filters: FilterItem[]): number {
  let count = 0;
  for (const filter of filters) {
    if (filter.children) {
      count += countFilters(filter.children);
    } else {
      count += 1;
    }
  }
  return count;
}

/**
 * 필터 트리를 평탄화하여 모든 리프 노드를 배열로 반환한다.
 * @param filters - 필터 배열
 * @returns 모든 리프 필터 배열
 */
export function flattenFilters(filters: FilterItem[]): FilterItem[] {
  const result: FilterItem[] = [];
  for (const filter of filters) {
    if (filter.children) {
      result.push(...flattenFilters(filter.children));
    } else {
      result.push(filter);
    }
  }
  return result;
}

/**
 * 리소스 유형 변경 시 관련 필드를 초기화한다.
 * @param filter - 대상 필터
 * @param newResource - 새 리소스 유형
 * @returns 초기화된 필터
 */
export function resetFilterForResource(
  filter: FilterItem,
  newResource: FilterResource
): FilterItem {
  return {
    id: filter.id,
    connector: filter.connector,
    resource: newResource,
    // 리소스별 기본 필드만 유지
    ...(newResource === 'attribute' && { filterType: 'string' as const }),
    ...(newResource === 'device' && {
      operator: 'isDevice' as const,
      deviceType: 'desktop' as const,
    }),
    ...(newResource === 'segment' && { operator: 'userIsIn' as const }),
  };
}

/**
 * 필터가 완전히 설정되었는지 (유효한 상태인지) 검사한다.
 * @param filter - 검사할 필터
 * @returns 완전 여부
 */
export function isFilterComplete(filter: FilterItem): boolean {
  if (filter.children) {
    return (
      filter.children.length > 0 && filter.children.every(isFilterComplete)
    );
  }

  if (!filter.operator) return false;

  switch (filter.resource) {
    case 'attribute':
      if (!filter.attributeKey || !filter.filterType) return false;
      break;
    case 'segment':
      if (!filter.segmentId) return false;
      break;
    case 'device':
      if (!filter.deviceType) return false;
      break;
    case 'person':
      break;
  }

  return true;
}
