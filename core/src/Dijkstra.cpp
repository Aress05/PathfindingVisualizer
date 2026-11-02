#include "Pathfinding.hpp"
#include <queue>
#include <limits>
#include <chrono>

namespace pathfinding {

static PathResult run_single_dijkstra(const Grid& grid, Point start, Point end, bool allow_diagonal) {
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

    using QueueElement = std::pair<double, Point>;
    std::priority_queue<QueueElement, std::vector<QueueElement>, std::greater<QueueElement>> pq;

    std::vector<double> dist(grid.size(), std::numeric_limits<double>::infinity());
    std::vector<int> parent(grid.size(), -1);
    std::vector<bool> closed(grid.size(), false);

    dist[start_idx] = 0.0;
    pq.push({0.0, start});
    result.frontier_order.push_back(start);

    while (!pq.empty()) {
        const auto [current_dist, current] = pq.top();
        pq.pop();
        const size_t current_idx = grid.to_index(current);

        if (closed[current_idx]) {
            continue;
        }
        closed[current_idx] = true;

        result.visited_order.push_back(current);

        if (current == end) {
            result.found = true;
            result.path = reconstruct_path(parent, start_idx, end_idx, grid);
            result.path_cost = dist[end_idx];
            break;
        }

        for (const Point& neighbor : grid.get_neighbors(current, allow_diagonal)) {
            const size_t n_idx = grid.to_index(neighbor);
            if (closed[n_idx]) continue;

            const double step_weight = grid.get_weight(neighbor);
            const double new_dist = current_dist + step_weight;

            if (new_dist < dist[n_idx]) {
                dist[n_idx] = new_dist;
                parent[n_idx] = static_cast<int>(current_idx);
                pq.push({new_dist, neighbor});
                result.frontier_order.push_back(neighbor);
            }
        }
    }

    result.nodes_explored = result.visited_order.size();
    return result;
}

PathResult solve_dijkstra(const Grid& grid, Point start, Point end, bool allow_diagonal) {
    const auto t_start = std::chrono::steady_clock::now();
    PathResult result = run_single_dijkstra(grid, start, end, allow_diagonal);
    const auto t_end = std::chrono::steady_clock::now();

    double elapsed_us = std::chrono::duration<double, std::micro>(t_end - t_start).count();

    if (elapsed_us < 15.0 && result.found) {
        constexpr int BENCHMARK_RUNS = 25;
        const auto b_start = std::chrono::steady_clock::now();
        for (int i = 0; i < BENCHMARK_RUNS; ++i) {
            run_single_dijkstra(grid, start, end, allow_diagonal);
        }
        const auto b_end = std::chrono::steady_clock::now();
        elapsed_us = std::chrono::duration<double, std::micro>(b_end - b_start).count() / BENCHMARK_RUNS;
    }

    result.execution_time_us = elapsed_us;
    return result;
}

} // namespace pathfinding
