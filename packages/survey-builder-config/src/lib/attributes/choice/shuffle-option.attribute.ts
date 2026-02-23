import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * shuffleOption 속성 — 선택지 셔플(무작위 정렬) 옵션.
 * 'none': 셔플 없음, 'all': 전체 셔플, 'exceptLast': 마지막 항목 제외 셔플.
 * 응답 편향을 줄이기 위해 선택지 순서를 무작위화할 때 사용된다.
 */
export const shuffleOptionAttribute = createAttribute({
  name: 'shuffleOption',
  validate(value) {
    return z.enum(['none', 'all', 'exceptLast']).parse(value);
  },
});
