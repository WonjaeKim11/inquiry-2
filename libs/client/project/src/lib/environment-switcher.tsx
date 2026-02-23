'use client';

import { useTranslation } from 'react-i18next';
import { Badge, Tabs, TabsList, TabsTrigger } from '@inquiry/client-ui';
import type { Environment } from './project-context';

/**
 * 환경 전환 UI.
 * production/development 환경을 탭 형태로 전환할 수 있다.
 * 현재 환경 타입을 Badge로 표시한다.
 */
export function EnvironmentSwitcher({
  environments,
  currentEnvironmentId,
  onSwitch,
}: {
  /** 프로젝트에 속한 환경 목록 */
  environments: Environment[];
  /** 현재 선택된 환경 ID */
  currentEnvironmentId: string | null;
  /** 환경 전환 시 호출되는 콜백 */
  onSwitch: (envId: string) => void;
}) {
  const { t } = useTranslation();

  if (environments.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-muted-foreground">
        {t('project.environment.switch')}
      </span>
      <Tabs value={currentEnvironmentId ?? undefined} onValueChange={onSwitch}>
        <TabsList>
          {environments.map((env) => (
            <TabsTrigger key={env.id} value={env.id}>
              <span className="flex items-center gap-2">
                {t(`project.environment.${env.type}`)}
                <Badge
                  variant={env.type === 'production' ? 'default' : 'secondary'}
                  className="text-[10px] px-1.5 py-0"
                >
                  {env.type}
                </Badge>
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  );
}
