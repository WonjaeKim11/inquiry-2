'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '@inquiry/client-core';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Button,
  Alert,
  AlertDescription,
} from '@inquiry/client-ui';
import { SurveyStatusBadge } from './survey-status-badge';
import { DeleteSurveyDialog } from './delete-survey-dialog';
import type { SurveyListItem } from './types';

/**
 * 설문 목록 컴포넌트.
 * 환경에 속한 모든 설문을 카드 형태로 나열하며,
 * 각 설문의 이름, 상태 배지, 유형, 응답 수, 날짜, 삭제 버튼 등을 표시한다.
 */
export function SurveyList({
  environmentId,
  refreshKey,
  onEdit,
}: {
  /** 대상 환경 ID */
  environmentId: string;
  /** 외부에서 갱신 트리거 시 변경되는 키 */
  refreshKey?: number;
  /** 편집 버튼 클릭 시 호출되는 콜백 */
  onEdit?: (surveyId: string) => void;
}) {
  const { t } = useTranslation();

  const [surveys, setSurveys] = useState<SurveyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 삭제 다이얼로그 상태
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  /**
   * 환경의 설문 목록을 서버에서 조회한다.
   * 응답이 배열이 아닌 경우 data 프로퍼티에서 배열을 추출한다.
   */
  const fetchSurveyList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/environments/${environmentId}/surveys`);
      if (!res.ok) {
        throw new Error(t('survey.errors.load_fail'));
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data ?? [];
      setSurveys(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('survey.errors.load_fail')
      );
    } finally {
      setLoading(false);
    }
  }, [environmentId, t]);

  useEffect(() => {
    fetchSurveyList();
  }, [fetchSurveyList, refreshKey]);

  /**
   * 날짜 문자열을 사용자가 읽을 수 있는 형식으로 변환한다.
   */
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // 빈 상태
  if (surveys.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">{t('survey.list.empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {surveys.map((survey) => (
        <Card key={survey.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">{survey.name}</CardTitle>
                <SurveyStatusBadge status={survey.status} />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit?.(survey.id)}
                >
                  {t('survey.list.edit')}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    setDeleteTarget({ id: survey.id, name: survey.name })
                  }
                >
                  {t('survey.list.delete')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                {survey.type}
              </span>
              {survey._count && (
                <>
                  <span>
                    {survey._count.responses} {t('survey.list.responses')}
                  </span>
                  <span>
                    {survey._count.displays} {t('survey.list.displays')}
                  </span>
                </>
              )}
              <span>
                {t('survey.list.created')}: {formatDate(survey.createdAt)}
              </span>
              <span>
                {t('survey.list.updated')}: {formatDate(survey.updatedAt)}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* 삭제 확인 다이얼로그 */}
      {deleteTarget && (
        <DeleteSurveyDialog
          surveyId={deleteTarget.id}
          surveyName={deleteTarget.name}
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onDeleted={() => {
            setDeleteTarget(null);
            fetchSurveyList();
          }}
        />
      )}
    </div>
  );
}
