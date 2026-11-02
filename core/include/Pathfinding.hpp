#pragma once

#include "Grid.hpp"
#include "Types.hpp"
#include <vector>

namespace pathfinding {

// Algoritmi di Pathfinding principali
PathResult solve_bfs(const Grid& grid, Point start, Point end, bool allow_diagonal = false);
PathResult solve_dfs(const Grid& grid, Point start, Point end, bool allow_diagonal = false);
PathResult solve_dijkstra(const Grid& grid, Point start, Point end, bool allow_diagonal = false);
PathResult solve_astar(const Grid& grid, Point start, Point end, HeuristicType heuristic = HeuristicType::Manhattan, bool allow_diagonal = false);
PathResult solve_greedy_bfs(const Grid& grid, Point start, Point end, HeuristicType heuristic = HeuristicType::Manhattan, bool allow_diagonal = false);
PathResult solve_bidirectional_bfs(const Grid& grid, Point start, Point end, bool allow_diagonal = false);

// Euristiche per A* e Greedy BFS
[[nodiscard]] double calculate_heuristic(Point a, Point b, HeuristicType type);

// Ricostruzione percorso dai predecessori (da start a end)
[[nodiscard]] std::vector<Point> reconstruct_path(const std::vector<int>& parent, size_t start_idx, size_t end_idx, const Grid& grid);

} // namespace pathfinding
