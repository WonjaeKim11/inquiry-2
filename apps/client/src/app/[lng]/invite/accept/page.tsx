'use client';

import { Suspense, use, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
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

/** 초대 수락 성공 시 서버 응답 타입 */
interface AcceptResult {
  organizationId: string;
  organizationName: string;
}

/**
 * 초대 수락 내부 컴포넌트.
 * useSearchParams를 사용하므로 Suspense 경계 내부에서 렌더링되어야 한다.
 * URL 쿼리의 token 파라미터를 추출하여 POST /api/invites/accept로 초대를 수락한다.
 */
function InviteAcceptContent({ lng }: { lng: string }) {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AcceptResult | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setError(t('member.accept.invalid'));
      setLoading(false);
      return;
    }

    const acceptInvite = async () => {
      try {
        const res = await apiFetch('/invites/accept', {
          method: 'POST',
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const data = await res.json();

          // 서버 에러 메시지에 따라 적절한 i18n 키를 선택한다
          if (res.status === 410 || data.message?.includes('expired')) {
            throw new Error(t('member.accept.expired'));
          }
          if (res.status === 400 || data.message?.includes('invalid')) {
            throw new Error(t('member.accept.invalid'));
          }
          throw new Error(data.message || t('member.accept.error'));
        }

        const data = await res.json();
        setResult({
          organizationId: data.organizationId,
          organizationName:
            data.organizationName ?? data.organization?.name ?? '',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : t('member.accept.error'));
      } finally {
        setLoading(false);
      }
    };

    acceptInvite();
  }, [searchParams, t]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center">
          {t('member.accept.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 로딩 상태 */}
        {loading && (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
            <p className="text-sm text-muted-foreground">
              {t('member.accept.loading')}
            </p>
          </div>
        )}

        {/* 성공 상태 */}
        {result && (
          <div className="space-y-4 text-center">
            <Alert>
              <AlertDescription>
                {t('member.accept.success', {
                  organizationName: result.organizationName,
                })}
              </AlertDescription>
            </Alert>
            <Button
              className="w-full"
              onClick={() =>
                router.push(
                  `/${lng}/organizations/${result.organizationId}/members`
                )
              }
            >
              {t('member.accept.go_to_dashboard')}
            </Button>
          </div>
        )}

        {/* 에러 상태 */}
        {error && (
          <div className="space-y-4 text-center">
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push(`/${lng}`)}
            >
              {t('member.accept.go_to_dashboard')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 초대 수락 페이지.
 * useSearchParams를 사용하는 내부 컴포넌트를 Suspense로 감싸
 * Next.js의 정적 생성 요구 사항을 충족한다.
 */
export default function InviteAcceptPage({
  params,
}: {
  params: Promise<{ lng: string }>;
}) {
  const { lng } = use(params);

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <Suspense
        fallback={
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
          </div>
        }
      >
        <InviteAcceptContent lng={lng} />
      </Suspense>
    </div>
  );
}
