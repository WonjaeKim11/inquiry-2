'use client';

import { useState, useEffect } from 'react';
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
  Switch,
  Alert,
  AlertDescription,
} from '@inquiry/client-ui';
import type { Organization } from './organization-context';
import { useOrganization } from './organization-context';

/**
 * 조직 일반 설정 컴포넌트.
 * 조직 이름 수정, AI 기능 토글을 제공한다.
 * 변경 사항은 PATCH /api/organizations/:id로 저장된다.
 */
export function OrganizationSettings({
  organization,
}: {
  organization: Organization;
}) {
  const { t } = useTranslation();
  const { refreshOrganizations } = useOrganization();

  const [name, setName] = useState(organization.name);
  const [isAIEnabled, setIsAIEnabled] = useState(organization.isAIEnabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // organization이 변경되면 폼 상태를 동기화한다
  useEffect(() => {
    setName(organization.name);
    setIsAIEnabled(organization.isAIEnabled);
  }, [organization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError(t('organization.create.name_required'));
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch(`/organizations/${organization.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          isAIEnabled,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('organization.settings.save_fail'));
      }

      await refreshOrganizations();
      setSuccess(t('organization.settings.save_success'));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('organization.settings.save_fail')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('organization.settings.general')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 조직 이름 필드 */}
          <div className="space-y-2">
            <Label htmlFor="settings-name">
              {t('organization.settings.name_label')}
            </Label>
            <Input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={64}
              required
            />
          </div>

          {/* AI 기능 토글 */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="ai-toggle">
                {t('organization.settings.ai_enabled')}
              </Label>
              <p className="text-sm text-muted-foreground">
                {t('organization.settings.ai_enabled_description')}
              </p>
            </div>
            <Switch
              id="ai-toggle"
              checked={isAIEnabled}
              onCheckedChange={setIsAIEnabled}
            />
          </div>

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

          <Button type="submit" disabled={loading}>
            {loading
              ? t('organization.settings.saving')
              : t('organization.settings.save')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
