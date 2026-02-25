'use client';

import { useTranslation } from 'react-i18next';
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@inquiry/client-ui';
import type { FilterItem, TimeUnit } from '@inquiry/shared-segment';
import { VALUE_LESS_OPERATORS } from '@inquiry/shared-segment';

interface ValueInputProps {
  filter: FilterItem;
  onChange: (updates: Partial<FilterItem>) => void;
}

/**
 * 필터 값 입력 컴포넌트 (다형성).
 * 연산자와 데이터 타입에 따라 적절한 입력 UI를 렌더링한다.
 */
export function ValueInput({ filter, onChange }: ValueInputProps) {
  const { t } = useTranslation('translation');
  const { operator, filterType, resource, value, timeUnit } = filter;

  // 값이 필요 없는 연산자 (isSet, isNotSet, isToday, isYesterday)
  if (!operator || VALUE_LESS_OPERATORS.has(operator)) {
    return null;
  }

  // 디바이스/세그먼트는 별도 선택기에서 값을 처리
  if (resource === 'device' || resource === 'segment') {
    return null;
  }

  // 날짜 범위 연산자 (isWithinLast, isNotWithinLast) - 숫자 + 시간 단위 조합
  if (operator === 'isWithinLast' || operator === 'isNotWithinLast') {
    return (
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange({ value: Number(e.target.value) || 1 })}
          className="w-[70px] h-8"
          min={1}
        />
        <Select
          value={timeUnit ?? 'day'}
          onValueChange={(v) => onChange({ timeUnit: v as TimeUnit })}
        >
          <SelectTrigger className="w-[90px] h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">{t('segment.filter.time_day')}</SelectItem>
            <SelectItem value="week">
              {t('segment.filter.time_week')}
            </SelectItem>
            <SelectItem value="month">
              {t('segment.filter.time_month')}
            </SelectItem>
            <SelectItem value="year">
              {t('segment.filter.time_year')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  // 날짜 입력 (isBefore, isAfter, isExactly)
  if (filterType === 'date') {
    return (
      <Input
        type="date"
        value={value ? String(value) : ''}
        onChange={(e) => onChange({ value: e.target.value })}
        className="w-[160px] h-8"
      />
    );
  }

  // 숫자 입력
  if (filterType === 'number') {
    return (
      <Input
        type="number"
        value={value ?? ''}
        onChange={(e) =>
          onChange({
            value: e.target.value === '' ? undefined : Number(e.target.value),
          })
        }
        className="w-[120px] h-8"
        placeholder={t('segment.filter.value_placeholder')}
      />
    );
  }

  // 기본 문자열 입력
  return (
    <Input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange({ value: e.target.value })}
      className="w-[150px] h-8"
      placeholder={t('segment.filter.value_placeholder')}
    />
  );
}
