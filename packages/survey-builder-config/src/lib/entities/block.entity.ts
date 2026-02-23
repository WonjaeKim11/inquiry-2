import { createEntity } from '@coltorapps/builder';

/**
 * Block 엔티티: 질문들을 그룹핑하는 컨테이너.
 * 모든 질문은 반드시 Block 안에 있어야 한다.
 */
export const blockEntity = createEntity({
  name: 'block',
  attributes: [],
});
