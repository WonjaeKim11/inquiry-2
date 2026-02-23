'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '@inquiry/client-core';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Button,
  Alert,
  AlertDescription,
} from '@inquiry/client-ui';
import { DeleteApiKeyDialog } from './delete-api-key-dialog';

/** 서버에서 반환하는 환경 권한 정보 */
interface EnvironmentPermission {
  environmentId: string;
  permission: 'READ' | 'WRITE' | 'MANAGE';
}

/** 서버에서 반환하는 API Key 정보 */
interface ApiKey {
  id: string;
  label: string;
  maskedKey: string;
  environmentPermissions: EnvironmentPermission[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

/**
 * API Key 목록 컴포넌트.
 * 조직에 속한 모든 API Key를 카드 형태로 나열하며,
 * 각 키의 라벨, 환경 권한 배지, 마지막 사용일, 만료일,
 * 삭제 버튼 등을 표시한다.
 */
export function ApiKeyList({
  organizationId,
  refreshKey,
}: {
  /** 대상 조직 ID */
  organizationId: string;
  /** 외부에서 갱신 트리거 시 변경되는 키 */
  refreshKey?: number;
}) {
  const { t } = useTranslation();

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 삭제 다이얼로그 상태
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    label: string;
  } | null>(null);

  /**
   * 조직의 API Key 목록을 서버에서 조회한다.
   * 응답이 배열이 아닌 경우 data 프로퍼티에서 배열을 추출한다.
   */
  const fetchApiKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/organizations/${organizationId}/api-keys`);
      if (!res.ok) {
        throw new Error(t('apiKey.errors.load_fail'));
      }
      const data = await res.json();
      // 서버 응답이 배열 또는 { data: [...] } 형태일 수 있음
      const list = Array.isArray(data) ? data : data.data ?? [];
      setApiKeys(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('apiKey.errors.load_fail')
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId, t]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys, refreshKey]);

  /**
   * 날짜 문자열을 사용자가 읽을 수 있는 형식으로 변환한다.
   * ISO 8601 형식의 날짜를 로케일에 맞게 포맷한다.
   */
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  /** 권한에 따른 배지 색상 클래스를 반환한다 */
  const getPermissionBadgeClass = (permission: string) => {
    switch (permission) {
      case 'READ':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'WRITE':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
      case 'MANAGE':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // 빈 상태
  if (apiKeys.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-muted-foreground">{t('apiKey.list.empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {apiKeys.map((apiKey) => (
        <Card key={apiKey.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{apiKey.label}</CardTitle>
              <Button
                variant="destructive"
                size="sm"
                onClick={() =>
                  setDeleteTarget({ id: apiKey.id, label: apiKey.label })
                }
              >
                {t('apiKey.list.delete')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* 마스킹된 키 표시 */}
              <code className="rounded bg-muted px-2 py-1 text-sm">
                {apiKey.maskedKey}
              </code>

              {/* 환경 권한 목록 */}
              {apiKey.environmentPermissions &&
                apiKey.environmentPermissions.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">
                      {t('apiKey.list.environments')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {apiKey.environmentPermissions.map((ep) => (
                        <span
                          key={`${ep.environmentId}-${ep.permission}`}
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getPermissionBadgeClass(
                            ep.permission
                          )}`}
                        >
                          {ep.environmentId}:{' '}
                          {t(`apiKey.permission.${ep.permission}`)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* 메타 정보 (마지막 사용일, 만료일, 생성일) */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>
                  {t('apiKey.list.last_used')}:{' '}
                  {apiKey.lastUsedAt
                    ? formatDate(apiKey.lastUsedAt)
                    : t('apiKey.list.never_used')}
                </span>
                <span>
                  {t('apiKey.list.expires')}:{' '}
                  {apiKey.expiresAt
                    ? formatDate(apiKey.expiresAt)
                    : t('apiKey.list.no_expiry')}
                </span>
                <span>
                  {t('apiKey.list.created')}: {formatDate(apiKey.createdAt)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* 삭제 확인 다이얼로그 */}
      {deleteTarget && (
        <DeleteApiKeyDialog
          organizationId={organizationId}
          apiKeyId={deleteTarget.id}
          apiKeyLabel={deleteTarget.label}
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
          onDeleted={() => {
            setDeleteTarget(null);
            fetchApiKeys();
          }}
        />
      )}
    </div>
  );
}
