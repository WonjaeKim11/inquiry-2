'use client';

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@inquiry/client-ui';

/**
 * 다국어 설정 카드.
 * 최소 UI만 구현하고, 상세 기능은 @inquiry/client-multilingual의 EditorLanguageSelector를 활용한다.
 * 현재는 설문 언어 설정에 대한 간단한 안내만 표시한다.
 */
export function LanguageSettingsCard() {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">
          {t('surveyEditor.element.languageSettings', 'Language Settings')}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2">
        <p className="text-xs text-muted-foreground">
          {t(
            'surveyEditor.element.languageSettingsDesc',
            'Configure survey languages from the menu bar.'
          )}
        </p>
      </CardContent>
    </Card>
  );
}
