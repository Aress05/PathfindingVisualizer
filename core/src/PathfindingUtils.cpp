#include "Pathfinding.hpp"
#include <cmath>
#include <algorithm>

namespace pathfinding {

double calculate_heuristic(Point a, Point b, HeuristicType type) {
    const double dx = std::abs(a.x - b.x);
    const double dy = std::abs(a.y - b.y);

    switch (type) {
        case HeuristicType::Manhattan:
            return dx + dy;
        case HeuristicType::Euclidean:
            return std::sqrt(dx * dx + dy * dy);
        case HeuristicType::Chebyshev:
            return std::max(dx, dy);
    }
    return 0.0;
}

std::vector<Point> reconstruct_path(const std::vector<int>& parent, size_t start_idx, size_t end_idx, const Grid& grid) {
    std::vector<Point> path;
    int curr = static_cast<int>(end_idx);

    while (curr != -1) {
        path.push_back(grid.to_point(static_cast<size_t>(curr)));
        if (static_cast<size_t>(curr) == start_idx) {
            break;
        }
        curr = parent[static_cast<size_t>(curr)];
    }

    std::reverse(path.begin(), path.end());
    return path;
}

} // namespace pathfinding

