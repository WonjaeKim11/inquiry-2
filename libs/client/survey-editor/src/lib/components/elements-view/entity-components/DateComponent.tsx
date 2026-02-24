'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createEntityComponent } from '@coltorapps/builder-react';
import { dateEntity } from '@inquiry/survey-builder-config';
import type { I18nString } from '@inquiry/survey-builder-config';
import {
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

/**
 * 지원되는 날짜 포맷 목록.
 * dateFormatAttribute의 z.enum 정의와 일치해야 한다.
 */
const DATE_FORMATS = [
  { value: 'M/d/yyyy', label: 'M/d/yyyy' },
  { value: 'dd/MM/yyyy', label: 'dd/MM/yyyy' },
  { value: 'yyyy-MM-dd', label: 'yyyy-MM-dd (ISO)' },
] as const;

/**
 * Date Entity 컴포넌트.
 * 날짜 입력 질문의 편집 UI를 제공한다.
 *
 * 기본 설정: headline
 * 고급 설정: dateFormat (M/d/yyyy, dd/MM/yyyy, yyyy-MM-dd)
 */
export const DateComponent = createEntityComponent(dateEntity, ({ entity }) => {
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

  /** dateFormat 속성 변경 핸들러 */
  const handleDateFormatChange = useCallback(
    (value: string) => {
      builderStore.setEntityAttribute(
        entityId,
        'dateFormat',
        value as (typeof DATE_FORMATS)[number]['value']
      );
    },
    [builderStore, entityId]
  );

  return (
    <ElementComponent
      entityId={entityId}
      entityType="date"
      typeLabel={t('surveyEditor.element.types.date', 'Date')}
      advancedSettings={
        <div className="space-y-3">
          {/* 날짜 포맷 선택 */}
          <div>
            <Label className="mb-1.5 block text-sm">
              {t('surveyEditor.element.dateFormat', 'Date Format')}
            </Label>
            <Select
              value={attrs.dateFormat ?? 'M/d/yyyy'}
              onValueChange={handleDateFormatChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map((fmt) => (
                  <SelectItem key={fmt.value} value={fmt.value}>
                    {fmt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
