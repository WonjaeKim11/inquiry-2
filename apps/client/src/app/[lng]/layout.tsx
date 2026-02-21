import '../global.css';
import { AuthProvider } from '@inquiry/client-core';
import { dir } from 'i18next';
import { languages } from '../i18n/settings';

export async function generateStaticParams() {
  return languages.map((lng) => ({ lng }));
}

export const metadata = {
  title: 'Inquiry',
  description: 'Inquiry Application',
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ lng: string }>;
};

export default async function RootLayout(props: Props) {
  const { lng } = await props.params;
  const { children } = props;

  return (
    <html lang={lng} dir={dir(lng)}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
