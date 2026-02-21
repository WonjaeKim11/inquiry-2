import { redirect } from 'next/navigation';

/** 기존 /signup 경로 → /auth/signup 으로 리다이렉트 */
export default function SignupRedirect() {
  redirect('/auth/signup');
}
