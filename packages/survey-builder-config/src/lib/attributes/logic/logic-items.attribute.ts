import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';
import { logicItemSchema } from '../../logic/types/logic-item.types';

/**
 * logicItems 속성 -- Block에 설정된 조건부 로직 아이템 목록.
 * 각 로직 아이템은 조건 그룹과 액션 배열로 구성된다.
 */
export const logicItemsAttribute = createAttribute({
  name: 'logicItems',
  validate(value) {
    return z.array(logicItemSchema).optional().parse(value);
  },
});
