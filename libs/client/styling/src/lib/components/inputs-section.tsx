'use client';

import { useTranslation } from 'react-i18next';
import { Input, Label, Slider } from '@inquiry/client-ui';
import type { StylingColor } from '@inquiry/survey-builder-config';
import { ColorPicker } from './color-picker';
import { StylingSection } from './styling-section';

interface InputsSectionProps {
  /** 현재 스타일링 객체 */
  styling: Record<string, unknown>;
  /** 색상 필드 업데이트 콜백 */
  updateColor: (key: string, color: Partial<StylingColor>) => void;
  /** 일반 필드 업데이트 콜백 */
  updateField: (key: string, value: unknown) => void;
  /** 다크 모드 색상 입력 활성화 여부 */
  darkModeEnabled: boolean;
}

/**
 * Inputs 섹션.
 * inputBgColor, inputBorderColor, inputBorderRadius, inputHeight,
 * inputTextColor, inputFontSize, placeholderOpacity, inputPaddingX,
 * inputPaddingY, inputShadow 10개 필드
 */
export function InputsSection({
  styling,
  updateColor,
  updateField,
  darkModeEnabled,
}: InputsSectionProps) {
  const { t } = useTranslation();

  return (
    <StylingSection title={t('project.styling.sections.inputs', 'Inputs')}>
      {/* 색상 필드 */}
      <ColorPicker
        label={t('project.styling.fields.inputBgColor', 'Background')}
        value={styling.inputBgColor as StylingColor | undefined}
        onChange={(color) => updateColor('inputBgColor', color)}
        darkModeEnabled={darkModeEnabled}
      />
      <ColorPicker
        label={t('project.styling.fields.inputBorderColor', 'Border Color')}
        value={styling.inputBorderColor as StylingColor | undefined}
        onChange={(color) => updateColor('inputBorderColor', color)}
        darkModeEnabled={darkModeEnabled}
      />
      <ColorPicker
        label={t('project.styling.fields.inputTextColor', 'Text Color')}
        value={styling.inputTextColor as StylingColor | undefined}
        onChange={(color) => updateColor('inputTextColor', color)}
        darkModeEnabled={darkModeEnabled}
      />

      {/* 숫자형 필드 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t('project.styling.fields.inputBorderRadius', 'Border Radius')}
          </Label>
          <Input
            type="number"
            value={(styling.inputBorderRadius as number) ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateField(
                'inputBorderRadius',
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="h-8 text-sm"
            min={0}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t('project.styling.fields.inputHeight', 'Height')}
          </Label>
          <Input
            type="number"
            value={(styling.inputHeight as number) ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateField(
                'inputHeight',
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="h-8 text-sm"
            min={0}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t('project.styling.fields.inputFontSize', 'Font Size')}
          </Label>
          <Input
            type="number"
            value={(styling.inputFontSize as number) ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateField(
                'inputFontSize',
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="h-8 text-sm"
            min={8}
          />
        </div>
      </div>

      {/* Placeholder Opacity (Slider) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">
            {t(
              'project.styling.fields.placeholderOpacity',
              'Placeholder Opacity'
            )}
          </Label>
          <span className="text-xs text-muted-foreground">
            {((styling.placeholderOpacity as number) ?? 0.5).toFixed(2)}
          </span>
        </div>
        <Slider
          value={[(styling.placeholderOpacity as number) ?? 0.5]}
          onValueChange={([v]) => updateField('placeholderOpacity', v)}
          min={0}
          max={1}
          step={0.05}
        />
      </div>

      {/* Padding 필드 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t('project.styling.fields.inputPaddingX', 'Padding X')}
          </Label>
          <Input
            type="number"
            value={(styling.inputPaddingX as number) ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateField(
                'inputPaddingX',
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="h-8 text-sm"
            min={0}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t('project.styling.fields.inputPaddingY', 'Padding Y')}
          </Label>
          <Input
            type="number"
            value={(styling.inputPaddingY as number) ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateField(
                'inputPaddingY',
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="h-8 text-sm"
            min={0}
          />
        </div>
      </div>

      {/* Input Shadow */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          {t('project.styling.fields.inputShadow', 'Box Shadow')}
        </Label>
        <Input
          type="text"
          value={(styling.inputShadow as string) ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            updateField('inputShadow', e.target.value)
          }
          placeholder="none"
          className="h-8 text-sm"
        />
      </div>
    </StylingSection>
  );
}
