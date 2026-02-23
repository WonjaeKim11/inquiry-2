'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '@inquiry/client-core';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Badge,
} from '@inquiry/client-ui';
import type { Organization, OrganizationBilling } from './organization-context';

/** Plan별 배지 색상 매핑 */
const PLAN_BADGE_CLASSES: Record<OrganizationBilling['plan'], string> = {
  free: 'bg-gray-100 text-gray-800 border-gray-200',
  startup: 'bg-blue-100 text-blue-800 border-blue-200',
  custom: 'bg-purple-100 text-purple-800 border-purple-200',
};

/**
 * Billing 설정 컴포넌트.
 * 현재 요금제, 결제 주기, 사용량 제한, 월간 응답수를 표시한다.
 * 요금제 변경 기능은 FSD-029에서 Stripe 연동과 함께 구현 예정이므로
 * 현재는 정보 표시만 제공한다.
 */
export function BillingSettings({
  organization,
}: {
  organization: Organization;
}) {
  const { t } = useTranslation();
  const [monthlyResponses, setMonthlyResponses] = useState<number | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(true);

  /** 월간 응답수를 조회한다 */
  const fetchMonthlyResponses = useCallback(async () => {
    setLoadingUsage(true);
    try {
      const res = await apiFetch(
        `/organizations/${organization.id}/monthly-response-count`
      );
      if (res.ok) {
        const data = await res.json();
        setMonthlyResponses(data.count ?? 0);
      }
    } catch {
      // 조회 실패 시 null로 유지하여 "알 수 없음" 상태를 표시
      setMonthlyResponses(null);
    } finally {
      setLoadingUsage(false);
    }
  }, [organization.id]);

  useEffect(() => {
    fetchMonthlyResponses();
  }, [fetchMonthlyResponses]);

  const { billing } = organization;

  /** Plan명을 i18n 키로 변환한다 */
  const planLabel = t(`organization.billing.plan_${billing.plan}`);

  /** Period를 i18n 키로 변환한다 */
  const periodLabel = t(`organization.billing.period_${billing.period}`);

  /**
   * 숫자 또는 null(무제한)을 포맷팅한다.
   * null은 "Unlimited"로 표시한다.
   */
  const formatLimit = (value: number | null): string => {
    if (value === null) return t('organization.billing.unlimited');
    return value.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('organization.billing.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 현재 요금제 */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            {t('organization.billing.current_plan')}
          </span>
          <Badge variant="outline" className={PLAN_BADGE_CLASSES[billing.plan]}>
            {planLabel}
          </Badge>
        </div>

        {/* 결제 주기 */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            {t('organization.billing.period')}
          </span>
          <span className="text-sm text-muted-foreground">{periodLabel}</span>
        </div>

        {/* 사용량 제한 */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">
            {t('organization.billing.limits')}
          </h4>
          <div className="grid gap-3 rounded-lg border p-4">
            {/* 프로젝트 제한 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t('organization.billing.projects_limit')}
              </span>
              <span className="text-sm font-medium">
                {formatLimit(billing.limits.projects)}
              </span>
            </div>

            {/* 월간 응답 제한 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t('organization.billing.responses_limit')}
              </span>
              <span className="text-sm font-medium">
                {formatLimit(billing.limits.monthlyResponses)}
              </span>
            </div>

            {/* 월간 식별 사용자 제한 */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t('organization.billing.miu_limit')}
              </span>
              <span className="text-sm font-medium">
                {formatLimit(billing.limits.monthlyMIU)}
              </span>
            </div>
          </div>
        </div>

        {/* 월간 응답수 사용량 */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            {t('organization.billing.monthly_responses')}
          </h4>
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {t('organization.billing.current_usage')}
              </span>
              {loadingUsage ? (
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              ) : (
                <span className="text-sm font-medium">
                  {monthlyResponses !== null
                    ? monthlyResponses.toLocaleString()
                    : '-'}
                  {billing.limits.monthlyResponses !== null && (
                    <>
                      {' '}
                      {t('organization.billing.of')}{' '}
                      {billing.limits.monthlyResponses.toLocaleString()}
                    </>
                  )}
                </span>
              )}
            </div>
            {/* 사용량 프로그레스 바 — 제한이 있는 경우에만 표시 */}
            {billing.limits.monthlyResponses !== null &&
              monthlyResponses !== null && (
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        (monthlyResponses / billing.limits.monthlyResponses) *
                          100
                      )}%`,
                    }}
                  />
                </div>
              )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
