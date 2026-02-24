'use client';

import { useCallback } from 'react';
import { Input, Textarea, Label } from '@inquiry/client-ui';
import type { I18nString } from '@inquiry/survey-builder-config';
import { useEditorUI } from '../../hooks/use-editor-ui';

interface LocalizedInputProps {
  /** 현재 I18nString 값 */
  value: I18nString | undefined;
  /** 값 변경 콜백 */
  onChange: (value: I18nString) => void;
  /** 라벨 */
  label?: string;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 여러 줄 입력 사용 여부 */
  multiline?: boolean;
  /** 최대 길이 */
  maxLength?: number;
  /** 비활성화 여부 */
  disabled?: boolean;
  /** 추가 CSS 클래스 */
  className?: string;
}

/**
 * 다국어 텍스트 입력 컴포넌트.
 * 현재 selectedLanguage에 해당하는 텍스트를 입력/표시한다.
 * I18nString(Record<string, string>) 타입의 값을 관리한다.
 *
 * @param props - LocalizedInputProps
 * @returns 선택된 언어에 맞는 입력 필드를 렌더링한다
 */
export function LocalizedInput({
  value,
  onChange,
  label,
  placeholder,
  multiline = false,
  maxLength,
  disabled = false,
  className,
}: LocalizedInputProps) {
  const { editorConfig } = useEditorUI();
  const language = editorConfig.selectedLanguage;

  /** 현재 언어의 텍스트 값. 언어별 값이 없으면 'default' 키 폴백 사용 */
  const currentValue = value?.[language] ?? value?.['default'] ?? '';

  /**
   * 텍스트 변경 핸들러.
   * 기존 I18nString 객체를 복사한 뒤 현재 언어의 값만 갱신한다.
   */
  const handleChange = useCallback(
    (text: string) => {
      const updated: I18nString = { ...(value ?? {}), [language]: text };
      onChange(updated);
    },
    [value, language, onChange]
  );

  return (
    <div className={className}>
      {label && (
        <Label className="mb-1.5 block text-sm font-medium">{label}</Label>
      )}
      {multiline ? (
        <Textarea
          value={currentValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          className="min-h-[80px]"
        />
      ) : (
        <Input
          value={currentValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            handleChange(e.target.value)
          }
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
        />
      )}
      {maxLength && (
        <p className="mt-1 text-xs text-muted-foreground">
          {currentValue.length}/{maxLength}
        </p>
      )}
    </div>
  );
}
