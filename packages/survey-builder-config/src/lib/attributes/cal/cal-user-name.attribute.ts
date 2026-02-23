import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * calUserName 속성 — Cal.com 사용자명 (필수).
 * 일정 예약 연동 시 Cal.com 사용자를 식별하는 데 사용된다.
 */
export const calUserNameAttribute = createAttribute({
  name: 'calUserName',
  validate(value) {
    return z
      .string()
      .min(1, 'Cal 사용자명은 최소 1자 이상이어야 합니다')
      .parse(value);
  },
});
