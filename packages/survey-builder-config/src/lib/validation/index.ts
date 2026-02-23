/**
 * Validation 모듈 공개 API.
 *
 * 24가지 검증 규칙 유형, 타입 정의, 검증 엔진, 규칙 평가기,
 * 유틸리티 함수를 일괄 re-export한다.
 */

export { VALIDATION_RULE_TYPES } from './validation-rule-type';
export type { ValidationRuleType } from './validation-rule-type';

export type {
  ValidationRule,
  ValidationConfig,
  ValidationError,
  ValidationResult,
} from './validation.types';

export { evaluateValidation } from './validation.engine';
export { evaluateRule } from './rules/index';
export { getApplicableRules, isRuleApplicable } from './validation.utils';
