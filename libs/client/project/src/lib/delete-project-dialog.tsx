'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '@inquiry/client-core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Alert,
  AlertDescription,
} from '@inquiry/client-ui';
import type { Project } from './project-context';

/**
 * 프로젝트 삭제 확인 다이얼로그.
 * Cascade 삭제 경고(환경, ActionClass, Language 모두 삭제)를 표시하고,
 * 프로젝트 이름 입력으로 삭제를 확인받는다.
 * 삭제 성공 시 onDeleted 콜백을 호출하여 부모에서 리다이렉트 등의
 * 후속 처리를 수행할 수 있게 한다.
 */
export function DeleteProjectDialog({
  project,
  open,
  onOpenChange,
  onDeleted,
}: {
  project: Project;
  /** 다이얼로그 열림/닫힘 상태 */
  open: boolean;
  /** 열림/닫힘 상태 변경 핸들러 */
  onOpenChange: (open: boolean) => void;
  /** 삭제 성공 시 호출되는 콜백 */
  onDeleted?: () => void;
}) {
  const { t } = useTranslation();

  const [confirmName, setConfirmName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 입력된 이름이 프로젝트 이름과 일치하는지 검사한다 */
  const isConfirmed = confirmName === project.name;

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch(`/projects/${project.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('project.delete.fail'));
      }

      // 다이얼로그를 닫고 상태를 초기화한다
      setConfirmName('');
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('project.delete.fail'));
    } finally {
      setLoading(false);
    }
  };

  /** 다이얼로그가 닫힐 때 상태를 초기화한다 */
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConfirmName('');
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('project.delete.title')}</DialogTitle>
          <DialogDescription>{t('project.delete.warning')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Cascade 삭제 경고 */}
          <Alert variant="destructive">
            <AlertDescription>{t('project.delete.warning')}</AlertDescription>
          </Alert>

          {/* 프로젝트 이름 확인 입력 */}
          <div className="space-y-2">
            <Label htmlFor="delete-project-confirm">
              {t('project.delete.confirm_name')}
            </Label>
            <p className="text-sm font-medium text-foreground">
              {project.name}
            </p>
            <Input
              id="delete-project-confirm"
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={project.name}
              autoComplete="off"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            {t('project.delete.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || loading}
          >
            {loading
              ? t('project.delete.deleting')
              : t('project.delete.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
