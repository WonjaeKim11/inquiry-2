import type { LogicItem } from '../types/index';

/** 순환 검출 결과 */
export interface CycleDetectionResult {
  hasCycle: boolean;
  cyclePath: string[];
}

/**
 * DFS 기반으로 순환 로직을 검출한다.
 * 각 Block의 jumpToBlock 액션과 logicFallback을 그래프 간선으로 사용한다.
 *
 * @param blockLogicMap - Block ID -> LogicItem[] 매핑
 * @param blockFallbackMap - Block ID -> logicFallback (nullable) 매핑
 * @returns 순환 검출 결과 (순환 경로 포함)
 */
export function detectCyclicLogic(
  blockLogicMap: Record<string, LogicItem[]>,
  blockFallbackMap: Record<string, string | null | undefined>
): CycleDetectionResult {
  // Block간 방향 그래프 구성
  const graph = buildBlockGraph(blockLogicMap, blockFallbackMap);
  const allBlockIds = Object.keys(graph);

  // DFS 상태 추적용 Set
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  // 각 블록을 시작점으로 DFS 수행
  for (const blockId of allBlockIds) {
    if (!visited.has(blockId)) {
      const cycle = dfs(blockId, graph, visited, recursionStack, path);
      if (cycle) {
        return { hasCycle: true, cyclePath: cycle };
      }
    }
  }

  return { hasCycle: false, cyclePath: [] };
}

/**
 * Block 간 방향 그래프를 구성한다.
 * 각 Block에서 jumpToBlock 액션과 logicFallback의 대상 Block ID를 간선으로 추가한다.
 *
 * @param blockLogicMap - Block ID -> LogicItem[] 매핑
 * @param blockFallbackMap - Block ID -> logicFallback 매핑
 * @returns Block ID를 키, 인접 Block ID 배열을 값으로 가지는 그래프
 */
function buildBlockGraph(
  blockLogicMap: Record<string, LogicItem[]>,
  blockFallbackMap: Record<string, string | null | undefined>
): Record<string, string[]> {
  const graph: Record<string, string[]> = {};

  for (const blockId of Object.keys(blockLogicMap)) {
    const neighbors = new Set<string>();

    // jumpToBlock 액션에서 간선 추출
    const items = blockLogicMap[blockId] ?? [];
    for (const item of items) {
      for (const action of item.actions) {
        if (action.objective === 'jumpToBlock') {
          neighbors.add(action.targetBlockId);
        }
      }
    }

    // logicFallback에서 간선 추출
    const fallback = blockFallbackMap[blockId];
    if (fallback) {
      neighbors.add(fallback);
    }

    graph[blockId] = Array.from(neighbors);
  }

  // 그래프에 없는 대상 블록도 빈 배열로 추가 (DFS 완전성 보장)
  for (const neighbors of Object.values(graph)) {
    for (const neighbor of neighbors) {
      if (!graph[neighbor]) {
        graph[neighbor] = [];
      }
    }
  }

  return graph;
}

/**
 * DFS로 순환을 검출한다.
 * recursionStack에 이미 존재하는 노드를 다시 만나면 순환으로 판정한다.
 *
 * @param node - 현재 탐색 노드
 * @param graph - 방향 그래프
 * @param visited - 방문 완료 노드 Set
 * @param recursionStack - 현재 재귀 경로에 있는 노드 Set
 * @param path - 현재 DFS 경로
 * @returns 순환 경로 배열 (없으면 null)
 */
function dfs(
  node: string,
  graph: Record<string, string[]>,
  visited: Set<string>,
  recursionStack: Set<string>,
  path: string[]
): string[] | null {
  visited.add(node);
  recursionStack.add(node);
  path.push(node);

  const neighbors = graph[node] ?? [];
  for (const neighbor of neighbors) {
    if (!visited.has(neighbor)) {
      const cycle = dfs(neighbor, graph, visited, recursionStack, path);
      if (cycle) return cycle;
    } else if (recursionStack.has(neighbor)) {
      // 순환 발견 -- 순환 경로 추출
      const cycleStart = path.indexOf(neighbor);
      return [...path.slice(cycleStart), neighbor];
    }
  }

  // 백트래킹: 현재 노드를 경로와 재귀 스택에서 제거
  path.pop();
  recursionStack.delete(node);
  return null;
}
