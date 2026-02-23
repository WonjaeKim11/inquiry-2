import { createAttribute } from '@coltorapps/builder';
import { z } from 'zod';

/**
 * insightsEnabled 속성 — AI 인사이트 분석 활성화 여부 (선택).
 * true이면 텍스트 응답에 대해 AI 기반 감성/주제 분석이 수행된다.
 */
export const insightsEnabledAttribute = createAttribute({
  name: 'insightsEnabled',
  validate(value) {
    return z.boolean().optional().parse(value);
  },
});
