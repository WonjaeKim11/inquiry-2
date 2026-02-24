'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createEntityComponent } from '@coltorapps/builder-react';
import { pictureSelectionEntity } from '@inquiry/survey-builder-config';
import type { I18nString, PictureChoice } from '@inquiry/survey-builder-config';
import { Button, Switch, Label, Input } from '@inquiry/client-ui';
import { X, Plus } from 'lucide-react';
import { createId } from '@paralleldrive/cuid2';
import { ElementComponent } from '../ElementComponent';
import { LocalizedInput } from '../../shared/LocalizedInput';
import { useBuilderStoreContext } from '../BuilderStoreContext';

/**
 * PictureSelection Entity 컴포넌트.
 * 이미지 기반 선택 질문의 편집 UI를 제공한다.
 *
 * 기본 설정: headline, pictureChoices(CRUD 리스트), allowMulti
 * 각 pictureChoice는 id + imageUrl로 구성된다.
 */
export const PictureSelectionComponent = createEntityComponent(
  pictureSelectionEntity,
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

    /** pictureChoice의 imageUrl 변경 핸들러 */
    const handleImageUrlChange = useCallback(
      (choiceId: string, imageUrl: string) => {
        const choices =
          (attrs.pictureChoices as PictureChoice[] | undefined) ?? [];
        const updated = choices.map((c) =>
          c.id === choiceId ? { ...c, imageUrl } : c
        );
        builderStore.setEntityAttribute(entityId, 'pictureChoices', updated);
      },
      [builderStore, entityId, attrs.pictureChoices]
    );

    /** pictureChoice 추가 핸들러. createId()로 고유 ID를 생성한다. */
    const addPictureChoice = useCallback(() => {
      const choices =
        (attrs.pictureChoices as PictureChoice[] | undefined) ?? [];
      const newChoices: PictureChoice[] = [
        ...choices,
        { id: createId(), imageUrl: '' },
      ];
      builderStore.setEntityAttribute(entityId, 'pictureChoices', newChoices);
    }, [builderStore, entityId, attrs.pictureChoices]);

    /** pictureChoice 삭제 핸들러 */
    const removePictureChoice = useCallback(
      (choiceId: string) => {
        const choices =
          (attrs.pictureChoices as PictureChoice[] | undefined) ?? [];
        const filtered = choices.filter((c) => c.id !== choiceId);
        builderStore.setEntityAttribute(entityId, 'pictureChoices', filtered);
      },
      [builderStore, entityId, attrs.pictureChoices]
    );

    /** allowMulti 속성 토글 핸들러 */
    const handleAllowMultiChange = useCallback(
      (checked: boolean) => {
        builderStore.setEntityAttribute(entityId, 'allowMulti', checked);
      },
      [builderStore, entityId]
    );

    const pictureChoices =
      (attrs.pictureChoices as PictureChoice[] | undefined) ?? [];

    return (
      <ElementComponent
        entityId={entityId}
        entityType="pictureSelection"
        typeLabel={t(
          'surveyEditor.element.types.pictureSelection',
          'Picture Selection'
        )}
      >
        {/* 기본 설정: headline + pictureChoices CRUD + allowMulti */}
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

          {/* 이미지 선택지 리스트 */}
          <div>
            <Label className="mb-1.5 block text-sm">
              {t('surveyEditor.element.pictureChoices', 'Picture Choices')}
            </Label>
            <div className="space-y-2">
              {pictureChoices.map((choice) => (
                <div key={choice.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      value={choice.imageUrl}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        handleImageUrlChange(choice.id, e.target.value)
                      }
                      placeholder={t(
                        'surveyEditor.element.imageUrlPlaceholder',
                        'Image URL'
                      )}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePictureChoice(choice.id);
                    }}
                    aria-label={t(
                      'surveyEditor.element.removePictureChoice',
                      'Remove picture choice'
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
                  addPictureChoice();
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                {t(
                  'surveyEditor.element.addPictureChoice',
                  'Add Picture Choice'
                )}
              </Button>
            </div>
          </div>

          {/* 복수 선택 허용 토글 */}
          <div className="flex items-center justify-between">
            <Label className="text-sm">
              {t('surveyEditor.element.allowMulti', 'Allow Multiple Selection')}
            </Label>
            <Switch
              checked={attrs.allowMulti ?? false}
              onCheckedChange={handleAllowMultiChange}
            />
          </div>
        </div>
      </ElementComponent>
    );
  }
);
