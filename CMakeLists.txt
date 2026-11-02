cmake_minimum_required(VERSION 3.20)
project(PathfindingVisualizer VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Export compile commands per clangd / IDE
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Warning flags per codice ad alta affidabilità
if(MSVC)
    add_compile_options(/W4 /permissive-)
else()
    add_compile_options(-Wall -Wextra -Wpedantic)
endif()

add_subdirectory(core)

