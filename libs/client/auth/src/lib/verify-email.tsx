'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@inquiry/client-core';
import { useTranslation } from 'react-i18next';

/**
 * 이메일 검증 컴포넌트.
 * URL의 ?token= 파라미터를 추출하여 서버에 검증 요청을 보낸다.
 */
export function VerifyEmail() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const { t } = useTranslation();
  const [message, setMessage] = useState(t('auth.verify_email.processing'));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage(t('auth.verify_email.missing_token'));
      return;
    }

    apiFetch('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setMessage(data.message || t('auth.verify_email.success_default'));
        } else {
          setStatus('error');
          setMessage(data.message || t('auth.verify_email.fail_default'));
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage(t('auth.verify_email.error'));
      });
  }, [t]);

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      <h1>{t('auth.verify_email.title')}</h1>
      <p
        style={{
          marginTop: '1rem',
          color: status === 'error' ? 'red' : status === 'success' ? 'green' : '#555',
        }}
      >
        {message}
      </p>
      {status !== 'loading' && (
        <p style={{ marginTop: '1.5rem' }}>
          <a href="/auth/login">{t('auth.verify_email.to_login')}</a>
        </p>
      )}
    </div>
  );
}
