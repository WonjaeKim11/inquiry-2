'use client';

import { useTranslation } from 'react-i18next';
import { Card } from '@inquiry/client-ui';

/**
 * Enterprise 라이선스 미활성 시 안내 컴포넌트.
 * 연락처 관리 기능이 Enterprise 전용임을 사용자에게 알린다.
 */
export function EnterpriseGate() {
  const { t } = useTranslation('translation');

  return (
    <Card className="p-8 text-center">
      <h2 className="text-xl font-semibold mb-2">
        {t('contact.license.required_title')}
      </h2>
      <p className="text-muted-foreground">
        {t('contact.license.required_message')}
      </p>
    </Card>
  );
}
