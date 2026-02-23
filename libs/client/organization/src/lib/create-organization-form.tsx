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
import { useOrganization } from './organization-context';

/**
 * 조직 이름 검증 스키마.
 * 1~64자 범위의 문자열을 허용한다.
 */
const createOrgSchema = z.object({
  name: z
    .string()
    .min(1, 'organization.create.name_required')
    .max(64, 'organization.errors.name_too_short'),
});

/**
 * 조직 생성 폼.
 * 조직 이름을 입력받아 POST /api/organizations를 호출한다.
 * 생성 성공 시 onSuccess 콜백을 호출하여 부모 컴포넌트에서 리다이렉트 등의
 * 후속 동작을 처리할 수 있게 한다.
 */
export function CreateOrganizationForm({
  onSuccess,
}: {
  onSuccess?: (orgId: string) => void;
}) {
  const { t } = useTranslation();
  const { refreshOrganizations } = useOrganization();

  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 클라이언트 사이드 검증
    const result = createOrgSchema.safeParse({ name: name.trim() });
    if (!result.success) {
      setError(t(result.error.issues[0].message));
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/organizations', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('organization.create.fail'));
      }

      const created = await res.json();

      // 조직 목록을 갱신하여 새 조직이 즉시 반영되도록 한다
      await refreshOrganizations();

      onSuccess?.(created.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('organization.create.fail')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t('organization.create.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">
              {t('organization.create.name_label')}
            </Label>
            <Input
              id="org-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('organization.create.name_placeholder')}
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
              ? t('organization.create.creating')
              : t('organization.create.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
