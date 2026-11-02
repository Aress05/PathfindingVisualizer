import React, { useState, useEffect, useRef, useCallback } from 'react';
import { runNativePathfinding } from './wasm/wasmBridge';
import type { NativePoint, NativePathResult } from './wasm/wasmBridge';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Cpu,
  Shuffle,
  Sliders,
  Shield,
  Weight,
  Eraser,
  Zap,
  Download,
  Upload,
  BarChart3,
  Code2,
  ChevronsLeft,
  ChevronsRight,
  PanelLeftClose,
  PanelRightClose,
  Activity,
  Info,
  MapPin,
  Flag,
  Compass
} from 'lucide-react';

type Tool = 'wall' | 'weight' | 'eraser' | 'start' | 'target';
type Algorithm = 'BFS' | 'DFS' | 'Dijkstra' | 'A*' | 'Greedy BFS' | 'Bi-BFS';
type RightTab = 'metrics' | 'info' | 'pseudocode';

interface AlgoInfo {
  name: string;
  fullName: string;
  timeComplexity: string;
  spaceComplexity: string;
  isOptimal: boolean;
  supportsWeights: boolean;
  description: string;
  pseudocode: string[];
}

const ALGO_METADATA: Record<Algorithm, AlgoInfo> = {
  BFS: {
    name: 'BFS',
    fullName: 'Breadth-First Search',
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    isOptimal: true,
    supportsWeights: false,
    description: 'Esplora la griglia a onde concentriche progressive (FIFO). Garantisce matematicamente il percorso con il minor numero di passi nei grafi non pesati.',
    pseudocode: [
      'coda.push(start); visitati[start] = true',
      'while (!coda.empty()) {',
      '  curr = coda.pop()',
      '  if (curr == target) return ricostruisci_cammino()',
      '  for (vicino in vicini(curr)) {',
      '    if (!visitati[vicino]) {',
      '      visitati[vicino] = true; padre[vicino] = curr',
      '      coda.push(vicino)',
      '    }',
      '  }',
      '}'
    ]
  },
  DFS: {
    name: 'DFS',
    fullName: 'Depth-First Search',
    timeComplexity: 'O(V + E)',
    spaceComplexity: 'O(V)',
    isOptimal: false,
    supportsWeights: false,
    description: 'Avanza lungo ogni corridoio fino a raggiungere un vicolo cieco prima di retrocedere (LIFO). Non garantisce né brevità né costo minimo.',
    pseudocode: [
      'stack.push(start); visitati[start] = true',
      'while (!stack.empty()) {',
      '  curr = stack.pop()',
      '  if (curr == target) return ricostruisci_cammino()',
      '  for (vicino in vicini(curr)) {',
      '    if (!visitati[vicino]) {',
      '      visitati[vicino] = true; padre[vicino] = curr',
      '      stack.push(vicino)',
      '    }',
      '  }',
      '}'
    ]
  },
  Dijkstra: {
    name: 'Dijkstra',
    fullName: 'Uniform-Cost Search (Min-Heap Priority Queue)',
    timeComplexity: 'O((V + E) log V)',
    spaceComplexity: 'O(V)',
    isOptimal: true,
    supportsWeights: true,
    description: 'Algoritmo a costo uniforme per grafi pesati. Calcola la frontiera a costo minimo garantendo l’ottimalità anche in presenza di terreni accidentati o pesi.',
    pseudocode: [
      'distanze.fill(INF); distanze[start] = 0',
      'pq.push({costo: 0, nodo: start})',
      'while (!pq.empty()) {',
      '  {c, curr} = pq.pop()',
      '  if (curr == target) return ricostruisci_cammino()',
      '  for (vicino in vicini(curr)) {',
      '    nuovo_c = c + peso(vicino)',
      '    if (nuovo_c < distanze[vicino]) {',
      '      distanze[vicino] = nuovo_c; padre[vicino] = curr',
      '      pq.push({costo: nuovo_c, nodo: vicino})',
      '    }',
      '  }',
      '}'
    ]
  },
  'A*': {
    name: 'A*',
    fullName: 'A-Star Heuristic Search Algorithm',
    timeComplexity: 'O((V + E) log V)',
    spaceComplexity: 'O(V)',
    isOptimal: true,
    supportsWeights: true,
    description: 'Combina il costo effettivo g(n) dal punto di partenza con una stima euristica ammissibile h(n) al target, dirigendo l’esplorazione e riducendo drasticamente i nodi espansi.',
    pseudocode: [
      'g_score.fill(INF); g_score[start] = 0',
      'f_score[start] = h(start, target)',
      'pq.push({f: f_score[start], nodo: start})',
      'while (!pq.empty()) {',
      '  curr = pq.pop().nodo',
      '  if (curr == target) return ricostruisci_cammino()',
      '  for (vicino in vicini(curr)) {',
      '    tentativo_g = g_score[curr] + peso(vicino)',
      '    if (tentativo_g < g_score[vicino]) {',
      '      g_score[vicino] = tentativo_g',
      '      f_score[vicino] = tentativo_g + h(vicino, target)',
      '      pq.push({f: f_score[vicino], nodo: vicino})',
      '    }',
      '  }',
      '}'
    ]
  },
  'Greedy BFS': {
    name: 'Greedy BFS',
    fullName: 'Greedy Best-First Search',
    timeComplexity: 'O((V + E) log V)',
    spaceComplexity: 'O(V)',
    isOptimal: false,
    supportsWeights: false,
    description: 'Valuta i nodi considerando esclusivamente la distanza stimata h(n) verso il bersaglio. Estremamente veloce in spazi aperti ma vulnerabile a trappole concave.',
    pseudocode: [
      'pq.push({h: h(start, target), nodo: start})',
      'while (!pq.empty()) {',
      '  curr = pq.pop().nodo',
      '  if (curr == target) return ricostruisci_cammino()',
      '  for (vicino in vicini(curr)) {',
      '    if (!visitati[vicino]) {',
      '      visitati[vicino] = true; padre[vicino] = curr',
      '      pq.push({h: h(vicino, target), nodo: vicino})',
      '    }',
      '  }',
      '}'
    ]
  },
  'Bi-BFS': {
    name: 'Bi-BFS',
    fullName: 'Bidirectional Breadth-First Search',
    timeComplexity: 'O(b^(d/2))',
    spaceComplexity: 'O(b^(d/2))',
    isOptimal: true,
    supportsWeights: false,
    description: 'Lancia due ricerche concentriche simultanee: una da Start verso Target e una da Target verso Start. Riduce lo spazio di ricerca esponenziale da b^d a 2 * b^(d/2).',
    pseudocode: [
      'coda_s.push(start); coda_e.push(target)',
      'while (!coda_s.empty() && !coda_e.empty()) {',
      '  espandi_livello(coda_s, visitati_s)',
      '  if (intersezione(visitati_s, visitati_e)) break',
      '  espandi_livello(coda_e, visitati_e)',
      '  if (intersezione(visitati_s, visitati_e)) break',
      '}',
      'return salda_cammini()'
    ]
  }
};

interface BenchmarkRow {
  algo: Algorithm;
  found: boolean;
  timeUs: number;
  nodes: number;
  pathLength: number;
  cost: number;
}

export default function App() {
  // Griglia adattiva
  const [cols, setCols] = useState<number>(45);
  const [rows, setRows] = useState<number>(24);
  const [cellSize, setCellSize] = useState<number>(26);

  const [start, setStart] = useState<NativePoint>({ x: 4, y: 12 });
  const [end, setEnd] = useState<NativePoint>({ x: 40, y: 12 });
  const [walls, setWalls] = useState<Set<string>>(new Set());
  const [weights, setWeights] = useState<Map<string, number>>(new Map());

  // Opzioni di ricerca
  const [algo, setAlgo] = useState<Algorithm>('BFS');
  const [heuristic, setHeuristic] = useState<'Manhattan' | 'Euclidean' | 'Chebyshev'>('Manhattan');
  const [allowDiagonal, setAllowDiagonal] = useState<boolean>(false);
  const [tool, setTool] = useState<Tool>('wall');
  const [colorblindMode, setColorblindMode] = useState<boolean>(false);

  // Tab laterale destra
  const [rightTab, setRightTab] = useState<RightTab>('metrics');

  // Drawer reattivi
  const [leftOpen, setLeftOpen] = useState<boolean>(true);
  const [rightOpen, setRightOpen] = useState<boolean>(true);

  // Player simulazione
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [speedLog, setSpeedLog] = useState<number>(3);
  const [timelineStep, setTimelineStep] = useState<number>(0);
  const [maxSteps, setMaxSteps] = useState<number>(0);

  const [stats, setStats] = useState<NativePathResult | null>(null);
  const [historyRuns, setHistoryRuns] = useState<NativePathResult[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modali e confronti
  const [showBenchmarkModal, setShowBenchmarkModal] = useState<boolean>(false);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkRow[]>([]);
  const [isBenchmarking, setIsBenchmarking] = useState<boolean>(false);
  const [jsComparison, setJsComparison] = useState<{ wasmUs: number; jsUs: number } | null>(null);

  // Buffer animazione
  const simulationEvents = useRef<{
    visited: NativePoint[];
    frontier: NativePoint[];
    path: NativePoint[];
  }>({ visited: [], frontier: [], path: [] });

  const currentStepRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const isRunningRef = useRef<boolean>(false);
  const animTimerRef = useRef<number | null>(null);

  // Dragging & Interaction
  const isPointerDown = useRef(false);
  const dragAction = useRef<'add' | 'remove' | null>(null);
  const draggingTarget = useRef<'start' | 'end' | null>(null);
  const lastCellInteracted = useRef<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gridContainerRef = useRef<HTMLDivElement | null>(null);

  const keyOf = (p: NativePoint) => `${p.x},${p.y}`;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Resize canvas responsivo
  useEffect(() => {
    const updateSize = () => {
      if (!gridContainerRef.current) return;
      const { clientWidth, clientHeight } = gridContainerRef.current;
      const targetCell = 26;
      const newCols = Math.max(20, Math.floor((clientWidth - 40) / targetCell));
      const newRows = Math.max(14, Math.floor((clientHeight - 40) / targetCell));

      setCols(newCols);
      setRows(newRows);
      setCellSize(targetCell);

      setStart((prev) => ({
        x: Math.min(prev.x, newCols - 2),
        y: Math.min(prev.y, newRows - 2)
      }));
      setEnd((prev) => ({
        x: Math.min(prev.x, newCols - 2),
        y: Math.min(prev.y, newRows - 2)
      }));
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [leftOpen, rightOpen]);

  // Rendering su Canvas ad alta definizione (Palette Linear / SaaS Professionale)
  const drawGrid = useCallback((currentStep: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = cols * cellSize;
    const logicalHeight = rows * cellSize;

    if (canvas.width !== logicalWidth * dpr || canvas.height !== logicalHeight * dpr) {
      canvas.width = logicalWidth * dpr;
      canvas.height = logicalHeight * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Sfondo canvas profondo
    ctx.fillStyle = '#090D16';
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    const { visited, frontier, path } = simulationEvents.current;

    const activeVisited = new Set<string>();
    const activeFrontier = new Set<string>();
    const activePath = new Set<string>();

    const visitedCount = visited.length;
    const frontierCount = frontier.length;

    for (let i = 0; i < Math.min(currentStep, frontierCount); i++) {
      activeFrontier.add(keyOf(frontier[i]));
    }
    for (let i = 0; i < Math.min(currentStep, visitedCount); i++) {
      activeVisited.add(keyOf(visited[i]));
      activeFrontier.delete(keyOf(visited[i]));
    }

    if (currentStep > visitedCount) {
      const pathSteps = currentStep - visitedCount;
      for (let i = 0; i < Math.min(pathSteps, path.length); i++) {
        activePath.add(keyOf(path[i]));
      }
    }

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const k = `${x},${y}`;
        const isWall = walls.has(k);
        const isWeight = weights.has(k);
        const isPath = activePath.has(k);
        const isVisited = activeVisited.has(k);
        const isFrontier = activeFrontier.has(k);

        const px = x * cellSize;
        const py = y * cellSize;

        // Griglia con bordi sottili e precisi (#1B2639)
        ctx.strokeStyle = '#182232';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, cellSize, cellSize);

        // 1. MURI (#1E293B superficie con bordo definito)
        if (isWall) {
          ctx.fillStyle = '#1E293B';
          ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 1.5, py + 1.5, cellSize - 3, cellSize - 3);
          continue;
        }

        // 2. PESI (Superficie viola indaco con etichetta costo "5")
        if (isWeight) {
          if (isPath) {
            ctx.fillStyle = '#78350F';
            ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
            ctx.strokeStyle = '#F59E0B';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px + 1.5, py + 1.5, cellSize - 3, cellSize - 3);
          } else if (isVisited) {
            ctx.fillStyle = '#3730A3';
            ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
            ctx.strokeStyle = '#6366F1';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 1.5, py + 1.5, cellSize - 3, cellSize - 3);
          } else {
            ctx.fillStyle = '#261F55';
            ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
            ctx.strokeStyle = '#4F46E5';
            ctx.lineWidth = 1;
            ctx.strokeRect(px + 1.5, py + 1.5, cellSize - 3, cellSize - 3);
          }

          ctx.fillStyle = isPath ? '#FEF08A' : '#E0E7FF';
          ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('5', px + cellSize / 2, py + cellSize / 2);
          continue;
        }

        // 3. CAMMINO OTTIMO (Ambra brillante #F59E0B)
        if (isPath) {
          ctx.fillStyle = '#F59E0B';
          ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
          ctx.strokeStyle = '#FBBF24';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 1.5, py + 1.5, cellSize - 3, cellSize - 3);
          continue;
        }

        // 4. NODI ESPLORATI (Blu notte professionale o contrasto accessibile)
        if (isVisited) {
          ctx.fillStyle = colorblindMode ? '#1D4ED8' : '#1E3A8A';
          ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
          continue;
        }

        // 5. FRONTIERA ATTIVA (Cyan brillante #0891B2 / #22D3EE)
        if (isFrontier) {
          ctx.fillStyle = colorblindMode ? '#C2410C' : '#0E7490';
          ctx.fillRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
          ctx.strokeStyle = colorblindMode ? '#FB923C' : '#22D3EE';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(px + 1.5, py + 1.5, cellSize - 3, cellSize - 3);
          continue;
        }
      }
    }

    // 6. START E TARGET: LAYER PRIORITARIO FINALE (Visibili sempre al 100%)
    const startPx = start.x * cellSize;
    const startPy = start.y * cellSize;
    ctx.fillStyle = '#10B981';
    ctx.fillRect(startPx + 2, startPy + 2, cellSize - 4, cellSize - 4);
    ctx.strokeStyle = '#34D399';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(startPx + 2, startPy + 2, cellSize - 4, cellSize - 4);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('S', startPx + cellSize / 2, startPy + cellSize / 2);

    const endPx = end.x * cellSize;
    const endPy = end.y * cellSize;
    ctx.fillStyle = '#F43F5E';
    ctx.fillRect(endPx + 2, endPy + 2, cellSize - 4, cellSize - 4);
    ctx.strokeStyle = '#FB7185';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(endPx + 2, endPy + 2, cellSize - 4, cellSize - 4);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('E', endPx + cellSize / 2, endPy + cellSize / 2);

    ctx.restore();
  }, [cols, rows, cellSize, start, end, walls, weights, colorblindMode]);

  useEffect(() => {
    if (!isRunningRef.current) {
      drawGrid(currentStepRef.current);
    }
  }, [drawGrid]);

  const stopSimulation = useCallback(() => {
    if (animTimerRef.current) {
      window.clearTimeout(animTimerRef.current);
      animTimerRef.current = null;
    }
    isRunningRef.current = false;
    isPausedRef.current = false;
    setIsRunning(false);
    setIsPaused(false);
  }, []);

  const clearVisualization = useCallback(() => {
    stopSimulation();
    simulationEvents.current = { visited: [], frontier: [], path: [] };
    currentStepRef.current = 0;
    setTimelineStep(0);
    setMaxSteps(0);
    setStats(null);
    drawGrid(0);
  }, [stopSimulation, drawGrid]);

  const resetAll = useCallback(() => {
    clearVisualization();
    setWalls(new Set());
    setWeights(new Map());
    showToast('Griglia azzerata.');
  }, [clearVisualization]);

  // Esecuzione C++ WASM
  const executePathfinding = async () => {
    try {
      stopSimulation();
      clearVisualization();

      const result = await runNativePathfinding(
        algo,
        cols,
        rows,
        walls,
        weights,
        start,
        end,
        heuristic,
        allowDiagonal
      );

      setStats(result);
      setHistoryRuns((prev) => [result, ...prev.slice(0, 4)]);

      simulationEvents.current = {
        visited: result.visited_order,
        frontier: result.frontier_order,
        path: result.path
      };

      const totalSteps = result.visited_order.length + result.path.length;
      setMaxSteps(totalSteps);
      currentStepRef.current = 0;
      setTimelineStep(0);

      isRunningRef.current = true;
      isPausedRef.current = false;
      setIsRunning(true);
      setIsPaused(false);

      const getBatchAndDelay = () => {
        if (speedLog === 1) return { batch: 1, delay: 35 };
        if (speedLog === 2) return { batch: 3, delay: 20 };
        if (speedLog === 3) return { batch: 8, delay: 12 };
        if (speedLog === 4) return { batch: 25, delay: 6 };
        return { batch: 60, delay: 2 };
      };

      const stepLoop = () => {
        if (!isRunningRef.current || isPausedRef.current) return;

        const { batch, delay } = getBatchAndDelay();
        currentStepRef.current = Math.min(currentStepRef.current + batch, totalSteps);
        setTimelineStep(currentStepRef.current);
        drawGrid(currentStepRef.current);

        if (currentStepRef.current < totalSteps) {
          animTimerRef.current = window.setTimeout(stepLoop, delay);
        } else {
          isRunningRef.current = false;
          setIsRunning(false);
          showToast(result.found ? `Percorso trovato in ${result.execution_time_us.toFixed(1)} µs` : 'Destinazione inaccessibile');
        }
      };

      stepLoop();
    } catch (err: any) {
      console.error('Errore esecuzione pathfinding:', err);
      showToast(`Errore: ${err?.message || err}`);
      stopSimulation();
    }
  };

  const togglePause = () => {
    if (!isRunning) return;
    const nextPaused = !isPaused;
    isPausedRef.current = nextPaused;
    setIsPaused(nextPaused);

    if (!nextPaused) {
      const totalSteps = maxSteps;
      const getBatchAndDelay = () => {
        if (speedLog === 1) return { batch: 1, delay: 35 };
        if (speedLog === 2) return { batch: 3, delay: 20 };
        if (speedLog === 3) return { batch: 8, delay: 12 };
        if (speedLog === 4) return { batch: 25, delay: 6 };
        return { batch: 60, delay: 2 };
      };

      const stepLoop = () => {
        if (!isRunningRef.current || isPausedRef.current) return;
        const { batch, delay } = getBatchAndDelay();
        currentStepRef.current = Math.min(currentStepRef.current + batch, totalSteps);
        setTimelineStep(currentStepRef.current);
        drawGrid(currentStepRef.current);

        if (currentStepRef.current < totalSteps) {
          animTimerRef.current = window.setTimeout(stepLoop, delay);
        } else {
          isRunningRef.current = false;
          setIsRunning(false);
        }
      };
      stepLoop();
    }
  };

  const stepForward = () => {
    if (isRunning && !isPaused) togglePause();
    const next = Math.min(currentStepRef.current + 1, maxSteps);
    currentStepRef.current = next;
    setTimelineStep(next);
    drawGrid(next);
  };

  const stepBackward = () => {
    if (isRunning && !isPaused) togglePause();
    const prev = Math.max(currentStepRef.current - 1, 0);
    currentStepRef.current = prev;
    setTimelineStep(prev);
    drawGrid(prev);
  };

  const jumpToStart = () => {
    if (isRunning && !isPaused) togglePause();
    currentStepRef.current = 0;
    setTimelineStep(0);
    drawGrid(0);
  };

  const jumpToEnd = () => {
    if (isRunning && !isPaused) togglePause();
    currentStepRef.current = maxSteps;
    setTimelineStep(maxSteps);
    drawGrid(maxSteps);
  };

  const handleTimelineChange = (newStep: number) => {
    if (isRunning && !isPaused) {
      isPausedRef.current = true;
      setIsPaused(true);
    }
    currentStepRef.current = newStep;
    setTimelineStep(newStep);
    drawGrid(newStep);
  };

  // Scenari Preimpostati
  const loadScenario = (type: 'trap' | 'weighted' | 'corridor' | 'blocked') => {
    clearVisualization();
    const newWalls = new Set<string>();
    const newWeights = new Map<string, number>();

    const midX = Math.floor(cols / 2);
    const midY = Math.floor(rows / 2);

    setStart({ x: 4, y: midY });
    setEnd({ x: cols - 5, y: midY });

    if (type === 'trap') {
      for (let y = midY - 6; y <= midY + 6; y++) newWalls.add(`${midX},${y}`);
      for (let x = midX - 8; x <= midX; x++) {
        newWalls.add(`${x},${midY - 6}`);
        newWalls.add(`${x},${midY + 6}`);
      }
      showToast('Scenario: Trappola Concava caricata');
    } else if (type === 'weighted') {
      for (let y = 0; y < rows; y++) {
        if (!(y < 4 || y > rows - 5)) {
          for (let x = midX - 3; x <= midX + 3; x++) newWeights.set(`${x},${y}`, 5.0);
        }
      }
      showToast('Scenario: Terreno Pesato caricato');
    } else if (type === 'corridor') {
      for (let x = 6; x < cols - 6; x += 6) {
        const leaveTop = (x / 6) % 2 === 0;
        for (let y = 0; y < rows; y++) {
          if (leaveTop && y > 3) newWalls.add(`${x},${y}`);
          if (!leaveTop && y < rows - 4) newWalls.add(`${x},${y}`);
        }
      }
      showToast('Scenario: Serpentina caricata');
    } else {
      for (let y = midY - 3; y <= midY + 3; y++) {
        newWalls.add(`${cols - 8},${y}`);
        newWalls.add(`${cols - 2},${y}`);
      }
      for (let x = cols - 8; x <= cols - 2; x++) {
        newWalls.add(`${x},${midY - 3}`);
        newWalls.add(`${x},${midY + 3}`);
      }
      showToast('Scenario: Bersaglio Chiuso caricato');
    }

    setWalls(newWalls);
    setWeights(newWeights);
  };

  // Generatori di Labirinto (Divisione, Casuale, Backtracker DFS)
  const generateMaze = (type: 'division' | 'random' | 'backtracker') => {
    clearVisualization();
    const newWalls = new Set<string>();

    if (type === 'random') {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if ((x === start.x && y === start.y) || (x === end.x && y === end.y)) continue;
          if (Math.random() < 0.28) newWalls.add(`${x},${y}`);
        }
      }
      showToast('Labirinto Casuale generato.');
    } else if (type === 'division') {
      for (let x = 0; x < cols; x++) {
        newWalls.add(`${x},0`);
        newWalls.add(`${x},${rows - 1}`);
      }
      for (let y = 0; y < rows; y++) {
        newWalls.add(`0,${y}`);
        newWalls.add(`${cols - 1},${y}`);
      }

      const divide = (r1: number, r2: number, c1: number, c2: number) => {
        if (r2 - r1 < 2 || c2 - c1 < 2) return;
        const isHorizontal = r2 - r1 > c2 - c1;

        if (isHorizontal) {
          const row = Math.floor((r1 + r2) / 2);
          const passage = c1 + Math.floor(Math.random() * (c2 - c1 + 1));
          for (let c = c1; c <= c2; c++) {
            if (c !== passage) newWalls.add(`${c},${row}`);
          }
          divide(r1, row - 1, c1, c2);
          divide(row + 1, r2, c1, c2);
        } else {
          const col = Math.floor((c1 + c2) / 2);
          const passage = r1 + Math.floor(Math.random() * (r2 - r1 + 1));
          for (let r = r1; r <= r2; r++) {
            if (r !== passage) newWalls.add(`${col},${r}`);
          }
          divide(r1, r2, c1, col - 1);
          divide(r1, r2, col + 1, c2);
        }
      };

      divide(1, rows - 2, 1, cols - 2);
      showToast('Labirinto a Divisione Ricorsiva generato.');
    } else {
      // Recursive Backtracker (DFS) per labirinti perfetti
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          newWalls.add(`${x},${y}`);
        }
      }
      const visited = new Set<string>();
      const stack: { x: number; y: number }[] = [];
      const startX = 1;
      const startY = 1;
      visited.add(`${startX},${startY}`);
      newWalls.delete(`${startX},${startY}`);
      stack.push({ x: startX, y: startY });

      while (stack.length > 0) {
        const curr = stack[stack.length - 1];
        const neighbors: { x: number; y: number; wx: number; wy: number }[] = [];
        const directions = [
          { dx: 0, dy: -2, wx: 0, wy: -1 },
          { dx: 2, dy: 0, wx: 1, wy: 0 },
          { dx: 0, dy: 2, wx: 0, wy: 1 },
          { dx: -2, dy: 0, wx: -1, wy: 0 }
        ];

        for (const dir of directions) {
          const nx = curr.x + dir.dx;
          const ny = curr.y + dir.dy;
          if (nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1 && !visited.has(`${nx},${ny}`)) {
            neighbors.push({ x: nx, y: ny, wx: curr.x + dir.wx, wy: curr.y + dir.wy });
          }
        }

        if (neighbors.length > 0) {
          const chosen = neighbors[Math.floor(Math.random() * neighbors.length)];
          visited.add(`${chosen.x},${chosen.y}`);
          newWalls.delete(`${chosen.wx},${chosen.wy}`);
          newWalls.delete(`${chosen.x},${chosen.y}`);
          stack.push({ x: chosen.x, y: chosen.y });
        } else {
          stack.pop();
        }
      }

      showToast('Labirinto Backtracker (DFS) generato.');
    }

    newWalls.delete(keyOf(start));
    newWalls.delete(keyOf(end));
    setWalls(newWalls);
    setWeights(new Map());
  };

  // Benchmark Shootout
  const runBenchmarkShootout = async () => {
    setIsBenchmarking(true);
    setShowBenchmarkModal(true);

    try {
      const algos: Algorithm[] = ['BFS', 'DFS', 'Dijkstra', 'A*', 'Greedy BFS', 'Bi-BFS'];
      const rowsResults: BenchmarkRow[] = [];

      for (const alg of algos) {
        const res = await runNativePathfinding(
          alg,
          cols,
          rows,
          walls,
          weights,
          start,
          end,
          heuristic,
          allowDiagonal
        );
        rowsResults.push({
          algo: alg,
          found: res.found,
          timeUs: res.execution_time_us,
          nodes: res.nodes_explored,
          pathLength: res.path.length,
          cost: res.path_cost
        });
      }

      setBenchmarkResults(rowsResults);
    } catch (err: any) {
      showToast(`Errore benchmark: ${err?.message || err}`);
    } finally {
      setIsBenchmarking(false);
    }
  };

  // Benchmark JS vs WASM
  const runJsVsWasmTest = async () => {
    try {
      const wasmRes = await runNativePathfinding(
        'BFS',
        cols,
        rows,
        walls,
        weights,
        start,
        end,
        'Manhattan',
        allowDiagonal
      );

      const RUNS = 30;
      const t0 = performance.now();
      for (let r = 0; r < RUNS; r++) {
        const queue: NativePoint[] = [start];
        const visited = new Uint8Array(cols * rows);
        visited[start.y * cols + start.x] = 1;
        let head = 0;
        while (head < queue.length) {
          const curr = queue[head++];
          if (curr.x === end.x && curr.y === end.y) break;
          const dx = [0, 1, 0, -1];
          const dy = [-1, 0, 1, 0];
          for (let i = 0; i < 4; i++) {
            const nx = curr.x + dx[i];
            const ny = curr.y + dy[i];
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
              const idx = ny * cols + nx;
              if (!visited[idx] && !walls.has(`${nx},${ny}`)) {
                visited[idx] = 1;
                queue.push({ x: nx, y: ny });
              }
            }
          }
        }
      }
      const jsElapsedUs = ((performance.now() - t0) * 1000) / RUNS;

      setJsComparison({
        wasmUs: wasmRes.execution_time_us,
        jsUs: jsElapsedUs
      });
      setRightTab('metrics');
      showToast(`C++ WASM: ${wasmRes.execution_time_us.toFixed(1)} µs | JS: ${jsElapsedUs.toFixed(1)} µs`);
    } catch (err: any) {
      showToast(`Errore test JS vs WASM: ${err?.message || err}`);
    }
  };

  const exportMap = () => {
    const data = {
      cols,
      rows,
      start,
      end,
      walls: Array.from(walls),
      weights: Array.from(weights.entries())
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `algoviz_grid_${Date.now()}.json`;
    a.click();
    showToast('Configurazione esportata in JSON.');
  };

  const importMap = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.start) setStart(data.start);
        if (data.end) setEnd(data.end);
        if (data.walls) setWalls(new Set(data.walls));
        if (data.weights) setWeights(new Map(data.weights));
        clearVisualization();
        showToast('Configurazione importata.');
      } catch (err) {
        showToast('File JSON non valido.');
      }
    };
    reader.readAsText(file);
  };

  // Scorciatoie da tastiera
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (isRunning) togglePause();
        else executePathfinding();
      } else if (e.key === 'c' || e.key === 'C') {
        clearVisualization();
      } else if (e.key === 'r' || e.key === 'R') {
        resetAll();
      } else if (e.key === 'w' || e.key === 'W') {
        setTool('wall');
      } else if (e.key === 'p' || e.key === 'P') {
        setTool('weight');
      } else if (e.key === 'e' || e.key === 'E') {
        setTool('eraser');
      } else if (e.key === 's' || e.key === 'S') {
        setTool('start');
      } else if (e.key === 't' || e.key === 'T') {
        setTool('target');
      } else if (e.key === 'm' || e.key === 'M') {
        generateMaze('division');
      } else if (e.code === 'ArrowRight') {
        stepForward();
      } else if (e.code === 'ArrowLeft') {
        stepBackward();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isRunning, isPaused, maxSteps]);

  // Gestione Coordinate e Pointer Tool
  const getPointerCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = (cols * cellSize) / rect.width;
    const scaleY = (rows * cellSize) / rect.height;
    const x = Math.floor(((e.clientX - rect.left) * scaleX) / cellSize);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / cellSize);
    if (x >= 0 && x < cols && y >= 0 && y < rows) return { x, y };
    return null;
  };

  const applyTool = (pt: NativePoint, action: 'add' | 'remove') => {
    const k = keyOf(pt);

    if (tool === 'start') {
      if (pt.x !== end.x || pt.y !== end.y) {
        setStart(pt);
        setWalls((prev) => { const n = new Set(prev); n.delete(k); return n; });
        setWeights((prev) => { const n = new Map(prev); n.delete(k); return n; });
      }
      return;
    }
    if (tool === 'target') {
      if (pt.x !== start.x || pt.y !== start.y) {
        setEnd(pt);
        setWalls((prev) => { const n = new Set(prev); n.delete(k); return n; });
        setWeights((prev) => { const n = new Map(prev); n.delete(k); return n; });
      }
      return;
    }

    if ((pt.x === start.x && pt.y === start.y) || (pt.x === end.x && pt.y === end.y)) return;

    if (tool === 'wall') {
      if (action === 'add') {
        setWalls((prev) => new Set(prev).add(k));
        setWeights((prev) => {
          const next = new Map(prev);
          next.delete(k);
          return next;
        });
      } else {
        setWalls((prev) => {
          const next = new Set(prev);
          next.delete(k);
          return next;
        });
      }
    } else if (tool === 'weight') {
      if (action === 'add') {
        setWeights((prev) => new Map(prev).set(k, 5.0));
        setWalls((prev) => {
          const next = new Set(prev);
          next.delete(k);
          return next;
        });
      } else {
        setWeights((prev) => {
          const next = new Map(prev);
          next.delete(k);
          return next;
        });
      }
    } else if (tool === 'eraser') {
      setWalls((prev) => {
        const next = new Set(prev);
        next.delete(k);
        return next;
      });
      setWeights((prev) => {
        const next = new Map(prev);
        next.delete(k);
        return next;
      });
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isRunning && !isPaused) return;
    const pt = getPointerCoords(e);
    if (!pt) return;

    isPointerDown.current = true;
    lastCellInteracted.current = keyOf(pt);

    // Se clicco su S o E posso trascinarli a prescindere dal tool attivo
    if (pt.x === start.x && pt.y === start.y) {
      draggingTarget.current = 'start';
      return;
    }
    if (pt.x === end.x && pt.y === end.y) {
      draggingTarget.current = 'end';
      return;
    }

    const k = keyOf(pt);
    if (tool === 'wall') {
      dragAction.current = walls.has(k) ? 'remove' : 'add';
    } else if (tool === 'weight') {
      dragAction.current = weights.has(k) ? 'remove' : 'add';
    } else {
      dragAction.current = 'remove';
    }

    applyTool(pt, dragAction.current);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isPointerDown.current || (isRunning && !isPaused)) return;
    const pt = getPointerCoords(e);
    if (!pt) return;

    const k = keyOf(pt);
    if (lastCellInteracted.current === k) return;
    lastCellInteracted.current = k;

    if (draggingTarget.current === 'start') {
      if ((pt.x !== end.x || pt.y !== end.y) && !walls.has(k)) setStart(pt);
      return;
    }
    if (draggingTarget.current === 'end') {
      if ((pt.x !== start.x || pt.y !== start.y) && !walls.has(k)) setEnd(pt);
      return;
    }

    if (dragAction.current) applyTool(pt, dragAction.current);
  };

  const onPointerUp = () => {
    isPointerDown.current = false;
    dragAction.current = null;
    draggingTarget.current = null;
    lastCellInteracted.current = null;
  };

  const currentInfo = ALGO_METADATA[algo];

  return (
    <div className="h-screen w-screen bg-[#090D16] text-[#E8EDF5] flex flex-col font-sans select-none overflow-hidden">
      {/* Toast Notifiche Posizionato in Basso a Destra */}
      {toastMsg && (
        <div className="fixed bottom-20 right-6 z-50 bg-[#131C2B] text-[#E8EDF5] text-xs font-semibold px-4 py-2.5 rounded-lg shadow-2xl border border-[#253247] flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span className="w-2 h-2 rounded-full bg-[#6366F1]"></span>
          <span>{toastMsg}</span>
        </div>
      )}

      {/* MODALE BENCHMARK COMPLETO (Linear / SaaS Style) */}
      {showBenchmarkModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-150">
          <div className="bg-[#0E1421] border border-[#253247] w-full max-w-2xl rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-[#253247] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#6366F1]/15 border border-[#6366F1]/30 text-[#6366F1] flex items-center justify-center">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#E8EDF5] tracking-tight">Benchmark Algoritmico Comparativo</h3>
                  <p className="text-xs text-[#8794A8]">Esecuzione nativa C++ WebAssembly su {cols} × {rows} nodi</p>
                </div>
              </div>
              <button
                onClick={() => setShowBenchmarkModal(false)}
                className="text-[#8794A8] hover:text-[#E8EDF5] px-3 py-1.5 rounded-lg bg-[#131C2B] border border-[#253247] text-xs font-medium transition hover:border-[#344461]"
              >
                Chiudi
              </button>
            </div>

            {isBenchmarking ? (
              <div className="py-14 flex flex-col items-center justify-center gap-3">
                <div className="w-7 h-7 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-medium text-[#8794A8]">Esecuzione shootout nel motore C++20...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#253247] text-[#8794A8] font-semibold uppercase text-[11px] tracking-wider">
                      <th className="py-2.5 px-3">Algoritmo</th>
                      <th className="py-2.5 px-3">Tempo CPU</th>
                      <th className="py-2.5 px-3">Nodi Visitati</th>
                      <th className="py-2.5 px-3">Lunghezza</th>
                      <th className="py-2.5 px-3">Costo Totale</th>
                      <th className="py-2.5 px-3 text-right">Esito</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums divide-y divide-[#182232]">
                    {benchmarkResults.map((r) => (
                      <tr key={r.algo} className="hover:bg-[#131C2B] transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[#E8EDF5]">{r.algo}</td>
                        <td className="py-2.5 px-3 font-mono text-[#22D3EE] font-bold">{r.timeUs.toFixed(1)} µs</td>
                        <td className="py-2.5 px-3 font-mono text-[#E8EDF5]">{r.nodes}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#F59E0B]">{r.pathLength}</td>
                        <td className="py-2.5 px-3 font-mono text-[#8794A8]">{r.cost}</td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.found ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30' : 'bg-[#F43F5E]/15 text-[#F43F5E] border border-[#F43F5E]/30'
                          }`}>
                            {r.found ? 'Trovato' : 'Isolato'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 1. HEADER SUPERIORE (Linear / Raycast Style) */}
      <header className="h-14 border-b border-[#253247] bg-[#0E1421] px-5 flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#6366F1]/15 border border-[#6366F1]/40 text-[#6366F1] flex items-center justify-center shadow-sm">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-base font-bold text-[#E8EDF5] tracking-tight">AlgoViz</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#131C2B] border border-[#253247]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#8794A8] font-bold">
                C++20 WASM
              </span>
            </div>
          </div>
        </div>

        {/* Scenari Didattici Preimpostati */}
        <div className="hidden lg:flex items-center gap-1 bg-[#090D16] p-1 rounded-lg border border-[#253247] text-xs">
          <span className="text-[11px] font-medium text-[#8794A8] px-2.5">Scenario:</span>
          <button
            onClick={() => loadScenario('trap')}
            className="px-2.5 py-1 rounded-md text-[#8794A8] hover:text-[#E8EDF5] hover:bg-[#131C2B] transition font-medium"
          >
            Trappola Concava
          </button>
          <button
            onClick={() => loadScenario('weighted')}
            className="px-2.5 py-1 rounded-md text-[#8794A8] hover:text-[#E8EDF5] hover:bg-[#131C2B] transition font-medium"
          >
            Terreno Pesato
          </button>
          <button
            onClick={() => loadScenario('corridor')}
            className="px-2.5 py-1 rounded-md text-[#8794A8] hover:text-[#E8EDF5] hover:bg-[#131C2B] transition font-medium"
          >
            Serpentina
          </button>
          <button
            onClick={() => loadScenario('blocked')}
            className="px-2.5 py-1 rounded-md text-[#8794A8] hover:text-[#E8EDF5] hover:bg-[#131C2B] transition font-medium"
          >
            Isolato
          </button>
        </div>

        {/* Toolbar Azioni Destra */}
        <div className="flex items-center gap-2 text-xs">
          <button
            onClick={runBenchmarkShootout}
            className="flex items-center gap-1.5 bg-[#131C2B] hover:bg-[#1A263B] text-[#E8EDF5] px-3 py-1.5 rounded-lg border border-[#253247] font-semibold transition hover:border-[#344461]"
          >
            <BarChart3 className="w-3.5 h-3.5 text-[#6366F1]" />
            <span>Confronta Algoritmi</span>
          </button>

          <button
            onClick={runJsVsWasmTest}
            className="hidden sm:flex items-center gap-1.5 bg-[#131C2B] hover:bg-[#1A263B] text-[#8794A8] hover:text-[#E8EDF5] px-3 py-1.5 rounded-lg border border-[#253247] font-medium transition hover:border-[#344461]"
          >
            <Zap className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>C++ vs JS</span>
          </button>

          <label className="flex items-center gap-1.5 bg-[#131C2B] hover:bg-[#1A263B] text-[#8794A8] hover:text-[#E8EDF5] px-3 py-1.5 rounded-lg border border-[#253247] cursor-pointer font-medium transition hover:border-[#344461]">
            <Upload className="w-3.5 h-3.5" />
            <span>Carica</span>
            <input type="file" accept=".json" onChange={importMap} className="hidden" />
          </label>

          <button
            onClick={exportMap}
            className="flex items-center gap-1.5 bg-[#131C2B] hover:bg-[#1A263B] text-[#8794A8] hover:text-[#E8EDF5] px-3 py-1.5 rounded-lg border border-[#253247] font-medium transition hover:border-[#344461]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Salva</span>
          </button>

          {/* Toggle Drawers per schermi compatti */}
          <button
            onClick={() => setLeftOpen(!leftOpen)}
            className="lg:hidden p-1.5 rounded-lg bg-[#131C2B] border border-[#253247] text-[#8794A8] hover:text-white"
            title="Toggle pannello sinistro"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
          <button
            onClick={() => setRightOpen(!rightOpen)}
            className="lg:hidden p-1.5 rounded-lg bg-[#131C2B] border border-[#253247] text-[#8794A8] hover:text-white"
            title="Toggle pannello destro"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. AREA CENTRALE WORKSTATION (3 Colonne) */}
      <div className="flex-1 flex overflow-hidden">
        {/* === SIDEBAR SINISTRA: ALGORITMI & STRUMENTI (w-72) === */}
        {leftOpen && (
          <aside className="w-72 border-r border-[#253247] bg-[#0E1421] p-4 flex flex-col gap-4 overflow-y-auto flex-shrink-0 z-10">
            {/* Sezione 1: Algoritmi */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase font-bold tracking-wider text-[#8794A8]">Algoritmo</span>
                <span className="text-[11px] font-mono text-[#6366F1] font-bold">{algo}</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 bg-[#090D16] p-1 rounded-xl border border-[#253247]">
                {(['BFS', 'DFS', 'Dijkstra', 'A*', 'Greedy BFS', 'Bi-BFS'] as Algorithm[]).map((alg) => {
                  const isSelected = algo === alg;
                  return (
                    <button
                      key={alg}
                      onClick={() => { setAlgo(alg); clearVisualization(); }}
                      disabled={isRunning}
                      className={`py-2 px-2.5 rounded-lg text-left transition-all ${
                        isSelected
                          ? 'bg-[#131C2B] text-[#E8EDF5] border border-[#6366F1] shadow-sm'
                          : 'text-[#8794A8] hover:text-[#E8EDF5] hover:bg-[#131C2B]/60 border border-transparent'
                      }`}
                    >
                      <div className="text-xs font-bold leading-tight">{alg}</div>
                      <div className="text-[10px] text-[#5C6B82] font-normal truncate mt-0.5">
                        {alg === 'BFS' ? 'Ampiezza' : alg === 'DFS' ? 'Profondità' : alg === 'Dijkstra' ? 'Min-Heap' : alg === 'A*' ? 'Euristico' : alg === 'Greedy BFS' ? 'Vorace' : 'Bi-direzionale'}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selettore Euristica (Attivo per A* e Greedy BFS) */}
              {(algo === 'A*' || algo === 'Greedy BFS') && (
                <div className="p-2.5 rounded-xl bg-[#131C2B] border border-[#253247] flex flex-col gap-2 mt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#8794A8]">Funzione Euristica</span>
                    <Compass className="w-3.5 h-3.5 text-[#22D3EE]" />
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-[#090D16] p-1 rounded-lg border border-[#253247]">
                    {(['Manhattan', 'Euclidean', 'Chebyshev'] as const).map((h) => (
                      <button
                        key={h}
                        onClick={() => setHeuristic(h)}
                        disabled={isRunning}
                        className={`py-1 text-[11px] font-medium rounded-md transition ${
                          heuristic === h
                            ? 'bg-[#131C2B] text-[#E8EDF5] font-bold border border-[#6366F1]/50 shadow-sm'
                            : 'text-[#8794A8] hover:text-[#E8EDF5]'
                        }`}
                      >
                        {h === 'Manhattan' ? 'Manh' : h === 'Euclidean' ? 'Eucl' : 'Cheb'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="h-px bg-[#253247]"></div>

            {/* Sezione 2: Strumenti Pennello & Griglia */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] uppercase font-bold tracking-wider text-[#8794A8]">Strumenti Griglia</span>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setTool('start')}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold transition ${
                    tool === 'start'
                      ? 'bg-[#131C2B] text-[#10B981] border-[#10B981]'
                      : 'border-transparent text-[#8794A8] hover:text-[#E8EDF5] hover:bg-[#131C2B]'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5 text-[#10B981]" />
                  <span>Start [S]</span>
                </button>

                <button
                  onClick={() => setTool('target')}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-semibold transition ${
                    tool === 'target'
                      ? 'bg-[#131C2B] text-[#F43F5E] border-[#F43F5E]'
                      : 'border-transparent text-[#8794A8] hover:text-[#E8EDF5] hover:bg-[#131C2B]'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5 text-[#F43F5E]" />
                  <span>Target [T]</span>
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => setTool('wall')}
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs font-semibold transition ${
                    tool === 'wall'
                      ? 'bg-[#131C2B] text-[#E8EDF5] border-[#6366F1]'
                      : 'border-transparent text-[#8794A8] hover:text-[#E8EDF5] hover:bg-[#131C2B]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-[#8794A8]" />
                    <span>Muro impassabile [W]</span>
                  </div>
                  <span className="text-[10px] text-[#5C6B82] font-mono">BLOCCO</span>
                </button>

                <button
                  onClick={() => setTool('weight')}
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs font-semibold transition ${
                    tool === 'weight'
                      ? 'bg-[#131C2B] text-[#E8EDF5] border-[#6366F1]'
                      : 'border-transparent text-[#8794A8] hover:text-[#E8EDF5] hover:bg-[#131C2B]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Weight className="w-3.5 h-3.5 text-[#A78BFA]" />
                    <span>Terreno pesato [P]</span>
                  </div>
                  <span className="text-[10px] text-[#A78BFA] font-mono font-bold">5×</span>
                </button>

                <button
                  onClick={() => setTool('eraser')}
                  className={`flex items-center justify-between p-2 rounded-lg border text-xs font-semibold transition ${
                    tool === 'eraser'
                      ? 'bg-[#131C2B] text-[#E8EDF5] border-[#6366F1]'
                      : 'border-transparent text-[#8794A8] hover:text-[#E8EDF5] hover:bg-[#131C2B]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Eraser className="w-3.5 h-3.5 text-[#FB7185]" />
                    <span>Gomma [E]</span>
                  </div>
                  <span className="text-[10px] text-[#5C6B82] font-mono">DEL</span>
                </button>
              </div>
            </div>

            <div className="h-px bg-[#253247]"></div>

            {/* Sezione 3: Generatore di Labirinti */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] uppercase font-bold tracking-wider text-[#8794A8]">Generatore Labirinti</span>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => generateMaze('division')}
                  disabled={isRunning}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#131C2B] hover:bg-[#1A263B] text-[11px] font-semibold text-[#E8EDF5] border border-[#253247] transition hover:border-[#344461]"
                >
                  <Shuffle className="w-3.5 h-3.5 text-[#6366F1] mb-1" />
                  <span>Divisione</span>
                </button>
                <button
                  onClick={() => generateMaze('backtracker')}
                  disabled={isRunning}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#131C2B] hover:bg-[#1A263B] text-[11px] font-semibold text-[#E8EDF5] border border-[#253247] transition hover:border-[#344461]"
                >
                  <Shuffle className="w-3.5 h-3.5 text-[#22D3EE] mb-1" />
                  <span>DFS Maze</span>
                </button>
                <button
                  onClick={() => generateMaze('random')}
                  disabled={isRunning}
                  className="flex flex-col items-center justify-center p-2 rounded-lg bg-[#131C2B] hover:bg-[#1A263B] text-[11px] font-semibold text-[#E8EDF5] border border-[#253247] transition hover:border-[#344461]"
                >
                  <Shuffle className="w-3.5 h-3.5 text-[#8794A8] mb-1" />
                  <span>Casuale</span>
                </button>
              </div>
            </div>

            {/* Sezione 4: Opzioni & Switch */}
            <div className="flex flex-col gap-2 mt-auto">
              <div className="flex items-center justify-between text-xs font-medium text-[#8794A8]">
                <span>Movimento Diagonale</span>
                <button
                  type="button"
                  onClick={() => { setAllowDiagonal(!allowDiagonal); clearVisualization(); }}
                  disabled={isRunning}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    allowDiagonal ? 'bg-[#6366F1]' : 'bg-[#1E293B]'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      allowDiagonal ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between text-xs font-medium text-[#8794A8]">
                <span>Colori Accessibili</span>
                <button
                  type="button"
                  onClick={() => setColorblindMode(!colorblindMode)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    colorblindMode ? 'bg-[#6366F1]' : 'bg-[#1E293B]'
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      colorblindMode ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={clearVisualization}
                  disabled={isRunning}
                  className="p-2 rounded-lg bg-[#131C2B] hover:bg-[#1A263B] text-xs font-semibold text-[#8794A8] hover:text-[#E8EDF5] border border-[#253247] transition"
                >
                  Pulisci Run [C]
                </button>
                <button
                  onClick={resetAll}
                  disabled={isRunning}
                  className="p-2 rounded-lg bg-[#F43F5E]/10 hover:bg-[#F43F5E]/20 text-xs font-semibold text-[#F43F5E] border border-[#F43F5E]/30 transition"
                >
                  Reset Muri [R]
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* === AREA CENTRALE GRIGLIA DOMINANTE === */}
        <main
          ref={gridContainerRef}
          className="flex-1 bg-[#090D16] p-5 flex flex-col items-center justify-center relative overflow-hidden"
        >
          {/* Canvas Wrapper con bordi raffinati e ombreggiatura software */}
          <div className="rounded-xl bg-[#090D16] border border-[#253247] shadow-2xl relative overflow-hidden flex items-center justify-center">
            <canvas
              ref={canvasRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              className="block cursor-crosshair touch-none"
              style={{
                width: `${cols * cellSize}px`,
                height: `${rows * cellSize}px`,
                maxWidth: '100%',
                maxHeight: '100%',
              }}
            />
          </div>

          {/* Sottotitolo Guida sotto il Canvas */}
          <div className="mt-2.5 flex items-center justify-between w-full max-w-[1250px] px-2 text-xs text-[#8794A8]">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#6366F1]"></span>
              <span>Trascina con il mouse per disegnare ostacoli o pesi. Clicca o trascina <strong>S</strong> ed <strong>E</strong> per riposizionarli.</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-[#5C6B82]">
              <span>Risoluzione: {cols} × {rows} nodi</span>
            </div>
          </div>
        </main>

        {/* === SIDEBAR DESTRA: TABS (Prestazioni | Info | Pseudocodice) (w-80) === */}
        {rightOpen && (
          <aside className="w-80 border-l border-[#253247] bg-[#0E1421] p-4 flex flex-col gap-4 overflow-y-auto flex-shrink-0 z-10">
            {/* Header Tabs in stile Linear */}
            <div className="flex items-center bg-[#090D16] p-1 rounded-xl border border-[#253247] text-xs">
              <button
                onClick={() => setRightTab('metrics')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition ${
                  rightTab === 'metrics'
                    ? 'bg-[#131C2B] text-[#E8EDF5] shadow-sm border border-[#253247]'
                    : 'text-[#8794A8] hover:text-[#E8EDF5]'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-[#6366F1]" />
                <span>Prestazioni</span>
              </button>

              <button
                onClick={() => setRightTab('info')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition ${
                  rightTab === 'info'
                    ? 'bg-[#131C2B] text-[#E8EDF5] shadow-sm border border-[#253247]'
                    : 'text-[#8794A8] hover:text-[#E8EDF5]'
                }`}
              >
                <Info className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>Info</span>
              </button>

              <button
                onClick={() => setRightTab('pseudocode')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition ${
                  rightTab === 'pseudocode'
                    ? 'bg-[#131C2B] text-[#E8EDF5] shadow-sm border border-[#253247]'
                    : 'text-[#8794A8] hover:text-[#E8EDF5]'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Codice</span>
              </button>
            </div>

            {/* TAB 1: PRESTAZIONI */}
            {rightTab === 'metrics' && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-bold tracking-wider text-[#8794A8]">Metriche Esecuzione</span>
                  <span className="text-[10px] font-mono text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded-full border border-[#10B981]/25 font-bold">
                    PROFILER
                  </span>
                </div>

                {/* Card Tempo Calcolo CPU Hero */}
                <div className="p-3.5 rounded-xl bg-[#131C2B] border border-[#253247] flex flex-col gap-1">
                  <span className="text-xs text-[#8794A8] font-medium">Tempo Calcolo C++ (steady_clock)</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-bold text-[#6366F1]">
                      {stats ? stats.execution_time_us.toFixed(1) : '---'}
                    </span>
                    <span className="text-xs text-[#8794A8] font-mono">µs</span>
                  </div>
                </div>

                {/* Tabella Metriche dettagliate */}
                <div className="flex flex-col gap-2 rounded-xl bg-[#131C2B] border border-[#253247] p-3 tabular-nums text-xs">
                  <div className="flex items-center justify-between border-b border-[#253247] pb-2">
                    <span className="text-[#8794A8]">Nodi Esplorati</span>
                    <span className="font-mono font-semibold text-[#E8EDF5]">
                      {stats ? `${stats.nodes_explored} (${((stats.nodes_explored / (cols * rows)) * 100).toFixed(1)}%)` : '---'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#253247] pb-2">
                    <span className="text-[#8794A8]">Passi Cammino</span>
                    <span className="font-mono font-bold text-[#F59E0B]">
                      {stats ? stats.path.length : '---'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[#253247] pb-2">
                    <span className="text-[#8794A8]">Costo Totale</span>
                    <span className="font-mono font-semibold text-[#E8EDF5]">
                      {stats ? stats.path_cost : '---'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[#8794A8]">Esito Ricerca</span>
                    <span className={`text-[11px] font-bold ${stats?.found ? 'text-[#10B981]' : stats ? 'text-[#F43F5E]' : 'text-[#8794A8]'}`}>
                      {stats ? (stats.found ? 'Percorso Trovato' : 'Inaccessibile') : 'In attesa'}
                    </span>
                  </div>
                </div>

                {/* Confronto C++ WASM vs Pure JS */}
                {jsComparison && (
                  <div className="p-3 rounded-xl bg-[#090D16] border border-[#6366F1]/30 flex flex-col gap-1.5 text-xs">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#6366F1]">Confronto Velocità Esecuzione</div>
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-[#8794A8]">C++ (WASM):</span>
                      <span className="font-bold text-[#10B981]">{jsComparison.wasmUs.toFixed(1)} µs</span>
                    </div>
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-[#8794A8]">Pure JS:</span>
                      <span className="font-bold text-[#F59E0B]">{jsComparison.jsUs.toFixed(1)} µs</span>
                    </div>
                    <div className="text-[11px] text-[#8794A8] pt-1 border-t border-[#253247]">
                      C++ è <strong className="text-[#E8EDF5]">{(jsComparison.jsUs / Math.max(jsComparison.wasmUs, 0.1)).toFixed(1)}×</strong> più veloce di Javascript
                    </div>
                  </div>
                )}

                {/* Storico ultime run */}
                {historyRuns.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <span className="text-[10px] uppercase font-bold text-[#8794A8]">Ultime Esecuzioni</span>
                    <div className="flex flex-col gap-1">
                      {historyRuns.map((h, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[#090D16] border border-[#253247] text-[11px] font-mono">
                          <span className="text-[#8794A8]">{h.nodes_explored} nodi</span>
                          <span className="text-[#6366F1] font-bold">{h.execution_time_us.toFixed(1)} µs</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: INFO ALGORITMO */}
            {rightTab === 'info' && (
              <div className="flex flex-col gap-3 text-xs">
                <div>
                  <h4 className="text-sm font-bold text-[#E8EDF5]">{currentInfo.fullName}</h4>
                  <p className="text-[#8794A8] text-xs mt-1.5 leading-relaxed">{currentInfo.description}</p>
                </div>

                <div className="p-3 rounded-xl bg-[#131C2B] border border-[#253247] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8794A8]">Complessità Tempo:</span>
                    <span className="font-mono font-bold text-[#6366F1]">{currentInfo.timeComplexity}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8794A8]">Complessità Spazio:</span>
                    <span className="font-mono font-bold text-[#22D3EE]">{currentInfo.spaceComplexity}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8794A8]">Ottimalità:</span>
                    <span className={`font-semibold ${currentInfo.isOptimal ? 'text-[#10B981]' : 'text-[#F59E0B]'}`}>
                      {currentInfo.isOptimal ? 'Garantita' : 'Sub-ottimale'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#8794A8]">Supporto Pesi:</span>
                    <span className={`font-semibold ${currentInfo.supportsWeights ? 'text-[#10B981]' : 'text-[#8794A8]'}`}>
                      {currentInfo.supportsWeights ? 'Sì (Dijkstra / A*)' : 'Ignorati'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PSEUDOCODICE */}
            {rightTab === 'pseudocode' && (
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-bold tracking-wider text-[#8794A8]">Logica C++ Implementata</span>
                  <span className="text-[10px] font-mono text-[#F59E0B] font-bold">{algo}</span>
                </div>
                <div className="p-3 rounded-xl bg-[#090D16] border border-[#253247] font-mono text-[11px] text-[#8794A8] flex flex-col gap-1 overflow-x-auto leading-relaxed">
                  {currentInfo.pseudocode.map((line, idx) => (
                    <div key={idx} className="flex gap-2.5">
                      <span className="text-[#5C6B82] select-none w-3 text-right">{idx + 1}</span>
                      <span className="text-[#CBD5E1]">{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* 3. FOOTER PLAYER DOCK (Linear Multimedia Bar) */}
      <footer className="h-16 border-t border-[#253247] bg-[#0E1421] px-5 py-2 flex items-center justify-between flex-shrink-0 z-20 gap-4">
        {/* Sinistra: Legenda Compatta ed Elegante */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-[#10B981] flex items-center justify-center text-[9px] text-white font-bold">S</span>
            <span className="text-[#8794A8]">Start</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-[#F43F5E] flex items-center justify-center text-[9px] text-white font-bold">E</span>
            <span className="text-[#8794A8]">Target</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-[#1E293B] border border-[#334155]"></span>
            <span className="text-[#8794A8]">Muro</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-[#261F55] border border-[#4F46E5] text-[8px] text-[#A78BFA] font-bold flex items-center justify-center">5</span>
            <span className="text-[#8794A8]">Peso</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-md ${colorblindMode ? 'bg-[#C2410C]' : 'bg-[#0E7490]'}`}></span>
            <span className="text-[#8794A8]">Frontiera</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-md ${colorblindMode ? 'bg-[#1D4ED8]' : 'bg-[#1E3A8A]'}`}></span>
            <span className="text-[#8794A8]">Esplorato</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-[#F59E0B]"></span>
            <span className="text-[#F59E0B] font-bold">Cammino</span>
          </div>
        </div>

        {/* Centro: CONTROLLI MEDIA & TIMELINE SCRUBBER */}
        <div className="flex-1 max-w-lg flex items-center gap-3 bg-[#090D16] px-4 py-1.5 rounded-xl border border-[#253247]">
          <div className="flex items-center gap-1">
            <button
              onClick={jumpToStart}
              disabled={maxSteps === 0 || timelineStep === 0}
              className="p-1.5 text-[#8794A8] hover:text-white disabled:opacity-30 transition rounded-md hover:bg-[#131C2B]"
              title="Torna all'Inizio"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={stepBackward}
              disabled={maxSteps === 0 || timelineStep === 0}
              className="p-1.5 text-[#8794A8] hover:text-white disabled:opacity-30 transition rounded-md hover:bg-[#131C2B]"
              title="Passo Indietro [←]"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Tasto Play/Pausa Centrale con Accento Primario #6366F1 */}
            <button
              onClick={isRunning ? togglePause : executePathfinding}
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold transition shadow-sm ${
                isRunning && !isPaused
                  ? 'bg-[#F59E0B] text-white hover:bg-[#D97706]'
                  : 'bg-[#6366F1] text-white hover:bg-[#4F46E5]'
              }`}
              title="Play / Pausa [Spazio]"
            >
              {isRunning && !isPaused ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
            </button>

            <button
              onClick={stepForward}
              disabled={maxSteps === 0 || timelineStep >= maxSteps}
              className="p-1.5 text-[#8794A8] hover:text-white disabled:opacity-30 transition rounded-md hover:bg-[#131C2B]"
              title="Passo Avanti [→]"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button
              onClick={jumpToEnd}
              disabled={maxSteps === 0 || timelineStep >= maxSteps}
              className="p-1.5 text-[#8794A8] hover:text-white disabled:opacity-30 transition rounded-md hover:bg-[#131C2B]"
              title="Vai alla Fine"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

          {/* Timeline Range Scrubber */}
          <div className="flex-1 flex flex-col gap-0.5">
            <div className="flex justify-between text-[10px] font-mono text-[#8794A8] tabular-nums">
              <span>Passo {timelineStep}</span>
              <span>Totale {maxSteps}</span>
            </div>
            <input
              type="range"
              min="0"
              max={maxSteps || 100}
              value={timelineStep}
              onChange={(e) => handleTimelineChange(Number(e.target.value))}
              disabled={maxSteps === 0}
              className="w-full cursor-pointer h-1.5 rounded-lg"
            />
          </div>
        </div>

        {/* Destra: Slider Velocità & Pulsante Primario */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#090D16] px-3 py-1.5 rounded-xl border border-[#253247] text-xs">
            <Sliders className="w-3.5 h-3.5 text-[#8794A8]" />
            <span className="text-[#8794A8] font-medium">Velocità:</span>
            <input
              type="range"
              min="1"
              max="5"
              value={speedLog}
              onChange={(e) => setSpeedLog(Number(e.target.value))}
              className="w-16 cursor-pointer h-1 rounded-lg"
            />
            <span className="font-mono text-[#E8EDF5] font-bold text-[11px] w-6 text-right">
              {speedLog === 1 ? '1×' : speedLog === 2 ? '2×' : speedLog === 3 ? '5×' : speedLog === 4 ? '20×' : 'MAX'}
            </span>
          </div>

          <button
            onClick={executePathfinding}
            disabled={isRunning && !isPaused}
            className="flex items-center gap-2 bg-[#6366F1] hover:bg-[#4F46E5] active:scale-95 text-white font-bold text-xs px-5 py-2 rounded-xl transition duration-150 disabled:opacity-50 shadow-md shadow-[#6366F1]/20"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>{isRunning ? 'CALCOLO...' : 'AVVIA SIMULAZIONE'}</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
