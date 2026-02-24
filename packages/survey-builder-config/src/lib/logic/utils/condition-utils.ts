import type { SingleCondition, ConditionGroup } from '../types/index';

/**
 * 조건 그룹에 단일 조건을 추가한다.
 * 기존 그룹을 변경하지 않고 새 그룹을 반환한다.
 *
 * @param group - 대상 조건 그룹
 * @param condition - 추가할 단일 조건
 * @returns 새 조건이 추가된 새 그룹
 */
export function addCondition(
  group: ConditionGroup,
  condition: SingleCondition
): ConditionGroup {
  return {
    ...group,
    conditions: [...group.conditions, condition],
  };
}

/**
 * 조건 그룹에서 조건을 삭제한다 (재귀 탐색).
 * 하위 그룹 내부의 조건도 ID로 찾아서 삭제한다.
 *
 * @param group - 대상 조건 그룹
 * @param conditionId - 삭제할 조건 ID
 * @returns 해당 조건이 제거된 새 그룹
 */
export function removeCondition(
  group: ConditionGroup,
  conditionId: string
): ConditionGroup {
  return {
    ...group,
    conditions: group.conditions
      .filter((item) => item.id !== conditionId)
      .map((item) => {
        // 하위 ConditionGroup이면 재귀적으로 탐색
        if ('connector' in item && 'conditions' in item) {
          return removeCondition(item as ConditionGroup, conditionId);
        }
        return item;
      }),
  };
}

/**
 * 조건을 복제한다.
 * 원본 조건 바로 뒤에 복제본을 삽입한다.
 *
 * @param group - 대상 조건 그룹
 * @param conditionId - 복제할 조건 ID
 * @param newId - 복제본에 부여할 새 ID
 * @returns 복제된 조건이 원본 뒤에 추가된 새 그룹
 */
export function duplicateCondition(
  group: ConditionGroup,
  conditionId: string,
  newId: string
): ConditionGroup {
  const index = group.conditions.findIndex((c) => c.id === conditionId);
  if (index === -1) return group;

  const source = group.conditions[index];
  const cloned = { ...source, id: newId };
  const newConditions = [...group.conditions];
  newConditions.splice(index + 1, 0, cloned);

  return { ...group, conditions: newConditions };
}

/**
 * 단일 조건을 업데이트한다 (재귀 탐색).
 * ID가 일치하는 SingleCondition을 찾아 부분 업데이트한다.
 *
 * @param group - 대상 조건 그룹
 * @param conditionId - 업데이트할 조건 ID
 * @param updates - 적용할 부분 업데이트 (id 제외)
 * @returns 해당 조건이 업데이트된 새 그룹
 */
export function updateCondition(
  group: ConditionGroup,
  conditionId: string,
  updates: Partial<Omit<SingleCondition, 'id'>>
): ConditionGroup {
  return {
    ...group,
    conditions: group.conditions.map((item) => {
      // 대상 SingleCondition 발견 시 업데이트 적용
      if (item.id === conditionId && 'operator' in item) {
        return { ...item, ...updates };
      }
      // 하위 ConditionGroup이면 재귀 탐색
      if ('connector' in item && 'conditions' in item) {
        return updateCondition(item as ConditionGroup, conditionId, updates);
      }
      return item;
    }),
  };
}
