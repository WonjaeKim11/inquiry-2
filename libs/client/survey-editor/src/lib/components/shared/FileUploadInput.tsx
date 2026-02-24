'use client';

import { useTranslation } from 'react-i18next';
import { ImageIcon, X } from 'lucide-react';
import { Input, Button, Label } from '@inquiry/client-ui';

interface FileUploadInputProps {
  /** 현재 URL 값 */
  value: string | undefined;
  /** URL 변경 콜백. 빈 문자열일 경우 undefined를 전달한다 */
  onChange: (url: string | undefined) => void;
  /** 라벨 */
  label?: string;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 비활성화 여부 */
  disabled?: boolean;
}

/**
 * 파일 URL 입력 컴포넌트.
 * 초기에는 URL 직접 입력 방식으로 구현하고,
 * 후속 작업에서 실제 파일 업로드 기능으로 교체한다.
 *
 * @param props - FileUploadInputProps
 * @returns 이미지 URL 입력 필드와 제거 버튼을 렌더링한다
 */
export function FileUploadInput({
  value,
  onChange,
  label,
  placeholder,
  disabled = false,
}: FileUploadInputProps) {
  const { t } = useTranslation();

  return (
    <div>
      {label && (
        <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      )}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <ImageIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value ?? ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange(e.target.value || undefined)
            }
            placeholder={
              placeholder ??
              t('surveyEditor.shared.imageUrlPlaceholder', 'Enter image URL...')
            }
            disabled={disabled}
            className="pl-9"
          />
        </div>
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(undefined)}
            disabled={disabled}
            aria-label={t('surveyEditor.shared.removeImage', 'Remove image')}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
