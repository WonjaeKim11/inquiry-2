import { z } from 'zod';
import type { ConditionGroup } from './condition.types';
import type { Action } from './action.types';
import { conditionGroupSchema } from './condition.types';
import { actionSchema } from './action.types';

/** 단일 로직 아이템: 조건 그룹 + 액션 배열 */
export interface LogicItem {
  id: string;
  conditions: ConditionGroup;
  actions: Action[];
}

/** 액션 수행 결과 */
export interface ActionResult {
  jumpTarget?: string;
  requiredElementIds: string[];
  calculations: Array<{
    targetField: { type: string; id: string };
    operator: string;
    result: string | number;
  }>;
}

/** 로직 평가에 필요한 컨텍스트 */
export interface LogicEvaluationContext {
  /** Element ID -> 응답 값 매핑 */
  responses: Record<string, unknown>;
  /** Variable ID -> 현재 값 매핑 */
  variables: Record<string, string | number>;
  /** HiddenField ID -> 값 매핑 */
  hiddenFields: Record<string, string>;
  /** Element ID -> 상태('submitted' | 'skipped' | 'clicked' 등) 매핑 */
  elementStatuses: Record<string, string>;
}

// ─── Zod 스키마 ──────────────────────────────────────────────

/** 로직 아이템 검증 스키마 */
export const logicItemSchema = z.object({
  id: z.string().min(1),
  conditions: conditionGroupSchema,
  actions: z.array(actionSchema),
});
