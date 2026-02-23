'use client';

import { useTranslation } from 'react-i18next';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Button,
} from '@inquiry/client-ui';
import { useOrganization } from './organization-context';

/**
 * 조직 전환 드롭다운.
 * 현재 선택된 조직 이름을 표시하고, 클릭 시 소속 조직 목록을 드롭다운으로 보여준다.
 * 목록 하단에 "새 조직 만들기" 링크를 포함한다.
 */
export function OrganizationSwitcher({
  onCreateNew,
}: {
  /** "새 조직 만들기" 클릭 시 호출되는 콜백 */
  onCreateNew?: () => void;
}) {
  const { t } = useTranslation();
  const { currentOrganization, organizations, switchOrganization, loading } =
    useOrganization();

  if (loading) {
    return <div className="h-9 w-40 animate-pulse rounded-md bg-muted" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full max-w-[240px] justify-between"
        >
          <span className="truncate">
            {currentOrganization?.name ?? t('organization.switcher.label')}
          </span>
          {/* 드롭다운 화살표 아이콘 */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="ml-2 shrink-0"
          >
            <path
              d="M3 4.5L6 7.5L9 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        <DropdownMenuLabel>
          {t('organization.switcher.label')}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onSelect={() => switchOrganization(org.id)}
            className={
              org.id === currentOrganization?.id ? 'bg-accent font-medium' : ''
            }
          >
            <span className="truncate">{org.name}</span>
          </DropdownMenuItem>
        ))}
        {organizations.length === 0 && (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">
            {t('organization.list.empty')}
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onCreateNew}>
          <span className="text-primary">
            {t('organization.switcher.create_new')}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
