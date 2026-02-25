'use client';

import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@inquiry/client-ui';
import type {
  FilterOperator,
  FilterResource,
  FilterType,
} from '@inquiry/shared-segment';
import { getOperatorsForType } from '@inquiry/shared-segment';

interface OperatorSelectorProps {
  resource: FilterResource;
  filterType?: FilterType;
  operator?: FilterOperator;
  onChange: (operator: FilterOperator) => void;
}

/** 연산자별 i18n 키 매핑 */
const OPERATOR_I18N_MAP: Record<FilterOperator, string> = {
  equals: 'segment.filter.op_equals',
  doesNotEqual: 'segment.filter.op_does_not_equal',
  contains: 'segment.filter.op_contains',
  doesNotContain: 'segment.filter.op_does_not_contain',
  startsWith: 'segment.filter.op_starts_with',
  endsWith: 'segment.filter.op_ends_with',
  isSet: 'segment.filter.op_is_set',
  isNotSet: 'segment.filter.op_is_not_set',
  lessThan: 'segment.filter.op_less_than',
  lessEqual: 'segment.filter.op_less_equal',
  greaterThan: 'segment.filter.op_greater_than',
  greaterEqual: 'segment.filter.op_greater_equal',
  isBefore: 'segment.filter.op_is_before',
  isAfter: 'segment.filter.op_is_after',
  isExactly: 'segment.filter.op_is_exactly',
  isWithinLast: 'segment.filter.op_is_within_last',
  isNotWithinLast: 'segment.filter.op_is_not_within_last',
  isToday: 'segment.filter.op_is_today',
  isYesterday: 'segment.filter.op_is_yesterday',
  userIsIn: 'segment.filter.op_user_is_in',
  userIsNotIn: 'segment.filter.op_user_is_not_in',
  isDevice: 'segment.filter.op_is_device',
};

/**
 * 연산자 선택 드롭다운.
 * 데이터 타입에 따라 사용 가능한 연산자만 표시한다.
 */
export function OperatorSelector({
  resource,
  filterType,
  operator,
  onChange,
}: OperatorSelectorProps) {
  const { t } = useTranslation('translation');

  /** 리소스 유형에 따라 사용 가능한 연산자 배열을 결정 */
  let operators: readonly FilterOperator[];

  if (resource === 'segment') {
    operators = ['userIsIn', 'userIsNotIn'];
  } else if (resource === 'device') {
    operators = ['isDevice'];
  } else {
    operators = getOperatorsForType(filterType ?? 'string');
  }

  return (
    <Select
      value={operator ?? ''}
      onValueChange={(v) => onChange(v as FilterOperator)}
    >
      <SelectTrigger className="w-[150px] h-8">
        <SelectValue placeholder={t('segment.filter.select_operator')} />
      </SelectTrigger>
      <SelectContent>
        {operators.map((op) => (
          <SelectItem key={op} value={op}>
            {t(OPERATOR_I18N_MAP[op], op)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
