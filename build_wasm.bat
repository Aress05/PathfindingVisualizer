@echo off
echo ===================================================
echo   Compilazione Motore C++20 in WebAssembly (WASM)
echo ===================================================

where em++ >nul 2>&1
if %errorlevel% neq 0 (
    if exist "%~dp0..\emsdk\emsdk_env.bat" (
        call "%~dp0..\emsdk\emsdk_env.bat"
    ) else if exist "%~dp0emsdk\emsdk_env.bat" (
        call "%~dp0emsdk\emsdk_env.bat"
    ) else (
        echo [ERRORE] Emscripten (em++) non trovato nel PATH di sistema.
        echo Assicurati di aver installato e attivato emsdk.
        exit /b 1
    )
)

cd /d "%~dp0"

if not exist "frontend\src\wasm" mkdir "frontend\src\wasm"
if not exist "frontend\public" mkdir "frontend\public"

echo Compilazione sorgenti C++ con em++ (O3, std=c++20, embind)...
em++ -std=c++20 -O3 -Icore/include --bind ^
    core/src/Grid.cpp ^
    core/src/PathfindingUtils.cpp ^
    core/src/BFS.cpp ^
    core/src/DFS.cpp ^
    core/src/Dijkstra.cpp ^
    core/src/AStar.cpp ^
    core/src/WasmBindings.cpp ^
    -s MODULARIZE=1 ^
    -s EXPORT_ES6=1 ^
    -s EXPORT_NAME=createPathfindingModule ^
    -s ALLOW_MEMORY_GROWTH=1 ^
    -o frontend/src/wasm/pathfinding.js

if errorlevel 1 (
    echo [ERRORE] Compilazione fallita.
    exit /b 1
)

copy /y frontend\src\wasm\pathfinding.wasm frontend\public\pathfinding.wasm >nul
echo.
echo [SUCCESSO] Modulo WebAssembly compilato con successo!
