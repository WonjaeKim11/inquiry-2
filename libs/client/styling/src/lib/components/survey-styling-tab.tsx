'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  CardContent,
  Switch,
  Label,
  Alert,
  AlertDescription,
} from '@inquiry/client-ui';
import { StylingForm } from './styling-form';
import { useStylingForm } from '../hooks/use-styling-form';

interface SurveyStylingTabProps {
  /** 현재 설문의 스타일링 데이터 */
  surveyStyling: Record<string, unknown> | null;
  /** 설문 유형 (link/app) */
  surveyType: 'link' | 'app';
  /** 프로젝트의 allowStyleOverride 설정 */
  allowStyleOverride: boolean;
  /** 스타일링 저장 콜백 */
  onSave: (styling: Record<string, unknown> | null) => Promise<void>;
}

/**
 * 설문 스타일링 탭 컴포넌트.
 * overrideTheme 토글 + StylingForm mode='survey' + Reset to Theme Styles 버튼을 제공한다.
 */
export function SurveyStylingTab({
  surveyStyling,
  surveyType,
  allowStyleOverride,
  onSave,
}: SurveyStylingTabProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 스타일링 폼 상태 관리 훅
  const { styling, updateField, updateColor, reset } = useStylingForm({
    mode: 'survey',
    initialData: surveyStyling ?? {},
  });

  // overrideTheme 토글 값 — 기본값은 false
  const overrideTheme = (styling.overrideTheme as boolean) ?? false;

  /** 스타일링 저장 핸들러 */
  const handleSave = useCallback(async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      await onSave(styling);
      setSuccess(t('project.settings.save_success'));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('project.styling.actions.save_fail', 'Failed to save styling')
      );
    } finally {
      setSaving(false);
    }
  }, [styling, onSave, t]);

  /** 테마 스타일로 초기화 — styling을 null로 저장 */
  const handleResetToTheme = useCallback(async () => {
    setError(null);
    setSaving(true);

    try {
      await onSave(null);
      reset();
      setSuccess(
        t('project.styling.actions.reset_to_theme', 'Reset to Theme Styles')
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('project.styling.actions.save_fail', 'Failed to save styling')
      );
    } finally {
      setSaving(false);
    }
  }, [onSave, reset, t]);

  // 프로젝트에서 스타일 오버라이드가 비활성화된 경우 안내 메시지만 표시
  if (!allowStyleOverride) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t(
            'project.styling.override_disabled',
            'Style override is disabled by project settings'
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Override Theme 토글 */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <Label className="text-sm font-medium">
              {t('project.styling.override_theme', 'Override Theme Styles')}
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t(
                'project.styling.override_theme_desc',
                'Customize styles for this survey only'
              )}
            </p>
          </div>
          <Switch
            checked={overrideTheme}
            onCheckedChange={(v) => updateField('overrideTheme', v)}
          />
        </CardContent>
      </Card>

      {/* 스타일링 폼 — overrideTheme이 활성화된 경우에만 표시 */}
      {overrideTheme && (
        <>
          <StylingForm
            styling={styling}
            updateField={updateField}
            updateColor={updateColor}
            mode="survey"
            surveyType={surveyType}
          />

          {/* 에러 알림 */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 성공 알림 */}
          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* 저장 / 초기화 버튼 */}
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? t('project.settings.saving')
                : t('project.settings.save')}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleResetToTheme}
              disabled={saving}
            >
              {t(
                'project.styling.actions.reset_to_theme',
                'Reset to Theme Styles'
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
