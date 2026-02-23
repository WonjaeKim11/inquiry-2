'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '@inquiry/client-core';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Alert,
  AlertDescription,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@inquiry/client-ui';

/** ActionClass 엔티티 타입 */
export interface ActionClass {
  id: string;
  name: string;
  type: 'code' | 'noCode' | 'automatic';
  key: string | null;
  description: string | null;
  noCodeConfig: Record<string, unknown> | null;
  environmentId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * ActionClass 목록 컴포넌트.
 * 환경별 ActionClass를 테이블 형태로 표시하고, 삭제 기능을 제공한다.
 */
export function ActionClassList({
  environmentId,
  onCreateNew,
}: {
  /** 환경 ID — 해당 환경의 ActionClass 목록을 조회 */
  environmentId: string;
  /** 새 ActionClass 생성 클릭 시 호출되는 콜백 */
  onCreateNew?: () => void;
}) {
  const { t } = useTranslation();

  const [actionClasses, setActionClasses] = useState<ActionClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ActionClass | null>(null);
  const [deleting, setDeleting] = useState(false);

  /** ActionClass 목록을 서버에서 조회한다 */
  const fetchActionClasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/environments/${environmentId}/action-classes`
      );
      if (!res.ok) {
        throw new Error(t('project.action_class.load_fail'));
      }
      const data = await res.json();
      setActionClasses(Array.isArray(data) ? data : data.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('project.action_class.load_fail')
      );
    } finally {
      setLoading(false);
    }
  }, [environmentId, t]);

  useEffect(() => {
    fetchActionClasses();
  }, [fetchActionClasses]);

  /** ActionClass를 삭제한다 */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/action-classes/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error(t('project.action_class.delete_fail'));
      }
      setDeleteTarget(null);
      await fetchActionClasses();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('project.action_class.delete_fail')
      );
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('project.action_class.title')}</CardTitle>
          {onCreateNew && (
            <Button onClick={onCreateNew} size="sm">
              {t('project.action_class.create')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {actionClasses.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            {t('project.action_class.empty')}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">
                    {t('project.action_class.name')}
                  </th>
                  <th className="pb-2 font-medium">
                    {t('project.action_class.type')}
                  </th>
                  <th className="pb-2 font-medium">
                    {t('project.action_class.key')}
                  </th>
                  <th className="pb-2 font-medium text-right" />
                </tr>
              </thead>
              <tbody>
                {actionClasses.map((ac) => (
                  <tr key={ac.id} className="border-b last:border-0">
                    <td className="py-3">
                      <div>
                        <span className="font-medium">{ac.name}</span>
                        {ac.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {ac.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge
                        variant={ac.type === 'code' ? 'default' : 'secondary'}
                      >
                        {ac.type === 'code'
                          ? t('project.action_class.code')
                          : t('project.action_class.no_code')}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <code className="text-xs text-muted-foreground">
                        {ac.key ?? '-'}
                      </code>
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteTarget(ac)}
                      >
                        {t('project.action_class.delete')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 삭제 확인 다이얼로그 */}
        <Dialog
          open={deleteTarget !== null}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('project.action_class.delete')}</DialogTitle>
              <DialogDescription>
                {t('project.action_class.delete_confirm')}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                {t('project.delete.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting
                  ? t('project.delete.deleting')
                  : t('project.action_class.delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
