'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '@inquiry/client-core';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Alert,
  AlertDescription,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@inquiry/client-ui';
import { RoleBadge } from './role-badge';

/** 서버에서 반환하는 멤버 항목 타입 */
interface Member {
  userId: string;
  name: string;
  email: string;
  role: string;
  joinedAt: string;
}

/** 역할 변경에 사용할 수 있는 전체 역할 목록 */
const ALL_ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'BILLING'] as const;

interface MemberListProps {
  /** 멤버 목록을 조회할 조직 ID */
  organizationId: string;
  /** 현재 로그인한 사용자의 ID — 자기 자신 표시 및 삭제 방지에 사용 */
  currentUserId: string;
  /** 현재 사용자의 역할 — 역할 변경/삭제 권한 판단에 사용 */
  currentUserRole: string;
}

/**
 * 멤버 목록 컴포넌트.
 * GET /api/organizations/:orgId/members 로 멤버 목록을 조회하고,
 * 권한에 따라 역할 변경 및 멤버 삭제 기능을 제공한다.
 *
 * 권한 규칙:
 * - Owner: 모든 멤버의 역할을 변경할 수 있고, 자신을 제외한 멤버를 삭제할 수 있다.
 * - Admin: MEMBER/BILLING 역할만 변경할 수 있고, 자신을 제외한 MEMBER/BILLING을 삭제할 수 있다.
 * - Member/Billing: 읽기만 가능하다.
 */
export function MemberList({
  organizationId,
  currentUserId,
  currentUserRole,
}: MemberListProps) {
  const { t } = useTranslation();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /** 멤버 목록을 서버에서 조회한다 */
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/organizations/${organizationId}/members`);
      if (!res.ok) {
        throw new Error(t('member.member_list.empty'));
      }
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : data.data ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('member.member_list.empty')
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId, t]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  /**
   * 특정 멤버에 대해 현재 사용자가 역할 변경이 가능한지 판단한다.
   * - Owner: 모든 멤버의 역할 변경 가능
   * - Admin: MEMBER와 BILLING 역할만 변경 가능
   */
  const canChangeRole = (member: Member): boolean => {
    if (member.userId === currentUserId) return false;
    if (currentUserRole === 'OWNER') return true;
    if (
      currentUserRole === 'ADMIN' &&
      (member.role === 'MEMBER' || member.role === 'BILLING')
    ) {
      return true;
    }
    return false;
  };

  /**
   * 특정 멤버에 대해 현재 사용자가 선택할 수 있는 역할 목록을 반환한다.
   * - Owner: 모든 역할
   * - Admin: MEMBER, BILLING만
   */
  const getAssignableRoles = (member: Member): string[] => {
    if (currentUserRole === 'OWNER') {
      return ALL_ROLES.filter((r) => r !== member.role);
    }
    if (currentUserRole === 'ADMIN') {
      return ['MEMBER', 'BILLING'].filter((r) => r !== member.role);
    }
    return [];
  };

  /**
   * 특정 멤버를 삭제할 수 있는지 판단한다.
   * - 자기 자신은 삭제할 수 없다 (탈퇴 기능으로 유도)
   * - Owner: 다른 모든 멤버 삭제 가능
   * - Admin: MEMBER와 BILLING만 삭제 가능
   */
  const canRemoveMember = (member: Member): boolean => {
    if (member.userId === currentUserId) return false;
    if (currentUserRole === 'OWNER') return true;
    if (
      currentUserRole === 'ADMIN' &&
      (member.role === 'MEMBER' || member.role === 'BILLING')
    ) {
      return true;
    }
    return false;
  };

  /**
   * 멤버의 역할을 변경한다.
   * PATCH /api/organizations/:orgId/members/:userId/role
   */
  const handleChangeRole = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    setError(null);
    try {
      const res = await apiFetch(
        `/organizations/${organizationId}/members/${userId}/role`,
        {
          method: 'PATCH',
          body: JSON.stringify({ role: newRole }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('member.invite.error'));
      }
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('member.invite.error'));
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * 멤버를 조직에서 삭제한다.
   * DELETE /api/organizations/:orgId/members/:userId
   */
  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm(t('member.member_list.remove_confirm'))) return;

    setActionLoading(userId);
    setError(null);
    try {
      const res = await apiFetch(
        `/organizations/${organizationId}/members/${userId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('member.invite.error'));
      }
      await fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('member.invite.error'));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('member.member_list.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('member.member_list.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {members.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t('member.member_list.empty')}
          </p>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                {/* 멤버 정보 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">
                      {member.name}
                      {member.userId === currentUserId && (
                        <span className="ml-1 text-sm text-muted-foreground">
                          {t('member.member_list.you')}
                        </span>
                      )}
                    </span>
                    <RoleBadge role={member.role} />
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {member.email}
                  </p>
                </div>

                {/* 역할 변경 및 삭제 버튼 */}
                <div className="ml-4 flex gap-2">
                  {/* 역할 변경 드롭다운 */}
                  {canChangeRole(member) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={actionLoading === member.userId}
                        >
                          {t('member.member_list.change_role')}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>
                          {t('member.member_list.change_role')}
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {getAssignableRoles(member).map((r) => (
                          <DropdownMenuItem
                            key={r}
                            onClick={() => handleChangeRole(member.userId, r)}
                          >
                            {t(`member.role.${r}`)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}

                  {/* 멤버 삭제 버튼 */}
                  {canRemoveMember(member) && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveMember(member.userId)}
                      disabled={actionLoading === member.userId}
                    >
                      {t('member.member_list.remove')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
