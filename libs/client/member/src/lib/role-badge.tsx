'use client';

import { useTranslation } from 'react-i18next';
import { Badge } from '@inquiry/client-ui';

/**
 * 멤버십 역할에 따른 색상 매핑.
 * OWNER: 보라색, ADMIN: 파란색, MEMBER: 초록색, BILLING: 주황색.
 */
const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-800 border-purple-200',
  ADMIN: 'bg-blue-100 text-blue-800 border-blue-200',
  MEMBER: 'bg-green-100 text-green-800 border-green-200',
  BILLING: 'bg-orange-100 text-orange-800 border-orange-200',
};

/** 역할이 매핑에 없을 경우 사용하는 기본 스타일 */
const DEFAULT_COLOR = 'bg-gray-100 text-gray-800 border-gray-200';

interface RoleBadgeProps {
  /** 멤버십 역할 (OWNER, ADMIN, MEMBER, BILLING) */
  role: string;
}

/**
 * 역할 배지 컴포넌트.
 * 멤버십 역할을 색상 구분된 배지로 표시한다.
 */
export function RoleBadge({ role }: RoleBadgeProps) {
  const { t } = useTranslation();

  const colorClass = ROLE_COLORS[role] ?? DEFAULT_COLOR;

  return (
    <Badge variant="outline" className={colorClass}>
      {t(`member.role.${role}`, role)}
    </Badge>
  );
}
