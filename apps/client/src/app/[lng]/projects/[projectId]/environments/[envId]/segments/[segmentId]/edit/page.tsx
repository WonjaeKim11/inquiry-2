'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import {
  SegmentForm,
  FilterEditor,
  fetchSegment,
  updateSegment,
} from '@inquiry/client-segment';
import type { SegmentFormValues } from '@inquiry/client-segment';
import type { FilterItem } from '@inquiry/shared-segment';

interface EditSegmentPageProps {
  params: Promise<{
    lng: string;
    projectId: string;
    envId: string;
    segmentId: string;
  }>;
}

/**
 * 세그먼트 수정 페이지.
 * 기존 세그먼트를 로드하여 제목/설명/필터를 수정한다.
 */
export default function EditSegmentPage({ params }: EditSegmentPageProps) {
  const { lng, projectId, envId, segmentId } = use(params);
  const { t } = useTranslation('translation');
  const router = useRouter();
  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [initialValues, setInitialValues] = useState<{
    title: string;
    description?: string;
    isPrivate?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  /** 세그먼트 관련 라우트의 기본 경로 */
  const basePath = `/${lng}/projects/${projectId}/environments/${envId}/segments`;

  /** 컴포넌트 마운트 시 기존 세그먼트 데이터를 서버에서 로드한다 */
  useEffect(() => {
    async function load() {
      const { data } = await fetchSegment(envId, segmentId);
      if (data) {
        setInitialValues({
          title: data.title,
          description: data.description ?? undefined,
          isPrivate: data.isPrivate,
        });
        setFilters((data.filters ?? []) as FilterItem[]);
      }
      setLoading(false);
    }
    load();
  }, [envId, segmentId]);

  /**
   * 폼 제출 핸들러.
   * 수정된 값과 현재 필터 상태를 결합하여 API에 전송한다.
   */
  const handleSubmit = async (values: SegmentFormValues) => {
    setSubmitting(true);
    const { ok } = await updateSegment(envId, segmentId, {
      ...values,
      filters: filters as unknown[],
    });
    setSubmitting(false);

    if (ok) {
      router.push(basePath);
    }
  };

  /* 로딩 중 표시 */
  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-muted-foreground">
          {t('common.loading', 'Loading...')}
        </p>
      </div>
    );
  }

  /* 세그먼트를 찾지 못한 경우 에러 표시 */
  if (!initialValues) {
    return (
      <div className="container mx-auto py-6">
        <p className="text-destructive">{t('segment.errors.not_found')}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('segment.form.edit')}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 세그먼트 기본 정보 수정 영역 */}
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {t('segment.form.details')}
          </h2>
          <SegmentForm
            mode="edit"
            initialValues={initialValues}
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
