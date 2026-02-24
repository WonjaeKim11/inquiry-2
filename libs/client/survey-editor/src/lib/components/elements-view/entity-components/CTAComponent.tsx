'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createEntityComponent } from '@coltorapps/builder-react';
import { ctaEntity } from '@inquiry/survey-builder-config';
import type { I18nString } from '@inquiry/survey-builder-config';
import { Switch, Label, Input } from '@inquiry/client-ui';
import { ElementComponent } from '../ElementComponent';
import { LocalizedInput } from '../../shared/LocalizedInput';
import { useBuilderStoreContext } from '../BuilderStoreContext';

/** buttonLabel의 최대 문자 수 */
const BUTTON_LABEL_MAX_LENGTH = 48;

/**
 * CTA(Call To Action) Entity 컴포넌트.
 * 외부 링크 버튼이 포함된 안내 화면의 편집 UI를 제공한다.
 *
 * 기본 설정: headline, buttonLabel(48자 제한), buttonUrl
 * 고급 설정: dismissible 토글
 *
 * dismissible이 true이면 응답자가 CTA를 건너뛸 수 있다.
 */
export const CTAComponent = createEntityComponent(ctaEntity, ({ entity }) => {
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

  /** buttonLabel 속성 변경 핸들러 (48자 제한) */
  const handleButtonLabelChange = useCallback(
    (value: I18nString) => {
      builderStore.setEntityAttribute(entityId, 'buttonLabel', value);
    },
    [builderStore, entityId]
  );

  /** buttonUrl 속성 변경 핸들러 */
  const handleButtonUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const url = e.target.value || undefined;
      builderStore.setEntityAttribute(entityId, 'buttonUrl', url ?? null);
    },
    [builderStore, entityId]
  );

  /** dismissible 속성 토글 핸들러 */
  const handleDismissibleChange = useCallback(
    (checked: boolean) => {
      builderStore.setEntityAttribute(entityId, 'dismissible', checked);
    },
    [builderStore, entityId]
  );

  return (
    <ElementComponent
      entityId={entityId}
      entityType="cta"
      typeLabel={t('surveyEditor.element.types.cta', 'CTA')}
      advancedSettings={
        <div className="space-y-3">
          {/* 건너뛰기 허용 토글 */}
          <div className="flex items-center justify-between">
            <Label className="text-sm">
              {t('surveyEditor.element.dismissible', 'Allow Dismiss')}
            </Label>
            <Switch
              checked={attrs.dismissible ?? false}
              onCheckedChange={handleDismissibleChange}
            />
          </div>
        </div>
      }
    >
      {/* 기본 설정: headline, buttonLabel, buttonUrl */}
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
          value={attrs.buttonLabel as I18nString | undefined}
          onChange={handleButtonLabelChange}
          label={t('surveyEditor.element.buttonLabel', 'Button Label')}
          placeholder={t('surveyEditor.element.buttonLabelPlaceholder', 'Next')}
          maxLength={BUTTON_LABEL_MAX_LENGTH}
        />
        <div>
          <Label className="mb-1.5 block text-sm font-medium">
            {t('surveyEditor.element.buttonUrl', 'Button URL')}
          </Label>
          <Input
            value={attrs.buttonUrl ?? ''}
            onChange={handleButtonUrlChange}
            placeholder={t(
              'surveyEditor.element.buttonUrlPlaceholder',
              'https://example.com'
            )}
          />
        </div>
      </div>
    </ElementComponent>
  );
});
