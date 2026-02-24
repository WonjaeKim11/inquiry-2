import type { SingleCondition, ConditionGroup } from '../types/index';
import { isSingleCondition } from '../types/index';
import {
  OPERATORS_WITHOUT_RIGHT_OPERAND,
  MAX_NESTING_DEPTH,
  MAX_CONDITIONS_PER_GROUP,
} from '../constants/index';

/** 조건 검증 오류 */
export interface ConditionValidationError {
  conditionId: string;
  message: string;
}

/**
 * 단일 조건의 구조를 검증한다.
 * - leftOperand 필수
 * - operator 필수
 * - rightOperand 필요/불필요 검증 (OPERATORS_WITHOUT_RIGHT_OPERAND 참조)
 *
 * @param condition - 검증할 단일 조건
 * @returns 검증 오류 배열 (오류가 없으면 빈 배열)
 */
export function validateSingleCondition(
  condition: SingleCondition
): ConditionValidationError[] {
  const errors: ConditionValidationError[] = [];

  // 좌측 피연산자 존재 여부 확인
  if (!condition.leftOperand || !condition.leftOperand.id) {
    errors.push({
      conditionId: condition.id,
      message: '좌측 피연산자가 설정되지 않았습니다.',
    });
  }

  // 연산자 존재 여부 확인
  if (!condition.operator) {
    errors.push({
      conditionId: condition.id,
      message: '연산자가 설정되지 않았습니다.',
    });
    return errors;
  }

  // 우측 피연산자 필요 여부 판별
  const noRightNeeded = (
    OPERATORS_WITHOUT_RIGHT_OPERAND as readonly string[]
  ).includes(condition.operator);

  // 우측 피연산자가 불필요한데 설정된 경우
  if (noRightNeeded && condition.rightOperand) {
    errors.push({
      conditionId: condition.id,
      message: `연산자 "${condition.operator}"는 우측 피연산자가 필요하지 않습니다.`,
    });
  }

  // 우측 피연산자가 필요한데 미설정된 경우
  if (!noRightNeeded && !condition.rightOperand) {
    errors.push({
      conditionId: condition.id,
      message: `연산자 "${condition.operator}"는 우측 피연산자가 필요합니다.`,
    });
  }

  return errors;
}

/**
 * 조건 그룹의 구조를 재귀적으로 검증한다.
 * - 빈 그룹 경고
 * - 중첩 깊이 제한 (MAX_NESTING_DEPTH)
 * - 그룹 내 조건 수 제한 (MAX_CONDITIONS_PER_GROUP)
 * - 각 조건의 구조 검증
 *
 * @param group - 검증할 조건 그룹
 * @param depth - 현재 중첩 깊이 (기본값 0)
 * @returns 검증 오류 배열
 */
export function validateConditionGroup(
  group: ConditionGroup,
  depth = 0
): ConditionValidationError[] {
  const errors: ConditionValidationError[] = [];

  // 중첩 깊이 초과 검사
  if (depth >= MAX_NESTING_DEPTH) {
    errors.push({
      conditionId: group.id,
      message: `조건 그룹 중첩 깊이가 최대치(${MAX_NESTING_DEPTH})를 초과합니다.`,
    });
    return errors;
  }

  // 빈 조건 그룹 검사
  if (group.conditions.length === 0) {
    errors.push({
      conditionId: group.id,
      message: '빈 조건 그룹입니다.',
    });
    return errors;
  }

  // 조건 수 초과 검사
  if (group.conditions.length > MAX_CONDITIONS_PER_GROUP) {
    errors.push({
      conditionId: group.id,
      message: `조건 수가 최대치(${MAX_CONDITIONS_PER_GROUP})를 초과합니다.`,
    });
  }

  // 각 조건 항목을 재귀적으로 검증
  for (const item of group.conditions) {
    if (isSingleCondition(item)) {
      errors.push(...validateSingleCondition(item));
    } else {
      errors.push(...validateConditionGroup(item, depth + 1));
    }
  }

  return errors;
}
