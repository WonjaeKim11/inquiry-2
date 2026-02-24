import type { SurveyBuilderSchema } from '@inquiry/survey-builder-config';
import type { SurveyMeta } from './schema-converter';

/** 설문 발행 전 클라이언트 검증 결과 */
export interface SurveyValidationResult {
  /** 검증 통과 여부 (errors가 비어있으면 true) */
  valid: boolean;
  /** 발행을 차단하는 오류 목록 */
  errors: string[];
  /** 경고 목록 (발행은 가능하지만 확인 권장) */
  warnings: string[];
  /** 오류가 있는 Entity ID 목록 (UI에서 하이라이트 용도) */
  invalidEntityIds: string[];
}

/**
 * Builder Schema와 SurveyMeta를 기반으로 발행 전 클라이언트 검증을 수행한다.
 * 서버 검증 전에 빠른 피드백을 제공하여 사용자 경험을 개선한다.
 *
 * 검증 항목:
 * 1. 스키마 존재 여부
 * 2. 최소 1개 블록 필요
 * 3. 최소 1개 질문 필요
 * 4. 각 블록에 최소 1개 질문 존재 확인 (경고)
 * 5. 각 질문의 headline 존재 확인
 * 6. 종료 카드 설정 여부 (경고)
 * 7. 설문 이름 존재 확인
 *
 * @param schema - Builder Store의 현재 스키마
 * @param meta - 현재 설문 메타데이터
 * @returns 검증 결과 (valid, errors, warnings, invalidEntityIds)
 */
export function validateSurveyForPublish(
  schema: SurveyBuilderSchema | undefined,
  meta: SurveyMeta
): SurveyValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const invalidEntityIds: string[] = [];

  // 1. 스키마 존재 여부
  if (!schema) {
    errors.push('설문 스키마가 없습니다');
    return { valid: false, errors, warnings, invalidEntityIds };
  }

  // Builder Schema 구조에 접근하기 위한 타입 단언
  const schemaAny = schema as unknown as {
    entities: Record<
      string,
      {
        type: string;
        attributes: Record<string, unknown>;
        children?: string[];
      }
    >;
    root: string[];
  };

  // 2. 최소 1개 블록 필요
  if (!schemaAny.root || schemaAny.root.length === 0) {
    errors.push('최소 1개의 블록이 필요합니다');
  }

  // 3. 최소 1개 질문 필요
  const entities = schemaAny.entities ?? {};
  const questions = Object.entries(entities).filter(
    ([, e]) => e.type !== 'block'
  );
  if (questions.length === 0) {
    errors.push('최소 1개의 질문이 필요합니다');
  }

  // 4. 각 블록에 최소 1개 질문이 있는지 확인 (비어있으면 경고)
  for (const blockId of schemaAny.root ?? []) {
    const block = entities[blockId];
    if (block && (!block.children || block.children.length === 0)) {
      warnings.push(`블록이 비어 있습니다`);
      invalidEntityIds.push(blockId);
    }
  }

  // 5. 각 질문의 headline이 있는지 확인
  for (const [entityId, entity] of Object.entries(entities)) {
    if (entity.type === 'block') continue;
    const headline = entity.attributes?.headline;
    if (
      !headline ||
      (typeof headline === 'object' && Object.keys(headline).length === 0)
    ) {
      // isDraft인 경우 경고만 (아직 작성 중인 질문)
      if (entity.attributes?.isDraft) {
        warnings.push(`질문의 제목이 비어 있습니다 (초안)`);
      } else {
        errors.push(`질문의 제목이 비어 있습니다`);
        invalidEntityIds.push(entityId);
      }
    }
  }

  // 6. Ending 카드 검사
  if (meta.endings.length === 0) {
    warnings.push('종료 카드가 설정되지 않았습니다');
  }

  // 7. 설문 이름 검사
  if (!meta.name || meta.name.trim().length === 0) {
    errors.push('설문 이름이 비어 있습니다');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    invalidEntityIds,
  };
}
