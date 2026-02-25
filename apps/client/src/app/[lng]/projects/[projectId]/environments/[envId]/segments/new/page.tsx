'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  SegmentForm,
  FilterEditor,
  createSegment,
} from '@inquiry/client-segment';
import type { SegmentFormValues } from '@inquiry/client-segment';
import type { FilterItem } from '@inquiry/shared-segment';

interface NewSegmentPageProps {
  params: Promise<{ lng: string; projectId: string; envId: string }>;
}

/**
 * 세그먼트 생성 페이지.
 * 제목/설명 폼과 필터 편집기를 결합하여 새 세그먼트를 만든다.
 */
export default function NewSegmentPage({ params }: NewSegmentPageProps) {
  const { lng, projectId, envId } = use(params);
  const { t } = useTranslation('translation');
  const router = useRouter();
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  /** 세그먼트 관련 라우트의 기본 경로 */
  const basePath = `/${lng}/projects/${projectId}/environments/${envId}/segments`;

  /**
   * 폼 제출 핸들러.
   * SegmentForm의 유효성 검사를 통과한 값과 필터 데이터를 결합하여 API에 전송한다.
   */
  const handleSubmit = async (values: SegmentFormValues) => {
    setSubmitting(true);
    const { ok } = await createSegment(envId, {
      ...values,
      filters: filters as unknown[],
    });
    setSubmitting(false);

    if (ok) {
      router.push(basePath);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('segment.form.create')}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 세그먼트 기본 정보 입력 영역 */}
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {t('segment.form.details')}
          </h2>
          <SegmentForm
            mode="create"
            onSubmit={handleSubmit}
            onCancel={() => router.push(basePath)}
            submitting={submitting}
          />
        </div>
        {/* 필터 규칙 편집 영역 */}
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {t('segment.filter.title')}
          </h2>
          <FilterEditor filters={filters} onChange={setFilters} envId={envId} />
        </div>
      </div>
    </div>
  );
}
