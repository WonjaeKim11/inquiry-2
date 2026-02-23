/**
 * 검증 시스템의 핵심 타입 정의.
 *
 * ValidationRule: 단일 검증 규칙 (타입 + 파라미터)
 * ValidationConfig: 여러 규칙의 논리 결합 (and/or)
 * ValidationError: 검증 실패 시 반환되는 에러 정보
 * ValidationResult: 검증 평가의 최종 결과
 */
import type { ValidationRuleType } from './validation-rule-type';

/**
 * 단일 검증 규칙.
 * 특정 ValidationRuleType에 해당하는 평가 함수와 매핑되어 실행된다.
 */
export interface ValidationRule {
  /** 규칙 고유 식별자 */
  id: string;
  /** 검증 규칙 유형 (24가지 중 하나) */
  type: ValidationRuleType;
  /** 규칙 평가에 필요한 파라미터 (예: min, max, pattern 등) */
  params?: Record<string, unknown>;
  /** Address/ContactInfo 등 복합 필드에서 서브 필드를 지정할 때 사용 */
  field?: string;
}

/**
 * 검증 설정.
 * 여러 ValidationRule을 and/or 논리로 결합하여 평가한다.
 */
export interface ValidationConfig {
  /** 규칙 결합 논리: 'and'는 모든 규칙 통과 필요, 'or'는 하나만 통과하면 성공 */
  logic: 'and' | 'or';
  /** 적용할 검증 규칙 목록 */
  rules: ValidationRule[];
}

/**
 * 검증 에러.
 * 클라이언트에서 i18n messageKey를 통해 로컬라이즈된 에러 메시지를 표시한다.
 */
export interface ValidationError {
  /** 실패한 검증 규칙의 유형 */
  ruleType: ValidationRuleType;
  /** 번역 키 (클라이언트 i18n에서 사용) */
  messageKey: string;
  /** 에러 메시지에 삽입될 파라미터 (예: { min: 3 }) */
  params?: Record<string, unknown>;
}

/**
 * 검증 결과.
 * valid가 true이면 errors는 빈 배열이다.
 */
export interface ValidationResult {
  /** 검증 통과 여부 */
  valid: boolean;
  /** 검증 실패 시 에러 목록 */
  errors: ValidationError[];
}
