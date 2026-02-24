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

interface ButtonsSectionProps {
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
  { value: '400', label: 'Normal (400)' },
  { value: '500', label: 'Medium (500)' },
  { value: '600', label: 'Semibold (600)' },
  { value: '700', label: 'Bold (700)' },
];

/**
 * Buttons 섹션.
 * buttonBgColor, buttonTextColor, buttonBorderRadius, buttonHeight,
 * buttonFontSize, buttonFontWeight, buttonPaddingX, buttonPaddingY 8개 필드
 */
export function ButtonsSection({
  styling,
  updateColor,
  updateField,
  darkModeEnabled,
}: ButtonsSectionProps) {
  const { t } = useTranslation();

  return (
    <StylingSection title={t('project.styling.sections.buttons', 'Buttons')}>
      {/* Colors */}
      <ColorPicker
        label={t('project.styling.fields.buttonBgColor', 'Background')}
        value={styling.buttonBgColor as StylingColor | undefined}
        onChange={(color) => updateColor('buttonBgColor', color)}
        darkModeEnabled={darkModeEnabled}
      />
      <ColorPicker
        label={t('project.styling.fields.buttonTextColor', 'Text Color')}
        value={styling.buttonTextColor as StylingColor | undefined}
        onChange={(color) => updateColor('buttonTextColor', color)}
        darkModeEnabled={darkModeEnabled}
      />

      {/* 숫자형 필드 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t('project.styling.fields.buttonBorderRadius', 'Border Radius')}
          </Label>
          <Input
            type="number"
            value={(styling.buttonBorderRadius as number) ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateField(
                'buttonBorderRadius',
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="h-8 text-sm"
            min={0}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t('project.styling.fields.buttonHeight', 'Height')}
          </Label>
          <Input
            type="text"
            value={String(styling.buttonHeight ?? '')}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateField(
                'buttonHeight',
                e.target.value === 'auto'
                  ? 'auto'
                  : e.target.value
                  ? Number(e.target.value)
                  : undefined
              )
            }
            placeholder="auto"
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t('project.styling.fields.buttonFontSize', 'Font Size')}
          </Label>
          <Input
            type="number"
            value={(styling.buttonFontSize as number) ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateField(
                'buttonFontSize',
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="h-8 text-sm"
            min={8}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t('project.styling.fields.buttonFontWeight', 'Font Weight')}
          </Label>
          <Select
            value={String(styling.buttonFontWeight ?? '')}
            onValueChange={(v) => updateField('buttonFontWeight', v)}
          >
            <SelectTrigger className="h-8 text-sm">
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
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t('project.styling.fields.buttonPaddingX', 'Padding X')}
          </Label>
          <Input
            type="number"
            value={(styling.buttonPaddingX as number) ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateField(
                'buttonPaddingX',
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="h-8 text-sm"
            min={0}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t('project.styling.fields.buttonPaddingY', 'Padding Y')}
          </Label>
          <Input
            type="number"
            value={(styling.buttonPaddingY as number) ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateField(
                'buttonPaddingY',
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="h-8 text-sm"
            min={0}
          />
        </div>
      </div>
    </StylingSection>
  );
}
