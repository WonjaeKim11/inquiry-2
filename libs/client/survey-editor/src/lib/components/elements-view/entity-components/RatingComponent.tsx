'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createEntityComponent } from '@coltorapps/builder-react';
import { ratingEntity } from '@inquiry/survey-builder-config';
import type { I18nString } from '@inquiry/survey-builder-config';
import {
  Switch,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@inquiry/client-ui';
import { ElementComponent } from '../ElementComponent';
import { LocalizedInput } from '../../shared/LocalizedInput';
import { useBuilderStoreContext } from '../BuilderStoreContext';

/** scale 속성에 허용되는 값 목록 */
const SCALE_TYPES = ['smiley', 'star', 'number'] as const;

/** range 속성에 허용되는 값 (3~10) */
const RANGE_VALUES = [3, 4, 5, 6, 7, 8, 9, 10] as const;

/**
 * Rating Entity 컴포넌트.
 * 별점/이모지/숫자 등 척도 기반 평가 질문의 편집 UI를 제공한다.
 *
 * 기본 설정: headline, scale(척도 유형), range(범위)
 * 고급 설정: lowerLabel, upperLabel, isColorCodingEnabled
 */
export const RatingComponent = createEntityComponent(
  ratingEntity,
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

    /** scale 속성 변경 핸들러 */
    const handleScaleChange = useCallback(
      (value: string) => {
        builderStore.setEntityAttribute(
          entityId,
          'scale',
          value as (typeof SCALE_TYPES)[number]
        );
      },
      [builderStore, entityId]
    );

    /** range 속성 변경 핸들러 */
    const handleRangeChange = useCallback(
      (value: string) => {
        builderStore.setEntityAttribute(entityId, 'range', Number(value));
      },
      [builderStore, entityId]
    );

    /** lowerLabel 속성 변경 핸들러 */
    const handleLowerLabelChange = useCallback(
      (value: I18nString) => {
        builderStore.setEntityAttribute(entityId, 'lowerLabel', value);
      },
      [builderStore, entityId]
    );

    /** upperLabel 속성 변경 핸들러 */
    const handleUpperLabelChange = useCallback(
      (value: I18nString) => {
        builderStore.setEntityAttribute(entityId, 'upperLabel', value);
      },
      [builderStore, entityId]
    );

    /** isColorCodingEnabled 속성 토글 핸들러 */
    const handleColorCodingChange = useCallback(
      (checked: boolean) => {
        builderStore.setEntityAttribute(
          entityId,
          'isColorCodingEnabled',
          checked
        );
      },
      [builderStore, entityId]
    );

    return (
      <ElementComponent
        entityId={entityId}
        entityType="rating"
        typeLabel={t('surveyEditor.element.types.rating', 'Rating')}
        advancedSettings={
          <div className="space-y-3">
            {/* 하단 라벨 */}
            <LocalizedInput
              value={attrs.lowerLabel as I18nString | undefined}
              onChange={handleLowerLabelChange}
              label={t('surveyEditor.element.lowerLabel', 'Lower Label')}
              placeholder={t(
                'surveyEditor.element.lowerLabelPlaceholder',
                'e.g. Not at all likely'
              )}
            />

            {/* 상단 라벨 */}
            <LocalizedInput
              value={attrs.upperLabel as I18nString | undefined}
              onChange={handleUpperLabelChange}
              label={t('surveyEditor.element.upperLabel', 'Upper Label')}
              placeholder={t(
                'surveyEditor.element.upperLabelPlaceholder',
                'e.g. Extremely likely'
              )}
            />

            {/* 색상 코딩 활성화 토글 */}
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                {t('surveyEditor.element.colorCoding', 'Color Coding')}
              </Label>
              <Switch
                checked={attrs.isColorCodingEnabled ?? false}
                onCheckedChange={handleColorCodingChange}
              />
            </div>
          </div>
        }
      >
        {/* 기본 설정: headline + scale + range */}
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

          {/* 척도 유형 선택 */}
          <div>
            <Label className="mb-1.5 block text-sm">
              {t('surveyEditor.element.scaleType', 'Scale Type')}
            </Label>
            <Select
              value={attrs.scale ?? 'star'}
              onValueChange={handleScaleChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCALE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`surveyEditor.element.scaleTypes.${type}`, type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 범위 선택 (3~10) */}
          <div>
            <Label className="mb-1.5 block text-sm">
              {t('surveyEditor.element.range', 'Range')}
            </Label>
            <Select
              value={String(attrs.range ?? 5)}
              onValueChange={handleRangeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RANGE_VALUES.map((val) => (
                  <SelectItem key={val} value={String(val)}>
                    {val}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </ElementComponent>
    );
  }
);
