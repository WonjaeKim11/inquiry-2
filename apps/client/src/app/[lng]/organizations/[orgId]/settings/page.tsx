'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth, apiFetch } from '@inquiry/client-core';
import {
  useOrganization,
  OrganizationSettings,
  BillingSettings,
  WhitelabelSettings,
  DeleteOrganizationDialog,
} from '@inquiry/client-organization';
import type { Organization } from '@inquiry/client-organization';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
} from '@inquiry/client-ui';

/**
 * 조직 설정 페이지.
 * 탭 형태로 일반/Billing/Whitelabel/삭제 설정을 제공한다.
 * URL 파라미터의 orgId로 해당 조직 상세 정보를 서버에서 조회한다.
 */
export default function OrganizationSettingsPage({
  params,
}: {
  params: Promise<{ lng: string; orgId: string }>;
}) {
  const { lng, orgId } = use(params);
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { refreshOrganizations } = useOrganization();
  const router = useRouter();

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  /** 조직 상세 정보를 서버에서 조회한다 */
  const fetchOrganization = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/organizations/${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setOrganization(data);
      } else {
        // 조회 실패 시 목록 페이지로 리다이렉트
        router.replace(`/${lng}/organizations`);
      }
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

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  if (!user || !organization) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* 페이지 헤더 */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t('organization.settings.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {organization.name}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/${lng}/organizations`)}
        >
          {t('organization.list.title')}
        </Button>
      </div>

      {/* 설정 탭 */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">
            {t('organization.settings.general')}
          </TabsTrigger>
          <TabsTrigger value="billing">
            {t('organization.billing.title')}
          </TabsTrigger>
          <TabsTrigger value="whitelabel">
            {t('organization.whitelabel.title')}
          </TabsTrigger>
          <TabsTrigger value="danger">
            {t('organization.delete.title')}
          </TabsTrigger>
        </TabsList>

        {/* 일반 설정 탭 */}
        <TabsContent value="general">
          <OrganizationSettings organization={organization} />
        </TabsContent>

        {/* Billing 설정 탭 */}
        <TabsContent value="billing">
          <BillingSettings organization={organization} />
        </TabsContent>

        {/* Whitelabel 설정 탭 */}
        <TabsContent value="whitelabel">
          <WhitelabelSettings organization={organization} />
        </TabsContent>

        {/* 위험 영역 — 조직 삭제 */}
        <TabsContent value="danger">
          <div className="rounded-lg border border-destructive/50 p-6">
            <h3 className="text-lg font-semibold text-destructive">
              {t('organization.delete.title')}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('organization.delete.warning')}{' '}
              {t('organization.delete.cascade_warning')}
            </p>
            <Button
              variant="destructive"
              className="mt-4"
              onClick={() => setDeleteDialogOpen(true)}
            >
              {t('organization.delete.confirm_button')}
            </Button>
          </div>

          <DeleteOrganizationDialog
            organization={organization}
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onDeleted={async () => {
              // 삭제 후 조직 목록을 갱신하고 목록 페이지로 리다이렉트한다
              await refreshOrganizations();
              router.replace(`/${lng}/organizations`);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
