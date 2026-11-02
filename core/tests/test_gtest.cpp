#include <gtest/gtest.h>
#include "Pathfinding.hpp"

using namespace pathfinding;

class PathfindingTest : public ::testing::Test {
protected:
    void SetUp() override {
        // Setup griglia 10x10 standard
        grid = std::make_unique<Grid>(10, 10);
    }

    std::unique_ptr<Grid> grid;
};

TEST_F(PathfindingTest, GridBoundaryCheck) {
    EXPECT_TRUE(grid->is_valid(Point{0, 0}));
    EXPECT_TRUE(grid->is_valid(Point{9, 9}));
    EXPECT_FALSE(grid->is_valid(Point{-1, 0}));
    EXPECT_FALSE(grid->is_valid(Point{0, 10}));
}

TEST_F(PathfindingTest, DirectPathFound) {
    Point start{0, 0};
    Point end{0, 5};

    PathResult res_bfs = solve_bfs(*grid, start, end);
    EXPECT_TRUE(res_bfs.found);
    EXPECT_EQ(res_bfs.path.size(), 6);
    EXPECT_EQ(res_bfs.path.front(), start);
    EXPECT_EQ(res_bfs.path.back(), end);

    PathResult res_astar = solve_astar(*grid, start, end);
    EXPECT_TRUE(res_astar.found);
    EXPECT_EQ(res_astar.path.size(), 6);
}

TEST_F(PathfindingTest, WallAvoidance) {
    Point start{1, 1};
    Point end{3, 1};

    // Muro a (2, 1) che blocca la linea retta
    grid->set_cell(Point{2, 1}, CellType::Wall);

    PathResult res = solve_astar(*grid, start, end);
    EXPECT_TRUE(res.found);

    for (const Point& p : res.path) {
        EXPECT_NE(p, (Point{2, 1}));
    }
}

TEST_F(PathfindingTest, UnreachableTarget) {
    Point start{0, 0};
    Point end{4, 4};

    // Chiudi la cella finale con muri intorno
    grid->set_cell(Point{3, 4}, CellType::Wall);
    grid->set_cell(Point{5, 4}, CellType::Wall);
    grid->set_cell(Point{4, 3}, CellType::Wall);
    grid->set_cell(Point{4, 5}, CellType::Wall);

    PathResult res_bfs = solve_bfs(*grid, start, end);
    EXPECT_FALSE(res_bfs.found);
    EXPECT_TRUE(res_bfs.path.empty());

    PathResult res_astar = solve_astar(*grid, start, end);
    EXPECT_FALSE(res_astar.found);
    EXPECT_TRUE(res_astar.path.empty());
}

TEST_F(PathfindingTest, DijkstraAndAStarEquivalence) {
    // Entrambi devono trovare lo stesso costo minimo
    grid->set_cell(Point{3, 0}, CellType::Wall);
    grid->set_cell(Point{3, 1}, CellType::Wall);
    grid->set_cell(Point{3, 2}, CellType::Wall);

    Point start{0, 0};
    Point end{6, 2};

    PathResult d_res = solve_dijkstra(*grid, start, end);
    PathResult a_res = solve_astar(*grid, start, end);

    EXPECT_TRUE(d_res.found);
    EXPECT_TRUE(a_res.found);
    EXPECT_DOUBLE_EQ(d_res.path_cost, a_res.path_cost);
    // A* deve tipicamente esplorare meno nodi o uguali a Dijkstra
    EXPECT_LE(a_res.nodes_explored, d_res.nodes_explored);
}

