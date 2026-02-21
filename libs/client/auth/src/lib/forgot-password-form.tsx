'use client';

import { useState } from 'react';
import { z } from 'zod';
import { apiFetch } from '@inquiry/client-core';
import { useTranslation } from 'react-i18next';

const forgotPasswordSchema = z.object({
  email: z.string().email('auth.forgot_password.invalid_email').max(255),
});

/**
 * 비밀번호 재설정 요청 폼.
 * 이메일을 입력하면 서버에서 재설정 링크를 발송한다.
 */
export function ForgotPasswordForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(t(result.error.issues[0].message));
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('auth.forgot_password.fail'));
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.forgot_password.fail'));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{ maxWidth: 400, margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
        <h1>{t('auth.forgot_password.check_email_title')}</h1>
        <p style={{ marginTop: '1rem', color: '#555' }}>
          {t('auth.forgot_password.email_sent_1', { email: <strong>{email}</strong> })}
          <br />
          {t('auth.forgot_password.email_sent_2')}
        </p>
        <p style={{ marginTop: '1.5rem' }}>
          <a href="/auth/login">{t('auth.forgot_password.back_to_login')}</a>
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: '2rem' }}>
      <h1>{t('auth.forgot_password.title')}</h1>
      <p style={{ color: '#555', marginBottom: '1.5rem' }}>
        {t('auth.forgot_password.description')}
      </p>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email">{t('auth.forgot_password.email_label')}</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            required
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </div>
        {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '0.75rem', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? t('auth.forgot_password.processing') : t('auth.forgot_password.submit')}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '1rem' }}>
        <a href="/auth/login">{t('auth.forgot_password.back_to_login')}</a>
      </p>
    </div>
  );
}
