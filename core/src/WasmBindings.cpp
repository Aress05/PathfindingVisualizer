#ifdef __EMSCRIPTEN__

#include <emscripten/bind.h>
#include "Pathfinding.hpp"
#include "Grid.hpp"
#include "Types.hpp"

using namespace emscripten;
using namespace pathfinding;

EMSCRIPTEN_BINDINGS(pathfinding_module) {
    // Registrazione della struct Point
    value_object<Point>("Point")
        .field("x", &Point::x)
        .field("y", &Point::y);

    // Registrazione degli Enum
    enum_<CellType>("CellType")
        .value("Empty", CellType::Empty)
        .value("Wall", CellType::Wall)
        .value("Weight", CellType::Weight);

    enum_<HeuristicType>("HeuristicType")
        .value("Manhattan", HeuristicType::Manhattan)
        .value("Euclidean", HeuristicType::Euclidean)
        .value("Chebyshev", HeuristicType::Chebyshev);

    // Registrazione dei vettori usati nei ritorni
    register_vector<Point>("VectorPoint");

    // Registrazione di PathResult
    value_object<PathResult>("PathResult")
        .field("found", &PathResult::found)
        .field("visited_order", &PathResult::visited_order)
        .field("frontier_order", &PathResult::frontier_order)
        .field("path", &PathResult::path)
        .field("nodes_explored", &PathResult::nodes_explored)
        .field("execution_time_us", &PathResult::execution_time_us)
        .field("path_cost", &PathResult::path_cost);

    // Registrazione della classe Grid
    class_<Grid>("Grid")
        .constructor<int, int>()
        .function("getWidth", &Grid::get_width)
        .function("getHeight", &Grid::get_height)
        .function("size", &Grid::size)
        .function("isValid", &Grid::is_valid)
        .function("isWalkable", &Grid::is_walkable)
        .function("setCell", &Grid::set_cell)
        .function("getCell", &Grid::get_cell)
        .function("getWeight", &Grid::get_weight)
        .function("toIndex", &Grid::to_index)
        .function("toPoint", &Grid::to_point)
        .function("clear", &Grid::clear)
        .function("clearWalls", &Grid::clear_walls);

    // Registrazione funzioni di ricerca con diagonale
    function("solveBFS", &solve_bfs);
    function("solveDFS", &solve_dfs);
    function("solveDijkstra", &solve_dijkstra);
    function("solveAStar", &solve_astar);
    function("solveGreedyBFS", &solve_greedy_bfs);
    function("solveBidirectionalBFS", &solve_bidirectional_bfs);
}

#endif
