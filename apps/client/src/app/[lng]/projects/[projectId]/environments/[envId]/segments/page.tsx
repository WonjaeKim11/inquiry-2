'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { SegmentList } from '@inquiry/client-segment';

interface SegmentsPageProps {
  params: Promise<{ lng: string; projectId: string; envId: string }>;
}

/**
 * 세그먼트 관리 메인 페이지.
 * 세그먼트 목록을 표시하고 생성/수정 페이지로의 네비게이션을 제공한다.
 */
export default function SegmentsPage({ params }: SegmentsPageProps) {
  const { lng, projectId, envId } = use(params);
  const { t } = useTranslation('translation');
  const router = useRouter();

  /** 세그먼트 관련 라우트의 기본 경로 */
  const basePath = `/${lng}/projects/${projectId}/environments/${envId}/segments`;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('segment.title')}</h1>
        <p className="text-muted-foreground">{t('segment.description')}</p>
      </div>

      <SegmentList
        envId={envId}
        onNavigateCreate={() => router.push(`${basePath}/new`)}
        onNavigateEdit={(segmentId) =>
          router.push(`${basePath}/${segmentId}/edit`)
        }
      />
    </div>
  );
}
