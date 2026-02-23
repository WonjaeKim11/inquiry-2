'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth, apiFetch } from '@inquiry/client-core';
import { useOrganization } from '@inquiry/client-organization';
import {
  InviteMemberForm,
  InviteList,
  MemberList,
  LeaveOrganizationDialog,
} from '@inquiry/client-member';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
} from '@inquiry/client-ui';

/** 서버에서 반환하는 멤버십 정보 (현재 사용자의 역할 확인용) */
interface MembershipInfo {
  role: string;
}

/**
 * 멤버 관리 페이지.
 * 상단에 멤버 초대 폼, 탭으로 멤버 목록과 대기 중인 초대를 표시한다.
 * 하단에는 조직 탈퇴 버튼이 있다.
 *
 * 사용자의 멤버십 역할을 별도 API로 조회하여
 * 초대, 역할 변경, 삭제 등의 권한을 결정한다.
 */
export default function MembersPage({
  params,
}: {
  params: Promise<{ lng: string; orgId: string }>;
}) {
  const { lng, orgId } = use(params);
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { refreshOrganizations } = useOrganization();
  const router = useRouter();

  const [currentUserRole, setCurrentUserRole] = useState<string>('MEMBER');
  const [organizationName, setOrganizationName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  /** 초대/멤버 목록 갱신을 트리거하는 카운터 */
  const [refreshKey, setRefreshKey] = useState(0);

  /**
   * 조직 상세 정보와 현재 사용자의 멤버십 역할을 조회한다.
   * 조직 정보에서 이름을, 멤버 목록에서 현재 사용자의 역할을 추출한다.
   */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 조직 상세 정보 조회
      const orgRes = await apiFetch(`/organizations/${orgId}`);
      if (!orgRes.ok) {
        router.replace(`/${lng}/organizations`);
        return;
      }
      const orgData = await orgRes.json();
      setOrganizationName(orgData.name);

      // 멤버 목록에서 현재 사용자의 역할 조회
      const membersRes = await apiFetch(`/organizations/${orgId}/members`);
      if (membersRes.ok) {
        const membersData = await membersRes.json();
        const membersList = Array.isArray(membersData)
          ? membersData
          : membersData.data ?? [];
        const currentMember = membersList.find(
          (m: MembershipInfo & { userId: string }) => m.userId === user?.id
        );
        if (currentMember) {
          setCurrentUserRole(currentMember.role);
        }
      }
    } catch {
      router.replace(`/${lng}/organizations`);
    } finally {
      setLoading(false);
    }
  }, [orgId, lng, router, user?.id]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/${lng}/auth/login`);
      return;
    }
    if (user) {
      fetchData();
    }
  }, [authLoading, user, router, lng, fetchData]);

  /** 초대 성공 시 목록 갱신 트리거 */
  const handleInviteSuccess = () => {
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

  /** Owner 또는 Admin만 초대 폼을 표시한다 */
  const canInvite = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* 페이지 헤더 */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('member.title')}</h1>
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
              router.push(`/${lng}/organizations/${orgId}/api-keys`)
            }
          >
            {t('apiKey.title')}
          </Button>
        </div>
      </div>

      {/* 초대 폼 — Owner/Admin만 표시 */}
      {canInvite && (
        <div className="mb-8">
          <InviteMemberForm
            organizationId={orgId}
            currentUserRole={currentUserRole}
            onSuccess={handleInviteSuccess}
          />
        </div>
      )}

      {/* 멤버/초대 탭 */}
      <Tabs defaultValue="members" className="space-y-6">
        <TabsList>
          <TabsTrigger value="members">
            {t('member.member_list.title')}
          </TabsTrigger>
          <TabsTrigger value="invites">
            {t('member.invite_list.title')}
          </TabsTrigger>
        </TabsList>

        {/* 멤버 목록 탭 */}
        <TabsContent value="members">
          <MemberList
            key={`members-${refreshKey}`}
            organizationId={orgId}
            currentUserId={user.id}
            currentUserRole={currentUserRole}
          />
        </TabsContent>

        {/* 대기 중인 초대 탭 */}
        <TabsContent value="invites">
          <InviteList
            key={`invites-${refreshKey}`}
            organizationId={orgId}
            currentUserRole={currentUserRole}
          />
        </TabsContent>
      </Tabs>

      {/* 조직 탈퇴 */}
      <div className="mt-8 rounded-lg border border-destructive/50 p-6">
        <h3 className="text-lg font-semibold text-destructive">
          {t('member.leave.title')}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          {t('member.leave.description')}
        </p>
        <Button
          variant="destructive"
          className="mt-4"
          onClick={() => setLeaveDialogOpen(true)}
        >
          {t('member.leave.confirm')}
        </Button>
      </div>

      <LeaveOrganizationDialog
        organizationId={orgId}
        organizationName={organizationName}
        currentUserRole={currentUserRole}
        open={leaveDialogOpen}
        onOpenChange={setLeaveDialogOpen}
        onSuccess={async () => {
          await refreshOrganizations();
          router.replace(`/${lng}/organizations`);
        }}
      />
    </div>
  );
}
