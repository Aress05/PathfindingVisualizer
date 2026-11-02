add_library(pathfinding_core STATIC
    src/Grid.cpp
    src/PathfindingUtils.cpp
    src/BFS.cpp
    src/DFS.cpp
    src/Dijkstra.cpp
    src/AStar.cpp
)

target_include_directories(pathfinding_core PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_compile_features(pathfinding_core PUBLIC cxx_std_20)

# Target per l'eseguibile di benchmark e test CLI rapido
add_executable(cli_benchmark tests/cli_benchmark.cpp)
target_link_libraries(cli_benchmark PRIVATE pathfinding_core)
target_compile_features(cli_benchmark PRIVATE cxx_std_20)

# Opzione per la suite di test GoogleTest
option(BUILD_GTEST "Compila i test con GoogleTest" OFF)

if(BUILD_GTEST)
    include(FetchContent)
    FetchContent_Declare(
      googletest
      GIT_REPOSITORY https://github.com/google/googletest.git
      GIT_TAG v1.14.0
    )
    set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)
    FetchContent_MakeAvailable(googletest)

    enable_testing()
    add_executable(unit_tests tests/test_gtest.cpp)
    target_link_libraries(unit_tests PRIVATE pathfinding_core GTest::gtest_main)
    target_compile_features(unit_tests PRIVATE cxx_std_20)
    include(GoogleTest)
    gtest_discover_tests(unit_tests)
endif()

