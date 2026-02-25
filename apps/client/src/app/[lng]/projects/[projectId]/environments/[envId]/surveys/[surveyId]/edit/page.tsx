'use client';

import { use, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@inquiry/client-core';
import { Alert, AlertDescription, Button } from '@inquiry/client-ui';
import { useProject } from '@inquiry/client-project';
import { useSurvey } from '@inquiry/client-survey';
import { surveyBuilder } from '@inquiry/survey-builder-config';
import { useBuilderStore } from '@coltorapps/builder-react';
import type { SurveyBuilderSchema } from '@inquiry/survey-builder-config';
import {
  surveyToBuilderData,
  EditorUIProvider,
  SurveyMetaProvider,
  SurveyEditorLayout,
  ElementsView,
  SettingsView,
  StylingView,
  FollowUpsView,
  SurveyPreview,
  useEditorUI,
  useEditorAutoSave,
  useSurveyPublish,
} from '@inquiry/client-survey-editor';
import type { SurveyMetaState } from '@inquiry/client-survey-editor';

/**
 * 설문 편집기 페이지.
 * 서버에서 설문 데이터를 로드하고, Builder Store + Meta Context를 초기화한 뒤
 * SurveyEditorLayout으로 편집기 UI를 렌더링한다.
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
  const { survey, loading, error } = useSurvey(surveyId);

  // 프로젝트 정보 — 스타일 오버라이드 허용 여부 확인에 사용
  const { currentProject } = useProject();

  // 미인증 시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/${lng}/auth/login`);
    }
  }, [authLoading, user, router, lng]);

  // 설문 데이터를 Builder Store용 schema와 Meta로 분리한다
  const builderData = useMemo(() => {
    if (!survey) return null;
    return surveyToBuilderData(survey);
  }, [survey]);

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

  if (error || !survey || !builderData) {
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

  const isStyleOverrideAllowed =
    (currentProject?.styling as Record<string, unknown>)?.allowStyleOverride !==
    false;

  return (
    <EditorUIProvider
      initialConfig={{
        isStyleOverrideAllowed,
      }}
    >
      <SurveyMetaProvider initialMeta={builderData.meta as SurveyMetaState}>
        <SurveyEditorInner
          schema={builderData.schema}
          backUrl={`/${lng}/projects/${projectId}/environments/${envId}/surveys`}
        />
      </SurveyMetaProvider>
    </EditorUIProvider>
  );
}

/**
 * 편집기 내부 컴포넌트.
 * EditorUIProvider, SurveyMetaProvider 하위에서 훅을 사용한다.
 * Builder Store를 생성하고, 자동 저장 + 발행 기능을 연결하며,
 * 활성 탭에 따라 편집 콘텐츠를 전환한다.
 */
function SurveyEditorInner({
  schema,
  backUrl,
}: {
  schema: SurveyBuilderSchema | undefined;
  backUrl: string;
}) {
  // Builder Store 생성 (initialData로 서버 데이터를 복원)
  const builderStore = useBuilderStore(surveyBuilder, {
    initialData: schema
      ? {
          schema,
          entitiesAttributesErrors: {},
          schemaError: null,
        }
      : undefined,
  });

  const { activeTab } = useEditorUI();
  const { performSave } = useEditorAutoSave(builderStore);
  const { publish } = useSurveyPublish(
    () => builderStore.getData()?.schema as SurveyBuilderSchema | undefined
  );

  // 활성 탭에 따라 편집 콘텐츠를 렌더링한다
  let editorContent;
  switch (activeTab) {
    case 'elements':
      editorContent = <ElementsView builderStore={builderStore} />;
      break;
    case 'settings':
      editorContent = <SettingsView />;
      break;
    case 'styling':
      editorContent = <StylingView />;
      break;
    case 'followUps':
      editorContent = <FollowUpsView />;
      break;
    default:
      editorContent = <ElementsView builderStore={builderStore} />;
  }

  return (
    <SurveyEditorLayout
      editorContent={editorContent}
      previewContent={<SurveyPreview builderStore={builderStore} />}
      backUrl={backUrl}
      onSave={performSave}
      onPublish={async () => {
        await publish();
      }}
    />
  );
}
