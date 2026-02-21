'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@inquiry/client-core';
import { useTranslation } from 'react-i18next';

/**
 * 로그아웃 처리 컴포넌트.
 * 마운트 시 자동으로 로그아웃하고 로그인 페이지로 안내한다.
 */
export function LogoutPage() {
  const { logout } = useAuth();
  const [done, setDone] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    logout().then(() => setDone(true)).catch(() => setDone(true));
  }, [logout]);

  if (!done) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>{t('auth.logout.processing')}</p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>{t('auth.logout.complete')}</h1>
      <p style={{ marginTop: '1rem' }}>{t('auth.logout.success_message')}</p>
      <p style={{ marginTop: '1.5rem' }}>
        <a href="/auth/login">{t('auth.logout.relogin')}</a>
      </p>
    </div>
  );
}
