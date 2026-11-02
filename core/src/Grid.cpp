#include "Grid.hpp"

namespace pathfinding {

Grid::Grid(int width, int height)
    : width_(width),
      height_(height),
      cells_(static_cast<size_t>(width * height), CellType::Empty),
      weights_(static_cast<size_t>(width * height), 1.0) {
    if (width <= 0 || height <= 0) {
        throw std::invalid_argument("Grid dimensions must be positive.");
    }
}

bool Grid::is_valid(Point p) const noexcept {
    return p.x >= 0 && p.x < width_ && p.y >= 0 && p.y < height_;
}

bool Grid::is_walkable(Point p) const noexcept {
    if (!is_valid(p)) return false;
    return cells_[to_index(p)] != CellType::Wall;
}

void Grid::set_cell(Point p, CellType type, double weight) {
    if (!is_valid(p)) {
        throw std::out_of_range("Coordinates outside grid boundaries.");
    }
    const size_t idx = to_index(p);
    cells_[idx] = type;
    weights_[idx] = (type == CellType::Weight) ? weight : 1.0;
}

CellType Grid::get_cell(Point p) const {
    if (!is_valid(p)) {
        throw std::out_of_range("Coordinates outside grid boundaries.");
    }
    return cells_[to_index(p)];
}

double Grid::get_weight(Point p) const {
    if (!is_valid(p)) {
        throw std::out_of_range("Coordinates outside grid boundaries.");
    }
    return weights_[to_index(p)];
}

std::vector<Point> Grid::get_neighbors(Point p, bool allow_diagonal) const {
    std::vector<Point> neighbors;
    neighbors.reserve(allow_diagonal ? 8 : 4);

    // 4 Direzioni cardinali: Su, Destra, Giu, Sinistra
    static constexpr int dx4[] = {0, 1, 0, -1};
    static constexpr int dy4[] = {-1, 0, 1, 0};

    for (int i = 0; i < 4; ++i) {
        Point neighbor{p.x + dx4[i], p.y + dy4[i]};
        if (is_walkable(neighbor)) {
            neighbors.push_back(neighbor);
        }
    }

    if (allow_diagonal) {
        static constexpr int dxd[] = {1, 1, -1, -1};
        static constexpr int dyd[] = {-1, 1, 1, -1};
        for (int i = 0; i < 4; ++i) {
            Point neighbor{p.x + dxd[i], p.y + dyd[i]};
            if (is_walkable(neighbor)) {
                neighbors.push_back(neighbor);
            }
        }
    }

    return neighbors;
}

void Grid::clear() {
    std::fill(cells_.begin(), cells_.end(), CellType::Empty);
    std::fill(weights_.begin(), weights_.end(), 1.0);
}

void Grid::clear_walls() {
    for (size_t i = 0; i < cells_.size(); ++i) {
        if (cells_[i] == CellType::Wall) {
            cells_[i] = CellType::Empty;
        }
    }
}

} // namespace pathfinding

