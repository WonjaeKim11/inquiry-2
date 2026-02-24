'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Label } from '@inquiry/client-ui';
import { suggestColors } from '@inquiry/survey-builder-config';
import type { StylingColor } from '@inquiry/survey-builder-config';
import { ColorPicker } from './color-picker';
import { StylingSection } from './styling-section';

interface GeneralColorsSectionProps {
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
 * General Colors 섹션.
 * brandColor, questionColor, inputColor, highlightBgColor,
 * selectedHighlightBgColor, fontFamily 6개 필드를 편집한다.
 * Suggest Colors 버튼으로 brandColor 기반 팔레트를 자동 생성한다.
 */
export function GeneralColorsSection({
  styling,
  updateColor,
  updateField,
  darkModeEnabled,
}: GeneralColorsSectionProps) {
  const { t } = useTranslation();

  /** Suggest Colors — brandColor 기반 자동 팔레트 생성 */
  const handleSuggestColors = useCallback(() => {
    const brandColor = styling.brandColor as StylingColor | undefined;
    if (!brandColor?.light) return;

    const suggested = suggestColors(brandColor.light);
    updateColor('questionColor', { light: suggested.questionColor });
    updateColor('inputColor', { light: suggested.inputBackground });
    updateColor('highlightBgColor', { light: suggested.inputBorderColor });
    updateColor('cardBgColor', { light: suggested.cardBackground });
    updateColor('buttonTextColor', { light: suggested.buttonTextColor });
  }, [styling.brandColor, updateColor]);

  /** 색상 필드 정의 */
  const colorFields = [
    {
      key: 'brandColor',
      label: t('project.styling.fields.brandColor', 'Brand Color'),
    },
    {
      key: 'questionColor',
      label: t('project.styling.fields.questionColor', 'Question Color'),
    },
    {
      key: 'inputColor',
      label: t('project.styling.fields.inputColor', 'Input Color'),
    },
    {
      key: 'highlightBgColor',
      label: t(
        'project.styling.fields.highlightBgColor',
        'Highlight Background'
      ),
    },
    {
      key: 'selectedHighlightBgColor',
      label: t(
        'project.styling.fields.selectedHighlightBgColor',
        'Selected Highlight'
      ),
    },
  ];

  return (
    <StylingSection
      title={t('project.styling.sections.general_colors', 'General Colors')}
      defaultOpen
    >
      {colorFields.map(({ key, label }) => (
        <ColorPicker
          key={key}
          label={label}
          value={styling[key] as StylingColor | undefined}
          onChange={(color) => updateColor(key, color)}
          darkModeEnabled={darkModeEnabled}
        />
      ))}

      {/* Font Family */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">
          {t('project.styling.fields.fontFamily', 'Font Family')}
        </Label>
        <Input
          type="text"
          value={(styling.fontFamily as string) ?? ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            updateField('fontFamily', e.target.value)
          }
          placeholder="inherit"
          className="h-8 text-sm"
        />
      </div>

      {/* Suggest Colors 버튼 */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleSuggestColors}
        disabled={!(styling.brandColor as StylingColor | undefined)?.light}
      >
        {t('project.styling.actions.suggest_colors', 'Suggest Colors')}
      </Button>
    </StylingSection>
  );
}
