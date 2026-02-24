'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createEntityComponent } from '@coltorapps/builder-react';
import {
  multipleChoiceSingleEntity,
  multipleChoiceMultiEntity,
} from '@inquiry/survey-builder-config';
import type { I18nString, Choice } from '@inquiry/survey-builder-config';
import {
  Button,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@inquiry/client-ui';
import { X, Plus } from 'lucide-react';
import { createId } from '@paralleldrive/cuid2';
import { ElementComponent } from '../ElementComponent';
import { LocalizedInput } from '../../shared/LocalizedInput';
import { useBuilderStoreContext } from '../BuilderStoreContext';

/** displayType 속성에 허용되는 값 목록 */
const DISPLAY_TYPES = ['list', 'grid'] as const;

/** shuffleOption 속성에 허용되는 값 목록 */
const SHUFFLE_OPTIONS = ['none', 'all', 'exceptLast'] as const;

/**
 * MultipleChoice 공통 Inner 컴포넌트.
 * multipleChoiceSingle / multipleChoiceMulti 양쪽에서 사용된다.
 * entity.type으로 single/multi를 구분하여 typeLabel을 표시한다.
 *
 * 기본 설정: headline, choices(CRUD 리스트)
 * 고급 설정: displayType, shuffleOption, otherOptionPlaceholder
 *
 * @param entity - coltorapps builder의 Entity 인스턴스
 * @param isMulti - true이면 복수 선택(체크박스), false이면 단일 선택(라디오)
 */
function MultipleChoiceInner({
  entity,
  isMulti,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  entity: { id: string; attributes: Record<string, any> };
  isMulti: boolean;
}) {
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

  /** 선택지 label 변경 핸들러 */
  const handleChoiceLabelChange = useCallback(
    (choiceId: string, value: I18nString) => {
      const choices = (attrs.choices as Choice[] | undefined) ?? [];
      const updated = choices.map((c) =>
        c.id === choiceId ? { ...c, label: value } : c
      );
      builderStore.setEntityAttribute(entityId, 'choices', updated);
    },
    [builderStore, entityId, attrs.choices]
  );

  /** 선택지 추가 핸들러. createId()로 고유 ID를 생성한다. */
  const addChoice = useCallback(() => {
    const choices = (attrs.choices as Choice[] | undefined) ?? [];
    const newChoices: Choice[] = [
      ...choices,
      { id: createId(), label: { default: '' } },
    ];
    builderStore.setEntityAttribute(entityId, 'choices', newChoices);
  }, [builderStore, entityId, attrs.choices]);

  /** 선택지 삭제 핸들러 */
  const removeChoice = useCallback(
    (choiceId: string) => {
      const choices = (attrs.choices as Choice[] | undefined) ?? [];
      const filtered = choices.filter((c) => c.id !== choiceId);
      builderStore.setEntityAttribute(entityId, 'choices', filtered);
    },
    [builderStore, entityId, attrs.choices]
  );

  /** displayType 속성 변경 핸들러 */
  const handleDisplayTypeChange = useCallback(
    (value: string) => {
      builderStore.setEntityAttribute(
        entityId,
        'displayType',
        value as (typeof DISPLAY_TYPES)[number]
      );
    },
    [builderStore, entityId]
  );

  /** shuffleOption 속성 변경 핸들러 */
  const handleShuffleOptionChange = useCallback(
    (value: string) => {
      builderStore.setEntityAttribute(
        entityId,
        'shuffleOption',
        value as (typeof SHUFFLE_OPTIONS)[number]
      );
    },
    [builderStore, entityId]
  );

  /** otherOptionPlaceholder 속성 변경 핸들러 */
  const handleOtherPlaceholderChange = useCallback(
    (value: I18nString) => {
      builderStore.setEntityAttribute(
        entityId,
        'otherOptionPlaceholder',
        value
      );
    },
    [builderStore, entityId]
  );

  const choices = (attrs.choices as Choice[] | undefined) ?? [];
  const entityType = isMulti ? 'multipleChoiceMulti' : 'multipleChoiceSingle';

  return (
    <ElementComponent
      entityId={entityId}
      entityType={entityType}
      typeLabel={
        isMulti
          ? t(
              'surveyEditor.element.types.multipleChoiceMulti',
              'Multiple Choice (Multi)'
            )
          : t(
              'surveyEditor.element.types.multipleChoiceSingle',
              'Multiple Choice (Single)'
            )
      }
      advancedSettings={
        <div className="space-y-3">
          {/* 표시 유형 선택 */}
          <div>
            <Label className="mb-1.5 block text-sm">
              {t('surveyEditor.element.displayType', 'Display Type')}
            </Label>
            <Select
              value={attrs.displayType ?? 'list'}
              onValueChange={handleDisplayTypeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DISPLAY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(
                      `surveyEditor.element.displayTypes.${type}`,
                      type === 'list' ? 'List' : 'Grid'
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 셔플 옵션 선택 */}
          <div>
            <Label className="mb-1.5 block text-sm">
              {t('surveyEditor.element.shuffleOption', 'Shuffle Option')}
            </Label>
            <Select
              value={attrs.shuffleOption ?? 'none'}
              onValueChange={handleShuffleOptionChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SHUFFLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {t(`surveyEditor.element.shuffleOptions.${opt}`, opt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 기타 옵션 플레이스홀더 */}
          <LocalizedInput
            value={attrs.otherOptionPlaceholder as I18nString | undefined}
            onChange={handleOtherPlaceholderChange}
            label={t(
              'surveyEditor.element.otherOptionPlaceholder',
              'Other Option Placeholder'
            )}
            placeholder={t(
              'surveyEditor.element.otherOptionPlaceholderHint',
              'e.g. Please specify...'
            )}
          />
        </div>
      }
    >
      {/* 기본 설정: headline + choices CRUD 리스트 */}
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

        {/* 선택지 리스트 */}
        <div>
          <Label className="mb-1.5 block text-sm">
            {t('surveyEditor.element.choices', 'Choices')}
          </Label>
          <div className="space-y-2">
            {choices.map((choice) => (
              <div key={choice.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <LocalizedInput
                    value={choice.label}
                    onChange={(val) => handleChoiceLabelChange(choice.id, val)}
                    placeholder={t(
                      'surveyEditor.element.choiceLabelPlaceholder',
                      'Choice label'
                    )}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeChoice(choice.id);
                  }}
                  aria-label={t(
                    'surveyEditor.element.removeChoice',
                    'Remove choice'
                  )}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                addChoice();
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              {t('surveyEditor.element.addChoice', 'Add Choice')}
            </Button>
          </div>
        </div>
      </div>
    </ElementComponent>
  );
}

/**
 * MultipleChoiceSingle Entity 컴포넌트.
 * 단일 선택(라디오) 질문의 편집 UI를 제공한다.
 */
export const MultipleChoiceSingleComponent = createEntityComponent(
  multipleChoiceSingleEntity,
  ({ entity }) => <MultipleChoiceInner entity={entity} isMulti={false} />
);

/**
 * MultipleChoiceMulti Entity 컴포넌트.
 * 복수 선택(체크박스) 질문의 편집 UI를 제공한다.
 */
export const MultipleChoiceMultiComponent = createEntityComponent(
  multipleChoiceMultiEntity,
  ({ entity }) => <MultipleChoiceInner entity={entity} isMulti={true} />
);
