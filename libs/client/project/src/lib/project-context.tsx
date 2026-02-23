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
import { apiFetch } from '@inquiry/client-core';

/** localStorage에 마지막 선택 프로젝트 ID를 저장하는 키 */
const LAST_PROJECT_KEY = 'inquiry_last_project_id';

/** localStorage에 마지막 선택 환경 ID를 저장하는 키 */
const LAST_ENV_KEY = 'inquiry_last_env_id';

/** Environment 엔티티 타입 — 프로젝트에 속한 실행 환경 */
export interface Environment {
  id: string;
  type: 'production' | 'development';
  appSetupCompleted: boolean;
  widgetSetupCompleted: boolean;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

/** Product 스타일링 설정 타입 — 서버 Project.styling JSON 필드에 대응 */
export interface ProjectStyling {
  brandColor?: string | null;
  cardBackgroundColor?: string | null;
  cardBorderColor?: string | null;
  roundness?: number | null;
  hideProgressBar?: boolean;
  isLogoHidden?: boolean;
  allowStyleOverride?: boolean;
}

/** Language 엔티티 타입 */
export interface ProjectLanguage {
  id: string;
  code: string;
  alias: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

/** Project 엔티티 타입 */
export interface Project {
  id: string;
  name: string;
  organizationId: string;
  recontactDays: number;
  placement: string;
  darkOverlay: string;
  clickOutsideClose: boolean;
  inAppSurveyBranding: boolean;
  linkSurveyBranding: boolean;
  styling: ProjectStyling;
  environments: Environment[];
  languages: ProjectLanguage[];
  createdAt: string;
  updatedAt: string;
}

/** ProjectContext가 제공하는 값 */
interface ProjectContextValue {
  /** 현재 선택된 프로젝트 */
  currentProject: Project | null;
  /** 조직 소속 프로젝트 목록 */
  projects: Project[];
  /** 현재 선택된 환경 */
  currentEnvironment: Environment | null;
  /** 목록 로딩 상태 */
  loading: boolean;
  /** 프로젝트 전환 — 선택된 프로젝트를 변경하고 localStorage에 저장 */
  switchProject: (projectId: string) => void;
  /** 환경 전환 — 선택된 환경을 변경하고 localStorage에 저장 */
  switchEnvironment: (envId: string) => void;
  /** 프로젝트 목록 재조회 — 생성/수정/삭제 후 최신 데이터 반영에 사용 */
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

/**
 * 프로젝트 상태를 관리하는 프로바이더.
 * organizationId를 받아 해당 조직의 프로젝트 목록을 로드한다.
 * 마지막 선택 프로젝트/환경 ID를 localStorage에 저장하여 세션 간 유지한다.
 */
export function ProjectProvider({
  organizationId,
  children,
}: {
  organizationId: string | null;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentEnvironment, setCurrentEnvironment] =
    useState<Environment | null>(null);
  const [loading, setLoading] = useState(true);

  /** 서버에서 조직 소속 프로젝트 목록을 조회한다 */
  const fetchProjects = useCallback(async () => {
    if (!organizationId) {
      setProjects([]);
      setCurrentProject(null);
      setCurrentEnvironment(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch(`/organizations/${organizationId}/projects`);
      if (!res.ok) {
        console.error(t('project.errors.load_fail'));
        setProjects([]);
        setCurrentProject(null);
        setCurrentEnvironment(null);
        return;
      }

      const data = await res.json();
      const projectList: Project[] = Array.isArray(data)
        ? data
        : data.data ?? [];
      setProjects(projectList);

      // localStorage에 저장된 마지막 선택 프로젝트 ID로 복원 시도
      const lastProjectId =
        typeof window !== 'undefined'
          ? localStorage.getItem(LAST_PROJECT_KEY)
          : null;
      const restored = lastProjectId
        ? projectList.find((p) => p.id === lastProjectId)
        : null;

      const selectedProject = restored ?? projectList[0] ?? null;
      setCurrentProject(selectedProject);

      if (selectedProject && typeof window !== 'undefined') {
        localStorage.setItem(LAST_PROJECT_KEY, selectedProject.id);
      }

      // 환경 복원 — 선택된 프로젝트의 환경에서 복원 시도
      if (selectedProject && selectedProject.environments.length > 0) {
        const lastEnvId =
          typeof window !== 'undefined'
            ? localStorage.getItem(LAST_ENV_KEY)
            : null;
        const restoredEnv = lastEnvId
          ? selectedProject.environments.find((e) => e.id === lastEnvId)
          : null;
        const selectedEnv =
          restoredEnv ?? selectedProject.environments[0] ?? null;
        setCurrentEnvironment(selectedEnv);
        if (selectedEnv && typeof window !== 'undefined') {
          localStorage.setItem(LAST_ENV_KEY, selectedEnv.id);
        }
      } else {
        setCurrentEnvironment(null);
      }
    } catch {
      console.error(t('project.errors.load_fail'));
      setProjects([]);
      setCurrentProject(null);
      setCurrentEnvironment(null);
    } finally {
      setLoading(false);
    }
  }, [organizationId, t]);

  // organizationId가 변경되면 프로젝트 목록을 재조회한다
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  /** 프로젝트를 전환한다 — 목록에서 해당 ID의 프로젝트를 찾아 현재 프로젝트로 설정한다 */
  const switchProject = useCallback(
    (projectId: string) => {
      const target = projects.find((p) => p.id === projectId);
      if (target) {
        setCurrentProject(target);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LAST_PROJECT_KEY, projectId);
        }
        // 프로젝트 전환 시 첫 번째 환경을 기본 선택
        if (target.environments.length > 0) {
          const env = target.environments[0];
          setCurrentEnvironment(env);
          if (typeof window !== 'undefined') {
            localStorage.setItem(LAST_ENV_KEY, env.id);
          }
        } else {
          setCurrentEnvironment(null);
        }
      }
    },
    [projects]
  );

  /** 환경을 전환한다 — 현재 프로젝트의 환경에서 해당 ID를 찾아 설정한다 */
  const switchEnvironment = useCallback(
    (envId: string) => {
      if (!currentProject) return;
      const target = currentProject.environments.find((e) => e.id === envId);
      if (target) {
        setCurrentEnvironment(target);
        if (typeof window !== 'undefined') {
          localStorage.setItem(LAST_ENV_KEY, envId);
        }
      }
    },
    [currentProject]
  );

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        projects,
        currentEnvironment,
        loading,
        switchProject,
        switchEnvironment,
        refreshProjects: fetchProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

/**
 * ProjectContext 사용 훅.
 * ProjectProvider 하위에서만 사용 가능하다.
 */
export function useProject(): ProjectContextValue {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error(
      'useProject는 ProjectProvider 안에서만 사용할 수 있습니다.'
    );
  }
  return context;
}
