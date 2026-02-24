import type { Action, LogicItem } from '../types/index';

/**
 * 로직 아이템에 액션을 추가한다.
 * 기존 로직 아이템을 변경하지 않고 새 객체를 반환한다.
 *
 * @param logicItem - 대상 로직 아이템
 * @param action - 추가할 액션
 * @returns 새 액션이 추가된 새 로직 아이템
 */
export function addAction(logicItem: LogicItem, action: Action): LogicItem {
  return {
    ...logicItem,
    actions: [...logicItem.actions, action],
  };
}

/**
 * 로직 아이템에서 액션을 삭제한다.
 * 기존 로직 아이템을 변경하지 않고 새 객체를 반환한다.
 *
 * @param logicItem - 대상 로직 아이템
 * @param actionId - 삭제할 액션 ID
 * @returns 해당 액션이 제거된 새 로직 아이템
 */
export function removeAction(
  logicItem: LogicItem,
  actionId: string
): LogicItem {
  return {
    ...logicItem,
    actions: logicItem.actions.filter((a) => a.id !== actionId),
  };
}

/**
 * 액션을 업데이트한다.
 * objective를 제외한 필드를 부분 업데이트한다.
 *
 * @param logicItem - 대상 로직 아이템
 * @param actionId - 업데이트할 액션 ID
 * @param updates - 적용할 부분 업데이트 (id, objective 제외)
 * @returns 해당 액션이 업데이트된 새 로직 아이템
 */
export function updateAction(
  logicItem: LogicItem,
  actionId: string,
  updates: Partial<Omit<Action, 'id' | 'objective'>>
): LogicItem {
  return {
    ...logicItem,
    actions: logicItem.actions.map((a) =>
      a.id === actionId ? { ...a, ...updates } : a
    ),
  };
}

/**
 * 액션의 objective를 변경한다.
 * objective 변경 시 관련 필드를 초기화하여 타입 안전성을 보장한다.
 *
 * @param logicItem - 대상 로직 아이템
 * @param actionId - 변경할 액션 ID
 * @param newObjective - 새 objective
 * @param defaults - 새 objective에 맞는 기본 필드 값
 * @returns objective가 변경된 새 로직 아이템
 */
export function changeObjective(
  logicItem: LogicItem,
  actionId: string,
  newObjective: Action['objective'],
  defaults: Omit<Action, 'id' | 'objective'>
): LogicItem {
  return {
    ...logicItem,
    actions: logicItem.actions.map((a) => {
      if (a.id !== actionId) return a;
      return { id: a.id, objective: newObjective, ...defaults } as Action;
    }),
  };
}
