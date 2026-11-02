#include "Pathfinding.hpp"
#include <queue>
#include <limits>
#include <chrono>

namespace pathfinding {

struct AStarNode {
    double f_score{0.0};
    double g_score{0.0};
    Point point{};

    bool operator>(const AStarNode& other) const noexcept {
        return f_score > other.f_score;
    }
};

static PathResult run_single_astar(const Grid& grid, Point start, Point end, HeuristicType heuristic, bool allow_diagonal) {
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

    std::priority_queue<AStarNode, std::vector<AStarNode>, std::greater<AStarNode>> pq;

    std::vector<double> g_score(grid.size(), std::numeric_limits<double>::infinity());
    std::vector<double> f_score(grid.size(), std::numeric_limits<double>::infinity());
    std::vector<int> parent(grid.size(), -1);
    std::vector<bool> closed(grid.size(), false);

    g_score[start_idx] = 0.0;
    f_score[start_idx] = calculate_heuristic(start, end, heuristic);
    pq.push(AStarNode{f_score[start_idx], 0.0, start});
    result.frontier_order.push_back(start);

    while (!pq.empty()) {
        const AStarNode current_node = pq.top();
        pq.pop();
        const Point current = current_node.point;
        const size_t current_idx = grid.to_index(current);

        if (closed[current_idx]) {
            continue;
        }
        closed[current_idx] = true;

        result.visited_order.push_back(current);

        if (current == end) {
            result.found = true;
            result.path = reconstruct_path(parent, start_idx, end_idx, grid);
            result.path_cost = g_score[end_idx];
            break;
        }

        for (const Point& neighbor : grid.get_neighbors(current, allow_diagonal)) {
            const size_t n_idx = grid.to_index(neighbor);
            if (closed[n_idx]) continue;

            const double tentative_g = current_node.g_score + grid.get_weight(neighbor);

            if (tentative_g < g_score[n_idx]) {
                parent[n_idx] = static_cast<int>(current_idx);
                g_score[n_idx] = tentative_g;
                const double h = calculate_heuristic(neighbor, end, heuristic);
                f_score[n_idx] = tentative_g + h;
                pq.push(AStarNode{f_score[n_idx], tentative_g, neighbor});
                result.frontier_order.push_back(neighbor);
            }
        }
    }

    result.nodes_explored = result.visited_order.size();
    return result;
}

PathResult solve_astar(const Grid& grid, Point start, Point end, HeuristicType heuristic, bool allow_diagonal) {
    const auto t_start = std::chrono::steady_clock::now();
    PathResult result = run_single_astar(grid, start, end, heuristic, allow_diagonal);
    const auto t_end = std::chrono::steady_clock::now();

    double elapsed_us = std::chrono::duration<double, std::micro>(t_end - t_start).count();

    if (elapsed_us < 15.0 && result.found) {
        constexpr int BENCHMARK_RUNS = 25;
        const auto b_start = std::chrono::steady_clock::now();
        for (int i = 0; i < BENCHMARK_RUNS; ++i) {
            run_single_astar(grid, start, end, heuristic, allow_diagonal);
        }
        const auto b_end = std::chrono::steady_clock::now();
        elapsed_us = std::chrono::duration<double, std::micro>(b_end - b_start).count() / BENCHMARK_RUNS;
    }

    result.execution_time_us = elapsed_us;
    return result;
}

// Greedy Best-First Search
static PathResult run_single_greedy(const Grid& grid, Point start, Point end, HeuristicType heuristic, bool allow_diagonal) {
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

    struct GreedyNode {
        double h_score{0.0};
        Point point{};
        bool operator>(const GreedyNode& other) const noexcept {
            return h_score > other.h_score;
        }
    };

    std::priority_queue<GreedyNode, std::vector<GreedyNode>, std::greater<GreedyNode>> pq;
    std::vector<bool> visited(grid.size(), false);
    std::vector<int> parent(grid.size(), -1);

    visited[start_idx] = true;
    pq.push(GreedyNode{calculate_heuristic(start, end, heuristic), start});
    result.frontier_order.push_back(start);

    while (!pq.empty()) {
        const auto [_, current] = pq.top();
        pq.pop();
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
                pq.push(GreedyNode{calculate_heuristic(neighbor, end, heuristic), neighbor});
                result.frontier_order.push_back(neighbor);
            }
        }
    }

    result.nodes_explored = result.visited_order.size();
    return result;
}

PathResult solve_greedy_bfs(const Grid& grid, Point start, Point end, HeuristicType heuristic, bool allow_diagonal) {
    const auto t_start = std::chrono::steady_clock::now();
    PathResult result = run_single_greedy(grid, start, end, heuristic, allow_diagonal);
    const auto t_end = std::chrono::steady_clock::now();

    double elapsed_us = std::chrono::duration<double, std::micro>(t_end - t_start).count();

    if (elapsed_us < 15.0 && result.found) {
        constexpr int BENCHMARK_RUNS = 25;
        const auto b_start = std::chrono::steady_clock::now();
        for (int i = 0; i < BENCHMARK_RUNS; ++i) {
            run_single_greedy(grid, start, end, heuristic, allow_diagonal);
        }
        const auto b_end = std::chrono::steady_clock::now();
        elapsed_us = std::chrono::duration<double, std::micro>(b_end - b_start).count() / BENCHMARK_RUNS;
    }

    result.execution_time_us = elapsed_us;
    return result;
}

// Bidirectional BFS
static PathResult run_single_bi_bfs(const Grid& grid, Point start, Point end, bool allow_diagonal) {
    PathResult result;

    if (!grid.is_valid(start) || !grid.is_valid(end) ||
        !grid.is_walkable(start) || !grid.is_walkable(end)) {
        return result;
    }

    if (start == end) {
        result.found = true;
        result.visited_order.push_back(start);
        result.path.push_back(start);
        result.nodes_explored = 1;
        result.path_cost = 0.0;
        return result;
    }

    const size_t start_idx = grid.to_index(start);
    const size_t end_idx = grid.to_index(end);

    std::queue<Point> q_start, q_end;
    std::vector<bool> visited_start(grid.size(), false);
    std::vector<bool> visited_end(grid.size(), false);
    std::vector<int> parent_start(grid.size(), -1);
    std::vector<int> parent_end(grid.size(), -1);

    q_start.push(start);
    visited_start[start_idx] = true;
    result.frontier_order.push_back(start);

    q_end.push(end);
    visited_end[end_idx] = true;
    result.frontier_order.push_back(end);

    int intersect_idx = -1;

    while (!q_start.empty() && !q_end.empty()) {
        const Point curr_f = q_start.front();
        q_start.pop();
        const size_t curr_f_idx = grid.to_index(curr_f);
        result.visited_order.push_back(curr_f);

        if (visited_end[curr_f_idx]) {
            intersect_idx = static_cast<int>(curr_f_idx);
            break;
        }

        for (const Point& neighbor : grid.get_neighbors(curr_f, allow_diagonal)) {
            const size_t n_idx = grid.to_index(neighbor);
            if (!visited_start[n_idx]) {
                visited_start[n_idx] = true;
                parent_start[n_idx] = static_cast<int>(curr_f_idx);
                q_start.push(neighbor);
                result.frontier_order.push_back(neighbor);
                if (visited_end[n_idx]) {
                    intersect_idx = static_cast<int>(n_idx);
                    break;
                }
            }
        }
        if (intersect_idx != -1) break;

        const Point curr_b = q_end.front();
        q_end.pop();
        const size_t curr_b_idx = grid.to_index(curr_b);
        result.visited_order.push_back(curr_b);

        if (visited_start[curr_b_idx]) {
            intersect_idx = static_cast<int>(curr_b_idx);
            break;
        }

        for (const Point& neighbor : grid.get_neighbors(curr_b, allow_diagonal)) {
            const size_t n_idx = grid.to_index(neighbor);
            if (!visited_end[n_idx]) {
                visited_end[n_idx] = true;
                parent_end[n_idx] = static_cast<int>(curr_b_idx);
                q_end.push(neighbor);
                result.frontier_order.push_back(neighbor);
                if (visited_start[n_idx]) {
                    intersect_idx = static_cast<int>(n_idx);
                    break;
                }
            }
        }
        if (intersect_idx != -1) break;
    }

    if (intersect_idx != -1) {
        result.found = true;
        std::vector<Point> path_f;
        int curr = intersect_idx;
        while (curr != -1) {
            path_f.push_back(grid.to_point(static_cast<size_t>(curr)));
            if (static_cast<size_t>(curr) == start_idx) break;
            curr = parent_start[static_cast<size_t>(curr)];
        }
        std::reverse(path_f.begin(), path_f.end());

        std::vector<Point> path_b;
        curr = parent_end[static_cast<size_t>(intersect_idx)];
        while (curr != -1) {
            path_b.push_back(grid.to_point(static_cast<size_t>(curr)));
            if (static_cast<size_t>(curr) == end_idx) break;
            curr = parent_end[static_cast<size_t>(curr)];
        }

        result.path = path_f;
        result.path.insert(result.path.end(), path_b.begin(), path_b.end());

        double total_cost = 0.0;
        for (size_t i = 1; i < result.path.size(); ++i) {
            total_cost += grid.get_weight(result.path[i]);
        }
        result.path_cost = total_cost;
    }

    result.nodes_explored = result.visited_order.size();
    return result;
}

PathResult solve_bidirectional_bfs(const Grid& grid, Point start, Point end, bool allow_diagonal) {
    const auto t_start = std::chrono::steady_clock::now();
    PathResult result = run_single_bi_bfs(grid, start, end, allow_diagonal);
    const auto t_end = std::chrono::steady_clock::now();

    double elapsed_us = std::chrono::duration<double, std::micro>(t_end - t_start).count();

    if (elapsed_us < 15.0 && result.found) {
        constexpr int BENCHMARK_RUNS = 25;
        const auto b_start = std::chrono::steady_clock::now();
        for (int i = 0; i < BENCHMARK_RUNS; ++i) {
            run_single_bi_bfs(grid, start, end, allow_diagonal);
        }
        const auto b_end = std::chrono::steady_clock::now();
        elapsed_us = std::chrono::duration<double, std::micro>(b_end - b_start).count() / BENCHMARK_RUNS;
    }

    result.execution_time_us = elapsed_us;
    return result;
}

} // namespace pathfinding
