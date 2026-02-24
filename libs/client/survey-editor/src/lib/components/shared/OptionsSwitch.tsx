'use client';

interface OptionsSwitchProps<T extends string> {
  /** 현재 선택된 값 */
  value: T;
  /** 값 변경 콜백 */
  onChange: (value: T) => void;
  /** 옵션 목록 (value-label 쌍) */
  options: { value: T; label: string }[];
  /** 비활성화 여부 */
  disabled?: boolean;
}

/**
 * 2가지 이상 옵션 전환 UI 컴포넌트.
 * 라디오 그룹 스타일의 세그먼트 전환기로,
 * Ending Card의 endScreen/redirectToUrl 유형 전환 등에 사용한다.
 *
 * @typeParam T - 옵션 값의 문자열 리터럴 유니온 타입
 * @param props - OptionsSwitchProps<T>
 * @returns 세그먼트 전환기 UI를 렌더링한다
 */
export function OptionsSwitch<T extends string>({
  value,
  onChange,
  options,
  disabled = false,
}: OptionsSwitchProps<T>) {
  return (
    <div className="inline-flex rounded-md border bg-muted p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={`rounded-sm px-3 py-1 text-sm font-medium transition-colors ${
            value === option.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
