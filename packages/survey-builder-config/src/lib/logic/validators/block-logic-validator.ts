import type { LogicItem, Action } from '../types/index';
import {
  MAX_LOGIC_ITEMS_PER_BLOCK,
  MAX_ACTIONS_PER_ITEM,
} from '../constants/index';
import { validateConditionGroup } from './condition-validator';

/** Block 로직 검증 오류 */
export interface BlockLogicValidationError {
  blockId: string;
  logicItemId?: string;
  message: string;
}

/**
 * Block의 로직을 검증한다.
 * - 로직 아이템 수 제한 (MAX_LOGIC_ITEMS_PER_BLOCK)
 * - 각 아이템의 조건 구조 검증
 * - 액션 유효성 검증 (개수 제한, Element ID 존재 여부 등)
 * - divideByZero 검사 (static 값이 0인 divide 연산)
 *
 * @param blockId - Block ID
 * @param logicItems - 검증할 로직 아이템 배열
 * @param existingElementIds - 현재 설문에 존재하는 Element ID 목록
 * @param existingBlockIds - 현재 설문에 존재하는 Block ID 목록
 * @param existingHiddenFieldIds - 현재 설문에 존재하는 Hidden Field ID 목록
 * @param existingVariableIds - 현재 설문에 존재하는 Variable ID 목록
 * @returns Block 로직 검증 오류 배열
 */
export function validateBlockLogic(
  blockId: string,
  logicItems: LogicItem[],
  existingElementIds: string[],
  existingBlockIds: string[],
  existingHiddenFieldIds: string[] = [],
  existingVariableIds: string[] = []
): BlockLogicValidationError[] {
  const errors: BlockLogicValidationError[] = [];

  // 로직 아이템 수 제한 검사
  if (logicItems.length > MAX_LOGIC_ITEMS_PER_BLOCK) {
    errors.push({
      blockId,
      message: `로직 아이템 수가 최대치(${MAX_LOGIC_ITEMS_PER_BLOCK})를 초과합니다.`,
    });
  }

  for (const item of logicItems) {
    // 조건 구조 검증
    const condErrors = validateConditionGroup(item.conditions);
    for (const ce of condErrors) {
      errors.push({
        blockId,
        logicItemId: item.id,
        message: ce.message,
      });
    }

    // 액션 수 제한 검사
    if (item.actions.length > MAX_ACTIONS_PER_ITEM) {
      errors.push({
        blockId,
        logicItemId: item.id,
        message: `액션 수가 최대치(${MAX_ACTIONS_PER_ITEM})를 초과합니다.`,
      });
    }

    // 각 액션 검증
    for (const action of item.actions) {
      errors.push(
        ...validateAction(
          blockId,
          item.id,
          action,
          existingElementIds,
          existingBlockIds,
          existingHiddenFieldIds,
          existingVariableIds
        )
      );
    }
  }

  return errors;
}

/**
 * 단일 액션을 검증한다.
 * objective에 따라 대상 리소스 존재 여부 및 연산 유효성을 확인한다.
 *
 * @param blockId - 소속 Block ID
 * @param logicItemId - 소속 LogicItem ID
 * @param action - 검증할 액션
 * @param existingElementIds - 존재하는 Element ID 목록
 * @param existingBlockIds - 존재하는 Block ID 목록
 * @param existingHiddenFieldIds - 존재하는 Hidden Field ID 목록
 * @param existingVariableIds - 존재하는 Variable ID 목록
 * @returns 검증 오류 배열
 */
function validateAction(
  blockId: string,
  logicItemId: string,
  action: Action,
  existingElementIds: string[],
  existingBlockIds: string[],
  existingHiddenFieldIds: string[],
  existingVariableIds: string[]
): BlockLogicValidationError[] {
  const errors: BlockLogicValidationError[] = [];

  switch (action.objective) {
    case 'jumpToBlock':
      // 점프 대상 블록 존재 여부 확인
      if (!existingBlockIds.includes(action.targetBlockId)) {
        errors.push({
          blockId,
          logicItemId,
          message: `점프 대상 블록 "${action.targetBlockId}"이 존재하지 않습니다.`,
        });
      }
      break;

    case 'requireAnswer':
      // 필수 응답 대상 요소 존재 여부 확인
      if (!existingElementIds.includes(action.targetElementId)) {
        errors.push({
          blockId,
          logicItemId,
          message: `필수 응답 대상 요소 "${action.targetElementId}"이 존재하지 않습니다.`,
        });
      }
      break;

    case 'calculate': {
      // target 필드 존재 여부 확인
      const targetExists = validateFieldExists(
        action.target,
        existingElementIds,
        existingHiddenFieldIds,
        existingVariableIds
      );
      if (!targetExists) {
        errors.push({
          blockId,
          logicItemId,
          message: `계산 대상 필드 "${action.target.id}" (${action.target.type})가 존재하지 않습니다.`,
        });
      }

      // divideByZero 검사 (static 값이 0인 divide 연산)
      if (action.operator === 'divide') {
        if (typeof action.value === 'number' && action.value === 0) {
          errors.push({
            blockId,
            logicItemId,
            message: '0으로 나누는 계산이 설정되어 있습니다.',
          });
        }
        if (typeof action.value === 'string' && action.value === '0') {
          errors.push({
            blockId,
            logicItemId,
            message: '0으로 나누는 계산이 설정되어 있습니다.',
          });
        }
      }
      break;
    }
  }

  return errors;
}

/**
 * DynamicField가 존재하는지 확인한다.
 * 필드의 type에 따라 적절한 ID 목록에서 검색한다.
 *
 * @param field - 확인할 필드 (type과 id를 포함)
 * @param elementIds - Element ID 목록
 * @param hiddenFieldIds - Hidden Field ID 목록
 * @param variableIds - Variable ID 목록
 * @returns 필드가 존재하면 true
 */
function validateFieldExists(
  field: { type: string; id: string },
  elementIds: string[],
  hiddenFieldIds: string[],
  variableIds: string[]
): boolean {
  switch (field.type) {
    case 'element':
    case 'question':
      return elementIds.includes(field.id);
    case 'hiddenField':
      return hiddenFieldIds.includes(field.id);
    case 'variable':
      return variableIds.includes(field.id);
    default:
      return false;
  }
}
