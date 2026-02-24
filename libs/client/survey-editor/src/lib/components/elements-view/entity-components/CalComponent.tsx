'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createEntityComponent } from '@coltorapps/builder-react';
import { calEntity } from '@inquiry/survey-builder-config';
import type { I18nString } from '@inquiry/survey-builder-config';
import { Label, Input } from '@inquiry/client-ui';
import { ElementComponent } from '../ElementComponent';
import { LocalizedInput } from '../../shared/LocalizedInput';
import { useBuilderStoreContext } from '../BuilderStoreContext';

/**
 * Cal Entity 컴포넌트.
 * Cal.com 일정 예약 질문의 편집 UI를 제공한다.
 *
 * 기본 설정: headline
 * 고급 설정: calUserName (Cal.com 사용자명), calHost (Cal.com 호스트 URL)
 *
 * calHost가 비어 있으면 기본 Cal.com 호스트(cal.com)를 사용한다.
 */
export const CalComponent = createEntityComponent(calEntity, ({ entity }) => {
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

  /** calUserName 속성 변경 핸들러 */
  const handleCalUserNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      builderStore.setEntityAttribute(entityId, 'calUserName', e.target.value);
    },
    [builderStore, entityId]
  );

  /** calHost 속성 변경 핸들러. 빈 값이면 null로 설정한다. */
  const handleCalHostChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const host = e.target.value || null;
      builderStore.setEntityAttribute(entityId, 'calHost', host);
    },
    [builderStore, entityId]
  );

  return (
    <ElementComponent
      entityId={entityId}
      entityType="cal"
      typeLabel={t('surveyEditor.element.types.cal', 'Cal.com')}
      advancedSettings={
        <div className="space-y-3">
          {/* Cal.com 사용자명 입력 */}
          <div>
            <Label className="mb-1.5 block text-sm">
              {t('surveyEditor.element.calUserName', 'Cal.com Username')}
            </Label>
            <Input
              value={attrs.calUserName ?? ''}
              onChange={handleCalUserNameChange}
              placeholder={t(
                'surveyEditor.element.calUserNamePlaceholder',
                'your-username'
              )}
            />
          </div>

          {/* Cal.com 호스트 URL 입력 */}
          <div>
            <Label className="mb-1.5 block text-sm">
              {t('surveyEditor.element.calHost', 'Cal.com Host')}
            </Label>
            <Input
              value={attrs.calHost ?? ''}
              onChange={handleCalHostChange}
              placeholder={t(
                'surveyEditor.element.calHostPlaceholder',
                'cal.com'
              )}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t(
                'surveyEditor.element.calHostHint',
                'Leave empty to use default Cal.com host'
              )}
            </p>
          </div>
        </div>
      }
    >
      {/* 기본 설정: headline */}
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
      </div>
    </ElementComponent>
  );
});
