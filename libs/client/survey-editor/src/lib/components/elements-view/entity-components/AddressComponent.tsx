'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createEntityComponent } from '@coltorapps/builder-react';
import {
  addressEntity,
  ADDRESS_FIELD_IDS,
} from '@inquiry/survey-builder-config';
import type {
  I18nString,
  SubField,
  AddressFieldId,
} from '@inquiry/survey-builder-config';
import { Switch, Label } from '@inquiry/client-ui';
import { ElementComponent } from '../ElementComponent';
import { LocalizedInput } from '../../shared/LocalizedInput';
import { useBuilderStoreContext } from '../BuilderStoreContext';

/**
 * addressFields 속성의 타입.
 * 각 AddressFieldId를 키로, SubField를 값으로 갖는 객체이다.
 */
type AddressFieldsMap = Record<AddressFieldId, SubField>;

/**
 * Address Entity 컴포넌트.
 * 주소 입력 질문을 편집한다.
 *
 * - headline: 다국어 질문 텍스트 (LocalizedInput)
 * - 6개 서브필드(addressLine1, addressLine2, city, state, zip, country)별
 *   show/required 토글
 */
export const AddressComponent = createEntityComponent(
  addressEntity,
  (props) => {
    const { entity } = props;
    const { t } = useTranslation();
    const entityId = entity.id;
    const attrs = entity.attributes;
    const { builderStore } = useBuilderStoreContext();

    const fields = (attrs.addressFields ?? {}) as AddressFieldsMap;

    /**
     * Entity 속성 값을 변경하는 공통 헬퍼.
     */
    const setAttr = useCallback(
      (name: string, value: unknown) => {
        builderStore.setEntityAttribute(entityId, name, value);
      },
      [builderStore, entityId]
    );

    /**
     * 서브필드의 속성(show 또는 required)을 토글한다.
     * 기존 addressFields 객체를 복사한 뒤 해당 필드의 값을 변경한다.
     *
     * @param fieldId - 변경할 서브필드 ID
     * @param prop - 변경할 속성 이름 ('show' 또는 'required')
     * @param value - 새 boolean 값
     */
    const toggleFieldProp = useCallback(
      (fieldId: AddressFieldId, prop: 'show' | 'required', value: boolean) => {
        const currentField: SubField = fields[fieldId] ?? {
          show: true,
          required: false,
        };
        const updated: AddressFieldsMap = {
          ...fields,
          [fieldId]: { ...currentField, [prop]: value },
        };
        setAttr('addressFields', updated);
      },
      [fields, setAttr]
    );

    return (
      <ElementComponent
        entityId={entityId}
        entityType="address"
        typeLabel={t('surveyEditor.element.types.address', 'Address')}
      >
        {/* 질문 제목 (다국어 입력) */}
        <LocalizedInput
          value={attrs.headline as I18nString | undefined}
          onChange={(v) => setAttr('headline', v)}
          label={t('surveyEditor.element.headline', 'Question')}
          placeholder={t(
            'surveyEditor.element.headlinePlaceholder',
            'Enter your question...'
          )}
        />

        {/* 서브필드 목록: 각 주소 필드별 show/required 토글 */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{t('surveyEditor.element.field', 'Field')}</span>
            <div className="flex gap-4">
              <span>{t('surveyEditor.element.show', 'Show')}</span>
              <span>{t('surveyEditor.element.required', 'Required')}</span>
            </div>
          </div>
          {ADDRESS_FIELD_IDS.map((fieldId) => {
            const field: SubField = fields[fieldId] ?? {
              show: true,
              required: false,
            };
            return (
              <div key={fieldId} className="flex items-center justify-between">
                <Label className="text-sm">
                  {t(`surveyEditor.element.addressFields.${fieldId}`, fieldId)}
                </Label>
                <div className="flex gap-4">
                  <Switch
                    checked={field.show}
                    onCheckedChange={(v) => toggleFieldProp(fieldId, 'show', v)}
                    aria-label={`${fieldId} ${t(
                      'surveyEditor.element.show',
                      'Show'
                    )}`}
                  />
                  <Switch
                    checked={field.required}
                    onCheckedChange={(v) =>
                      toggleFieldProp(fieldId, 'required', v)
                    }
                    aria-label={`${fieldId} ${t(
                      'surveyEditor.element.required',
                      'Required'
                    )}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </ElementComponent>
    );
  }
);
