'use client';

import { use } from 'react';
import { useTranslation } from 'react-i18next';
import { ContactList, AttributeKeyManager } from '@inquiry/client-contact';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@inquiry/client-ui';

interface ContactsPageProps {
  params: Promise<{ lng: string; projectId: string; envId: string }>;
}

/**
 * 연락처 관리 메인 페이지.
 * 연락처 목록과 속성 키 관리를 탭으로 분리한다.
 */
export default function ContactsPage({ params }: ContactsPageProps) {
  const { envId } = use(params);
  const { t } = useTranslation('translation');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('contact.title')}</h1>
        <p className="text-muted-foreground">{t('contact.description')}</p>
      </div>

      <Tabs defaultValue="contacts">
        <TabsList>
          <TabsTrigger value="contacts">{t('contact.title')}</TabsTrigger>
          <TabsTrigger value="attributes">
            {t('contact.attribute.title')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="contacts" className="mt-4">
          <ContactList envId={envId} />
        </TabsContent>
        <TabsContent value="attributes" className="mt-4">
          <AttributeKeyManager envId={envId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
