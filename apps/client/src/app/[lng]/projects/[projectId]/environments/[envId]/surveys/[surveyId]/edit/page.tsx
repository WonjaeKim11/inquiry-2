'use client';

import { use, useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@inquiry/client-core';
import {
  Button,
  Input,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  AlertDescription,
} from '@inquiry/client-ui';
import {
  useSurvey,
  useAutoSave,
  SurveyStatusBadge,
  publishSurvey,
  pauseSurvey,
  resumeSurvey,
  completeSurvey,
  updateSurvey,
} from '@inquiry/client-survey';
import type { SurveyStatus, UpdateSurveyInput } from '@inquiry/client-survey';
import {
  MultiLanguageCard,
  EditorLanguageSelector,
  useSurveyLanguages,
} from '@inquiry/client-multilingual';
import type {
  EditingLanguageContext,
  LanguageWithConfig,
} from '@inquiry/client-multilingual';

/**
 * 설문 편집기 페이지.
 * 설문 데이터를 로드하고, 이름/스키마 편집, 자동 저장, 상태 전이, 다국어 설정 기능을 제공한다.
 */
export default function SurveyEditPage({
  params,
}: {
  params: Promise<{
    lng: string;
    projectId: string;
    envId: string;
    surveyId: string;
  }>;
}) {
  const { lng, projectId, envId, surveyId } = use(params);
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // 설문 데이터 로드
  const { survey, loading, error, refetch } = useSurvey(surveyId);

  // 편집 상태
  const [name, setName] = useState('');
  const [schemaText, setSchemaText] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [editingLanguage, setEditingLanguage] =
    useState<EditingLanguageContext | null>(null);

  // 설문 데이터가 로드되면 편집 상태를 초기화한다
  useEffect(() => {
    if (survey) {
      setName(survey.name);
      setSchemaText(JSON.stringify(survey.schema ?? {}, null, 2));
    }
  }, [survey]);

  // 자동 저장용 데이터 객체를 메모이제이션한다
  const autoSaveData: UpdateSurveyInput = useMemo(
    () => ({ name, schema: safeParseJSON(schemaText) }),
    [name, schemaText]
  );

  // 자동 저장 (초안 상태에서만 활성화)
  const { saving, lastSavedAt } = useAutoSave(surveyId, autoSaveData, {
    enabled: survey?.status === 'DRAFT',
  });

  /** 다국어 설정 변경 시 즉시 서버에 저장하고 refetch한다 */
  const handleMultilingualUpdate = useCallback(
    async (data: Partial<UpdateSurveyInput>) => {
      try {
        await updateSurvey(surveyId, data);
        await refetch();
      } catch {
        // MultiLanguageCard 내부에서 에러를 처리하므로 여기서는 무시
      }
    },
    [surveyId, refetch]
  );

  // 다국어 훅 — EditorLanguageSelector에 전달할 데이터
  const { languagesWithConfig } = useSurveyLanguages(
    projectId,
    survey,
    handleMultilingualUpdate
  );

  // 미인증 시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/${lng}/auth/login`);
    }
  }, [authLoading, user, router, lng]);

  /**
   * 상태 전이 액션을 실행한다.
   * 성공 시 설문 데이터를 다시 조회한다.
   */
  const handleStatusTransition = useCallback(
    async (action: 'publish' | 'pause' | 'resume' | 'complete') => {
      setStatusError(null);
      setTransitioning(true);

      const actionMap = {
        publish: publishSurvey,
        pause: pauseSurvey,
        resume: resumeSurvey,
        complete: completeSurvey,
      };

      try {
        const result = await actionMap[action](surveyId);
        if (!result.ok) {
          throw new Error(result.message || t('survey.errors.transition_fail'));
        }
        await refetch();
      } catch (err) {
        setStatusError(
          err instanceof Error
            ? err.message
            : t('survey.errors.transition_fail')
        );
      } finally {
        setTransitioning(false);
      }
    },
    [surveyId, refetch, t]
  );

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error || !survey) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <Alert variant="destructive">
          <AlertDescription>
            {error || t('survey.errors.not_found')}
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() =>
            router.push(
              `/${lng}/projects/${projectId}/environments/${envId}/surveys`
            )
          }
        >
          {t('survey.editor.back_to_list')}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* 네비게이션 */}
      <div className="mb-6 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            router.push(
              `/${lng}/projects/${projectId}/environments/${envId}/surveys`
            )
          }
        >
          {t('survey.editor.back_to_list')}
        </Button>
      </div>

      {/* 헤더: 설문 이름 + 상태 배지 + 언어 선택 + 저장 표시 */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{t('survey.editor.title')}</h1>
          <SurveyStatusBadge status={survey.status} />
        </div>
        <div className="flex items-center gap-4">
          {languagesWithConfig.filter(
            (l: LanguageWithConfig) => l.isEnabled || l.isDefault
          ).length > 1 && (
            <EditorLanguageSelector
              languages={languagesWithConfig}
              editingContext={editingLanguage}
              onSelectLanguage={setEditingLanguage}
            />
          )}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {saving && <span>{t('survey.actions.saving')}</span>}
            {!saving && lastSavedAt && (
              <span>{t('survey.actions.auto_saved')}</span>
            )}
          </div>
        </div>
      </div>

      {/* 상태 전이 에러 */}
      {statusError && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{statusError}</AlertDescription>
        </Alert>
      )}

      {/* 상태 전이 버튼 */}
      <div className="mb-6 flex flex-wrap gap-2">
        <StatusTransitionButtons
          status={survey.status}
          transitioning={transitioning}
          onTransition={handleStatusTransition}
          t={t}
        />
      </div>

      {/* 설문 이름 편집 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('survey.create.name_label')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            type="text"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setName(e.target.value)
            }
            placeholder={t('survey.create.name_placeholder')}
          />
        </CardContent>
      </Card>

      {/* 스키마 편집 (JSON) */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{t('survey.editor.questions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="min-h-[300px] w-full rounded-md border bg-transparent p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={schemaText}
            onChange={(e) => setSchemaText(e.target.value)}
            spellCheck={false}
          />
        </CardContent>
      </Card>

      {/* 다국어 설정 카드 */}
      <MultiLanguageCard
        projectId={projectId}
        survey={survey}
        onUpdate={handleMultilingualUpdate}
        lng={lng}
      />
    </div>
  );
}

/**
 * JSON 문자열을 안전하게 파싱한다.
 * 파싱 실패 시 undefined를 반환한다.
 */
function safeParseJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * 현재 상태에 따라 사용 가능한 상태 전이 버튼을 렌더링한다.
 * DRAFT → Publish, IN_PROGRESS → Pause/Complete, PAUSED → Resume/Complete
 */
function StatusTransitionButtons({
  status,
  transitioning,
  onTransition,
  t,
}: {
  status: SurveyStatus;
  transitioning: boolean;
  onTransition: (action: 'publish' | 'pause' | 'resume' | 'complete') => void;
  t: (key: string) => string;
}) {
  switch (status) {
    case 'DRAFT':
      return (
        <Button
          onClick={() => onTransition('publish')}
          disabled={transitioning}
        >
          {t('survey.actions.publish')}
        </Button>
      );
    case 'IN_PROGRESS':
      return (
        <>
          <Button
            variant="outline"
            onClick={() => onTransition('pause')}
            disabled={transitioning}
          >
            {t('survey.actions.pause')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => onTransition('complete')}
            disabled={transitioning}
          >
            {t('survey.actions.complete')}
          </Button>
        </>
      );
    case 'PAUSED':
      return (
        <>
          <Button
            onClick={() => onTransition('resume')}
            disabled={transitioning}
          >
            {t('survey.actions.resume')}
          </Button>
          <Button
            variant="secondary"
            onClick={() => onTransition('complete')}
            disabled={transitioning}
          >
            {t('survey.actions.complete')}
          </Button>
        </>
      );
    case 'COMPLETED':
      return null;
    default:
      return null;
  }
}
