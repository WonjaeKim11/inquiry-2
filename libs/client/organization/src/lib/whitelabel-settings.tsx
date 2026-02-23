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
  Alert,
  AlertDescription,
} from '@inquiry/client-ui';
import type { Organization } from './organization-context';
import { useOrganization } from './organization-context';

/**
 * Whitelabel(브랜드) 설정 컴포넌트.
 * 로고 URL과 파비콘 URL을 입력받고, 이미지 미리보기를 제공한다.
 * 변경 사항은 PATCH /api/organizations/:id (whitelabel 필드)로 저장된다.
 */
export function WhitelabelSettings({
  organization,
}: {
  organization: Organization;
}) {
  const { t } = useTranslation();
  const { refreshOrganizations } = useOrganization();

  const [logoUrl, setLogoUrl] = useState(
    organization.whitelabel?.logoUrl ?? ''
  );
  const [faviconUrl, setFaviconUrl] = useState(
    organization.whitelabel?.faviconUrl ?? ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // organization이 변경되면 폼 상태를 동기화한다
  useEffect(() => {
    setLogoUrl(organization.whitelabel?.logoUrl ?? '');
    setFaviconUrl(organization.whitelabel?.faviconUrl ?? '');
  }, [organization]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const res = await apiFetch(`/organizations/${organization.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          whitelabel: {
            logoUrl: logoUrl.trim() || null,
            faviconUrl: faviconUrl.trim() || null,
          },
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
        <CardTitle>{t('organization.whitelabel.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 로고 URL */}
          <div className="space-y-2">
            <Label htmlFor="logo-url">
              {t('organization.whitelabel.logo_url')}
            </Label>
            <Input
              id="logo-url"
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder={t('organization.whitelabel.logo_url_placeholder')}
            />
            {/* 로고 미리보기 */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {t('organization.whitelabel.preview')}:
              </span>
              {logoUrl.trim() ? (
                <img
                  src={logoUrl.trim()}
                  alt="Logo preview"
                  className="h-10 max-w-[200px] rounded border object-contain"
                  onError={(e) => {
                    // 로드 실패 시 img 요소를 숨긴다
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t('organization.whitelabel.no_preview')}
                </span>
              )}
            </div>
          </div>

          {/* 파비콘 URL */}
          <div className="space-y-2">
            <Label htmlFor="favicon-url">
              {t('organization.whitelabel.favicon_url')}
            </Label>
            <Input
              id="favicon-url"
              type="url"
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
              placeholder={t('organization.whitelabel.favicon_url_placeholder')}
            />
            {/* 파비콘 미리보기 */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {t('organization.whitelabel.preview')}:
              </span>
              {faviconUrl.trim() ? (
                <img
                  src={faviconUrl.trim()}
                  alt="Favicon preview"
                  className="h-6 w-6 rounded border object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <span className="text-xs text-muted-foreground">
                  {t('organization.whitelabel.no_preview')}
                </span>
              )}
            </div>
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
