import type { Segment } from '@prisma/client';

/** 세그먼트 + 연결된 설문 수 */
export interface SegmentWithSurveyCount extends Segment {
  _count: {
    surveys: number;
  };
}
