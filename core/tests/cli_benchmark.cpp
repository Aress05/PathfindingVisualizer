#include "Pathfinding.hpp"
#include <iostream>
#include <iomanip>

using namespace pathfinding;

void print_grid_with_path(const Grid& grid, Point start, Point end, const std::vector<Point>& path) {
    std::vector<std::string> visual(grid.get_height(), std::string(grid.get_width(), '.'));

    for (int y = 0; y < grid.get_height(); ++y) {
        for (int x = 0; x < grid.get_width(); ++x) {
            Point p{x, y};
            if (grid.get_cell(p) == CellType::Wall) {
                visual[y][x] = '#';
            } else if (grid.get_cell(p) == CellType::Weight) {
                visual[y][x] = 'W';
            }
        }
    }

    for (const Point& p : path) {
        if (p != start && p != end && visual[p.y][p.x] != '#') {
            visual[p.y][p.x] = '*';
        }
    }

    visual[start.y][start.x] = 'S';
    visual[end.y][end.x] = 'E';

    std::cout << "  +";
    for (int x = 0; x < grid.get_width(); ++x) std::cout << "-";
    std::cout << "+\n";

    for (int y = 0; y < grid.get_height(); ++y) {
        std::cout << "  |" << visual[y] << "|\n";
    }

    std::cout << "  +";
    for (int x = 0; x < grid.get_width(); ++x) std::cout << "-";
    std::cout << "+\n";
}

void print_result(const std::string& name, const PathResult& res) {
    std::cout << "\n=== " << name << " ===" << std::endl;
    std::cout << "  Found:         " << (res.found ? "YES" : "NO") << "\n";
    std::cout << "  Path Length:   " << res.path.size() << " steps\n";
    std::cout << "  Nodes Visited: " << res.nodes_explored << "\n";
    std::cout << "  Path Cost:     " << res.path_cost << "\n";
    std::cout << "  CPU Time:      " << std::fixed << std::setprecision(2) << res.execution_time_us << " us\n";
}

int main() {
    std::cout << "=====================================================\n";
    std::cout << "       PATHFINDING C++20 CORE ENGINE BENCHMARK       \n";
    std::cout << "=====================================================\n";

    // Creiamo una griglia 20x10 con ostacoli
    Grid grid(20, 10);
    Point start{1, 1};
    Point end{18, 8};

    // Muro a barriera verticale con passaggio
    for (int y = 0; y < 8; ++y) {
        grid.set_cell(Point{7, y}, CellType::Wall);
    }
    // Secondo muro
    for (int y = 2; y < 10; ++y) {
        grid.set_cell(Point{14, y}, CellType::Wall);
    }

    // Aggiungiamo celle pesate
    grid.set_cell(Point{6, 8}, CellType::Weight, 5.0);
    grid.set_cell(Point{6, 9}, CellType::Weight, 5.0);

    std::cout << "\n[1] TEST: Griglia 20x10 con ostacoli e pesi\n";

    // 1. BFS
    PathResult bfs_res = solve_bfs(grid, start, end);
    print_result("BFS (Breadth-First Search)", bfs_res);
    print_grid_with_path(grid, start, end, bfs_res.path);

    // 2. DFS
    PathResult dfs_res = solve_dfs(grid, start, end);
    print_result("DFS (Depth-First Search)", dfs_res);

    // 3. Dijkstra
    PathResult dijkstra_res = solve_dijkstra(grid, start, end);
    print_result("Dijkstra (Uniform Cost)", dijkstra_res);

    // 4. A*
    PathResult astar_res = solve_astar(grid, start, end, HeuristicType::Manhattan);
    print_result("A* (Manhattan Heuristic)", astar_res);
    print_grid_with_path(grid, start, end, astar_res.path);

    std::cout << "\n[2] TEST VERIFICA: Dijkstra vs A* ottimalita'\n";
    if (dijkstra_res.found && astar_res.found && dijkstra_res.path_cost == astar_res.path_cost) {
        std::cout << "  -> SUCCESSO! A* e Dijkstra hanno trovato lo stesso costo ottimo: " 
                  << astar_res.path_cost << "\n";
        std::cout << "  -> A* ha visitato " << astar_res.nodes_explored 
                  << " nodi rispetto ai " << dijkstra_res.nodes_explored << " di Dijkstra (euristica efficace!)\n";
    } else {
        std::cout << "  -> ATTENZIONE: Discrepanza tra costi ottimi.\n";
        return 1;
    }

    // 5. Test Target Inaccessibile
    std::cout << "\n[3] TEST: Target completamente isolato da muri\n";
    Grid blocked_grid(10, 10);
    Point b_start{0, 0};
    Point b_end{9, 9};
    for (int i = 0; i < 10; ++i) {
        blocked_grid.set_cell(Point{5, i}, CellType::Wall); // Muro completo da cima a fondo
    }
    PathResult blocked_res = solve_astar(blocked_grid, b_start, b_end);
    if (!blocked_res.found) {
        std::cout << "  -> SUCCESSO! Il target irraggiungibile e' stato gestito correttamente (found = false).\n";
    } else {
        std::cout << "  -> ERRORE: Trovato percorso attraverso muro solido!\n";
        return 1;
    }

    std::cout << "\nTUTTI I TEST DEL CORE C++20 SONO STATI SUPERATI CON SUCCESSO!\n";
    return 0;
}

