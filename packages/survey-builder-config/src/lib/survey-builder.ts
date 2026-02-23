import { createBuilder } from '@coltorapps/builder';
import { createId, isCuid } from '@paralleldrive/cuid2';

import { blockEntity } from './entities/block.entity';
import { openTextEntity } from './entities/open-text.entity';
import { multipleChoiceSingleEntity } from './entities/multiple-choice-single.entity';
import { multipleChoiceMultiEntity } from './entities/multiple-choice-multi.entity';
import { npsEntity } from './entities/nps.entity';
import { ctaEntity } from './entities/cta.entity';
import { ratingEntity } from './entities/rating.entity';
import { consentEntity } from './entities/consent.entity';
import { pictureSelectionEntity } from './entities/picture-selection.entity';
import { dateEntity } from './entities/date.entity';
import { fileUploadEntity } from './entities/file-upload.entity';
import { calEntity } from './entities/cal.entity';
import { matrixEntity } from './entities/matrix.entity';
import { addressEntity } from './entities/address.entity';
import { rankingEntity } from './entities/ranking.entity';
import { contactInfoEntity } from './entities/contact-info.entity';

import { FORBIDDEN_IDS } from './constants/forbidden-ids';

/** 모든 질문(Element) Entity 이름 목록 */
export const ELEMENT_ENTITY_NAMES = [
  'openText',
  'multipleChoiceSingle',
  'multipleChoiceMulti',
  'nps',
  'cta',
  'rating',
  'consent',
  'pictureSelection',
  'date',
  'fileUpload',
  'cal',
  'matrix',
  'address',
  'ranking',
  'contactInfo',
] as const;

/**
 * 설문 빌더 정의.
 * 서버/클라이언트 공유 — 16개 Entity, parent-child 제약, ID 검증, 스키마 검증.
 */
export const surveyBuilder = createBuilder({
  entities: [
    blockEntity,
    openTextEntity,
    multipleChoiceSingleEntity,
    multipleChoiceMultiEntity,
    npsEntity,
    ctaEntity,
    ratingEntity,
    consentEntity,
    pictureSelectionEntity,
    dateEntity,
    fileUploadEntity,
    calEntity,
    matrixEntity,
    addressEntity,
    rankingEntity,
    contactInfoEntity,
  ],

  entitiesExtensions: {
    // Block: 모든 Element를 자식으로 허용
    block: {
      childrenAllowed: [...ELEMENT_ENTITY_NAMES],
    },
    // 모든 Element: block 내부에만 배치 가능
    openText: { parentRequired: true, allowedParents: ['block'] },
    multipleChoiceSingle: { parentRequired: true, allowedParents: ['block'] },
    multipleChoiceMulti: { parentRequired: true, allowedParents: ['block'] },
    nps: { parentRequired: true, allowedParents: ['block'] },
    cta: { parentRequired: true, allowedParents: ['block'] },
    rating: { parentRequired: true, allowedParents: ['block'] },
    consent: { parentRequired: true, allowedParents: ['block'] },
    pictureSelection: { parentRequired: true, allowedParents: ['block'] },
    date: { parentRequired: true, allowedParents: ['block'] },
    fileUpload: { parentRequired: true, allowedParents: ['block'] },
    cal: { parentRequired: true, allowedParents: ['block'] },
    matrix: { parentRequired: true, allowedParents: ['block'] },
    address: { parentRequired: true, allowedParents: ['block'] },
    ranking: { parentRequired: true, allowedParents: ['block'] },
    contactInfo: { parentRequired: true, allowedParents: ['block'] },
  },

  generateEntityId() {
    let id: string;
    do {
      id = createId();
    } while ((FORBIDDEN_IDS as readonly string[]).includes(id));
    return id;
  },

  validateEntityId(id) {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      throw new Error(
        'Entity ID는 영문, 숫자, 하이픈, 언더스코어만 허용됩니다'
      );
    }
    if (/\s/.test(id)) {
      throw new Error('Entity ID에 공백은 허용되지 않습니다');
    }
    if ((FORBIDDEN_IDS as readonly string[]).includes(id)) {
      throw new Error(`금지된 Entity ID입니다: ${id}`);
    }
    if (!isCuid(id)) {
      throw new Error(`유효하지 않은 Entity ID 형식입니다: ${id}`);
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
