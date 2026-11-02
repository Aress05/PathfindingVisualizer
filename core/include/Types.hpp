#pragma once

#include <cstdint>
#include <vector>
#include <compare>
#include <functional>

namespace pathfinding {

struct Point {
    int x{0};
    int y{0};

    constexpr auto operator<=>(const Point&) const = default;
};

enum class CellType : uint8_t {
    Empty = 0,
    Wall = 1,
    Weight = 2
};

enum class HeuristicType {
    Manhattan,
    Euclidean,
    Chebyshev
};

struct PathResult {
    bool found{false};
    std::vector<Point> visited_order;
    std::vector<Point> frontier_order;
    std::vector<Point> path;
    size_t nodes_explored{0};
    double execution_time_us{0.0};
    double path_cost{0.0};
};

} // namespace pathfinding

// Specializzazione std::hash per Point compatibile a 32 e 64 bit
template <>
struct std::hash<pathfinding::Point> {
    std::size_t operator()(const pathfinding::Point& p) const noexcept {
        return (static_cast<std::size_t>(p.x) * 73856093u) ^ (static_cast<std::size_t>(p.y) * 19349663u);
    }
};
