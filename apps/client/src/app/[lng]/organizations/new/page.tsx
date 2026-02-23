'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@inquiry/client-core';
import { CreateOrganizationForm } from '@inquiry/client-organization';

/**
 * 조직 생성 페이지.
 * 조직 이름을 입력받아 새 조직을 생성한다.
 * 생성 성공 시 해당 조직의 설정 페이지로 리다이렉트한다.
 */
export default function NewOrganizationPage({
  params,
}: {
  params: Promise<{ lng: string }>;
}) {
  const { lng } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();

  // 미인증 시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/${lng}/auth/login`);
    }
  }, [loading, user, router, lng]);

  if (loading) {
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
    <div className="flex min-h-screen items-center justify-center p-8">
      <CreateOrganizationForm
        onSuccess={(orgId) =>
          router.push(`/${lng}/organizations/${orgId}/settings`)
        }
      />
    </div>
  );
}
