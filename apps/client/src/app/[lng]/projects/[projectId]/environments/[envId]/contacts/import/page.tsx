'use client';

import { use } from 'react';
import { useTranslation } from 'react-i18next';
import { CsvImportForm } from '@inquiry/client-contact';

interface ImportPageProps {
  params: Promise<{ lng: string; projectId: string; envId: string }>;
}

/**
 * CSV Import 페이지.
 * CSV 파일 업로드를 통한 연락처 대량 가져오기 기능을 제공한다.
 */
export default function ImportPage({ params }: ImportPageProps) {
  const { envId } = use(params);
  const { t } = useTranslation('translation');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('contact.import.title')}</h1>
        <p className="text-muted-foreground">
          {t('contact.import.description')}
        </p>
      </div>
      <CsvImportForm envId={envId} />
    </div>
  );
}
