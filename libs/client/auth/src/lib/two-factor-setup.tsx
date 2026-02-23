'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '@inquiry/client-core';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Alert,
  AlertDescription,
  Badge,
} from '@inquiry/client-ui';

/** 2FA 활성화 API 응답 데이터 */
interface TwoFactorEnableData {
  secret: string;
  qrCodeUri: string;
  backupCodes: string[];
}

/** 컴포넌트 내부 상태 */
type SetupState =
  | { phase: 'loading' }
  | { phase: 'disabled' }
  | { phase: 'enabled' }
  | { phase: 'setup'; data: TwoFactorEnableData }
  | { phase: 'error'; message: string };

/**
 * 2단계 인증(2FA) 설정 컴포넌트.
 * GET /api/auth/2fa/status로 현재 상태를 확인하고,
 * 활성화/비활성화 토글 및 QR 코드 기반 설정 흐름을 제공한다.
 *
 * 비활성 상태: "2FA 활성화" 버튼 → QR 코드 + Secret + Backup Codes 표시
 * 활성 상태: 상태 뱃지 + "2FA 비활성화" 버튼
 */
export function TwoFactorSetup() {
  const { t } = useTranslation();
  const [state, setState] = useState<SetupState>({ phase: 'loading' });
  const [actionLoading, setActionLoading] = useState(false);

  /** 2FA 상태를 서버에서 조회한다 */
  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiFetch('/auth/2fa/status');
      if (!res.ok) {
        const error = await res.json();
        setState({
          phase: 'error',
          message: error.message || 'Failed to load status',
        });
        return;
      }
      const { data } = await res.json();
      setState({ phase: data.twoFactorEnabled ? 'enabled' : 'disabled' });
    } catch {
      setState({ phase: 'error', message: 'Failed to load 2FA status' });
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  /**
   * 2FA 활성화를 요청하고 QR 코드 및 백업 코드를 표시한다.
   * 라이선스 미지원 시 서버가 에러를 반환하면 feature_unavailable 메시지를 표시한다.
   */
  const handleEnable = async () => {
    setActionLoading(true);
    try {
      const res = await apiFetch('/auth/2fa/enable', { method: 'POST' });
      if (!res.ok) {
        const error = await res.json();
        // 라이선스 미지원 등의 에러 처리
        setState({
          phase: 'error',
          message: error.message || t('auth.two_factor.feature_unavailable'),
        });
        return;
      }
      const { data } = await res.json();
      setState({ phase: 'setup', data });
    } catch {
      setState({
        phase: 'error',
        message: t('auth.two_factor.feature_unavailable'),
      });
    } finally {
      setActionLoading(false);
    }
  };

  /**
   * 2FA 비활성화를 요청한다.
   * 확인 다이얼로그를 표시한 후 서버에 요청한다.
   */
  const handleDisable = async () => {
    // 사용자에게 비활성화 확인
    const confirmed = window.confirm(t('auth.two_factor.confirm_disable'));
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const res = await apiFetch('/auth/2fa/disable', { method: 'POST' });
      if (!res.ok) {
        const error = await res.json();
        setState({ phase: 'error', message: error.message });
        return;
      }
      setState({ phase: 'disabled' });
    } catch {
      setState({ phase: 'error', message: 'Failed to disable 2FA' });
    } finally {
      setActionLoading(false);
    }
  };

  /** 설정 완료 후 활성 상태로 전환 */
  const handleSetupDone = () => {
    setState({ phase: 'enabled' });
  };

  // 로딩 상태
  if (state.phase === 'loading') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        </CardContent>
      </Card>
    );
  }

  // 에러 상태
  if (state.phase === 'error') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('auth.two_factor.title')}</CardTitle>
          <CardDescription>{t('auth.two_factor.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
          <Button variant="outline" className="mt-4" onClick={fetchStatus}>
            {t('auth.two_factor.done')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // QR 코드 설정 단계
  if (state.phase === 'setup') {
    const qrUrl = `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(
      state.data.qrCodeUri
    )}`;

    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('auth.two_factor.setup_title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* QR 코드 */}
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-muted-foreground">
              {t('auth.two_factor.scan_qr')}
            </p>
            <img
              src={qrUrl}
              alt="2FA QR Code"
              width={200}
              height={200}
              className="rounded border"
            />
          </div>

          {/* 수동 입력용 시크릿 키 */}
          <div>
            <p className="text-sm text-muted-foreground">
              {t('auth.two_factor.manual_entry')}
            </p>
            <code className="mt-1 block rounded bg-muted px-3 py-2 text-sm font-mono break-all select-all">
              {state.data.secret}
            </code>
          </div>

          {/* 백업 코드 목록 */}
          <div>
            <h4 className="text-sm font-semibold">
              {t('auth.two_factor.backup_codes_title')}
            </h4>
            <p className="text-xs text-muted-foreground mb-2">
              {t('auth.two_factor.backup_codes_description')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {state.data.backupCodes.map((code) => (
                <code
                  key={code}
                  className="rounded bg-muted px-2 py-1 text-center text-sm font-mono select-all"
                >
                  {code}
                </code>
              ))}
            </div>
          </div>

          <Button onClick={handleSetupDone} className="w-full">
            {t('auth.two_factor.done')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 활성/비활성 상태
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('auth.two_factor.title')}</CardTitle>
        <CardDescription>{t('auth.two_factor.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          {state.phase === 'enabled' ? (
            <Badge variant="default" className="bg-green-600">
              {t('auth.two_factor.enabled')}
            </Badge>
          ) : (
            <Badge variant="secondary">{t('auth.two_factor.disabled')}</Badge>
          )}
        </div>

        {state.phase === 'enabled' ? (
          <Button
            variant="destructive"
            onClick={handleDisable}
            disabled={actionLoading}
          >
            {t('auth.two_factor.disable_button')}
          </Button>
        ) : (
          <Button onClick={handleEnable} disabled={actionLoading}>
            {t('auth.two_factor.enable_button')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
