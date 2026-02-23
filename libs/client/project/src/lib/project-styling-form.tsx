'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '@inquiry/client-core';
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Switch,
  Alert,
  AlertDescription,
} from '@inquiry/client-ui';
import type { Project } from './project-context';

/**
 * 프로젝트 스타일링 설정 컴포넌트.
 * brandColor, cardBackgroundColor, cardBorderColor, roundness,
 * hideProgressBar, isLogoHidden, allowStyleOverride를 설정한다.
 * styling JSON 필드로 PATCH /api/projects/:projectId에 전송된다.
 */
export function ProjectStylingForm({
  project,
  onUpdated,
}: {
  project: Project;
  /** 스타일링 저장 후 호출되는 콜백 */
  onUpdated?: () => void;
}) {
  const { t } = useTranslation();

  const [brandColor, setBrandColor] = useState(
    project.styling?.brandColor ?? ''
  );
  const [cardBackgroundColor, setCardBackgroundColor] = useState(
    project.styling?.cardBackgroundColor ?? ''
  );
  const [cardBorderColor, setCardBorderColor] = useState(
    project.styling?.cardBorderColor ?? ''
  );
  const [roundness, setRoundness] = useState(project.styling?.roundness ?? 8);
  const [hideProgressBar, setHideProgressBar] = useState(
    project.styling?.hideProgressBar ?? false
  );
  const [isLogoHidden, setIsLogoHidden] = useState(
    project.styling?.isLogoHidden ?? false
  );
  const [allowStyleOverride, setAllowStyleOverride] = useState(
    project.styling?.allowStyleOverride ?? false
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // project이 변경되면 폼 상태를 동기화한다
  useEffect(() => {
    setBrandColor(project.styling?.brandColor ?? '');
    setCardBackgroundColor(project.styling?.cardBackgroundColor ?? '');
    setCardBorderColor(project.styling?.cardBorderColor ?? '');
    setRoundness(project.styling?.roundness ?? 8);
    setHideProgressBar(project.styling?.hideProgressBar ?? false);
    setIsLogoHidden(project.styling?.isLogoHidden ?? false);
    setAllowStyleOverride(project.styling?.allowStyleOverride ?? false);
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    setLoading(true);
    try {
      const res = await apiFetch(`/projects/${project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          styling: {
            brandColor: brandColor || null,
            cardBackgroundColor: cardBackgroundColor || null,
            cardBorderColor: cardBorderColor || null,
            roundness,
            hideProgressBar,
            isLogoHidden,
            allowStyleOverride,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('project.settings.save_fail'));
      }

      setSuccess(t('project.settings.save_success'));
      onUpdated?.();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('project.settings.save_fail')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('project.settings.styling')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 브랜드 색상 */}
          <div className="space-y-2">
            <Label htmlFor="brand-color">
              {t('project.styling.brand_color')}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="brand-color"
                type="color"
                value={brandColor || '#000000'}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-10 w-14 cursor-pointer p-1"
              />
              <Input
                type="text"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>

          {/* 카드 배경색 */}
          <div className="space-y-2">
            <Label htmlFor="card-bg-color">
              {t('project.styling.card_background')}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="card-bg-color"
                type="color"
                value={cardBackgroundColor || '#ffffff'}
                onChange={(e) => setCardBackgroundColor(e.target.value)}
                className="h-10 w-14 cursor-pointer p-1"
              />
              <Input
                type="text"
                value={cardBackgroundColor}
                onChange={(e) => setCardBackgroundColor(e.target.value)}
                placeholder="#ffffff"
                className="flex-1"
              />
            </div>
          </div>

          {/* 카드 테두리 색상 */}
          <div className="space-y-2">
            <Label htmlFor="card-border-color">
              {t('project.styling.card_border')}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="card-border-color"
                type="color"
                value={cardBorderColor || '#e5e7eb'}
                onChange={(e) => setCardBorderColor(e.target.value)}
                className="h-10 w-14 cursor-pointer p-1"
              />
              <Input
                type="text"
                value={cardBorderColor}
                onChange={(e) => setCardBorderColor(e.target.value)}
                placeholder="#e5e7eb"
                className="flex-1"
              />
            </div>
          </div>

          {/* 모서리 둥글기 */}
          <div className="space-y-2">
            <Label htmlFor="roundness">{t('project.styling.roundness')}</Label>
            <Input
              id="roundness"
              type="number"
              min={0}
              max={50}
              value={roundness}
              onChange={(e) => setRoundness(Number(e.target.value))}
            />
          </div>

          {/* 진행률 바 숨기기 */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <Label htmlFor="hide-progress">
              {t('project.styling.hide_progress')}
            </Label>
            <Switch
              id="hide-progress"
              checked={hideProgressBar}
              onCheckedChange={setHideProgressBar}
            />
          </div>

          {/* 로고 숨기기 */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <Label htmlFor="hide-logo">{t('project.styling.hide_logo')}</Label>
            <Switch
              id="hide-logo"
              checked={isLogoHidden}
              onCheckedChange={setIsLogoHidden}
            />
          </div>

          {/* 스타일 오버라이드 허용 */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <Label htmlFor="allow-override">
              {t('project.styling.allow_override')}
            </Label>
            <Switch
              id="allow-override"
              checked={allowStyleOverride}
              onCheckedChange={setAllowStyleOverride}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={loading}>
            {loading
              ? t('project.settings.saving')
              : t('project.settings.save')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
