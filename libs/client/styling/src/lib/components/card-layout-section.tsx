'use client';

import { useTranslation } from 'react-i18next';
import {
  Label,
  Switch,
  Slider,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@inquiry/client-ui';
import { CARD_ARRANGEMENT_OPTIONS } from '@inquiry/survey-builder-config';
import type {
  StylingColor,
  CardArrangement,
} from '@inquiry/survey-builder-config';
import { ColorPicker } from './color-picker';
import { StylingSection } from './styling-section';

interface CardLayoutSectionProps {
  /** 현재 스타일링 객체 */
  styling: Record<string, unknown>;
  /** 색상 필드 업데이트 콜백 */
  updateColor: (key: string, color: Partial<StylingColor>) => void;
  /** 일반 필드 업데이트 콜백 */
  updateField: (key: string, value: unknown) => void;
  /** 다크 모드 색상 입력 활성화 여부 */
  darkModeEnabled: boolean;
  /** 설문 유형 — 카드 배열 키 결정에 사용 */
  surveyType?: 'link' | 'app';
}

/**
 * Card & Layout 섹션.
 * cardBgColor, cardBorderColor, highlightBorderColor, roundness(Slider),
 * cardArrangement(Select), hideLogo(Switch)
 */
export function CardLayoutSection({
  styling,
  updateColor,
  updateField,
  darkModeEnabled,
  surveyType,
}: CardLayoutSectionProps) {
  const { t } = useTranslation();

  const arrangement = (styling.cardArrangement as CardArrangement) ?? {};
  /** surveyType에 따라 app/link 카드 배열 키 결정 */
  const arrangementKey = surveyType === 'app' ? 'appSurvey' : 'linkSurvey';

  return (
    <StylingSection
      title={t('project.styling.sections.card_layout', 'Card & Layout')}
    >
      <ColorPicker
        label={t('project.styling.fields.cardBgColor', 'Card Background')}
        value={styling.cardBgColor as StylingColor | undefined}
        onChange={(color) => updateColor('cardBgColor', color)}
        darkModeEnabled={darkModeEnabled}
      />
      <ColorPicker
        label={t('project.styling.fields.cardBorderColor', 'Card Border')}
        value={styling.cardBorderColor as StylingColor | undefined}
        onChange={(color) => updateColor('cardBorderColor', color)}
        darkModeEnabled={darkModeEnabled}
      />
      <ColorPicker
        label={t(
          'project.styling.fields.highlightBorderColor',
          'Highlight Border'
        )}
        value={styling.highlightBorderColor as StylingColor | undefined}
        onChange={(color) => updateColor('highlightBorderColor', color)}
        darkModeEnabled={darkModeEnabled}
      />

      {/* Roundness (Slider) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">
            {t('project.styling.fields.roundness', 'Roundness')}
          </Label>
          <span className="text-xs text-muted-foreground">
            {(styling.roundness as number) ?? 8}px
          </span>
        </div>
        <Slider
          value={[(styling.roundness as number) ?? 8]}
          onValueChange={([v]) => updateField('roundness', v)}
          min={0}
          max={24}
          step={1}
        />
      </div>

      {/* Card Arrangement */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          {t('project.styling.fields.cardArrangement', 'Card Arrangement')}
        </Label>
        <Select
          value={arrangement[arrangementKey] ?? 'simple'}
          onValueChange={(v) =>
            updateField('cardArrangement', {
              ...arrangement,
              [arrangementKey]: v,
            })
          }
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CARD_ARRANGEMENT_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {t(`project.styling.card_${opt}`, opt)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hide Logo 토글 */}
      <div className="flex items-center justify-between rounded-lg border p-3">
        <Label className="text-sm">
          {t('project.styling.fields.hideLogo', 'Hide Logo')}
        </Label>
        <Switch
          checked={(styling.hideLogo as boolean) ?? false}
          onCheckedChange={(v) => updateField('hideLogo', v)}
        />
      </div>
    </StylingSection>
  );
}
