'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@inquiry/client-core';
import { useOrganization } from '@inquiry/client-organization';
import { CreateProjectForm, useProject } from '@inquiry/client-project';

/**
 * 프로젝트 생성 페이지.
 * 프로젝트 이름을 입력받아 현재 조직에 새 프로젝트를 생성한다.
 * 생성 성공 시 해당 프로젝트의 대시보드 페이지로 리다이렉트한다.
 */
export default function NewProjectPage({
  params,
}: {
  params: Promise<{ lng: string }>;
}) {
  const { lng } = use(params);
  const { user, loading } = useAuth();
  const { currentOrganization } = useOrganization();
  const { refreshProjects } = useProject();
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

  if (!user || !currentOrganization) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <CreateProjectForm
        organizationId={currentOrganization.id}
        onSuccess={async (projectId) => {
          await refreshProjects();
          router.push(`/${lng}/projects/${projectId}`);
        }}
      />
    </div>
  );
}
