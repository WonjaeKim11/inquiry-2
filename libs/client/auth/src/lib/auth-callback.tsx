'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@inquiry/client-core';
import { useTranslation } from 'react-i18next';

/**
 * OAuth 콜백 처리 컴포넌트.
 * URL 쿼리 파라미터에서 accessToken을 추출하여 AuthProvider에 전달하고,
 * 성공 시 메인 페이지로 리다이렉트한다.
 */
export function AuthCallback() {
  const { handleOAuthCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');

    if (!accessToken) {
      setError(t('auth.callback.no_token'));
      return;
    }

    handleOAuthCallback(accessToken)
      .then(() => {
        // URL에서 토큰 파라미터 제거 후 메인으로 이동
        window.location.href = '/';
      })
      .catch(() => {
        setError(t('auth.callback.error'));
      });
  }, [handleOAuthCallback]);

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p style={{ color: 'red' }}>{error}</p>
        <a href="/auth/login">{t('auth.callback.back_to_login')}</a>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <p>{t('auth.callback.processing')}</p>
    </div>
  );
}
