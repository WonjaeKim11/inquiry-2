'use client';

import { useTranslation } from 'react-i18next';
import {
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@inquiry/client-ui';
import type { StylingColor } from '@inquiry/survey-builder-config';
import { ColorPicker } from './color-picker';
import { StylingSection } from './styling-section';

interface HeadlinesSectionProps {
  /** 현재 스타일링 객체 */
  styling: Record<string, unknown>;
  /** 색상 필드 업데이트 콜백 */
  updateColor: (key: string, color: Partial<StylingColor>) => void;
  /** 일반 필드 업데이트 콜백 */
  updateField: (key: string, value: unknown) => void;
  /** 다크 모드 색상 입력 활성화 여부 */
  darkModeEnabled: boolean;
}

/** 폰트 굵기 선택지 */
const FONT_WEIGHT_OPTIONS = [
  { value: '300', label: 'Light (300)' },
  { value: '400', label: 'Normal (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semibold (600)' },
  { value: '700', label: 'Bold (700)' },
];

/**
 * Headlines & Descriptions 섹션.
 * 3그룹 x 3필드 (fontSize, fontWeight, color) = 9개 필드
 */
export function HeadlinesSection({
  styling,
  updateColor,
  updateField,
  darkModeEnabled,
}: HeadlinesSectionProps) {
  const { t } = useTranslation();

  /** 그룹 정의: headline, description, topLabel */
  const groups = [
    {
      prefix: 'headline',
      label: t('project.styling.fields.headline', 'Headline'),
    },
    {
      prefix: 'description',
      label: t('project.styling.fields.description', 'Description'),
    },
    {
      prefix: 'topLabel',
      label: t('project.styling.fields.topLabel', 'Top Label'),
    },
  ];

  return (
    <StylingSection
      title={t(
        'project.styling.sections.headlines',
        'Headlines & Descriptions'
      )}
    >
      {groups.map(({ prefix, label }) => (
        <div key={prefix} className="space-y-3 rounded-lg border p-3">
          <span className="text-sm font-medium">{label}</span>

          {/* Font Size */}
          <div className="flex items-center gap-2">
            <Label className="w-20 text-xs text-muted-foreground">
              {t('project.styling.fields.fontSize', 'Size')}
            </Label>
            <Input
              type="number"
              value={(styling[`${prefix}FontSize`] as number) ?? ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                updateField(
                  `${prefix}FontSize`,
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              placeholder="16"
              className="h-8 flex-1 text-sm"
              min={8}
              max={72}
            />
          </div>

          {/* Font Weight */}
          <div className="flex items-center gap-2">
            <Label className="w-20 text-xs text-muted-foreground">
              {t('project.styling.fields.fontWeight', 'Weight')}
            </Label>
            <Select
              value={String(styling[`${prefix}FontWeight`] ?? '')}
              onValueChange={(v) => updateField(`${prefix}FontWeight`, v)}
            >
              <SelectTrigger className="h-8 flex-1 text-sm">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {FONT_WEIGHT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color */}
          <ColorPicker
            label={t('project.styling.fields.color', 'Color')}
            value={styling[`${prefix}Color`] as StylingColor | undefined}
            onChange={(color) => updateColor(`${prefix}Color`, color)}
            darkModeEnabled={darkModeEnabled}
          />
        </div>
      ))}
    </StylingSection>
  );
}
