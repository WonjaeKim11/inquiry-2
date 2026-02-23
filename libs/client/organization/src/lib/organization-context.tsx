'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useTranslation } from 'react-i18next';
import { apiFetch, useAuth } from '@inquiry/client-core';

/** localStorage에 마지막 선택 조직 ID를 저장하는 키 */
const LAST_ORG_KEY = 'inquiry_last_org_id';

/** Billing 정보 타입 — 서버 Organization.billing JSON 필드에 대응 */
export interface OrganizationBilling {
  plan: 'free' | 'startup' | 'custom';
  period: 'monthly' | 'yearly';
  periodStart: string | null;
  limits: {
    projects: number | null;
    monthlyResponses: number | null;
    monthlyMIU: number | null;
  };
  stripeCustomerId: string | null;
}

/** Whitelabel 설정 타입 — 서버 Organization.whitelabel JSON 필드에 대응 */
export interface OrganizationWhitelabel {
  logoUrl?: string | null;
  faviconUrl?: string | null;
}

/** Organization 엔티티 타입 */
export interface Organization {
  id: string;
  name: string;
  billing: OrganizationBilling;
  whitelabel: OrganizationWhitelabel;
  isAIEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 페이지네이션 메타 정보 */
interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

/** OrganizationContext가 제공하는 값 */
interface OrganizationContextValue {
  /** 현재 선택된 조직 */
  currentOrganization: Organization | null;
  /** 사용자 소속 조직 목록 */
  organizations: Organization[];
  /** 목록 로딩 상태 */
  loading: boolean;
  /** 조직 전환 — 선택된 조직을 변경하고 localStorage에 저장 */
  switchOrganization: (orgId: string) => void;
  /** 조직 목록 재조회 — 생성/수정/삭제 후 최신 데이터 반영에 사용 */
  refreshOrganizations: () => Promise<void>;
  /** 페이지네이션 메타 */
  meta: PaginationMeta | null;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(
  null
);

/**
 * 조직 상태를 관리하는 프로바이더.
 * AuthProvider 내부에 배치하여 인증 상태에 따라 조직 목록을 로드한다.
 * 마지막 선택 조직 ID를 localStorage에 저장하여 세션 간 유지한다.
 */
export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { t } = useTranslation();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganization] =
    useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  /** 서버에서 사용자 소속 조직 목록을 조회한다 */
  const fetchOrganizations = useCallback(async () => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrganization(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // pageSize를 100으로 설정하여 대부분의 사용자가 한 번에 전체 목록을 받을 수 있도록 한다
      const res = await apiFetch('/organizations?page=1&pageSize=100');
      if (!res.ok) {
        console.error(t('organization.errors.load_fail'));
        setOrganizations([]);
        setCurrentOrganization(null);
        return;
      }

      const data = await res.json();
      const orgList: Organization[] = data.data ?? [];
      setOrganizations(orgList);
      setMeta(data.meta ?? null);

      // localStorage에 저장된 마지막 선택 조직 ID로 복원 시도
      const lastOrgId =
        typeof window !== 'undefined'
          ? localStorage.getItem(LAST_ORG_KEY)
          : null;
      const restored = lastOrgId
        ? orgList.find((org) => org.id === lastOrgId)
        : null;

      if (restored) {
        setCurrentOrganization(restored);
      } else if (orgList.length > 0) {
        // 마지막 선택이 없거나 해당 조직이 없으면 첫 번째 조직을 기본 선택
        setCurrentOrganization(orgList[0]);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LAST_ORG_KEY, orgList[0].id);
        }
      } else {
        setCurrentOrganization(null);
      }
    } catch {
      console.error(t('organization.errors.load_fail'));
      setOrganizations([]);
      setCurrentOrganization(null);
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  // 사용자 인증 상태가 변경되면 조직 목록을 재조회한다
  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  /** 조직을 전환한다 — 목록에서 해당 ID의 조직을 찾아 현재 조직으로 설정한다 */
  const switchOrganization = useCallback(
    (orgId: string) => {
      const target = organizations.find((org) => org.id === orgId);
      if (target) {
        setCurrentOrganization(target);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LAST_ORG_KEY, orgId);
        }
      }
    },
    [organizations]
  );

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        organizations,
        loading,
        switchOrganization,
        refreshOrganizations: fetchOrganizations,
        meta,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

/**
 * OrganizationContext 사용 훅.
 * OrganizationProvider 하위에서만 사용 가능하다.
 */
export function useOrganization(): OrganizationContextValue {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error(
      'useOrganization은 OrganizationProvider 안에서만 사용할 수 있습니다.'
    );
  }
  return context;
}
