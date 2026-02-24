'use client';

import { useTranslation } from 'react-i18next';
import { Input, Label, Switch } from '@inquiry/client-ui';
import type { StylingColor } from '@inquiry/survey-builder-config';
import { ColorPicker } from './color-picker';
import { StylingSection } from './styling-section';

interface ProgressBarSectionProps {
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
 * Progress Bar 섹션.
 * progressTrackHeight, progressTrackBgColor, progressIndicatorColor 3개 필드 + hideProgressBar Switch
 */
export function ProgressBarSection({
  styling,
  updateColor,
  updateField,
  darkModeEnabled,
}: ProgressBarSectionProps) {
  const { t } = useTranslation();

  return (
    <StylingSection
      title={t('project.styling.sections.progress_bar', 'Progress Bar')}
    >
      {/* Hide Progress Bar 토글 */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <Label className="text-sm">
          {t('project.styling.fields.hideProgressBar', 'Hide Progress Bar')}
        </Label>
        <Switch
          checked={(styling.hideProgressBar as boolean) ?? false}
          onCheckedChange={(v) => updateField('hideProgressBar', v)}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          {t('project.styling.fields.progressTrackHeight', 'Track Height')}
        </Label>
        <Input
          type="number"
          value={(styling.progressTrackHeight as number) ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            updateField(
              'progressTrackHeight',
              e.target.value ? Number(e.target.value) : undefined
            )
          }
          className="h-8 text-sm"
          min={1}
          max={20}
        />
      </div>

      <ColorPicker
        label={t(
          'project.styling.fields.progressTrackBgColor',
          'Track Background'
        )}
        value={styling.progressTrackBgColor as StylingColor | undefined}
        onChange={(color) => updateColor('progressTrackBgColor', color)}
        darkModeEnabled={darkModeEnabled}
      />
      <ColorPicker
        label={t(
          'project.styling.fields.progressIndicatorColor',
          'Indicator Color'
        )}
        value={styling.progressIndicatorColor as StylingColor | undefined}
        onChange={(color) => updateColor('progressIndicatorColor', color)}
        darkModeEnabled={darkModeEnabled}
      />
    </StylingSection>
  );
}
