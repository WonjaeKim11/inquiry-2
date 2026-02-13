import './global.css';
import { AuthProvider } from '@inquiry/client-core';

export const metadata = {
  title: 'Inquiry',
  description: 'Inquiry Application',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
