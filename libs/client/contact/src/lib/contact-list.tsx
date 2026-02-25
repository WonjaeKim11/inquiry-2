'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@inquiry/client-ui';
import { fetchContacts, type ContactItem } from './contact-api';
import { ContactSearch } from './contact-search';
import { DeleteContactDialog } from './delete-contact-dialog';

interface ContactListProps {
  envId: string;
}

/**
 * 연락처 목록 테이블 컴포넌트.
 * 페이지네이션, 검색, 삭제 기능을 제공한다.
 */
export function ContactList({ envId }: ContactListProps) {
  const { t } = useTranslation('translation');
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContactItem | null>(null);

  /** 연락처 목록을 서버에서 조회한다 */
  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchContacts(envId, {
        page,
        pageSize,
        search: search || undefined,
      });
      if (result.ok && result.data) {
        setContacts(result.data.data);
        setTotalCount(result.data.totalCount);
      }
    } finally {
      setLoading(false);
    }
  }, [envId, page, pageSize, search]);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4">
      {/* 검색 + 통계 */}
      <div className="flex items-center justify-between gap-4">
        <ContactSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <span className="text-sm text-muted-foreground">
          {t('contact.list.total_count', { count: totalCount })}
        </span>
      </div>

      {/* 테이블 */}
      {loading ? (
        <div className="py-8 text-center text-muted-foreground">
          {t('contact.import.processing')}
        </div>
      ) : contacts.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          {search
            ? t('contact.list.search_no_result')
            : t('contact.list.empty')}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">User ID</th>
                <th className="px-4 py-3 text-left font-medium">
                  {t('contact.attribute.title')}
                </th>
                <th className="px-4 py-3 text-left font-medium">
                  {t('contact.list.created_at')}
                </th>
                <th className="px-4 py-3 text-right font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {contacts.map((contact) => (
                <tr key={contact.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    {String(contact.attributes['email'] ?? '-')}
                  </td>
                  <td className="px-4 py-3">
                    {String(contact.attributes['userId'] ?? '-')}
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate">
                    {Object.entries(contact.attributes)
                      .filter(([k]) => k !== 'email' && k !== 'userId')
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ') || '-'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(contact.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(contact)}
                      className="text-destructive hover:text-destructive"
                    >
                      {t('contact.delete.submit')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            &larr;
          </Button>
          <span className="text-sm text-muted-foreground">
            {t('contact.list.page_info', { page, totalPages })}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            &rarr;
          </Button>
        </div>
      )}

      {/* 삭제 다이얼로그 */}
      {deleteTarget && (
        <DeleteContactDialog
          envId={envId}
          contact={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            loadContacts();
          }}
        />
      )}
    </div>
  );
}
