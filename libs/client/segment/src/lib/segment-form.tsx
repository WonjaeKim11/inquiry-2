'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Label, Textarea, Switch } from '@inquiry/client-ui';
import type { SegmentFormValues } from './schemas/segment.schema.js';

interface SegmentFormProps {
  /** 초기값 (수정 시) */
  initialValues?: Partial<SegmentFormValues>;
  /** 폼 제출 콜백 */
  onSubmit: (values: SegmentFormValues) => Promise<void>;
  /** 취소 콜백 */
  onCancel?: () => void;
  /** 제출 중 여부 */
  submitting?: boolean;
  /** 모드: 생성/수정 */
  mode?: 'create' | 'edit';
}

/**
 * 세그먼트 제목/설명/공개여부 입력 폼.
 * 생성과 수정에서 공용으로 사용한다.
 */
export function SegmentForm({
  initialValues,
  onSubmit,
  onCancel,
  submitting = false,
  mode = 'create',
}: SegmentFormProps) {
  const { t } = useTranslation('translation');
  const [title, setTitle] = useState(initialValues?.title ?? '');
  const [description, setDescription] = useState(
    initialValues?.description ?? ''
  );
  const [isPrivate, setIsPrivate] = useState(initialValues?.isPrivate ?? true);
  const [error, setError] = useState('');

  /** 폼 제출 핸들러 - 기본 유효성 검사 후 콜백 호출 */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t('segment.form.title_required'));
      return;
    }
    if (trimmedTitle.length > 100) {
      setError(t('segment.form.title_max'));
      return;
    }

    await onSubmit({
      title: trimmedTitle,
      description: description || undefined,
      isPrivate,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 제목 입력 */}
      <div className="space-y-2">
        <Label htmlFor="segment-title">{t('segment.form.title_label')}</Label>
        <Input
          id="segment-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('segment.form.title_placeholder')}
          maxLength={100}
          required
        />
      </div>

      {/* 설명 입력 */}
      <div className="space-y-2">
        <Label htmlFor="segment-description">
          {t('segment.form.description_label')}
        </Label>
        <Textarea
          id="segment-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('segment.form.description_placeholder')}
          maxLength={500}
          rows={3}
        />
      </div>

      {/* 비공개 여부 토글 */}
      <div className="flex items-center gap-2">
        <Switch
          id="segment-private"
          checked={isPrivate}
          onCheckedChange={setIsPrivate}
        />
        <Label htmlFor="segment-private">
          {t('segment.form.private_label')}
        </Label>
      </div>

      {/* 유효성 검사 에러 메시지 */}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* 액션 버튼 */}
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            {t('segment.form.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={submitting}>
          {submitting
            ? t('common.saving', 'Saving...')
            : mode === 'create'
            ? t('segment.form.create')
            : t('segment.form.save')}
        </Button>
      </div>
    </form>
  );
}
