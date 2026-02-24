'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createEntityComponent } from '@coltorapps/builder-react';
import {
  fileUploadEntity,
  ALLOWED_FILE_EXTENSIONS,
} from '@inquiry/survey-builder-config';
import type { I18nString } from '@inquiry/survey-builder-config';
import { Switch, Label, Input } from '@inquiry/client-ui';
import { ElementComponent } from '../ElementComponent';
import { LocalizedInput } from '../../shared/LocalizedInput';
import { useBuilderStoreContext } from '../BuilderStoreContext';

/**
 * FileUpload Entity 컴포넌트.
 * 파일 업로드 질문을 편집한다.
 *
 * - headline: 다국어 질문 텍스트 (LocalizedInput)
 * - 고급 설정: 복수 파일 허용, 최대 파일 크기, 허용 확장자 체크박스
 */
export const FileUploadComponent = createEntityComponent(
  fileUploadEntity,
  (props) => {
    const { entity } = props;
    const { t } = useTranslation();
    const entityId = entity.id;
    const attrs = entity.attributes;
    const { builderStore } = useBuilderStoreContext();

    /**
     * Entity 속성 값을 변경하는 공통 헬퍼.
     * builderStore.setEntityAttribute를 간결하게 호출한다.
     */
    const setAttr = useCallback(
      (name: string, value: unknown) => {
        builderStore.setEntityAttribute(entityId, name, value);
      },
      [builderStore, entityId]
    );

    /**
     * 허용 확장자 토글 핸들러.
     * 현재 목록에 있으면 제거, 없으면 추가한다.
     */
    const toggleExtension = useCallback(
      (ext: string) => {
        const current = (attrs.allowedFileExtensions ?? []) as string[];
        const updated = current.includes(ext)
          ? current.filter((e) => e !== ext)
          : [...current, ext];
        setAttr('allowedFileExtensions', updated);
      },
      [attrs.allowedFileExtensions, setAttr]
    );

    return (
      <ElementComponent
        entityId={entityId}
        entityType="fileUpload"
        typeLabel={t('surveyEditor.element.types.fileUpload', 'File Upload')}
        advancedSettings={
          <div className="space-y-3">
            {/* 복수 파일 허용 토글 */}
            <div className="flex items-center justify-between">
              <Label className="text-sm">
                {t(
                  'surveyEditor.element.allowMultipleFiles',
                  'Allow Multiple Files'
                )}
              </Label>
              <Switch
                checked={(attrs.allowMultipleFiles as boolean) ?? false}
                onCheckedChange={(v) => setAttr('allowMultipleFiles', v)}
              />
            </div>

            {/* 최대 파일 크기 입력 */}
            <div>
              <Label className="mb-1 block text-sm">
                {t('surveyEditor.element.maxFileSize', 'Max File Size (MB)')}
              </Label>
              <Input
                type="number"
                value={(attrs.maxSizeInMB as number) ?? 10}
                onChange={(e) => setAttr('maxSizeInMB', Number(e.target.value))}
                className="h-8 w-24"
              />
            </div>

            {/* 허용 확장자 체크박스 그룹 */}
            <div>
              <Label className="mb-1.5 block text-sm">
                {t(
                  'surveyEditor.element.allowedExtensions',
                  'Allowed Extensions'
                )}
              </Label>
              <div className="flex flex-wrap gap-2">
                {(ALLOWED_FILE_EXTENSIONS as readonly string[]).map((ext) => (
                  <label key={ext} className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={(
                        (attrs.allowedFileExtensions ?? []) as string[]
                      ).includes(ext)}
                      onChange={() => toggleExtension(ext)}
                      className="rounded border-gray-300"
                    />
                    {ext}
                  </label>
                ))}
              </div>
            </div>
          </div>
        }
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
      </ElementComponent>
    );
  }
);
