'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth, apiFetch } from '@inquiry/client-core';
import {
  ApiKeyList,
  CreateApiKeyDialog,
  ApiKeySecretDialog,
} from '@inquiry/client-api-key';
import { Button } from '@inquiry/client-ui';

/**
 * API Key 관리 페이지.
 * 조직에 속한 API Key 목록을 표시하고,
 * 새 키 생성 / 1회 키 표시 / 삭제 기능을 제공한다.
 */
export default function ApiKeysPage({
  params,
}: {
  params: Promise<{ lng: string; orgId: string }>;
}) {
  const { lng, orgId } = use(params);
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [organizationName, setOrganizationName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [secretDialogOpen, setSecretDialogOpen] = useState(false);
  const [createdPlainKey, setCreatedPlainKey] = useState('');
  /** 목록 갱신을 트리거하는 카운터 */
  const [refreshKey, setRefreshKey] = useState(0);

  /**
   * 조직 상세 정보를 서버에서 조회한다.
   * 조직이 존재하지 않으면 조직 목록 페이지로 리다이렉트한다.
   */
  const fetchOrganization = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/organizations/${orgId}`);
      if (!res.ok) {
        router.replace(`/${lng}/organizations`);
        return;
      }
      const data = await res.json();
      setOrganizationName(data.name);
    } catch {
      router.replace(`/${lng}/organizations`);
    } finally {
      setLoading(false);
    }
  }, [orgId, lng, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/${lng}/auth/login`);
      return;
    }
    if (user) {
      fetchOrganization();
    }
  }, [authLoading, user, router, lng, fetchOrganization]);

  /**
   * API Key 생성 성공 시 호출되는 핸들러.
   * 평문 키를 저장하고 비밀 표시 다이얼로그를 연다.
   */
  const handleCreated = (result: { plainKey: string }) => {
    setCreatedPlainKey(result.plainKey);
    setSecretDialogOpen(true);
    // 목록 갱신 트리거
    setRefreshKey((prev) => prev + 1);
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* 페이지 헤더 */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('apiKey.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {organizationName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/${lng}/organizations/${orgId}/settings`)
            }
          >
            {t('organization.settings.title')}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/${lng}/organizations/${orgId}/members`)
            }
          >
            {t('member.title')}
          </Button>
        </div>
      </div>

      {/* 설명 및 생성 버튼 */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t('apiKey.description')}
        </p>
        <Button onClick={() => setCreateDialogOpen(true)}>
          {t('apiKey.create.title')}
        </Button>
      </div>

      {/* API Key 목록 */}
      <ApiKeyList organizationId={orgId} refreshKey={refreshKey} />

      {/* API Key 생성 다이얼로그 */}
      <CreateApiKeyDialog
        organizationId={orgId}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreated={handleCreated}
      />

      {/* 생성된 키 1회 표시 다이얼로그 */}
      <ApiKeySecretDialog
        plainKey={createdPlainKey}
        open={secretDialogOpen}
        onOpenChange={setSecretDialogOpen}
      />
    </div>
  );
}
