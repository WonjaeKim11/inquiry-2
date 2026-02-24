'use client';

import { createContext, useContext } from 'react';
import type { BuilderStore } from '@coltorapps/builder';
import type { ReactNode } from 'react';

/**
 * BuilderCanvas에서 하위 Entity 컴포넌트로 builderStore와
 * 파생 데이터(blockLabels 등)를 전달하는 Context.
 *
 * createEntityComponent로 만든 Entity 컴포넌트는 자체 props에
 * builderStore를 받을 수 없으므로, Context를 통해 전달한다.
 */
interface BuilderStoreContextValue {
  /** @coltorapps/builder의 BuilderStore 인스턴스 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builderStore: BuilderStore<any>;
  /** Block ID -> "Block N" 라벨 매핑 */
  blockLabels: Record<string, string>;
}

const BuilderStoreCtx = createContext<BuilderStoreContextValue | null>(null);

interface BuilderStoreProviderProps {
  /** BuilderStore 인스턴스 */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builderStore: BuilderStore<any>;
  /** Block ID -> 라벨 매핑 */
  blockLabels: Record<string, string>;
  children: ReactNode;
}

/**
 * BuilderStore Context Provider.
 * BuilderCanvas에서 사용하여 하위 Entity 컴포넌트에 store를 제공한다.
 */
export function BuilderStoreProvider({
  builderStore,
  blockLabels,
  children,
}: BuilderStoreProviderProps) {
  return (
    <BuilderStoreCtx.Provider value={{ builderStore, blockLabels }}>
      {children}
    </BuilderStoreCtx.Provider>
  );
}

/**
 * BuilderStore Context에 접근하는 훅.
 * BuilderStoreProvider 외부에서 호출하면 에러를 throw한다.
 *
 * @returns builderStore 인스턴스와 blockLabels 매핑
 * @throws BuilderStoreProvider 바깥에서 호출 시 에러
 */
export function useBuilderStoreContext(): BuilderStoreContextValue {
  const context = useContext(BuilderStoreCtx);
  if (!context) {
    throw new Error(
      'useBuilderStoreContext must be used within BuilderStoreProvider'
    );
  }
  return context;
}
