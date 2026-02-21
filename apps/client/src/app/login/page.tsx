import { redirect } from 'next/navigation';

/** 기존 /login 경로 → /auth/login 으로 리다이렉트 */
export default function LoginRedirect() {
  redirect('/auth/login');
}
