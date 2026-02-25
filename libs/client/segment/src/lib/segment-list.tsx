'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@inquiry/client-ui';
import {
  fetchSegments,
  cloneSegment,
  type SegmentItem,
} from './segment-api.js';
import { DeleteSegmentDialog } from './delete-segment-dialog.js';

interface SegmentListProps {
  envId: string;
  /** 세그먼트 생성 페이지로 이동하는 콜백 */
  onNavigateCreate?: () => void;
  /** 세그먼트 수정 페이지로 이동하는 콜백 */
  onNavigateEdit?: (segmentId: string) => void;
}

/**
 * 세그먼트 목록 테이블 컴포넌트.
 * 환경별 세그먼트 목록을 조회하고, 복제/삭제 액션을 제공한다.
 * @inquiry/client-ui에 Table 컴포넌트가 없으므로 네이티브 HTML 테이블을 사용한다.
 */
export function SegmentList({
  envId,
  onNavigateCreate,
  onNavigateEdit,
}: SegmentListProps) {
  const { t } = useTranslation('translation');
  const [segments, setSegments] = useState<SegmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<SegmentItem | null>(null);

  /** 세그먼트 목록을 서버에서 다시 불러온다 */
  const loadSegments = useCallback(async () => {
    setLoading(true);
    const { data } = await fetchSegments(envId);
    setSegments(data);
    setLoading(false);
  }, [envId]);

  useEffect(() => {
    loadSegments();
  }, [loadSegments]);

  /** 세그먼트 복제 후 목록 새로고침 */
  const handleClone = async (segmentId: string) => {
    const { ok } = await cloneSegment(envId, segmentId);
    if (ok) loadSegments();
  };

  /** 삭제 완료 후 다이얼로그 닫고 목록 새로고침 */
  const handleDeleteComplete = () => {
    setDeleteTarget(null);
    loadSegments();
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {t('common.loading', 'Loading...')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더: 총 개수 + 생성 버튼 */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {segments.length === 0
            ? t('segment.list.empty')
            : t('segment.list.total_count', { count: segments.length })}
        </p>
        {onNavigateCreate && (
          <Button onClick={onNavigateCreate} size="sm">
            {t('segment.list.create_new')}
          </Button>
        )}
      </div>

      {/* 세그먼트 테이블 (네이티브 HTML) */}
      {segments.length > 0 && (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('segment.form.title_label')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('segment.form.description_label')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('segment.list.survey_count')}
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('segment.list.visibility')}
                </th>
                <th className="w-[80px] px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {segments.map((segment) => (
                <tr key={segment.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{segment.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {segment.description || '-'}
                  </td>
                  <td className="px-4 py-3">{segment._count.surveys}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={segment.isPrivate ? 'secondary' : 'outline'}
                    >
                      {segment.isPrivate
                        ? t('segment.list.private')
                        : t('segment.list.public')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          ···
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onNavigateEdit && (
                          <DropdownMenuItem
                            onClick={() => onNavigateEdit(segment.id)}
                          >
                            {t('segment.form.edit')}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleClone(segment.id)}
                        >
                          {t('segment.actions.clone')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTarget(segment)}
                        >
                          {t('segment.actions.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteTarget && (
        <DeleteSegmentDialog
          envId={envId}
          segment={deleteTarget}
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          onDeleted={handleDeleteComplete}
        />
      )}
    </div>
  );
}
