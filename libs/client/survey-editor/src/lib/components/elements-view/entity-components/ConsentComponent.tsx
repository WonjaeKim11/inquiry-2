'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createEntityComponent } from '@coltorapps/builder-react';
import { consentEntity } from '@inquiry/survey-builder-config';
import type { I18nString } from '@inquiry/survey-builder-config';
import { Switch, Label } from '@inquiry/client-ui';
import { ElementComponent } from '../ElementComponent';
import { LocalizedInput } from '../../shared/LocalizedInput';
import { useBuilderStoreContext } from '../BuilderStoreContext';

/**
 * Consent Entity 컴포넌트.
 * 동의/약관 확인 질문의 편집 UI를 제공한다.
 *
 * 기본 설정: headline, label(동의 문구, multiline)
 * 고급 설정: required 토글 (기본 true)
 *
 * label은 HTML 텍스트를 지원하는 다국어 문자열이다.
 */
export const ConsentComponent = createEntityComponent(
  consentEntity,
  ({ entity }) => {
    const { t } = useTranslation();
    const { builderStore } = useBuilderStoreContext();
    const entityId = entity.id;
    const attrs = entity.attributes;

    /** headline 속성 변경 핸들러 */
    const handleHeadlineChange = useCallback(
      (value: I18nString) => {
        builderStore.setEntityAttribute(entityId, 'headline', value);
      },
      [builderStore, entityId]
    );

    /** label 속성 변경 핸들러 (동의 문구, HTML 텍스트) */
    const handleLabelChange = useCallback(
      (value: I18nString) => {
        builderStore.setEntityAttribute(entityId, 'label', value);
      },
      [builderStore, entityId]
    );

    /** required 속성 토글 핸들러 */
    const handleRequiredChange = useCallback(
      (checked: boolean) => {
        builderStore.setEntityAttribute(entityId, 'required', checked);
      },
      [builderStore, entityId]
    );

    return (
      <ElementComponent
        entityId={entityId}
        entityType="consent"
        typeLabel={t('surveyEditor.element.types.consent', 'Consent')}
        advancedSettings={
          <div className="space-y-3">
            {/* 필수 응답 토글 */}
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                {t('surveyEditor.element.required', 'Required')}
              </Label>
              <Switch
                checked={attrs.required ?? true}
                onCheckedChange={handleRequiredChange}
              />
            </div>
          </div>
        }
      >
        {/* 기본 설정: headline + label(동의 문구) */}
        <div className="space-y-3">
          <LocalizedInput
            value={attrs.headline as I18nString | undefined}
            onChange={handleHeadlineChange}
            label={t('surveyEditor.element.headline', 'Question')}
            placeholder={t(
              'surveyEditor.element.headlinePlaceholder',
              'Enter your question...'
            )}
          />
          <LocalizedInput
            value={attrs.label as I18nString | undefined}
            onChange={handleLabelChange}
            label={t('surveyEditor.element.consentLabel', 'Consent Text')}
            placeholder={t(
              'surveyEditor.element.consentLabelPlaceholder',
              'I agree to...'
            )}
            multiline
          />
        </div>
      </ElementComponent>
    );
  }
);
