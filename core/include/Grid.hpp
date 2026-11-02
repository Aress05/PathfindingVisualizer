#pragma once

#include "Types.hpp"
#include <vector>
#include <stdexcept>

namespace pathfinding {

class Grid {
public:
    Grid(int width, int height);

    [[nodiscard]] int get_width() const noexcept { return width_; }
    [[nodiscard]] int get_height() const noexcept { return height_; }
    [[nodiscard]] size_t size() const noexcept { return static_cast<size_t>(width_ * height_); }

    [[nodiscard]] bool is_valid(Point p) const noexcept;
    [[nodiscard]] bool is_walkable(Point p) const noexcept;

    void set_cell(Point p, CellType type, double weight = 1.0);
    [[nodiscard]] CellType get_cell(Point p) const;
    [[nodiscard]] double get_weight(Point p) const;

    [[nodiscard]] std::vector<Point> get_neighbors(Point p, bool allow_diagonal = false) const;

    [[nodiscard]] size_t to_index(Point p) const noexcept {
        return static_cast<size_t>(p.y * width_ + p.x);
    }

    [[nodiscard]] Point to_point(size_t index) const noexcept {
        return Point{
            static_cast<int>(index % static_cast<size_t>(width_)),
            static_cast<int>(index / static_cast<size_t>(width_))
        };
    }

    void clear();
    void clear_walls();

private:
    int width_{0};
    int height_{0};
    std::vector<CellType> cells_;
    std::vector<double> weights_;
};

} // namespace pathfinding

