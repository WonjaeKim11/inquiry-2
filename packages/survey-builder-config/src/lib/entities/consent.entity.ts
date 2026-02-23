import { createEntity } from '@coltorapps/builder';
import {
  headlineAttribute,
  requiredAttribute,
  subheaderAttribute,
  imageUrlAttribute,
  videoUrlAttribute,
  isDraftAttribute,
  labelAttribute,
} from '../attributes/index';

/**
 * Consent 질문 엔티티: 동의/약관 확인 질문.
 * 다국어 지원 라벨을 통해 동의 문구를 표시한다.
 */
export const consentEntity = createEntity({
  name: 'consent',
  attributes: [
    // 공통
    headlineAttribute,
    requiredAttribute,
    subheaderAttribute,
    imageUrlAttribute,
    videoUrlAttribute,
    isDraftAttribute,
    // 고유
    labelAttribute,
  ],
  parentRequired: true,
});
