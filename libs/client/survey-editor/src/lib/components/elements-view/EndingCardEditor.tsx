'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { SurveyEnding } from '@inquiry/survey-builder-config';
import { Card, CardContent, Input, Label } from '@inquiry/client-ui';
import { OptionsSwitch } from '../shared/OptionsSwitch';
import { LocalizedInput } from '../shared/LocalizedInput';
import { FileUploadInput } from '../shared/FileUploadInput';

interface EndingCardEditorProps {
  /** 편집할 종료 카드 데이터 */
  ending: SurveyEnding;
  /** 종료 카드 변경 콜백. 변경된 전체 객체를 전달한다 */
  onChange: (ending: SurveyEnding) => void;
  /** 목록 내 인덱스 (카드 번호 표시용) */
  index: number;
}

/**
 * 단일 Ending Card 편집기.
 * endScreen / redirectToUrl 두 가지 유형을 OptionsSwitch로 전환하며,
 * 유형에 따라 다른 편집 필드를 렌더링한다.
 *
 * endScreen: headline, subheader, buttonLabel, buttonLink, imageUrl
 * redirectToUrl: redirectUrl
 */
export function EndingCardEditor({
  ending,
  onChange,
  index,
}: EndingCardEditorProps) {
  const { t } = useTranslation();

  /**
   * ending 부분 업데이트 헬퍼.
   * 기존 ending 객체를 복사한 뒤 지정 키의 값만 갱신한다.
   */
  const updateField = useCallback(
    <K extends keyof SurveyEnding>(key: K, value: SurveyEnding[K]) => {
      onChange({ ...ending, [key]: value });
    },
    [ending, onChange]
  );

  /** OptionsSwitch에 전달할 유형 옵션 배열 */
  const typeOptions = [
    {
      value: 'endScreen' as const,
      label: t('surveyEditor.ending.endScreen', 'End Screen'),
    },
    {
      value: 'redirectToUrl' as const,
      label: t('surveyEditor.ending.redirectToUrl', 'Redirect to URL'),
    },
  ];

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        {/* 카드 번호 + 유형 전환 스위치 */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {t('surveyEditor.ending.cardTitle', 'Ending Card')} #{index + 1}
          </span>
          <OptionsSwitch
            value={ending.type}
            onChange={(v) => updateField('type', v)}
            options={typeOptions}
          />
        </div>

        {/* endScreen 유형 필드들 */}
        {ending.type === 'endScreen' && (
          <>
            <LocalizedInput
              value={ending.headline}
              onChange={(v) => updateField('headline', v)}
              label={t('surveyEditor.ending.headline', 'Headline')}
            />
            <LocalizedInput
              value={ending.subheader}
              onChange={(v) => updateField('subheader', v)}
              label={t('surveyEditor.ending.subheader', 'Subheader')}
              multiline
            />
            <LocalizedInput
              value={ending.buttonLabel}
              onChange={(v) => updateField('buttonLabel', v)}
              label={t('surveyEditor.ending.buttonLabel', 'Button Label')}
            />
            <div>
              <Label className="mb-1.5 block text-sm">
                {t('surveyEditor.ending.buttonLink', 'Button Link')}
              </Label>
              <Input
                value={ending.buttonLink ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  updateField('buttonLink', e.target.value || undefined)
                }
                placeholder="https://..."
              />
            </div>
            <FileUploadInput
              value={ending.imageUrl}
              onChange={(v) => updateField('imageUrl', v)}
              label={t('surveyEditor.ending.image', 'Image')}
            />
          </>
        )}

        {/* redirectToUrl 유형 필드 */}
        {ending.type === 'redirectToUrl' && (
          <div>
            <Label className="mb-1.5 block text-sm">
              {t('surveyEditor.ending.redirectUrl', 'Redirect URL')}
            </Label>
            <Input
              value={ending.redirectUrl ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateField('redirectUrl', e.target.value || undefined)
              }
              placeholder="https://..."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
