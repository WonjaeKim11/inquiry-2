// ID 검증
export { validateId } from './id-validator';
export type { IdValidationResult } from './id-validator';

// 변수 검증
export {
  validateVariableName,
  validateVariableId,
  validateVariables,
} from './variable-validator';

// 히든 필드 검증
export {
  HIDDEN_FIELD_FORBIDDEN_IDS,
  validateHiddenFieldId,
  validateHiddenFields,
} from './hidden-field-validator';

// 참조 무결성 검사
export {
  checkHiddenFieldReferences,
  checkVariableReferences,
} from './reference-checker';
export type { ReferenceCheckResult } from './reference-checker';

// Recall 빈 fallback 검사는 recall 모듈에서 import
import { validateFallbacks } from '../recall/recall-safety';
import { validateVariables } from './variable-validator';
import { validateHiddenFields } from './hidden-field-validator';

/**
 * 설문 변수와 히든 필드를 통합 검증한다.
 * validateForPublish의 4단계에서 호출.
 *
 * @param variables - 변수 배열
 * @param hiddenFields - 히든 필드 설정
 * @param existingElementIds - 기존 element ID 목록
 * @param schema - 설문 빌더 스키마 (recall fallback 검사용)
 * @returns 통합 검증 결과
 */
export function validateSurveyVariablesAndFields(
  variables: Array<{
    id: string;
    name: string;
    type: string;
    value: string | number;
  }>,
  hiddenFields: { enabled: boolean; fieldIds: string[] },
  existingElementIds: string[],
  schema: Record<string, unknown>
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. 변수 검증
  const variableResult = validateVariables(variables);
  errors.push(...variableResult.errors);

  // 2. 히든 필드 검증
  const variableIds = variables.map((v) => v.id);
  const hiddenFieldResult = validateHiddenFields(
    hiddenFields,
    existingElementIds,
    variableIds
  );
  errors.push(...hiddenFieldResult.errors);

  // 3. Recall 빈 fallback 경고 (스키마 내 모든 텍스트 속성 검사)
  const entities = schema['entities'] as
    | Record<string, { attributes?: Record<string, unknown> }>
    | undefined;
  if (entities) {
    for (const [entityId, entity] of Object.entries(entities)) {
      const attrs = entity.attributes ?? {};
      for (const [attrName, value] of Object.entries(attrs)) {
        if (typeof value === 'string') {
          const emptyFallbacks = validateFallbacks(value);
          for (const recallId of emptyFallbacks) {
            warnings.push(
              `Entity "${entityId}" attribute "${attrName}": recall "${recallId}" has empty fallback.`
            );
          }
        }
        // I18nString 형태 검사
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          for (const [locale, text] of Object.entries(
            value as Record<string, unknown>
          )) {
            if (typeof text === 'string') {
              const emptyFallbacks = validateFallbacks(text);
              for (const recallId of emptyFallbacks) {
                warnings.push(
                  `Entity "${entityId}" attribute "${attrName}" [${locale}]: recall "${recallId}" has empty fallback.`
                );
              }
            }
          }
        }
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
