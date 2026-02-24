'use client';

import { useTranslation } from 'react-i18next';
import { Switch, Label } from '@inquiry/client-ui';
import type { StylingColor } from '@inquiry/survey-builder-config';
import type { StylingFormMode } from '../types';
import { GeneralColorsSection } from './general-colors-section';
import { HeadlinesSection } from './headlines-section';
import { ButtonsSection } from './buttons-section';
import { InputsSection } from './inputs-section';
import { OptionsSection } from './options-section';
import { ProgressBarSection } from './progress-bar-section';
import { CardLayoutSection } from './card-layout-section';
import { BackgroundSection } from './background-section';

interface StylingFormProps {
  /** 현재 스타일링 값 */
  styling: Record<string, unknown>;
  /** 필드 업데이트 콜백 */
  updateField: (key: string, value: unknown) => void;
  /** 색상 필드 업데이트 콜백 */
  updateColor: (key: string, color: Partial<StylingColor>) => void;
  /** 폼 모드 (프로젝트/설문) */
  mode: StylingFormMode;
  /** 설문 유형 — link일 때만 배경 섹션 표시 */
  surveyType?: 'link' | 'app';
}

/**
 * 스타일링 메인 합성 폼 컴포넌트.
 * 모든 섹션 (General Colors, Headlines, Buttons, Inputs, Options, Progress Bar,
 * Card & Layout, Background)을 조합하여 렌더링한다.
 */
export function StylingForm({
  styling,
  updateField,
  updateColor,
  mode,
  surveyType,
}: StylingFormProps) {
  const { t } = useTranslation();

  const darkModeEnabled = (styling.darkMode as boolean) ?? false;
  /** 배경 섹션은 프로젝트 모드이거나 link 설문일 때만 표시 */
  const showBackground = mode === 'project' || surveyType === 'link';

  return (
    <div className="space-y-4">
      {/* Dark Mode 토글 */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label className="text-sm font-medium">
            {t('project.styling.dark_mode', 'Dark Mode')}
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t(
              'project.styling.dark_mode_desc',
              'Enable dark color values for each field'
            )}
          </p>
        </div>
        <Switch
          checked={darkModeEnabled}
          onCheckedChange={(v) => updateField('darkMode', v)}
        />
      </div>

      {/* 프로젝트 모드: allowStyleOverride 토글 */}
      {mode === 'project' && (
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <Label className="text-sm font-medium">
              {t('project.styling.allow_override', 'Allow Style Override')}
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(
                'project.styling.allow_override_desc',
                'Allow surveys to override project theme'
              )}
            </p>
          </div>
          <Switch
            checked={(styling.allowStyleOverride as boolean) ?? true}
            onCheckedChange={(v) => updateField('allowStyleOverride', v)}
          />
        </div>
      )}

      {/* 섹션들 */}
      <GeneralColorsSection
        styling={styling}
        updateColor={updateColor}
        updateField={updateField}
        darkModeEnabled={darkModeEnabled}
      />

      <HeadlinesSection
        styling={styling}
        updateColor={updateColor}
        updateField={updateField}
        darkModeEnabled={darkModeEnabled}
      />

      <ButtonsSection
        styling={styling}
        updateColor={updateColor}
        updateField={updateField}
        darkModeEnabled={darkModeEnabled}
      />

      <InputsSection
        styling={styling}
        updateColor={updateColor}
        updateField={updateField}
        darkModeEnabled={darkModeEnabled}
      />

      <OptionsSection
        styling={styling}
        updateColor={updateColor}
        updateField={updateField}
        darkModeEnabled={darkModeEnabled}
      />

      <ProgressBarSection
        styling={styling}
        updateColor={updateColor}
        updateField={updateField}
        darkModeEnabled={darkModeEnabled}
      />

      <CardLayoutSection
        styling={styling}
        updateColor={updateColor}
        updateField={updateField}
        darkModeEnabled={darkModeEnabled}
        surveyType={surveyType}
      />

      {/* 배경 섹션 — Link Survey 또는 프로젝트 모드에서만 표시 */}
      {showBackground && (
        <BackgroundSection
          styling={styling}
          updateField={updateField}
          updateColor={updateColor}
          darkModeEnabled={darkModeEnabled}
        />
      )}
    </div>
  );
}
