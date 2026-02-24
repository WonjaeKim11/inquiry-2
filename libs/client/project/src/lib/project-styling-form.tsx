'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '@inquiry/client-core';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Alert,
  AlertDescription,
} from '@inquiry/client-ui';
import { StylingForm, useStylingForm } from '@inquiry/client-styling';
import type { Project } from './project-context';

/**
 * 프로젝트 스타일링 설정 컴포넌트.
 * StylingForm을 mode='project'로 사용하여 40+ 속성을 편집한다.
 * styling JSON 필드로 PATCH /api/projects/:projectId에 전송된다.
 */
export function ProjectStylingForm({
  project,
  onUpdated,
}: {
  project: Project;
  /** 스타일링 저장 후 호출되는 콜백 */
  onUpdated?: () => void;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { styling, updateField, updateColor, isDirty, reset } = useStylingForm({
    mode: 'project',
    initialData: (project.styling as Record<string, unknown>) ?? {},
  });

  /** 스타일링 저장 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await apiFetch(`/projects/${project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ styling }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('project.settings.save_fail'));
      }

      setSuccess(t('project.settings.save_success'));
      onUpdated?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('project.settings.save_fail')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('project.settings.styling')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <StylingForm
            styling={styling}
            updateField={updateField}
            updateColor={updateColor}
            mode="project"
          />

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

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={loading}>
              {loading
                ? t('project.settings.saving')
                : t('project.settings.save')}
            </Button>
            {isDirty && (
              <Button type="button" variant="outline" onClick={reset}>
                {t('project.styling.actions.reset', 'Reset')}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
