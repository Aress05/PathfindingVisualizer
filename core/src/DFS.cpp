#include "Pathfinding.hpp"
#include <vector>
#include <chrono>

namespace pathfinding {

PathResult solve_dfs(const Grid& grid, Point start, Point end, bool allow_diagonal) {
    const auto t_start = std::chrono::high_resolution_clock::now();
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
        const auto t_end = std::chrono::high_resolution_clock::now();
        result.execution_time_us = std::chrono::duration<double, std::micro>(t_end - t_start).count();
        return result;
    }

    std::vector<Point> stack;
    std::vector<bool> visited(grid.size(), false);
    std::vector<int> parent(grid.size(), -1);

    stack.push_back(start);
    visited[start_idx] = true;
    result.frontier_order.push_back(start);

    while (!stack.empty()) {
        const Point current = stack.back();
        stack.pop_back();
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
                stack.push_back(neighbor);
                result.frontier_order.push_back(neighbor);
            }
        }
    }

    result.nodes_explored = result.visited_order.size();
    const auto t_end = std::chrono::high_resolution_clock::now();
    result.execution_time_us = std::chrono::duration<double, std::micro>(t_end - t_start).count();

    return result;
}

} // namespace pathfinding
