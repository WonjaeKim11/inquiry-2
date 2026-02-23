'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@inquiry/client-core';
import {
  useOrganization,
  OrganizationSwitcher,
} from '@inquiry/client-organization';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from '@inquiry/client-ui';

/**
 * 조직 목록 페이지.
 * 사용자 소속 조직을 카드 형태로 표시하고, 각 조직의 설정 페이지로 이동할 수 있다.
 * 조직이 없는 경우 조직 생성 페이지로 안내한다.
 */
export default function OrganizationsPage({
  params,
}: {
  params: Promise<{ lng: string }>;
}) {
  const { lng } = use(params);
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { organizations, loading: orgLoading } = useOrganization();
  const router = useRouter();

  // 미인증 시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/${lng}/auth/login`);
    }
  }, [authLoading, user, router, lng]);

  if (authLoading || orgLoading) {
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
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('organization.list.title')}</h1>
        <div className="flex items-center gap-4">
          <OrganizationSwitcher
            onCreateNew={() => router.push(`/${lng}/organizations/new`)}
          />
          <Button onClick={() => router.push(`/${lng}/organizations/new`)}>
            {t('organization.list.create_new')}
          </Button>
        </div>
      </div>

      {organizations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-4 text-muted-foreground">
              {t('organization.list.empty')}
            </p>
            <Button onClick={() => router.push(`/${lng}/organizations/new`)}>
              {t('organization.list.create_new')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {organizations.map((org) => (
            <Card
              key={org.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() =>
                router.push(`/${lng}/organizations/${org.id}/settings`)
              }
            >
              <CardHeader>
                <CardTitle className="text-lg">{org.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t(`organization.billing.plan_${org.billing.plan}`)} /{' '}
                  {t(`organization.billing.period_${org.billing.period}`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
