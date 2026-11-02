#include "Pathfinding.hpp"
#include <queue>
#include <chrono>

namespace pathfinding {

static PathResult run_single_bfs(const Grid& grid, Point start, Point end, bool allow_diagonal) {
    PathResult result;

    if (!grid.is_valid(start) || !grid.is_valid(end) ||
        !grid.is_walkable(start) || !grid.is_walkable(end)) {
        return result;
    }

    const size_t start_idx = grid.to_index(start);
    const size_t end_idx = grid.to_index(end);

    if (start == end) {
        result.found = true;
        result.visited_order.push_back(start);
        result.path.push_back(start);
        result.nodes_explored = 1;
        result.path_cost = 0.0;
        return result;
    }

    std::queue<Point> queue;
    std::vector<bool> visited(grid.size(), false);
    std::vector<int> parent(grid.size(), -1);

    queue.push(start);
    visited[start_idx] = true;
    result.frontier_order.push_back(start);

    while (!queue.empty()) {
        const Point current = queue.front();
        queue.pop();
        const size_t current_idx = grid.to_index(current);

        result.visited_order.push_back(current);

        if (current == end) {
            result.found = true;
            result.path = reconstruct_path(parent, start_idx, end_idx, grid);
            
            double total_cost = 0.0;
            for (size_t i = 1; i < result.path.size(); ++i) {
                total_cost += grid.get_weight(result.path[i]);
            }
            result.path_cost = total_cost;
            break;
        }

        for (const Point& neighbor : grid.get_neighbors(current, allow_diagonal)) {
            const size_t n_idx = grid.to_index(neighbor);
            if (!visited[n_idx]) {
                visited[n_idx] = true;
                parent[n_idx] = static_cast<int>(current_idx);
                queue.push(neighbor);
                result.frontier_order.push_back(neighbor);
            }
        }
    }

    result.nodes_explored = result.visited_order.size();
    return result;
}

PathResult solve_bfs(const Grid& grid, Point start, Point end, bool allow_diagonal) {
    // Eseguiamo un primo run completo per memorizzare i vettori
    const auto t_start = std::chrono::steady_clock::now();
    PathResult result = run_single_bfs(grid, start, end, allow_diagonal);
    const auto t_end = std::chrono::steady_clock::now();

    double elapsed_us = std::chrono::duration<double, std::micro>(t_end - t_start).count();

    // Se il tempo è inferiore a 10 microsecondi, eseguiamo 30 iterazioni per calcolare una media precisa
    if (elapsed_us < 15.0 && result.found) {
        constexpr int BENCHMARK_RUNS = 25;
        const auto b_start = std::chrono::steady_clock::now();
        for (int i = 0; i < BENCHMARK_RUNS; ++i) {
            run_single_bfs(grid, start, end, allow_diagonal);
        }
        const auto b_end = std::chrono::steady_clock::now();
        elapsed_us = std::chrono::duration<double, std::micro>(b_end - b_start).count() / BENCHMARK_RUNS;
    }

    result.execution_time_us = elapsed_us;
    return result;
}

} // namespace pathfinding
