import { createBuilder } from '@coltorapps/builder';
import { createId, isCuid } from '@paralleldrive/cuid2';
import { blockEntity } from './entities/block.entity';
import { openTextEntity } from './entities/open-text.entity';

/**
 * 설문 빌더 정의.
 * 서버/클라이언트 공유 — 엔티티 관계, ID 생성/검증, 스키마 검증을 포함한다.
 */
export const surveyBuilder = createBuilder({
  entities: [blockEntity, openTextEntity],
  entitiesExtensions: {
    block: {
      childrenAllowed: ['openText'],
    },
    openText: {
      parentRequired: true,
      allowedParents: ['block'],
    },
  },
  generateEntityId: () => createId(),
  validateEntityId(id) {
    if (!isCuid(id)) {
      throw new Error(`유효하지 않은 entity ID: ${id}`);
    }
  },
  validateSchema(schema) {
    const entities = Object.values(schema.entities);
    const blocks = entities.filter((e) => e.type === 'block');
    if (blocks.length === 0) {
      throw new Error('최소 1개 블록이 필요합니다');
    }
    const questions = entities.filter((e) => e.type !== 'block');
    if (questions.length === 0) {
      throw new Error('최소 1개 질문이 필요합니다');
    }
    return schema;
  },
});

export type SurveyBuilderSchema = Parameters<
  typeof surveyBuilder.validateSchema
>[0];
