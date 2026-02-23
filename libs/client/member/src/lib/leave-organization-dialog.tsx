'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '@inquiry/client-core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Alert,
  AlertDescription,
} from '@inquiry/client-ui';

interface LeaveOrganizationDialogProps {
  /** 탈퇴할 조직 ID */
  organizationId: string;
  /** 조직 이름 — 확인 메시지에 표시 */
  organizationName: string;
  /** 현재 사용자의 역할 — Owner 탈퇴 불가 판단에 사용 */
  currentUserRole: string;
  /** 다이얼로그 열림/닫힘 상태 */
  open: boolean;
  /** 열림/닫힘 상태 변경 핸들러 */
  onOpenChange: (open: boolean) => void;
  /** 탈퇴 성공 시 호출되는 콜백 */
  onSuccess?: () => void;
}

/**
 * 조직 탈퇴 확인 다이얼로그.
 * Owner 역할인 경우 탈퇴가 불가하다는 경고를 표시하고,
 * 그 외 역할인 경우 탈퇴 확인을 받은 후 POST /api/organizations/:orgId/leave를 호출한다.
 */
export function LeaveOrganizationDialog({
  organizationId,
  organizationName,
  currentUserRole,
  open,
  onOpenChange,
  onSuccess,
}: LeaveOrganizationDialogProps) {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Owner인 경우 탈퇴할 수 없다 */
  const isOwner = currentUserRole === 'OWNER';

  const handleLeave = async () => {
    if (isOwner) return;

    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch(`/organizations/${organizationId}/leave`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('member.invite.error'));
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('member.invite.error'));
    } finally {
      setLoading(false);
    }
  };

  /** 다이얼로그가 닫힐 때 에러 상태를 초기화한다 */
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('member.leave.title')}</DialogTitle>
          <DialogDescription>{t('member.leave.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">{organizationName}</p>

          {/* Owner 탈퇴 불가 경고 */}
          {isOwner && (
            <Alert variant="destructive">
              <AlertDescription>
                {t('member.leave.owner_warning')}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            {t('member.leave.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleLeave}
            disabled={isOwner || loading}
          >
            {loading ? t('member.leave.leaving') : t('member.leave.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
