'use client';

import { useState } from 'react';
import { z } from 'zod';
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
} from '@inquiry/client-ui';

/**
 * 프로젝트 이름 검증 스키마.
 * 1~64자 범위의 문자열을 허용한다.
 */
const createProjectSchema = z.object({
  name: z
    .string()
    .min(1, 'project.errors.name_required')
    .max(64, 'project.errors.name_too_long'),
});

/**
 * 프로젝트 생성 폼.
 * 프로젝트 이름을 입력받아 POST /api/projects를 호출한다.
 * 생성 시 organizationId가 자동으로 설정되며,
 * 성공 시 onSuccess 콜백을 호출하여 부모에서 리다이렉트 등의 후속 처리를 수행한다.
 */
export function CreateProjectForm({
  organizationId,
  onSuccess,
}: {
  /** 프로젝트를 생성할 조직 ID */
  organizationId: string;
  /** 생성 성공 시 호출되는 콜백 — 생성된 프로젝트 ID를 전달 */
  onSuccess?: (projectId: string) => void;
}) {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 클라이언트 사이드 검증
    const result = createProjectSchema.safeParse({ name: name.trim() });
    if (!result.success) {
      setError(t(result.error.issues[0].message));
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          organizationId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('project.create.fail'));
      }

      const created = await res.json();
      onSuccess?.(created.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('project.create.fail'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t('project.create.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">{t('project.create.name')}</Label>
            <Input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('project.create.name_placeholder')}
              maxLength={64}
              required
              autoFocus
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? t('project.create.creating')
              : t('project.create.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
