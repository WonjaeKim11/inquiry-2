'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createEntityComponent } from '@coltorapps/builder-react';
import { npsEntity } from '@inquiry/survey-builder-config';
import type { I18nString } from '@inquiry/survey-builder-config';
import { ElementComponent } from '../ElementComponent';
import { LocalizedInput } from '../../shared/LocalizedInput';
import { useBuilderStoreContext } from '../BuilderStoreContext';

/** NPS 고정 척도 범위 (0~10) */
const NPS_SCALE_MIN = 0;
const NPS_SCALE_MAX = 10;

/**
 * NPS(Net Promoter Score) Entity 컴포넌트.
 * 0~10 범위의 추천 점수 질문의 편집 UI를 제공한다.
 *
 * 기본 설정: headline, lowerLabel, upperLabel
 * 0~10 고정 척도는 편집 불가로 설명만 표시한다.
 */
export const NPSComponent = createEntityComponent(npsEntity, ({ entity }) => {
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

  return (
    <ElementComponent
      entityId={entityId}
      entityType="nps"
      typeLabel={t('surveyEditor.element.types.nps', 'NPS')}
    >
      {/* 기본 설정: headline + 척도 설명 + lowerLabel + upperLabel */}
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

        {/* 고정 척도 범위 설명 (편집 불가) */}
        <div className="rounded-md bg-muted/50 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            {t(
              'surveyEditor.element.npsScaleDescription',
              'Scale: {{min}} - {{max}} (fixed)',
              {
                min: NPS_SCALE_MIN,
                max: NPS_SCALE_MAX,
              }
            )}
          </p>
          <div className="mt-1.5 flex justify-between text-sm">
            {Array.from(
              { length: NPS_SCALE_MAX - NPS_SCALE_MIN + 1 },
              (_, i) => NPS_SCALE_MIN + i
            ).map((n) => (
              <span
                key={n}
                className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-medium"
              >
                {n}
              </span>
            ))}
          </div>
        </div>

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
      </div>
    </ElementComponent>
  );
});
