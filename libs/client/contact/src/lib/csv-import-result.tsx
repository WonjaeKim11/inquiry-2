'use client';

import { useTranslation } from 'react-i18next';
import { Card } from '@inquiry/client-ui';
import type { CsvImportResult as CsvImportResultType } from './contact-api';

interface CsvImportResultProps {
  result: CsvImportResultType;
}

/**
 * CSV Import 결과 표시 컴포넌트.
 * 생성/업데이트/건너뜀/에러 수를 시각적으로 보여준다.
 */
export function CsvImportResult({ result }: CsvImportResultProps) {
  const { t } = useTranslation('translation');

  return (
    <Card className="p-6">
      <h3 className="font-semibold mb-4">{t('contact.import.result_title')}</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{result.created}</p>
          <p className="text-sm text-muted-foreground">
            {t('contact.import.result_created', { count: result.created })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
          <p className="text-sm text-muted-foreground">
            {t('contact.import.result_updated', { count: result.updated })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
          <p className="text-sm text-muted-foreground">
            {t('contact.import.result_skipped', { count: result.skipped })}
          </p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-600">{result.errors}</p>
          <p className="text-sm text-muted-foreground">
            {t('contact.import.result_errors', { count: result.errors })}
          </p>
        </div>
      </div>
    </Card>
  );
}
