'use client';

import { useTranslation } from 'react-i18next';
import { Input, Label } from '@inquiry/client-ui';
import type { StylingColor } from '@inquiry/survey-builder-config';
import { ColorPicker } from './color-picker';
import { StylingSection } from './styling-section';

interface OptionsSectionProps {
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
 * Options 섹션.
 * optionBgColor, optionLabelColor, optionBorderRadius,
 * optionPaddingX, optionPaddingY, optionFontSize 6개 필드
 */
export function OptionsSection({
  styling,
  updateColor,
  updateField,
  darkModeEnabled,
}: OptionsSectionProps) {
  const { t } = useTranslation();

  return (
    <StylingSection title={t('project.styling.sections.options', 'Options')}>
      <ColorPicker
        label={t('project.styling.fields.optionBgColor', 'Background')}
        value={styling.optionBgColor as StylingColor | undefined}
        onChange={(color) => updateColor('optionBgColor', color)}
        darkModeEnabled={darkModeEnabled}
      />
      <ColorPicker
        label={t('project.styling.fields.optionLabelColor', 'Label Color')}
        value={styling.optionLabelColor as StylingColor | undefined}
        onChange={(color) => updateColor('optionLabelColor', color)}
        darkModeEnabled={darkModeEnabled}
      />
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t('project.styling.fields.optionBorderRadius', 'Border Radius')}
          </Label>
          <Input
            type="number"
            value={(styling.optionBorderRadius as number) ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateField(
                'optionBorderRadius',
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="h-8 text-sm"
            min={0}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t('project.styling.fields.optionFontSize', 'Font Size')}
          </Label>
          <Input
            type="number"
            value={(styling.optionFontSize as number) ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateField(
                'optionFontSize',
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="h-8 text-sm"
            min={8}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t('project.styling.fields.optionPaddingX', 'Padding X')}
          </Label>
          <Input
            type="number"
            value={(styling.optionPaddingX as number) ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateField(
                'optionPaddingX',
                e.target.value ? Number(e.target.value) : undefined
              )
            }
            className="h-8 text-sm"
            min={0}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t('project.styling.fields.optionPaddingY', 'Padding Y')}
          </Label>
          <Input
            type="number"
            value={(styling.optionPaddingY as number) ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateField(
                'optionPaddingY',
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
