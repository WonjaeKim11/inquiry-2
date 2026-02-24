/**
 * Block 로직 평가 엔진.
 *
 * Block에 설정된 로직 아이템들을 순차적으로 평가하여
 * 첫 번째 매칭 로직의 액션을 수행한다.
 * 모든 로직이 불일치하면 logicFallback을 적용한다.
 */

import type {
  LogicItem,
  ActionResult,
  LogicEvaluationContext,
} from '../types/index';
import { evaluateConditionGroup } from './group-evaluator';
import { performActions } from './action-performer';

/** Block 로직 평가 결과 */
export interface BlockLogicResult {
  /** 매칭된 로직 아이템 ID (없으면 undefined) */
  matchedItemId?: string;
  /** 액션 수행 결과 */
  actionResult: ActionResult;
  /** fallback이 적용되었는지 */
  isFallback: boolean;
}

/**
 * Block의 로직 아이템들을 순차 평가한다.
 * 첫 번째 매칭 로직의 액션을 수행하고 결과를 반환한다.
 * 모든 로직이 불일치하면 logicFallback을 적용한다.
 *
 * @param logicItems - Block에 설정된 로직 아이템 배열
 * @param logicFallback - 모든 조건 불일치 시 이동할 블록 ID (nullable)
 * @param context - 로직 평가 컨텍스트
 * @returns Block 로직 평가 결과
 */
export function evaluateBlockLogic(
  logicItems: LogicItem[],
  logicFallback: string | null | undefined,
  context: LogicEvaluationContext
): BlockLogicResult {
  // 로직 아이템이 없으면 빈 결과 반환
  if (!logicItems || logicItems.length === 0) {
    return createEmptyResult(logicFallback);
  }

  // 로직 아이템을 순차적으로 평가
  for (const item of logicItems) {
    try {
      const matched = evaluateConditionGroup(item.conditions, context);
      if (matched) {
        return {
          matchedItemId: item.id,
          actionResult: performActions(item.actions, context),
          isFallback: false,
        };
      }
    } catch {
      // 개별 아이템 평가 실패 시 다음으로 진행
      continue;
    }
  }

  // 모든 조건 불일치 -> fallback 적용
  return createEmptyResult(logicFallback);
}

/**
 * 빈 결과를 생성한다. logicFallback이 있으면 jumpTarget으로 설정.
 *
 * @param logicFallback - fallback 블록 ID (nullable)
 * @returns 빈 BlockLogicResult
 */
function createEmptyResult(
  logicFallback: string | null | undefined
): BlockLogicResult {
  return {
    matchedItemId: undefined,
    actionResult: {
      jumpTarget: logicFallback ?? undefined,
      requiredElementIds: [],
      calculations: [],
    },
    isFallback: !!logicFallback,
  };
}
