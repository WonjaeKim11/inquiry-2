'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createEntityComponent } from '@coltorapps/builder-react';
import { rankingEntity } from '@inquiry/survey-builder-config';
import type { I18nString, Choice } from '@inquiry/survey-builder-config';
import { Button, Switch, Label } from '@inquiry/client-ui';
import { X, Plus } from 'lucide-react';
import { createId } from '@paralleldrive/cuid2';
import { ElementComponent } from '../ElementComponent';
import { LocalizedInput } from '../../shared/LocalizedInput';
import { useBuilderStoreContext } from '../BuilderStoreContext';

/** 선택지 개수 제한 (2~25개) */
const MIN_CHOICES = 2;
const MAX_CHOICES = 25;

/**
 * Ranking Entity 컴포넌트.
 * 드래그 앤 드롭으로 항목 순위를 매기는 질문의 편집 UI를 제공한다.
 *
 * 기본 설정: headline, choices(CRUD 리스트, 2~25개)
 * 고급 설정: shuffleOption
 */
export const RankingComponent = createEntityComponent(
  rankingEntity,
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

    /** 선택지 추가 핸들러. createId()로 고유 ID를 생성한다. 최대 25개까지 허용. */
    const addChoice = useCallback(() => {
      const choices = (attrs.choices as Choice[] | undefined) ?? [];
      if (choices.length >= MAX_CHOICES) return;
      const newChoices: Choice[] = [
        ...choices,
        { id: createId(), label: { default: '' } },
      ];
      builderStore.setEntityAttribute(entityId, 'choices', newChoices);
    }, [builderStore, entityId, attrs.choices]);

    /** 선택지 삭제 핸들러. 최소 2개는 유지한다. */
    const removeChoice = useCallback(
      (choiceId: string) => {
        const choices = (attrs.choices as Choice[] | undefined) ?? [];
        if (choices.length <= MIN_CHOICES) return;
        const filtered = choices.filter((c) => c.id !== choiceId);
        builderStore.setEntityAttribute(entityId, 'choices', filtered);
      },
      [builderStore, entityId, attrs.choices]
    );

    /** shuffleOption 속성 토글 핸들러. boolean으로 'none'/'all' 변환 */
    const handleShuffleChange = useCallback(
      (checked: boolean) => {
        builderStore.setEntityAttribute(
          entityId,
          'shuffleOption',
          checked ? 'all' : 'none'
        );
      },
      [builderStore, entityId]
    );

    const choices = (attrs.choices as Choice[] | undefined) ?? [];
    const isShuffleEnabled = attrs.shuffleOption === 'all';
    const canAddMore = choices.length < MAX_CHOICES;
    const canRemove = choices.length > MIN_CHOICES;

    return (
      <ElementComponent
        entityId={entityId}
        entityType="ranking"
        typeLabel={t('surveyEditor.element.types.ranking', 'Ranking')}
        advancedSettings={
          <div className="space-y-3">
            {/* 셔플 옵션 토글 */}
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                {t('surveyEditor.element.shuffleChoices', 'Shuffle Choices')}
              </Label>
              <Switch
                checked={isShuffleEnabled}
                onCheckedChange={handleShuffleChange}
              />
            </div>
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
              <span className="ml-1 text-xs text-muted-foreground">
                ({choices.length}/{MAX_CHOICES})
              </span>
            </Label>
            <div className="space-y-2">
              {choices.map((choice, idx) => (
                <div key={choice.id} className="flex items-center gap-2">
                  {/* 순위 번호 표시 */}
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-xs font-medium">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <LocalizedInput
                      value={choice.label}
                      onChange={(val) =>
                        handleChoiceLabelChange(choice.id, val)
                      }
                      placeholder={t(
                        'surveyEditor.element.choiceLabelPlaceholder',
                        'Choice label'
                      )}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!canRemove}
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
              {canAddMore && (
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
              )}
            </div>
          </div>
        </div>
      </ElementComponent>
    );
  }
);
