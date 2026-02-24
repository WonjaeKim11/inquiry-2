'use client';

import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
} from '@inquiry/client-ui';
import { isRtlLanguage } from '@inquiry/survey-builder-config';
import type { LanguageWithConfig, EditingLanguageContext } from '../types';

/**
 * 설문 에디터 헤더에 표시되는 언어 선택 드롭다운.
 * 활성화된 언어 목록을 보여주고, 편집할 언어를 전환할 수 있게 한다.
 */
export function EditorLanguageSelector({
  languages,
  editingContext,
  onSelectLanguage,
}: {
  /** 활성화된 언어 목록 */
  languages: LanguageWithConfig[];
  /** 현재 편집 중인 언어 컨텍스트 */
  editingContext: EditingLanguageContext | null;
  /** 언어 선택 시 호출되는 콜백 */
  onSelectLanguage: (ctx: EditingLanguageContext) => void;
}) {
  const { t } = useTranslation();

  // 활성화된 언어만 표시
  const enabledLanguages = languages.filter((l) => l.isEnabled || l.isDefault);

  if (enabledLanguages.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {t('multilingual.editing_language')}
      </span>
      <Select
        value={editingContext?.languageId ?? ''}
        onValueChange={(languageId) => {
          const found = enabledLanguages.find(
            (l) => l.language.id === languageId
          );
          if (found) {
            onSelectLanguage({
              languageId: found.language.id,
              code: found.language.code,
              isRtl: isRtlLanguage(found.language.code),
            });
          }
        }}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={t('multilingual.editing_language')} />
        </SelectTrigger>
        <SelectContent>
          {enabledLanguages.map((l) => (
            <SelectItem key={l.language.id} value={l.language.id}>
              <span className="flex items-center gap-2">
                <span>{l.language.alias ?? l.language.code}</span>
                <code className="text-xs text-muted-foreground">
                  {l.language.code}
                </code>
                {isRtlLanguage(l.language.code) && (
                  <Badge variant="outline" className="text-xs">
                    RTL
                  </Badge>
                )}
                {l.isDefault && (
                  <Badge variant="secondary" className="text-xs">
                    {t('multilingual.default_language')}
                  </Badge>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
