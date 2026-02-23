import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * calHost 속성 — Cal.com 호스트 URL (선택).
 * 셀프 호스팅된 Cal.com 인스턴스를 사용하는 경우 호스트 URL을 지정한다.
 * undefined/null이면 기본 Cal.com 호스트를 사용한다.
 */
export const calHostAttribute = createAttribute({
  name: 'calHost',
  validate(value) {
    return z.string().optional().nullable().parse(value);
  },
});
