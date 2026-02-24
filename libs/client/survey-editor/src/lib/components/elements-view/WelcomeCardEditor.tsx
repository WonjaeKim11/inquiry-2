'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Switch,
  Label,
} from '@inquiry/client-ui';
import type { WelcomeCard } from '@inquiry/survey-builder-config';
import { useSurveyMeta } from '../../hooks/use-survey-meta';
import { LocalizedInput } from '../shared/LocalizedInput';
import { FileUploadInput } from '../shared/FileUploadInput';

/**
 * Welcome Card 편집기.
 * SurveyMetaContext의 welcomeCard를 편집한다.
 * 7가지 속성을 관리한다:
 *  - enabled: 카드 표시 여부
 *  - headline: 헤드라인 텍스트 (I18nString)
 *  - html: 부제목/설명 텍스트 (I18nString, multiline)
 *  - fileUrl: 이미지 URL
 *  - buttonLabel: 시작 버튼 텍스트 (I18nString, 최대 48자)
 *  - showResponseCount: 응답 수 표시 여부 (link 유형만)
 *  - timeToFinish: 예상 소요 시간 표시 여부
 */
export function WelcomeCardEditor() {
  const { t } = useTranslation();
  const { welcomeCard, updateWelcomeCard, type: surveyType } = useSurveyMeta();

  /**
   * welcomeCard 부분 업데이트 헬퍼.
   * 기존 welcomeCard 객체를 복사한 뒤 지정 키의 값만 갱신하여 업데이트한다.
   */
  const updateField = useCallback(
    <K extends keyof WelcomeCard>(key: K, value: WelcomeCard[K]) => {
      updateWelcomeCard({ ...welcomeCard, [key]: value });
    },
    [welcomeCard, updateWelcomeCard]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <CardTitle className="text-sm">
          {t('surveyEditor.welcomeCard.title', 'Welcome Card')}
        </CardTitle>
        <Switch
          checked={welcomeCard.enabled}
          onCheckedChange={(v) => updateField('enabled', v)}
        />
      </CardHeader>

      {welcomeCard.enabled && (
        <CardContent className="space-y-4 pt-0">
          {/* 헤드라인 입력 */}
          <LocalizedInput
            value={welcomeCard.headline}
            onChange={(v) => updateField('headline', v)}
            label={t('surveyEditor.welcomeCard.headline', 'Headline')}
            placeholder={t(
              'surveyEditor.welcomeCard.headlinePlaceholder',
              'Welcome!'
            )}
          />

          {/* 부제목 입력 (여러 줄) */}
          <LocalizedInput
            value={welcomeCard.html}
            onChange={(v) => updateField('html', v)}
            label={t('surveyEditor.welcomeCard.subtitle', 'Subtitle')}
            placeholder={t(
              'surveyEditor.welcomeCard.subtitlePlaceholder',
              'Subtitle text...'
            )}
            multiline
          />

          {/* 이미지 URL 입력 */}
          <FileUploadInput
            value={welcomeCard.fileUrl}
            onChange={(v) => updateField('fileUrl', v)}
            label={t('surveyEditor.welcomeCard.image', 'Image')}
          />

          {/* 시작 버튼 텍스트 (최대 48자 제한) */}
          <LocalizedInput
            value={welcomeCard.buttonLabel}
            onChange={(v) => updateField('buttonLabel', v)}
            label={t('surveyEditor.welcomeCard.buttonLabel', 'Button Label')}
            maxLength={48}
          />

          {/* showResponseCount: link 유형 설문에서만 표시 */}
          {surveyType === 'link' && (
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                {t(
                  'surveyEditor.welcomeCard.showResponseCount',
                  'Show Response Count'
                )}
              </Label>
              <Switch
                checked={welcomeCard.showResponseCount ?? false}
                onCheckedChange={(v) => updateField('showResponseCount', v)}
              />
            </div>
          )}

          {/* 예상 소요 시간 표시 토글 */}
          <div className="flex items-center justify-between">
            <Label className="text-sm">
              {t('surveyEditor.welcomeCard.timeToFinish', 'Time to Finish')}
            </Label>
            <Switch
              checked={welcomeCard.timeToFinish ?? false}
              onCheckedChange={(v) => updateField('timeToFinish', v)}
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
}
