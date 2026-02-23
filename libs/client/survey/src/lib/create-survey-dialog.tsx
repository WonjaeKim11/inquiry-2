'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Alert,
  AlertDescription,
} from '@inquiry/client-ui';
import { createSurvey, createSurveyFromTemplate } from './api';
import { fetchTemplates } from './api';
import type { SurveyDetail, SurveyTemplate, SurveyType } from './types';

/**
 * 설문 생성 다이얼로그.
 * 이름, 유형(link/app), 템플릿(선택사항)을 입력받아
 * 설문을 생성하고 성공 시 부모에게 전달한다.
 */
export function CreateSurveyDialog({
  environmentId,
  open,
  onOpenChange,
  onCreated,
}: {
  /** 대상 환경 ID */
  environmentId: string;
  /** 다이얼로그 열림/닫힘 상태 */
  open: boolean;
  /** 열림/닫힘 상태 변경 핸들러 */
  onOpenChange: (open: boolean) => void;
  /** 생성 성공 시 결과를 전달하는 콜백 */
  onCreated: (survey: SurveyDetail) => void;
}) {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [type, setType] = useState<SurveyType>('link');
  const [templateId, setTemplateId] = useState<string>('');
  const [templates, setTemplates] = useState<SurveyTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 다이얼로그가 열릴 때 템플릿 목록을 조회한다
  useEffect(() => {
    if (open) {
      fetchTemplates().then((result) => {
        if (result.ok) {
          setTemplates(result.data);
        }
      });
    }
  }, [open]);

  /** 폼 유효성 검사: 이름 필수 */
  const isValid = name.trim() !== '';

  /**
   * 설문 생성 요청을 서버에 보낸다.
   * 템플릿이 선택된 경우 템플릿 기반 생성 API를 사용한다.
   */
  const handleSubmit = async () => {
    if (!isValid) return;

    setError(null);
    setLoading(true);

    try {
      const input = { name: name.trim(), type };
      const result = templateId
        ? await createSurveyFromTemplate(environmentId, templateId, input)
        : await createSurvey(environmentId, input);

      if (!result.ok) {
        throw new Error(result.message || t('survey.create.fail'));
      }

      resetForm();
      onOpenChange(false);
      if (result.data) {
        onCreated(result.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('survey.create.fail'));
    } finally {
      setLoading(false);
    }
  };

  /** 폼 상태를 초기값으로 되돌린다 */
  const resetForm = () => {
    setName('');
    setType('link');
    setTemplateId('');
    setError(null);
  };

  /** 다이얼로그가 닫힐 때 폼을 초기화한다 */
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('survey.create.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 설문 이름 입력 */}
          <div className="space-y-2">
            <Label htmlFor="survey-name">{t('survey.create.name_label')}</Label>
            <Input
              id="survey-name"
              type="text"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
              placeholder={t('survey.create.name_placeholder')}
              autoComplete="off"
            />
          </div>

          {/* 설문 유형 선택 */}
          <div className="space-y-2">
            <Label>{t('survey.create.type_label')}</Label>
            <Select
              value={type}
              onValueChange={(v: string) => setType(v as SurveyType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="link">
                  {t('survey.create.type_link')}
                </SelectItem>
                <SelectItem value="app">
                  {t('survey.create.type_app')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 템플릿 선택 (선택사항) */}
          <div className="space-y-2">
            <Label>{t('survey.create.template_label')}</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder={t('survey.create.template_none')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  {t('survey.create.template_none')}
                </SelectItem>
                {templates.map((tmpl) => (
                  <SelectItem key={tmpl.id} value={tmpl.id}>
                    {tmpl.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            {t('survey.delete.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || loading}>
            {loading ? t('survey.create.creating') : t('survey.create.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
