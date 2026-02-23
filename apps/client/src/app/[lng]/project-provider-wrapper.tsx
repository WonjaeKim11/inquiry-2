'use client';

import type { ReactNode } from 'react';
import { useOrganization } from '@inquiry/client-organization';
import { ProjectProvider } from '@inquiry/client-project';

/**
 * ProjectProvider를 OrganizationContext와 연결하는 래퍼.
 * 현재 선택된 조직의 ID를 ProjectProvider에 전달하여
 * 해당 조직의 프로젝트 목록을 자동으로 로드한다.
 * 서버 컴포넌트인 RootLayout에서 클라이언트 사이드 컨텍스트에
 * 접근할 수 없으므로 이 래퍼가 필요하다.
 */
export function ProjectProviderWrapper({ children }: { children: ReactNode }) {
  const { currentOrganization } = useOrganization();

  return (
    <ProjectProvider organizationId={currentOrganization?.id ?? null}>
      {children}
    </ProjectProvider>
  );
}
