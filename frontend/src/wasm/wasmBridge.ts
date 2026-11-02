// Wrapper TypeScript per interagire direttamente con il modulo C++20 compilato in WebAssembly

// @ts-ignore
import createPathfindingModule from './pathfinding.js';

export interface NativePoint {
  x: number;
  y: number;
}

export interface NativePathResult {
  found: boolean;
  visited_order: NativePoint[];
  frontier_order: NativePoint[];
  path: NativePoint[];
  nodes_explored: number;
  execution_time_us: number;
  path_cost: number;
}

export interface WasmModule {
  Grid: any;
  CellType: {
    Empty: { value: number };
    Wall: { value: number };
    Weight: { value: number };
  };
  HeuristicType: {
    Manhattan: { value: number };
    Euclidean: { value: number };
    Chebyshev: { value: number };
  };
  solveBFS: (grid: any, start: NativePoint, end: NativePoint, allow_diagonal: boolean) => any;
  solveDFS: (grid: any, start: NativePoint, end: NativePoint, allow_diagonal: boolean) => any;
  solveDijkstra: (grid: any, start: NativePoint, end: NativePoint, allow_diagonal: boolean) => any;
  solveAStar: (grid: any, start: NativePoint, end: NativePoint, heuristic: any, allow_diagonal: boolean) => any;
  solveGreedyBFS: (grid: any, start: NativePoint, end: NativePoint, heuristic: any, allow_diagonal: boolean) => any;
  solveBidirectionalBFS: (grid: any, start: NativePoint, end: NativePoint, allow_diagonal: boolean) => any;
}

let wasmInstance: WasmModule | null = null;
let initPromise: Promise<WasmModule> | null = null;

export async function getWasmEngine(): Promise<WasmModule> {
  if (wasmInstance) return wasmInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const mod = await createPathfindingModule({
      locateFile: (path: string) => {
        if (path.endsWith('.wasm')) {
          return '/pathfinding.wasm';
        }
        return path;
      }
    });
    wasmInstance = mod as WasmModule;
    return wasmInstance;
  })();

  return initPromise;
}

export function vectorPointToArray(vec: any): NativePoint[] {
  const result: NativePoint[] = [];
  const size = vec.size();
  for (let i = 0; i < size; ++i) {
    const pt = vec.get(i);
    result.push({ x: pt.x, y: pt.y });
  }
  return result;
}

// Esecuzione algoritmo nativo C++ su una griglia
export async function runNativePathfinding(
  algo: 'BFS' | 'DFS' | 'Dijkstra' | 'A*' | 'Greedy BFS' | 'Bi-BFS',
  width: number,
  height: number,
  walls: Set<string>,
  weights: Map<string, number>,
  start: NativePoint,
  end: NativePoint,
  heuristic: 'Manhattan' | 'Euclidean' | 'Chebyshev' = 'Manhattan',
  allowDiagonal: boolean = false
): Promise<NativePathResult> {
  const wasm = await getWasmEngine();
  const nativeGrid = new wasm.Grid(width, height);

  try {
    for (const key of walls) {
      const [x, y] = key.split(',').map(Number);
      nativeGrid.setCell({ x, y }, wasm.CellType.Wall, 1.0);
    }

    for (const [key, weight] of weights.entries()) {
      const [x, y] = key.split(',').map(Number);
      nativeGrid.setCell({ x, y }, wasm.CellType.Weight, weight);
    }

    let rawResult: any;
    if (algo === 'BFS') {
      rawResult = wasm.solveBFS(nativeGrid, start, end, allowDiagonal);
    } else if (algo === 'DFS') {
      rawResult = wasm.solveDFS(nativeGrid, start, end, allowDiagonal);
    } else if (algo === 'Dijkstra') {
      rawResult = wasm.solveDijkstra(nativeGrid, start, end, allowDiagonal);
    } else if (algo === 'A*') {
      const hVal = wasm.HeuristicType[heuristic];
      rawResult = wasm.solveAStar(nativeGrid, start, end, hVal, allowDiagonal);
    } else if (algo === 'Greedy BFS') {
      const hVal = wasm.HeuristicType[heuristic];
      rawResult = wasm.solveGreedyBFS(nativeGrid, start, end, hVal, allowDiagonal);
    } else {
      rawResult = wasm.solveBidirectionalBFS(nativeGrid, start, end, allowDiagonal);
    }

    const visited = vectorPointToArray(rawResult.visited_order);
    const frontier = vectorPointToArray(rawResult.frontier_order);
    const path = vectorPointToArray(rawResult.path);

    const result: NativePathResult = {
      found: rawResult.found,
      visited_order: visited,
      frontier_order: frontier,
      path: path,
      nodes_explored: rawResult.nodes_explored,
      execution_time_us: rawResult.execution_time_us,
      path_cost: rawResult.path_cost,
    };

    return result;
  } finally {
    nativeGrid.delete();
  }
}
