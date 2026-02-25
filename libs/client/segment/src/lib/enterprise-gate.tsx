'use client';

import { useTranslation } from 'react-i18next';

/**
 * Enterprise 라이선스 미활성 시 안내 컴포넌트.
 * 세그먼트 기능 사용을 위해 Enterprise 라이선스가 필요하다는 메시지를 표시한다.
 */
export function EnterpriseGate() {
  const { t } = useTranslation('translation');

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <h2 className="text-xl font-semibold">
        {t('segment.license.required_title')}
      </h2>
      <p className="text-muted-foreground text-center max-w-md">
        {t('segment.license.required_message')}
      </p>
    </div>
  );
}
