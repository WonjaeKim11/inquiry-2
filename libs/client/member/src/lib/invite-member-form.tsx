'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '@inquiry/client-core';
import {
  Button,
  Input,
  Label,
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
} from '@inquiry/client-ui';

/**
 * 초대 폼 입력 검증 스키마.
 * 이메일 형식과 이름 길이를 검사한다.
 */
const inviteSchema = z.object({
  email: z.string().email('member.invite.error'),
  name: z.string().min(1, 'member.invite.error'),
  role: z.enum(['ADMIN', 'MEMBER', 'BILLING']),
});

/** 역할 선택에서 표시할 수 있는 역할 목록 */
const ASSIGNABLE_ROLES = ['ADMIN', 'MEMBER', 'BILLING'] as const;

interface InviteMemberFormProps {
  /** 초대를 보낼 조직 ID */
  organizationId: string;
  /** 현재 사용자의 역할 — ADMIN 역할 할당 가능 여부 판단에 사용 */
  currentUserRole: string;
  /** 초대 성공 시 호출되는 콜백 */
  onSuccess?: () => void;
}

/**
 * 멤버 초대 폼.
 * 이메일, 이름, 역할을 입력받아 POST /api/invites로 초대를 생성한다.
 * Owner만 ADMIN 역할 초대가 가능하며, 그 외는 MEMBER와 BILLING만 선택 가능하다.
 */
export function InviteMemberForm({
  organizationId,
  currentUserRole,
  onSuccess,
}: InviteMemberFormProps) {
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('MEMBER');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * 현재 사용자의 역할에 따라 선택 가능한 역할 목록을 필터링한다.
   * Owner는 모든 역할을 할당할 수 있고, 그 외에는 ADMIN을 제외한다.
   */
  const availableRoles = ASSIGNABLE_ROLES.filter((r) => {
    if (r === 'ADMIN' && currentUserRole !== 'OWNER') return false;
    return true;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // 클라이언트 사이드 검증
    const result = inviteSchema.safeParse({
      email: email.trim(),
      name: name.trim(),
      role,
    });
    if (!result.success) {
      setError(t(result.error.issues[0].message));
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/invites', {
        method: 'POST',
        body: JSON.stringify({
          organizationId,
          email: email.trim(),
          name: name.trim(),
          role,
          teamIds: [],
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('member.invite.error'));
      }

      setSuccess(t('member.invite.success'));
      // 폼 초기화
      setEmail('');
      setName('');
      setRole('MEMBER');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('member.invite.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('member.invite.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이메일 입력 */}
          <div className="space-y-2">
            <Label htmlFor="invite-email">{t('member.invite.email')}</Label>
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('member.invite.email_placeholder')}
              required
            />
          </div>

          {/* 이름 입력 */}
          <div className="space-y-2">
            <Label htmlFor="invite-name">{t('member.invite.name')}</Label>
            <Input
              id="invite-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('member.invite.name_placeholder')}
              required
            />
          </div>

          {/* 역할 선택 드롭다운 */}
          <div className="space-y-2">
            <Label>{t('member.invite.role')}</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  type="button"
                  className="w-full justify-start"
                >
                  {t(`member.role.${role}`)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {availableRoles.map((r) => (
                  <DropdownMenuItem key={r} onClick={() => setRole(r)}>
                    {t(`member.role.${r}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? t('member.invite.submitting')
              : t('member.invite.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
