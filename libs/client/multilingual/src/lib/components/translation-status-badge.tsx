'use client';

import { useTranslation } from 'react-i18next';
import { Badge } from '@inquiry/client-ui';
import type { TranslationStatus } from '../types';

/** 번역 상태에 따른 Badge variant 매핑 */
const STATUS_VARIANT: Record<
  TranslationStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  complete: 'default',
  incomplete: 'secondary',
  missing: 'destructive',
};

/** 번역 상태에 따른 i18n 키 매핑 */
const STATUS_KEY: Record<TranslationStatus, string> = {
  complete: 'multilingual.translation_complete',
  incomplete: 'multilingual.translation_incomplete',
  missing: 'multilingual.translation_missing',
};

/**
 * 번역 완료도를 Badge로 표시하는 컴포넌트.
 * complete → 기본, incomplete → secondary, missing → destructive
 */
export function TranslationStatusBadge({
  status,
}: {
  status: TranslationStatus;
}) {
  const { t } = useTranslation();
  return (
    <Badge variant={STATUS_VARIANT[status]}>{t(STATUS_KEY[status])}</Badge>
  );
}
