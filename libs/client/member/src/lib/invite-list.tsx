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
} from '@inquiry/client-ui';
import { RoleBadge } from './role-badge';

/** 서버에서 반환하는 초대 항목 타입 */
interface Invite {
  id: string;
  email: string;
  name: string | null;
  role: string;
  expiresAt: string;
  createdAt: string;
}

interface InviteListProps {
  /** 초대 목록을 조회할 조직 ID */
  organizationId: string;
  /** 현재 사용자의 역할 — 재발송/삭제 권한 판단에 사용 */
  currentUserRole: string;
}

/**
 * 대기 중인 초대 목록 컴포넌트.
 * GET /api/invites?organizationId=xxx 로 초대 목록을 조회하고,
 * Owner/Admin에게는 재발송/삭제 기능을 제공한다.
 */
export function InviteList({
  organizationId,
  currentUserRole,
}: InviteListProps) {
  const { t } = useTranslation();

  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /** 관리 권한 여부 — Owner 또는 Admin만 재발송/삭제 가능 */
  const canManage = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  /** 초대 목록을 서버에서 조회한다 */
  const fetchInvites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/invites?organizationId=${organizationId}`);
      if (!res.ok) {
        throw new Error(t('member.invite.error'));
      }
      const data = await res.json();
      // 응답이 배열이면 직접 사용하고, data 프로퍼티가 있으면 data를 사용
      setInvites(Array.isArray(data) ? data : data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('member.invite.error'));
    } finally {
      setLoading(false);
    }
  }, [organizationId, t]);

  useEffect(() => {
    fetchInvites();
  }, [fetchInvites]);

  /**
   * 초대를 재발송한다.
   * POST /api/invites/:inviteId/resend?organizationId=xxx
   */
  const handleResend = async (inviteId: string) => {
    setActionLoading(inviteId);
    setError(null);
    try {
      const res = await apiFetch(
        `/invites/${inviteId}/resend?organizationId=${organizationId}`,
        { method: 'POST' }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('member.invite.error'));
      }
      // 성공 시 목록 새로고침
      await fetchInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('member.invite.error'));
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * 초대를 삭제한다.
   * DELETE /api/invites/:inviteId?organizationId=xxx
   */
  const handleDelete = async (inviteId: string) => {
    if (!window.confirm(t('member.invite_list.delete_confirm'))) return;

    setActionLoading(inviteId);
    setError(null);
    try {
      const res = await apiFetch(
        `/invites/${inviteId}?organizationId=${organizationId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('member.invite.error'));
      }
      // 성공 시 목록 새로고침
      await fetchInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('member.invite.error'));
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * 만료 날짜를 사용자 친화적인 문자열로 포맷한다.
   */
  const formatExpiry = (expiresAt: string): string => {
    const date = new Date(expiresAt);
    const now = new Date();
    if (date <= now) return t('member.invite_list.expired');
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('member.invite_list.title')}</CardTitle>
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
        <CardTitle>{t('member.invite_list.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {invites.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t('member.invite_list.empty')}
          </p>
        ) : (
          <div className="space-y-3">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                {/* 초대 정보 */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{invite.email}</span>
                    <RoleBadge role={invite.role} />
                  </div>
                  {invite.name && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {invite.name}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('member.invite_list.expires')}:{' '}
                    {formatExpiry(invite.expiresAt)}
                  </p>
                </div>

                {/* 관리 버튼 — Owner/Admin만 표시 */}
                {canManage && (
                  <div className="ml-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResend(invite.id)}
                      disabled={actionLoading === invite.id}
                    >
                      {t('member.invite_list.resend')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(invite.id)}
                      disabled={actionLoading === invite.id}
                    >
                      {t('member.invite_list.delete')}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
