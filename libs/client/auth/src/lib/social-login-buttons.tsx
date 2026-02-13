'use client';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3000/api';

/**
 * Google/GitHub 소셜 로그인 버튼.
 * 클릭 시 서버의 OAuth 시작 엔드포인트로 리다이렉트한다.
 */
export function SocialLoginButtons() {
  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div
        style={{
          textAlign: 'center',
          marginBottom: '1rem',
          color: '#666',
          borderTop: '1px solid #ddd',
          paddingTop: '1rem',
        }}
      >
        또는
      </div>
      <button
        type="button"
        onClick={() => {
          window.location.href = `${API_BASE_URL}/auth/google`;
        }}
        style={{
          width: '100%',
          padding: '0.75rem',
          marginBottom: '0.5rem',
          cursor: 'pointer',
          backgroundColor: '#4285f4',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
        }}
      >
        Google로 계속하기
      </button>
      <button
        type="button"
        onClick={() => {
          window.location.href = `${API_BASE_URL}/auth/github`;
        }}
        style={{
          width: '100%',
          padding: '0.75rem',
          cursor: 'pointer',
          backgroundColor: '#24292e',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
        }}
      >
        GitHub로 계속하기
      </button>
    </div>
  );
}
