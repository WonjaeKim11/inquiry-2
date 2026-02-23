'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@inquiry/client-core';
import { ActionClassForm } from '@inquiry/client-project';

/**
 * ActionClass 생성 페이지.
 * code/noCode 타입별 ActionClass 생성 폼을 제공한다.
 * 생성 성공 시 ActionClass 목록 페이지로 리다이렉트한다.
 */
export default function NewActionClassPage({
  params,
}: {
  params: Promise<{ lng: string; projectId: string; envId: string }>;
}) {
  const { lng, projectId, envId } = use(params);
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
      <ActionClassForm
        environmentId={envId}
        onSuccess={() =>
          router.push(
            `/${lng}/projects/${projectId}/environments/${envId}/action-classes`
          )
        }
      />
    </div>
  );
}
