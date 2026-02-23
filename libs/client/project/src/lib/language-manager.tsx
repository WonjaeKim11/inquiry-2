'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '@inquiry/client-core';
import {
  Button,
  Input,
  Label,
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
import type { ProjectLanguage } from './project-context';

/**
 * 언어 관리 컴포넌트.
 * 프로젝트에 연결된 언어(ISO 639-1 코드)를 조회, 등록, 수정, 삭제한다.
 * (projectId, code) 고유성 검증은 서버 사이드에서 처리된다.
 */
export function LanguageManager({
  projectId,
}: {
  /** 언어를 관리할 프로젝트 ID */
  projectId: string;
}) {
  const { t } = useTranslation();

  const [languages, setLanguages] = useState<ProjectLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 새 언어 추가 폼 상태
  const [newCode, setNewCode] = useState('');
  const [newAlias, setNewAlias] = useState('');
  const [addLoading, setAddLoading] = useState(false);

  // 수정 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAlias, setEditAlias] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // 삭제 확인 상태
  const [deleteTarget, setDeleteTarget] = useState<ProjectLanguage | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  /** 언어 목록을 서버에서 조회한다 */
  const fetchLanguages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/projects/${projectId}/languages`);
      if (!res.ok) {
        throw new Error(t('project.language.load_fail'));
      }
      const data = await res.json();
      setLanguages(Array.isArray(data) ? data : data.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('project.language.load_fail')
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

  useEffect(() => {
    fetchLanguages();
  }, [fetchLanguages]);

  /** 새 언어를 등록한다 */
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const code = newCode.trim().toLowerCase();
    if (!code || code.length < 2 || code.length > 10) {
      setError(t('project.language.invalid_code'));
      return;
    }

    setAddLoading(true);
    try {
      const res = await apiFetch(`/projects/${projectId}/languages`, {
        method: 'POST',
        body: JSON.stringify({
          code,
          alias: newAlias.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('project.language.add_fail'));
      }

      setNewCode('');
      setNewAlias('');
      setSuccess(t('project.language.success'));
      await fetchLanguages();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('project.language.add_fail')
      );
    } finally {
      setAddLoading(false);
    }
  };

  /** 언어 별칭을 수정한다 */
  const handleEdit = async (languageId: string) => {
    setError(null);
    setSuccess(null);
    setEditLoading(true);

    try {
      const res = await apiFetch(`/languages/${languageId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          alias: editAlias.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('project.language.edit_fail'));
      }

      setEditingId(null);
      setEditAlias('');
      await fetchLanguages();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('project.language.edit_fail')
      );
    } finally {
      setEditLoading(false);
    }
  };

  /** 언어를 삭제한다 */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await apiFetch(`/languages/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error(t('project.language.delete_fail'));
      }
      setDeleteTarget(null);
      await fetchLanguages();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('project.language.delete_fail')
      );
    } finally {
      setDeleting(false);
    }
  };

  /** 수정 모드를 시작한다 */
  const startEdit = (lang: ProjectLanguage) => {
    setEditingId(lang.id);
    setEditAlias(lang.alias ?? '');
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
        <CardTitle>{t('project.language.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* 새 언어 추가 폼 */}
        <form onSubmit={handleAdd} className="flex items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="lang-code">{t('project.language.code')}</Label>
            <Input
              id="lang-code"
              type="text"
              value={newCode}
              onChange={(e) => setNewCode(e.target.value)}
              placeholder="en"
              maxLength={10}
              className="w-24"
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="lang-alias">{t('project.language.alias')}</Label>
            <Input
              id="lang-alias"
              type="text"
              value={newAlias}
              onChange={(e) => setNewAlias(e.target.value)}
              placeholder="English"
            />
          </div>
          <Button type="submit" disabled={addLoading}>
            {addLoading
              ? t('project.language.adding')
              : t('project.language.add')}
          </Button>
        </form>

        {/* 언어 목록 */}
        {languages.length === 0 ? (
          <p className="py-4 text-center text-muted-foreground">
            {t('project.language.empty')}
          </p>
        ) : (
          <div className="space-y-2">
            {languages.map((lang) => (
              <div
                key={lang.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                {editingId === lang.id ? (
                  // 수정 모드
                  <div className="flex flex-1 items-center gap-2">
                    <code className="rounded bg-muted px-2 py-1 text-sm">
                      {lang.code}
                    </code>
                    <Input
                      type="text"
                      value={editAlias}
                      onChange={(e) => setEditAlias(e.target.value)}
                      placeholder="Alias"
                      className="flex-1"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleEdit(lang.id)}
                      disabled={editLoading}
                    >
                      {t('project.settings.save')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      {t('project.delete.cancel')}
                    </Button>
                  </div>
                ) : (
                  // 표시 모드
                  <>
                    <div className="flex items-center gap-3">
                      <code className="rounded bg-muted px-2 py-1 text-sm font-medium">
                        {lang.code}
                      </code>
                      {lang.alias && (
                        <span className="text-sm text-muted-foreground">
                          {lang.alias}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEdit(lang)}
                      >
                        {t('project.language.edit')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteTarget(lang)}
                      >
                        {t('project.language.delete')}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
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
              <DialogTitle>{t('project.language.delete')}</DialogTitle>
              <DialogDescription>
                {t('project.language.delete_confirm')}
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
                  : t('project.language.delete')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
