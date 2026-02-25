'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@inquiry/client-ui';

interface ContactSearchProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * 연락처 검색 입력 컴포넌트.
 * 300ms debounce를 적용하여 불필요한 API 호출을 줄인다.
 */
export function ContactSearch({ value, onChange }: ContactSearchProps) {
  const { t } = useTranslation('translation');
  const [local, setLocal] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (local !== value) {
        onChange(local);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [local, value, onChange]);

  return (
    <Input
      placeholder={t('contact.list.search_placeholder')}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      className="max-w-sm"
    />
  );
}
