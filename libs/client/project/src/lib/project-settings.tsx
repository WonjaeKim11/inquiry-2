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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@inquiry/client-ui';
import type { Project } from './project-context';

/** Placement 옵션 목록 — 위젯 배치 위치 */
const PLACEMENT_OPTIONS = [
  'bottomRight',
  'bottomLeft',
  'topRight',
  'topLeft',
  'center',
] as const;

/** Dark overlay 옵션 목록 */
const DARK_OVERLAY_OPTIONS = ['none', 'light', 'dark'] as const;

/**
 * 프로젝트 일반 설정 컴포넌트.
 * 이름, recontactDays, placement, darkOverlay, 각종 토글을 제공한다.
 * 변경 사항은 PATCH /api/projects/:projectId로 저장된다.
 */
export function ProjectSettings({
  project,
  onUpdated,
}: {
  project: Project;
  /** 설정 저장 후 호출되는 콜백 — 프로젝트 목록 갱신에 사용 */
  onUpdated?: () => void;
}) {
  const { t } = useTranslation();

  const [name, setName] = useState(project.name);
  const [recontactDays, setRecontactDays] = useState(project.recontactDays);
  const [placement, setPlacement] = useState(project.placement);
  const [darkOverlay, setDarkOverlay] = useState(project.darkOverlay);
  const [clickOutsideClose, setClickOutsideClose] = useState(
    project.clickOutsideClose
  );
  const [inAppSurveyBranding, setInAppSurveyBranding] = useState(
    project.inAppSurveyBranding
  );
  const [linkSurveyBranding, setLinkSurveyBranding] = useState(
    project.linkSurveyBranding
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // project이 변경되면 폼 상태를 동기화한다
  useEffect(() => {
    setName(project.name);
    setRecontactDays(project.recontactDays);
    setPlacement(project.placement);
    setDarkOverlay(project.darkOverlay);
    setClickOutsideClose(project.clickOutsideClose);
    setInAppSurveyBranding(project.inAppSurveyBranding);
    setLinkSurveyBranding(project.linkSurveyBranding);
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError(t('project.errors.name_required'));
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch(`/projects/${project.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: name.trim(),
          recontactDays,
          placement,
          darkOverlay,
          clickOutsideClose,
          inAppSurveyBranding,
          linkSurveyBranding,
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
        <CardTitle>{t('project.settings.general')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 프로젝트 이름 */}
          <div className="space-y-2">
            <Label htmlFor="project-settings-name">
              {t('project.settings.name')}
            </Label>
            <Input
              id="project-settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={64}
              required
            />
          </div>

          {/* 재접촉 대기 일수 */}
          <div className="space-y-2">
            <Label htmlFor="recontact-days">
              {t('project.settings.recontact_days')}
            </Label>
            <Input
              id="recontact-days"
              type="number"
              min={0}
              max={365}
              value={recontactDays}
              onChange={(e) => setRecontactDays(Number(e.target.value))}
            />
          </div>

          {/* 위젯 배치 위치 */}
          <div className="space-y-2">
            <Label>{t('project.settings.placement')}</Label>
            <Select value={placement} onValueChange={setPlacement}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLACEMENT_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dark overlay 설정 */}
          <div className="space-y-2">
            <Label>{t('project.settings.dark_overlay')}</Label>
            <Select value={darkOverlay} onValueChange={setDarkOverlay}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DARK_OVERLAY_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 외부 클릭 시 닫기 토글 */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <Label htmlFor="click-outside-close">
              {t('project.settings.click_outside_close')}
            </Label>
            <Switch
              id="click-outside-close"
              checked={clickOutsideClose}
              onCheckedChange={setClickOutsideClose}
            />
          </div>

          {/* 인앱 설문 브랜딩 토글 */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <Label htmlFor="in-app-branding">
              {t('project.settings.in_app_branding')}
            </Label>
            <Switch
              id="in-app-branding"
              checked={inAppSurveyBranding}
              onCheckedChange={setInAppSurveyBranding}
            />
          </div>

          {/* 링크 설문 브랜딩 토글 */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <Label htmlFor="link-branding">
              {t('project.settings.link_branding')}
            </Label>
            <Switch
              id="link-branding"
              checked={linkSurveyBranding}
              onCheckedChange={setLinkSurveyBranding}
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
