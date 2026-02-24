import type { LogicItem, ConditionGroup } from '../types/index';

/**
 * 로직 아이템을 추가한다.
 * 기존 배열을 변경하지 않고 새 배열을 반환한다.
 *
 * @param items - 현재 로직 아이템 배열
 * @param newItem - 추가할 새 로직 아이템
 * @returns 새 아이템이 추가된 새 배열
 */
export function addLogicItem(
  items: LogicItem[],
  newItem: LogicItem
): LogicItem[] {
  return [...items, newItem];
}

/**
 * 로직 아이템을 복제한다.
 * 새 ID를 부여하고, 조건/액션 내부 ID도 새로 부여한다.
 *
 * @param items - 현재 로직 아이템 배열
 * @param itemId - 복제할 아이템 ID
 * @param newId - 새 아이템 ID
 * @param idGenerator - 내부 ID 생성 함수
 * @returns 복제된 아이템이 추가된 새 배열 (원본 아이템이 없으면 원래 배열 반환)
 */
export function duplicateLogicItem(
  items: LogicItem[],
  itemId: string,
  newId: string,
  idGenerator: () => string
): LogicItem[] {
  const source = items.find((item) => item.id === itemId);
  if (!source) return items;

  const cloned: LogicItem = {
    id: newId,
    conditions: cloneConditionGroup(source.conditions, idGenerator),
    actions: source.actions.map((action) => ({
      ...action,
      id: idGenerator(),
    })),
  };

  return [...items, cloned];
}

/**
 * 로직 아이템을 삭제한다.
 * 기존 배열을 변경하지 않고 새 배열을 반환한다.
 *
 * @param items - 현재 로직 아이템 배열
 * @param itemId - 삭제할 아이템 ID
 * @returns 해당 아이템이 제거된 새 배열
 */
export function removeLogicItem(
  items: LogicItem[],
  itemId: string
): LogicItem[] {
  return items.filter((item) => item.id !== itemId);
}

/**
 * 로직 아이템 순서를 변경한다.
 * 유효하지 않은 인덱스가 전달되면 원래 배열을 반환한다.
 *
 * @param items - 현재 배열
 * @param fromIndex - 이동할 아이템의 현재 인덱스
 * @param toIndex - 이동할 목표 인덱스
 * @returns 순서가 변경된 새 배열
 */
export function reorderLogicItems(
  items: LogicItem[],
  fromIndex: number,
  toIndex: number
): LogicItem[] {
  if (fromIndex < 0 || fromIndex >= items.length) return items;
  if (toIndex < 0 || toIndex >= items.length) return items;

  const result = [...items];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}

/**
 * 조건 그룹을 깊은 복사하며 모든 ID를 새로 부여한다.
 * SingleCondition과 ConditionGroup을 재귀적으로 처리한다.
 *
 * @param group - 복사할 조건 그룹
 * @param idGenerator - ID 생성 함수
 * @returns 새 ID가 부여된 조건 그룹 복사본
 */
function cloneConditionGroup(
  group: ConditionGroup,
  idGenerator: () => string
): ConditionGroup {
  return {
    id: idGenerator(),
    connector: group.connector,
    conditions: group.conditions.map((item) => {
      // SingleCondition 판별: operator와 leftOperand 프로퍼티 존재 여부
      if ('operator' in item && 'leftOperand' in item) {
        return { ...item, id: idGenerator() };
      }
      // ConditionGroup (재귀)
      return cloneConditionGroup(item as ConditionGroup, idGenerator);
    }),
  };
}
