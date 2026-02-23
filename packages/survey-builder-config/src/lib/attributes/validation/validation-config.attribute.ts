import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * 개별 검증 규칙 스키마.
 * id: 규칙 식별자, type: 규칙 유형, params: 규칙 파라미터, field: 대상 필드.
 */
const validationRuleSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  params: z.record(z.string(), z.unknown()).optional(),
  field: z.string().optional(),
});

/**
 * validationConfig 스키마.
 * logic: 규칙 결합 방식 (and/or), rules: 검증 규칙 배열.
 */
const validationConfigSchema = z
  .object({
    logic: z.enum(['and', 'or']),
    rules: z.array(validationRuleSchema),
  })
  .optional()
  .nullable();

/**
 * validationConfig 속성 — 질문에 적용되는 검증 규칙 구성 (선택).
 * 여러 검증 규칙을 AND/OR 로직으로 결합하여 응답값을 검증한다.
 * undefined/null이면 추가 검증 없음.
 */
export const validationConfigAttribute = createAttribute({
  name: 'validationConfig',
  validate(value) {
    return validationConfigSchema.parse(value);
  },
});
