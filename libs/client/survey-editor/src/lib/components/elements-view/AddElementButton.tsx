'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@inquiry/client-ui';
import { ELEMENT_ENTITY_NAMES } from '@inquiry/survey-builder-config';

interface AddElementButtonProps {
  /** 부모 Block의 Entity ID */
  blockId: string;
  /** Element 추가 콜백. Entity 타입과 부모 Block ID를 전달한다. */
  onAddEntity: (type: string, parentId: string) => void;
}

/**
 * Element 유형별 기본 속성.
 * 새 Element 생성 시 초기값으로 사용된다.
 * headline은 I18nString 형태({ default: '' })로 초기화하며,
 * isDraft: true로 설정하여 미완성 상태임을 표시한다.
 */
export const DEFAULT_ELEMENT_ATTRS: Record<string, Record<string, unknown>> = {
  openText: {
    headline: { default: '' },
    required: false,
    isDraft: true,
  },
  multipleChoiceSingle: {
    headline: { default: '' },
    required: false,
    isDraft: true,
    choices: [],
  },
  multipleChoiceMulti: {
    headline: { default: '' },
    required: false,
    isDraft: true,
    choices: [],
  },
  nps: {
    headline: { default: '' },
    required: false,
    isDraft: true,
    lowerLabel: { default: '' },
    upperLabel: { default: '' },
  },
  cta: {
    headline: { default: '' },
    isDraft: true,
    dismissible: false,
    buttonLabel: { default: '' },
  },
  rating: {
    headline: { default: '' },
    required: false,
    isDraft: true,
    scale: 'star',
    range: 5,
  },
  consent: {
    headline: { default: '' },
    required: true,
    isDraft: true,
    label: { default: '' },
  },
  pictureSelection: {
    headline: { default: '' },
    required: false,
    isDraft: true,
    pictureChoices: [],
  },
  date: {
    headline: { default: '' },
    required: false,
    isDraft: true,
    dateFormat: 'M-d-y',
  },
  fileUpload: {
    headline: { default: '' },
    required: false,
    isDraft: true,
    allowMultipleFiles: false,
    maxSizeInMB: 10,
  },
  cal: {
    headline: { default: '' },
    isDraft: true,
    calUserName: '',
    calHost: '',
  },
  matrix: {
    headline: { default: '' },
    required: false,
    isDraft: true,
    rows: [],
    columns: [],
  },
  address: {
    headline: { default: '' },
    required: false,
    isDraft: true,
  },
  ranking: {
    headline: { default: '' },
    required: false,
    isDraft: true,
    choices: [],
  },
  contactInfo: {
    headline: { default: '' },
    required: false,
    isDraft: true,
  },
};

/**
 * Element 추가 버튼.
 * 15가지 Element 유형 목록을 드롭다운으로 표시하고,
 * 선택 시 해당 Block에 새 Entity를 추가한다.
 */
export function AddElementButton({
  blockId,
  onAddEntity,
}: AddElementButtonProps) {
  const { t } = useTranslation();

  /** Element 타입 선택 시 부모 Block에 추가 */
  const handleAdd = useCallback(
    (type: string) => {
      onAddEntity(type, blockId);
    },
    [blockId, onAddEntity]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full border border-dashed"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          {t('surveyEditor.block.addElement', 'Add Element')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-64 overflow-y-auto">
        {ELEMENT_ENTITY_NAMES.map((type) => (
          <DropdownMenuItem key={type} onClick={() => handleAdd(type)}>
            {t(`surveyEditor.element.types.${type}`, type)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
