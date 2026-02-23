'use client';

import { useState } from 'react';
import { z } from 'zod';
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
  Textarea,
  Alert,
  AlertDescription,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@inquiry/client-ui';

/** URL 필터 항목 타입 */
interface UrlFilter {
  rule: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'notContains';
  value: string;
}

/** noCode 트리거 타입 옵션 */
const NO_CODE_TYPES = [
  'click',
  'pageView',
  'exitIntent',
  'fiftyPercentScroll',
] as const;

/** URL 필터 규칙 옵션 */
const URL_FILTER_RULES = [
  'contains',
  'equals',
  'startsWith',
  'endsWith',
  'notContains',
] as const;

/**
 * ActionClass 생성/수정 Zod 검증 스키마.
 * type이 'code'이면 key가 필수이고, 'noCode'이면 noCodeConfig가 필요하다.
 */
const actionClassSchema = z
  .object({
    name: z
      .string()
      .min(1, 'project.action_class.name_required')
      .max(128, 'project.action_class.name_too_long'),
    description: z.string().optional(),
    type: z.enum(['code', 'noCode']),
    key: z.string().optional(),
    noCodeType: z.string().optional(),
    cssSelector: z.string().optional(),
    innerHtml: z.string().optional(),
    urlFilters: z
      .array(
        z.object({
          rule: z.enum([
            'contains',
            'equals',
            'startsWith',
            'endsWith',
            'notContains',
          ]),
          value: z.string(),
        })
      )
      .optional(),
  })
  .refine(
    (data) => {
      // code 타입일 때 key가 반드시 필요하다
      if (data.type === 'code') {
        return !!data.key && data.key.trim().length > 0;
      }
      return true;
    },
    {
      message: 'project.action_class.key_required',
      path: ['key'],
    }
  );

/**
 * ActionClass 생성/수정 폼.
 * type 선택에 따라 code는 key 입력, noCode는 noCodeConfig 설정을 제공한다.
 * Zod를 사용하여 클라이언트 사이드 검증을 수행한다.
 */
export function ActionClassForm({
  environmentId,
  onSuccess,
}: {
  /** ActionClass를 생성할 환경 ID */
  environmentId: string;
  /** 생성 성공 시 호출되는 콜백 */
  onSuccess?: () => void;
}) {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'code' | 'noCode'>('code');
  const [key, setKey] = useState('');
  const [noCodeType, setNoCodeType] = useState<string>('click');
  const [cssSelector, setCssSelector] = useState('');
  const [innerHtml, setInnerHtml] = useState('');
  const [urlFilters, setUrlFilters] = useState<UrlFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** URL 필터 추가 */
  const addUrlFilter = () => {
    setUrlFilters([...urlFilters, { rule: 'contains', value: '' }]);
  };

  /** URL 필터 제거 */
  const removeUrlFilter = (index: number) => {
    setUrlFilters(urlFilters.filter((_, i) => i !== index));
  };

  /** URL 필터 업데이트 */
  const updateUrlFilter = (
    index: number,
    field: keyof UrlFilter,
    value: string
  ) => {
    const updated = [...urlFilters];
    updated[index] = { ...updated[index], [field]: value };
    setUrlFilters(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 클라이언트 사이드 검증
    const formData = {
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      key: type === 'code' ? key.trim() : undefined,
      noCodeType: type === 'noCode' ? noCodeType : undefined,
      cssSelector:
        type === 'noCode' && cssSelector.trim()
          ? cssSelector.trim()
          : undefined,
      innerHtml:
        type === 'noCode' && innerHtml.trim() ? innerHtml.trim() : undefined,
      urlFilters:
        type === 'noCode' && urlFilters.length > 0 ? urlFilters : undefined,
    };

    const result = actionClassSchema.safeParse(formData);
    if (!result.success) {
      setError(t(result.error.issues[0].message));
      return;
    }

    // API 요청 바디 구성
    const body: Record<string, unknown> = {
      name: formData.name,
      description: formData.description,
      type: formData.type,
    };

    if (type === 'code') {
      body.key = formData.key;
    } else {
      // noCode 타입일 때 noCodeConfig를 구성한다
      body.noCodeConfig = {
        type: noCodeType,
        cssSelector: formData.cssSelector,
        innerHtml: formData.innerHtml,
        urlFilters:
          formData.urlFilters && formData.urlFilters.length > 0
            ? formData.urlFilters
            : undefined,
      };
    }

    setLoading(true);
    try {
      const res = await apiFetch(
        `/environments/${environmentId}/action-classes`,
        {
          method: 'POST',
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('project.action_class.create_fail'));
      }

      onSuccess?.();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('project.action_class.create_fail')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{t('project.action_class.create')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 이름 */}
          <div className="space-y-2">
            <Label htmlFor="ac-name">{t('project.action_class.name')}</Label>
            <Input
              id="ac-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={128}
              required
              autoFocus
            />
          </div>

          {/* 설명 */}
          <div className="space-y-2">
            <Label htmlFor="ac-description">
              {t('project.action_class.description')}
            </Label>
            <Textarea
              id="ac-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* 타입 선택 */}
          <div className="space-y-2">
            <Label>{t('project.action_class.type')}</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as 'code' | 'noCode')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="code">
                  {t('project.action_class.code')}
                </SelectItem>
                <SelectItem value="noCode">
                  {t('project.action_class.no_code')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* code 타입: key 입력 */}
          {type === 'code' && (
            <div className="space-y-2">
              <Label htmlFor="ac-key">{t('project.action_class.key')}</Label>
              <Input
                id="ac-key"
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                required
              />
            </div>
          )}

          {/* noCode 타입: 트리거 설정 */}
          {type === 'noCode' && (
            <>
              {/* noCode 트리거 타입 */}
              <div className="space-y-2">
                <Label>{t('project.action_class.no_code_type')}</Label>
                <Select value={noCodeType} onValueChange={setNoCodeType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NO_CODE_TYPES.map((nct) => (
                      <SelectItem key={nct} value={nct}>
                        {nct}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* CSS 셀렉터 */}
              <div className="space-y-2">
                <Label htmlFor="ac-css-selector">
                  {t('project.action_class.css_selector')}
                </Label>
                <Input
                  id="ac-css-selector"
                  type="text"
                  value={cssSelector}
                  onChange={(e) => setCssSelector(e.target.value)}
                  placeholder=".my-button"
                />
              </div>

              {/* Inner HTML */}
              <div className="space-y-2">
                <Label htmlFor="ac-inner-html">
                  {t('project.action_class.inner_html')}
                </Label>
                <Input
                  id="ac-inner-html"
                  type="text"
                  value={innerHtml}
                  onChange={(e) => setInnerHtml(e.target.value)}
                />
              </div>

              {/* URL 필터 목록 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('project.action_class.url_filters')}</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addUrlFilter}
                  >
                    {t('project.action_class.add_filter')}
                  </Button>
                </div>
                {urlFilters.map((filter, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Select
                      value={filter.rule}
                      onValueChange={(v) => updateUrlFilter(index, 'rule', v)}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {URL_FILTER_RULES.map((rule) => (
                          <SelectItem key={rule} value={rule}>
                            {rule}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="text"
                      value={filter.value}
                      onChange={(e) =>
                        updateUrlFilter(index, 'value', e.target.value)
                      }
                      placeholder="URL"
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => removeUrlFilter(index)}
                    >
                      X
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading
              ? t('project.action_class.creating')
              : t('project.action_class.create')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
