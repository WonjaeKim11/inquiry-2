'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@inquiry/client-core';

/**
 * 로그아웃 처리 컴포넌트.
 * 마운트 시 자동으로 로그아웃하고 로그인 페이지로 안내한다.
 */
export function LogoutPage() {
  const { logout } = useAuth();
  const [done, setDone] = useState(false);

  useEffect(() => {
    logout().then(() => setDone(true)).catch(() => setDone(true));
  }, [logout]);

  if (!done) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <p>로그아웃 처리 중...</p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>로그아웃 완료</h1>
      <p style={{ marginTop: '1rem' }}>성공적으로 로그아웃되었습니다.</p>
      <p style={{ marginTop: '1.5rem' }}>
        <a href="/auth/login">다시 로그인하기</a>
      </p>
    </div>
  );
}
