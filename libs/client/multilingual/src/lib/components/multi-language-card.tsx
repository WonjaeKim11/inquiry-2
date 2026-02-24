'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  Badge,
  Alert,
  AlertDescription,
} from '@inquiry/client-ui';
import { useOrganization } from '@inquiry/client-organization';
import type { SurveyDetail, UpdateSurveyInput } from '@inquiry/client-survey';
import { isRtlLanguage } from '@inquiry/survey-builder-config';
import { useSurveyLanguages } from '../hooks/use-survey-languages';
import { TranslationStatusBadge } from './translation-status-badge';
import { RemoveTranslationsDialog } from './remove-translations-dialog';

/**
 * 설문 다국어 설정 카드.
 * 설문 에디터 사이드바에 배치하여 다국어 설정을 관리한다.
 *
 * @param projectId - 프로젝트 ID
 * @param survey - 설문 상세 데이터
 * @param onUpdate - 설문 업데이트 콜백
 * @param lng - 현재 UI 언어 (라우트 파라미터)
 */
export function MultiLanguageCard({
  projectId,
  survey,
  onUpdate,
  lng,
}: {
  projectId: string;
  survey: SurveyDetail;
  onUpdate: (data: Partial<UpdateSurveyInput>) => void;
  lng: string;
}) {
  const { t } = useTranslation();
  const { currentOrganization } = useOrganization();
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [removing, setRemoving] = useState(false);

  const {
    projectLanguages,
    languagesWithConfig,
    loading,
    setDefaultLanguage,
    toggleLanguage,
    removeAllTranslations,
    setShowLanguageSwitch,
  } = useSurveyLanguages(projectId, survey, onUpdate);

  /** 다국어 비활성화 확인 처리 */
  const handleRemoveConfirm = useCallback(() => {
    setRemoving(true);
    removeAllTranslations();
    setRemoving(false);
    setRemoveDialogOpen(false);
  }, [removeAllTranslations]);

  // 라이선스 체크 — free 플랜은 다국어 기능 미제공
  const plan = currentOrganization?.billing?.plan ?? 'free';
  const hasLicense = plan !== 'free';

  if (!hasLicense) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('multilingual.card_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              {t('multilingual.upgrade_prompt')}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('multilingual.card_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // 프로젝트 언어가 없음
  if (projectLanguages.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('multilingual.card_title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('multilingual.no_project_languages')}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.href = `/${lng}/projects/${projectId}/settings`;
            }}
          >
            {t('multilingual.go_to_settings')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 프로젝트 언어 1개 — 다국어 기능 사용 불가
  if (projectLanguages.length === 1) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('multilingual.card_title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('multilingual.add_more_languages')}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              window.location.href = `/${lng}/projects/${projectId}/settings`;
            }}
          >
            {t('multilingual.go_to_settings')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 정상 상태 — 다국어 설정 UI
  const surveyLangs = survey.languages ?? [];
  const defaultLang = languagesWithConfig.find((l) => l.isDefault);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('multilingual.card_title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 기본 언어 선택 */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            {t('multilingual.default_language')}
          </label>
          <Select
            value={defaultLang?.language.id ?? ''}
            onValueChange={(languageId) => setDefaultLanguage(languageId)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('multilingual.default_language')} />
            </SelectTrigger>
            <SelectContent>
              {projectLanguages.map((lang) => (
                <SelectItem key={lang.id} value={lang.id}>
                  {lang.alias ?? lang.code}{' '}
                  <code className="text-xs text-muted-foreground">
                    ({lang.code})
                  </code>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 보조 언어 토글 */}
        <div className="space-y-2">
          {languagesWithConfig
            .filter((l) => !l.isDefault)
            .map((l) => (
              <div
                key={l.language.id}
                className="flex items-center justify-between rounded-lg border p-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {l.language.alias ?? l.language.code}
                  </span>
                  <code className="text-xs text-muted-foreground">
                    {l.language.code}
                  </code>
                  {isRtlLanguage(l.language.code) && (
                    <Badge variant="outline" className="text-xs">
                      RTL
                    </Badge>
                  )}
                  <TranslationStatusBadge status={l.translationStatus} />
                </div>
                <Switch
                  checked={l.isEnabled}
                  onCheckedChange={(checked) =>
                    toggleLanguage(l.language.id, checked)
                  }
                />
              </div>
            ))}
        </div>

        {/* 응답자 언어 전환기 표시 여부 */}
        {surveyLangs.length > 1 && (
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                {t('multilingual.language_switch')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('multilingual.language_switch_hint')}
              </p>
            </div>
            <Switch
              checked={survey.showLanguageSwitch ?? false}
              onCheckedChange={(checked) => setShowLanguageSwitch(checked)}
            />
          </div>
        )}

        {/* 다국어 비활성화 버튼 */}
        {surveyLangs.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-destructive hover:text-destructive"
            onClick={() => setRemoveDialogOpen(true)}
          >
            {t('multilingual.disable_multilingual')}
          </Button>
        )}

        <RemoveTranslationsDialog
          open={removeDialogOpen}
          onOpenChange={setRemoveDialogOpen}
          onConfirm={handleRemoveConfirm}
          removing={removing}
        />
      </CardContent>
    </Card>
  );
}
