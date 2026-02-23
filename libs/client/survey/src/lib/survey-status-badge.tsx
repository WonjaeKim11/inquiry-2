'use client';

import { useTranslation } from 'react-i18next';
import { Badge } from '@inquiry/client-ui';
import type { SurveyStatus } from './types';

/** 상태별 Badge variant 매핑 */
const STATUS_VARIANT: Record<
  SurveyStatus,
  'secondary' | 'default' | 'outline' | 'destructive'
> = {
  DRAFT: 'secondary',
  IN_PROGRESS: 'default',
  PAUSED: 'outline',
  COMPLETED: 'secondary',
};

/** 상태별 추가 CSS 클래스 */
const STATUS_CLASS: Record<SurveyStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  IN_PROGRESS:
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  PAUSED: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

/**
 * 설문 상태 배지 컴포넌트.
 * DRAFT/IN_PROGRESS/PAUSED/COMPLETED 상태를 시각적으로 표시한다.
 */
export function SurveyStatusBadge({ status }: { status: SurveyStatus }) {
  const { t } = useTranslation();

  return (
    <Badge variant={STATUS_VARIANT[status]} className={STATUS_CLASS[status]}>
      {t(`survey.status.${status}`)}
    </Badge>
  );
}
