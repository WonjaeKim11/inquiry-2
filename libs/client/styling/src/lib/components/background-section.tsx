'use client';

import { useTranslation } from 'react-i18next';
import {
  Label,
  Slider,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input,
} from '@inquiry/client-ui';
import { BACKGROUND_TYPES } from '@inquiry/survey-builder-config';
import type {
  SurveyBackground,
  BackgroundType,
  StylingColor,
} from '@inquiry/survey-builder-config';
import { StylingSection } from './styling-section';

interface BackgroundSectionProps {
  /** 현재 스타일링 객체 */
  styling: Record<string, unknown>;
  /** 일반 필드 업데이트 콜백 */
  updateField: (key: string, value: unknown) => void;
  /** 색상 필드 업데이트 콜백 */
  updateColor: (key: string, color: Partial<StylingColor>) => void;
  /** 다크 모드 색상 입력 활성화 여부 */
  darkModeEnabled: boolean;
}

/**
 * Background 섹션 (Link Survey 전용).
 * 4가지 배경 타입 (color/image/upload/animation) 선택 + 밝기 Slider.
 * image와 upload는 placeholder로 구현한다 (후속 Phase).
 */
export function BackgroundSection({
  styling,
  updateField,
  updateColor,
  darkModeEnabled,
}: BackgroundSectionProps) {
  const { t } = useTranslation();

  const background = (styling.background as SurveyBackground) ?? {};
  const bgType = background.bgType ?? 'color';
  const brightness = background.brightness ?? 100;

  /** 배경 객체 부분 업데이트 */
  const updateBackground = (partial: Partial<SurveyBackground>) => {
    updateField('background', { ...background, ...partial });
  };

  /** 배경 타입별 라벨 매핑 */
  const bgTypeLabels: Record<BackgroundType, string> = {
    color: t('project.styling.bg_type_color', 'Color'),
    image: t('project.styling.bg_type_image', 'Image (Unsplash)'),
    upload: t('project.styling.bg_type_upload', 'Upload'),
    animation: t('project.styling.bg_type_animation', 'Animation'),
  };

  return (
    <StylingSection
      title={t('project.styling.sections.background', 'Background')}
    >
      {/* Background Type 선택 */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          {t('project.styling.fields.bgType', 'Type')}
        </Label>
        <Select
          value={bgType}
          onValueChange={(v) =>
            updateBackground({ bgType: v as BackgroundType, bg: '' })
          }
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BACKGROUND_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {bgTypeLabels[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 타입별 입력 UI */}
      {bgType === 'color' && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">
            {t('project.styling.fields.bgColor', 'Background Color')}
          </Label>
          <Input
            type="text"
            value={background.bg ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              updateBackground({ bg: e.target.value })
            }
            placeholder="#f1f5f9"
            className="h-8 text-sm font-mono"
          />
        </div>
      )}

      {bgType === 'image' && (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          {t(
            'project.styling.bg_image_placeholder',
            'Unsplash integration coming soon'
          )}
        </div>
      )}

      {bgType === 'upload' && (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          {t(
            'project.styling.bg_upload_placeholder',
            'File upload coming soon'
          )}
        </div>
      )}

      {bgType === 'animation' && (
        <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          {t(
            'project.styling.bg_animation_placeholder',
            'Animation backgrounds coming soon'
          )}
        </div>
      )}

      {/* Brightness Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">
            {t('project.styling.brightness', 'Brightness')}
          </Label>
          <span className="text-xs text-muted-foreground">{brightness}%</span>
        </div>
        <Slider
          value={[brightness]}
          onValueChange={([v]) => updateBackground({ brightness: v })}
          min={0}
          max={200}
          step={5}
        />
      </div>
    </StylingSection>
  );
}
