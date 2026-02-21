'use client';

import { useState } from 'react';
import { z } from 'zod';
import { apiFetch } from '@inquiry/client-core';
import { useTranslation } from 'react-i18next';

/**
 * 비밀번호 재설정 폼 검증 스키마.
 * 서버 DTO 규칙과 동기화되어야 한다.
 */
const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'auth.reset_password.min_length')
      .max(128, 'auth.reset_password.max_length')
      .regex(/[A-Z]/, 'auth.reset_password.require_uppercase')
      .regex(/[0-9]/, 'auth.reset_password.require_number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.reset_password.password_mismatch',
    path: ['confirmPassword'],
  });

/**
 * 비밀번호 재설정 폼.
 * URL의 ?token= 파라미터와 새 비밀번호를 서버에 전송한다.
 */
export function ResetPasswordForm() {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      setError(t(result.error.issues[0].message));
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      setError(t('auth.reset_password.no_token'));
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('auth.reset_password.fail'));
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.reset_password.fail'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ maxWidth: 400, margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
        <h1>{t('auth.reset_password.success_title')}</h1>
        <p style={{ marginTop: '1rem', color: 'green' }}>
          {t('auth.reset_password.success_message')}
        </p>
        <p style={{ marginTop: '1.5rem' }}>
          <a href="/auth/login">{t('auth.reset_password.login_new_password')}</a>
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: '2rem' }}>
      <h1>{t('auth.reset_password.title')}</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password">{t('auth.reset_password.new_password')}</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.reset_password.password_placeholder')}
            required
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="confirmPassword">{t('auth.reset_password.confirm_password')}</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('auth.reset_password.confirm_password_placeholder')}
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
          {loading ? t('auth.reset_password.processing') : t('auth.reset_password.submit')}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '1rem' }}>
        <a href="/auth/login">{t('auth.reset_password.back_to_login')}</a>
      </p>
    </div>
  );
}
