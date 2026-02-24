import type { LogicItem } from '../types/index';
import { validateBlockLogic } from './block-logic-validator';
import { detectCyclicLogic } from './cycle-detector';
import type { BlockLogicValidationError } from './block-logic-validator';
import type { CycleDetectionResult } from './cycle-detector';

/** 설문 로직 검증 결과 */
export interface SurveyLogicValidationResult {
  valid: boolean;
  blockErrors: BlockLogicValidationError[];
  cycleResult: CycleDetectionResult;
}

/**
 * 설문 전체의 로직을 검증한다.
 * 1) 각 Block의 로직 구조 검증
 * 2) logicFallback 대상 블록 존재 여부 검증
 * 3) 순환 로직 검출
 *
 * @param blockLogicMap - Block ID -> LogicItem[] 매핑
 * @param blockFallbackMap - Block ID -> logicFallback 매핑
 * @param existingElementIds - 설문에 존재하는 Element ID 목록
 * @param existingBlockIds - 설문에 존재하는 Block ID 목록
 * @param existingHiddenFieldIds - Hidden Field ID 목록
 * @param existingVariableIds - Variable ID 목록
 * @returns 설문 로직 검증 결과
 */
export function validateSurveyLogic(
  blockLogicMap: Record<string, LogicItem[]>,
  blockFallbackMap: Record<string, string | null | undefined>,
  existingElementIds: string[],
  existingBlockIds: string[],
  existingHiddenFieldIds: string[] = [],
  existingVariableIds: string[] = []
): SurveyLogicValidationResult {
  const blockErrors: BlockLogicValidationError[] = [];

  // 1) 각 Block의 로직 검증
  for (const blockId of Object.keys(blockLogicMap)) {
    const items = blockLogicMap[blockId] ?? [];
    const errors = validateBlockLogic(
      blockId,
      items,
      existingElementIds,
      existingBlockIds,
      existingHiddenFieldIds,
      existingVariableIds
    );
    blockErrors.push(...errors);
  }

  // 2) logicFallback 대상 블록 존재 여부 검증
  for (const [blockId, fallback] of Object.entries(blockFallbackMap)) {
    if (fallback && !existingBlockIds.includes(fallback)) {
      blockErrors.push({
        blockId,
        message: `logicFallback 대상 블록 "${fallback}"이 존재하지 않습니다.`,
      });
    }
  }

  // 3) 순환 로직 검출
  const cycleResult = detectCyclicLogic(blockLogicMap, blockFallbackMap);

  return {
    valid: blockErrors.length === 0 && !cycleResult.hasCycle,
    blockErrors,
    cycleResult,
  };
}

export {
  validateSingleCondition,
  validateConditionGroup,
} from './condition-validator';
export type { ConditionValidationError } from './condition-validator';
export { validateBlockLogic } from './block-logic-validator';
export type { BlockLogicValidationError } from './block-logic-validator';
export { detectCyclicLogic } from './cycle-detector';
export type { CycleDetectionResult } from './cycle-detector';
