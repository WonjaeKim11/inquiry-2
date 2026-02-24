import type { SingleCondition, ConditionGroup } from '../types/index';

/**
 * 새 빈 조건 그룹을 생성한다.
 *
 * @param id - 그룹 ID
 * @param connector - 논리 연결자 ('and' 또는 'or', 기본값 'and')
 * @returns 빈 조건 배열을 가진 새 조건 그룹
 */
export function createConditionGroup(
  id: string,
  connector: 'and' | 'or' = 'and'
): ConditionGroup {
  return { id, connector, conditions: [] };
}

/**
 * 조건 그룹의 connector를 토글한다 (and <-> or).
 * 기존 그룹을 변경하지 않고 새 그룹을 반환한다.
 *
 * @param group - 대상 조건 그룹
 * @returns connector가 토글된 새 그룹
 */
export function toggleConnector(group: ConditionGroup): ConditionGroup {
  return {
    ...group,
    connector: group.connector === 'and' ? 'or' : 'and',
  };
}

/**
 * 선택한 조건들을 하위 그룹으로 묶는다.
 * 선택된 조건들을 새 하위 그룹으로 이동하고, 첫 번째 선택된 조건의 위치에 삽입한다.
 *
 * @param group - 대상 그룹
 * @param conditionIds - 하위 그룹으로 묶을 조건 ID 배열
 * @param newGroupId - 새 하위 그룹 ID
 * @param connector - 새 하위 그룹의 connector (기본값 'and')
 * @returns 선택 조건이 하위 그룹으로 묶인 새 그룹
 */
export function nestAsGroup(
  group: ConditionGroup,
  conditionIds: string[],
  newGroupId: string,
  connector: 'and' | 'or' = 'and'
): ConditionGroup {
  if (conditionIds.length === 0) return group;

  const toNest: Array<SingleCondition | ConditionGroup> = [];
  const remaining: Array<SingleCondition | ConditionGroup> = [];

  // 선택된 조건과 나머지를 분리
  for (const item of group.conditions) {
    if (conditionIds.includes(item.id)) {
      toNest.push(item);
    } else {
      remaining.push(item);
    }
  }

  if (toNest.length === 0) return group;

  // 새 하위 그룹 생성
  const nestedGroup: ConditionGroup = {
    id: newGroupId,
    connector,
    conditions: toNest,
  };

  // 첫 번째 선택된 조건의 위치에 하위 그룹 삽입
  const firstIndex = group.conditions.findIndex((c) =>
    conditionIds.includes(c.id)
  );
  const result = [
    ...group.conditions.filter((c) => !conditionIds.includes(c.id)),
  ];
  result.splice(Math.min(firstIndex, result.length), 0, nestedGroup);

  return { ...group, conditions: result };
}
