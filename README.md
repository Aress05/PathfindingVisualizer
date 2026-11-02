# ⚡ AlgoViz — C++20 & WebAssembly Pathfinding Visualizer

Un visualizzatore di algoritmi di ricerca percorsi (*Pathfinding*) ad alte prestazioni, con interfaccia utente professionale in stile **Linear / Raycast / Modern SaaS**.

Il core logico ed algoritmico è implementato interamente in **C++20 nativo** e compilato per il web in **WebAssembly (.wasm)** tramite **Emscripten / Embind**, garantendo un'esecuzione in microsecondi senza il sovraccarico di interpretazione del JavaScript tradizionale.

![C++20](https://img.shields.io/badge/Language-C%2B%2B20-00599C?logo=cplusplus)
![WebAssembly](https://img.shields.io/badge/Binary-WebAssembly-654FF0?logo=webassembly)
![React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20TypeScript-20232A?logo=react)
![Tailwind](https://img.shields.io/badge/Styling-Tailwind%20CSS-06B6D4?logo=tailwindcss)
![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?logo=vite)

---

## 🎯 Caratteristiche Principali

### 🧠 Motore Nativo C++20 (Compilato in WASM)
- **6 Algoritmi di Ricerca**:
  - **BFS (Breadth-First Search)**: Ottimale in grafi non pesati, garantisce il minor numero di archi.
  - **DFS (Depth-First Search)**: Ricerca in profondità rapida lungo corridoi.
  - **Dijkstra (Uniform-Cost Search)**: Ricerca a costo minimo con Min-Heap priority queue per terreni pesati.
  - **A\***: Ricerca euristica informata con selezione dell'euristica di distanza.
  - **Greedy Best-First Search**: Orientato all'obiettivo basato sulla stima euristica verso il target.
  - **Bidirectional BFS**: Due frontiere simultanee da Start e Target che si incontrano a metà strada, dimezzando lo spazio di ricerca.
- **Funzioni Euristiche Selezionabili**: Manhattan, Euclidea e Chebyshev.
- **Supporto Movimento Diagonale**: Calcolo percorsi a 4 o a 8 direzioni.
- **Profiling ad Alta Precisione**: Misurazione in microsecondi reali tramite `std::chrono::steady_clock`.

### 💻 Interfaccia Utente & Strumenti Grafici
- **Design System Premium**: Ispirato ai moderni developer tools (Linear, Raycast) con palette scura calibrata (`#090D16`, `#0E1421`, `#131C2B`, `#6366F1`).
- **Canvas HTML5 Reattivo**: Rendering ad alta fedeltà con gestione automatica del DPI (`window.devicePixelRatio`).
- **Strumenti Griglia Completi**:
  - Posizionamento e spostamento drag & drop di **Start [S]** e **Target [E]** (garantiti sempre sul layer superiore).
  - Tracciamento muri impassabili **[W]** e terreni pesati a costo 5× **[P]**.
  - Gomma di cancellazione mirata **[E]**.
- **Generatori di Labirinti**:
  - *Divisione Ricorsiva* (cammini geometrici)
  - *Recursive Backtracker DFS* (labirinti perfetti a corridoio)
  - *Generatore Casuale*
- **Scenari Didattici Predefiniti**: Trappola Concava (dimostra i limiti del Greedy BFS vs A\*), Terreno Pesato (Dijkstra vs BFS), Serpentina e Bersaglio Chiuso.
- **Player Multimediale**: Play/Pausa (`Spazio`), avanzamento e arretramento passo-passo (`Frecce`), scrubber interattivo della timeline, regolazione velocità da 1× a MAX.
- **Benchmarking Integrato**:
  - *Confronto Algoritmi*: Esecuzione di tutti i 6 algoritmi sulla stessa mappa con tabella comparativa di tempi, nodi esplorati e costo.
  - *C++ WASM vs Pure JS*: Misurazione fianco a fianco del fattore di speedup del motore nativo.
- **Import/Export JSON**: Possibilità di salvare e caricare qualsiasi configurazione di mappa.

---

## 📂 Architettura della Codebase

```
PathfindingVisualizer/
├── core/                        # Motore C++20 Nativo
│   ├── include/
│   │   ├── Types.hpp            # Definizione Point, CellType, PathResult
│   │   ├── Grid.hpp             # Griglia contigua 1D ad accesso O(1)
│   │   └── Pathfinding.hpp      # Solver e interfacce degli algoritmi
│   ├── src/
│   │   ├── Grid.cpp             # Implementazione della griglia
│   │   ├── PathfindingUtils.cpp # Calcolo euristiche e tracciamento
│   │   ├── BFS.cpp              # Algoritmi BFS e Bidirezionale
│   │   ├── DFS.cpp              # Ricerca in profondità
│   │   ├── Dijkstra.cpp         # Algoritmo di Dijkstra con priority queue
│   │   ├── AStar.cpp            # A* e Greedy BFS
│   │   └── WasmBindings.cpp     # Interfaccia Embind per export WebAssembly
│   └── tests/
│       ├── cli_benchmark.cpp    # Benchmark CLI nativo per profiling desktop
│       └── test_gtest.cpp       # Unit test con GoogleTest
├── frontend/                    # Web Application
│   ├── src/
│   │   ├── wasm/
│   │   │   ├── pathfinding.js   # Emscripten glue code generato
│   │   │   ├── pathfinding.wasm # Binario WebAssembly compilato
│   │   │   └── wasmBridge.ts    # Bridge TypeScript fortemente tipizzato
│   │   ├── App.tsx              # Componente UI principale, Canvas & State Machine
│   │   └── index.css            # Token di stile e palette di colori
│   └── package.json
├── build_wasm.bat               # Script per compilare C++ in WebAssembly tramite em++
└── CMakeLists.txt               # Configurazione CMake per compilazione nativa C++
```

---

## 🚀 Avvio Rapido Locale

### 1. Clonare ed Eseguire la Web App
Non è necessario avere Emscripten o C++ installato per eseguire l'applicazione: i file WebAssembly pre-compilati sono già inclusi in `frontend/`.

```bash
# Entra nella cartella frontend
cd frontend

# Installa le dipendenze
npm install

# Avvia il server di sviluppo Vite
npm run dev
```

Apri il browser all'indirizzo **`http://localhost:5173`**.

---

### 2. Ricompilare il Motore C++ in WebAssembly (Opzionale)
Se modifichi i sorgenti C++ in `core/`:

1. Installa ed attiva [Emscripten SDK (emsdk)](https://emscripten.org/docs/getting_started/downloads.html).
2. Esegui lo script:
```cmd
.\build_wasm.bat
```
Lo script compilerà i sorgenti con ottimizzazione `-O3` e collocherà i file `pathfinding.js` e `pathfinding.wasm` direttamente in `frontend/src/wasm/` e `frontend/public/`.

---

### 3. Compilazione Nativa Desktop (CLI Benchmark)
Per testare le prestazioni native sul sistema operativo ospite (Windows/Linux/macOS):

```bash
cmake -B build
cmake --build build --config Release
.\build\core\cli_benchmark.exe
```

---

## 📄 Licenza
Rilasciato sotto licenza [MIT](LICENSE).
