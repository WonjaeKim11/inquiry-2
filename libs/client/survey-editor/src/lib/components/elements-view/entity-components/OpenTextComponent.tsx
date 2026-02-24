'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createEntityComponent } from '@coltorapps/builder-react';
import { openTextEntity } from '@inquiry/survey-builder-config';
import type { I18nString } from '@inquiry/survey-builder-config';
import {
  Switch,
  Label,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@inquiry/client-ui';
import { ElementComponent } from '../ElementComponent';
import { LocalizedInput } from '../../shared/LocalizedInput';
import { useBuilderStoreContext } from '../BuilderStoreContext';

/** inputType 속성에 허용되는 값 목록 */
const INPUT_TYPES = ['text', 'email', 'url', 'number', 'phone'] as const;

/**
 * OpenText Entity 컴포넌트.
 * 자유 텍스트 입력 질문의 편집 UI를 제공한다.
 *
 * 기본 설정: headline, placeholder
 * 고급 설정: inputType, longAnswer, charLimitEnabled, minLength, maxLength
 *
 * builderStore.setEntityAttribute를 통해 속성 값을 변경한다.
 */
export const OpenTextComponent = createEntityComponent(
  openTextEntity,
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

    /** placeholder 속성 변경 핸들러 */
    const handlePlaceholderChange = useCallback(
      (value: I18nString) => {
        builderStore.setEntityAttribute(entityId, 'placeholder', value);
      },
      [builderStore, entityId]
    );

    /** inputType 속성 변경 핸들러 */
    const handleInputTypeChange = useCallback(
      (value: string) => {
        builderStore.setEntityAttribute(
          entityId,
          'inputType',
          value as (typeof INPUT_TYPES)[number]
        );
      },
      [builderStore, entityId]
    );

    /** longAnswer 속성 토글 핸들러 */
    const handleLongAnswerChange = useCallback(
      (checked: boolean) => {
        builderStore.setEntityAttribute(entityId, 'longAnswer', checked);
      },
      [builderStore, entityId]
    );

    /** charLimitEnabled 속성 토글 핸들러 */
    const handleCharLimitEnabledChange = useCallback(
      (checked: boolean) => {
        builderStore.setEntityAttribute(entityId, 'charLimitEnabled', checked);
      },
      [builderStore, entityId]
    );

    /** minLength 속성 변경 핸들러. 빈 값이면 0으로 설정한다. */
    const handleMinLengthChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const num = e.target.value === '' ? 0 : Number(e.target.value);
        builderStore.setEntityAttribute(entityId, 'minLength', num);
      },
      [builderStore, entityId]
    );

    /** maxLength 속성 변경 핸들러. 빈 값이면 0으로 설정한다. */
    const handleMaxLengthChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const num = e.target.value === '' ? 0 : Number(e.target.value);
        builderStore.setEntityAttribute(entityId, 'maxLength', num);
      },
      [builderStore, entityId]
    );

    return (
      <ElementComponent
        entityId={entityId}
        entityType="openText"
        typeLabel={t('surveyEditor.element.types.openText', 'Open Text')}
        advancedSettings={
          <div className="space-y-3">
            {/* 입력 타입 선택 */}
            <div>
              <Label className="mb-1.5 block text-sm">
                {t('surveyEditor.element.inputType', 'Input Type')}
              </Label>
              <Select
                value={attrs.inputType ?? 'text'}
                onValueChange={handleInputTypeChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INPUT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`surveyEditor.element.inputTypes.${type}`, type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 장문 응답 토글 */}
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                {t('surveyEditor.element.longAnswer', 'Long Answer')}
              </Label>
              <Switch
                checked={attrs.longAnswer ?? false}
                onCheckedChange={handleLongAnswerChange}
              />
            </div>

            {/* 문자 수 제한 토글 */}
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                {t('surveyEditor.element.charLimit', 'Character Limit')}
              </Label>
              <Switch
                checked={attrs.charLimitEnabled ?? false}
                onCheckedChange={handleCharLimitEnabledChange}
              />
            </div>

            {/* charLimitEnabled일 때만 최소/최대 길이 입력 표시 */}
            {attrs.charLimitEnabled && (
              <div className="flex gap-3">
                <div className="flex-1">
                  <Label className="mb-1 block text-xs">
                    {t('surveyEditor.element.minLength', 'Min')}
                  </Label>
                  <Input
                    type="number"
                    value={attrs.minLength ?? ''}
                    onChange={handleMinLengthChange}
                    className="h-8"
                  />
                </div>
                <div className="flex-1">
                  <Label className="mb-1 block text-xs">
                    {t('surveyEditor.element.maxLength', 'Max')}
                  </Label>
                  <Input
                    type="number"
                    value={attrs.maxLength ?? ''}
                    onChange={handleMaxLengthChange}
                    className="h-8"
                  />
                </div>
              </div>
            )}
          </div>
        }
      >
        {/* 기본 설정: headline + placeholder */}
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
            value={attrs.placeholder as I18nString | undefined}
            onChange={handlePlaceholderChange}
            label={t('surveyEditor.element.placeholder', 'Placeholder')}
            placeholder={t(
              'surveyEditor.element.placeholderPlaceholder',
              'Type placeholder text...'
            )}
          />
        </div>
      </ElementComponent>
    );
  }
);
