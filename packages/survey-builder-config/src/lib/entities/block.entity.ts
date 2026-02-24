import { createEntity } from '@coltorapps/builder';
import { logicItemsAttribute } from '../attributes/logic/logic-items.attribute';
import { logicFallbackAttribute } from '../attributes/logic/logic-fallback.attribute';

/**
 * Block 엔티티: 질문들을 그룹핑하는 컨테이너.
 * 모든 질문은 반드시 Block 안에 있어야 한다.
 * logicItems: 조건부 로직 아이템 목록 (optional)
 * logicFallback: 모든 조건 불일치 시 이동할 블록 ID (optional, nullable)
 */
export const blockEntity = createEntity({
  name: 'block',
  attributes: [logicItemsAttribute, logicFallbackAttribute],
});
