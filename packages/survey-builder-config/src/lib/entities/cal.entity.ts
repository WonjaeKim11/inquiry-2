import { createEntity } from '@coltorapps/builder';
import {
  headlineAttribute,
  requiredAttribute,
  subheaderAttribute,
  imageUrlAttribute,
  videoUrlAttribute,
  isDraftAttribute,
  calUserNameAttribute,
  calHostAttribute,
} from '../attributes/index';

/**
 * Cal 질문 엔티티: Cal.com 일정 예약 질문.
 * Cal.com 사용자 이름과 호스트 URL을 통해 일정 예약 UI를 임베드한다.
 */
export const calEntity = createEntity({
  name: 'cal',
  attributes: [
    // 공통
    headlineAttribute,
    requiredAttribute,
    subheaderAttribute,
    imageUrlAttribute,
    videoUrlAttribute,
    isDraftAttribute,
    // 고유
    calUserNameAttribute,
    calHostAttribute,
  ],
  parentRequired: true,
});
