'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@inquiry/client-core';

/**
 * 이메일 검증 컴포넌트.
 * URL의 ?token= 파라미터를 추출하여 서버에 검증 요청을 보낸다.
 */
export function VerifyEmail() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('이메일 인증 처리 중...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('인증 토큰이 없습니다. 유효한 링크인지 확인해주세요.');
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
          setMessage(data.message || '이메일 인증이 완료되었습니다.');
        } else {
          setStatus('error');
          setMessage(data.message || '이메일 인증에 실패했습니다.');
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage('이메일 인증 처리 중 오류가 발생했습니다.');
      });
  }, []);

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
      <h1>이메일 인증</h1>
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
          <a href="/auth/login">로그인 페이지로 이동</a>
        </p>
      )}
    </div>
  );
}
