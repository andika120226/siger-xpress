"""
TSP Solver using Google OR-Tools.
=================================
Solves the Traveling Salesperson Problem (TSP) for logistics route optimization.

Algorithm:
- Distance matrix computed locally via Haversine formula (no external API).
- OR-Tools RoutingModel with PATH_CHEAPEST_ARC first-solution strategy.
- GUIDED_LOCAL_SEARCH metaheuristic for refinement.
- Static time limit: 5 seconds.

Fuel estimation:
- Average truck consumption: 4 km/L (Indonesian logistics average).
- Average truck speed: 40 km/h (mixed urban + highway).
"""

import math
from dataclasses import dataclass

from ortools.constraint_solver import pywrapcp, routing_enums_pb2

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
EARTH_RADIUS_KM = 6_371.0
AVG_SPEED_KMH = 40.0       # Average truck speed (mixed road conditions)
AVG_FUEL_KM_PER_L = 4.0    # Average fuel consumption: 1 liter per 4 km
SOLVER_TIME_LIMIT_S = 5     # OR-Tools solver time limit in seconds


@dataclass
class SolverResult:
    """Result returned by the TSP solver."""

    ordered_indices: list[int]   # Indices into the original location list (0 = origin)
    total_distance_km: float
    total_cost_km: float



# ---------------------------------------------------------------------------
# Haversine distance (local computation — no external API)
# ---------------------------------------------------------------------------

def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Calculate the great-circle distance between two points on Earth
    using the Haversine formula.  Returns distance in kilometres.
    """
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lng / 2) ** 2
    )
    return EARTH_RADIUS_KM * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def build_distance_matrix(
    coords: list[tuple[float, float]],
    names: list[str],
) -> list[list[int]]:
    """
    Build a symmetric distance matrix from a list of (lat, lng) tuples,
    applying a penalty multiplier for traffic conditions.
    """
    n = len(coords)
    matrix: list[list[int]] = []
    for i in range(n):
        row: list[int] = []
        for j in range(n):
            if i == j:
                row.append(0)
            else:
                km = _haversine_km(coords[i][0], coords[i][1], coords[j][0], coords[j][1])
                status = get_traffic_status(names[i], names[j])
                
                penalty = 1.0
                if status == "congested":
                    penalty = 2.0  # 2.0x distance penalty
                elif status == "warning":
                    penalty = 1.3  # 1.3x distance penalty
                    
                row.append(int((km * penalty) * 1_000))
        matrix.append(row)
    return matrix


# ---------------------------------------------------------------------------
# OR-Tools TSP Solver
# ---------------------------------------------------------------------------

def solve_tsp(coords: list[tuple[float, float]], names: list[str]) -> SolverResult:
    """
    Solve the Travelling Salesperson Problem for the given coordinates and traffic conditions.

    Parameters
    ----------
    coords : list of (lat, lng) tuples.
             Index 0 is always the origin/depot.
    names : list of location names corresponding to coords.

    Returns
    -------
    SolverResult with the optimal visit order and total distance.
    """
    n = len(coords)

    # Edge case: only origin + 1 destination → trivial route
    if n <= 2:
        total_km = _haversine_km(*coords[0], *coords[1]) if n == 2 else 0.0
        return SolverResult(
            ordered_indices=list(range(n)),
            total_distance_km=round(total_km, 2),
        )

    distance_matrix = build_distance_matrix(coords, names)

    # OR-Tools routing setup
    manager = pywrapcp.RoutingIndexManager(n, 1, 0)  # 1 vehicle, depot=0
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index: int, to_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    # Search parameters
    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_params.time_limit.seconds = SOLVER_TIME_LIMIT_S

    # Solve
    solution = routing.SolveWithParameters(search_params)

    if solution is None:
        # Fallback: return original order if solver fails
        total_km = 0.0
        total_cost = 0.0
        for i in range(n - 1):
            total_km += _haversine_km(*coords[i], *coords[i + 1])
            total_cost += distance_matrix[i][i+1] / 1000.0
        if n > 1:
            total_km += _haversine_km(*coords[n-1], *coords[0])
            total_cost += distance_matrix[n-1][0] / 1000.0
            
        return SolverResult(
            ordered_indices=list(range(n)),
            total_distance_km=round(total_km, 2),
            total_cost_km=round(total_cost, 2),
        )

    # Extract ordered route from solution
    ordered: list[int] = []
    index = routing.Start(0)
    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        ordered.append(node)
        index = solution.Value(routing.NextVar(index))
        
    # Calculate actual physical distance (without traffic penalties)
    actual_total_km = 0.0
    actual_total_cost = 0.0
    
    for i in range(len(ordered) - 1):
        actual_total_km += _haversine_km(*coords[ordered[i]], *coords[ordered[i + 1]])
        actual_total_cost += distance_matrix[ordered[i]][ordered[i + 1]] / 1000.0
    
    # Add return to origin
    if len(ordered) > 1:
        actual_total_km += _haversine_km(*coords[ordered[-1]], *coords[ordered[0]])
        actual_total_cost += distance_matrix[ordered[-1]][ordered[0]] / 1000.0

    return SolverResult(
        ordered_indices=ordered,
        total_distance_km=round(actual_total_km, 2),
        total_cost_km=round(actual_total_cost, 2),
    )


import random
import hashlib

def get_traffic_status(start_name: str, end_name: str) -> str:
    """Deterministic traffic status based on segment names for simulation."""
    s = start_name.lower()
    e = end_name.lower()
    
    # Macet (Congested / Red) – koridor padat truk
    if ("bandar lampung" in s and "bakauheni" in e) or ("bakauheni" in s and "bandar lampung" in e):
        return "congested"
    if ("kotabumi" in s and "kopi liwa" in e) or ("kopi liwa" in s and "kotabumi" in e):
        return "congested"
        
    # Renovasi (Warning / Yellow) - Skenario 3 demonstration
    if ("metro" in s and "kotabumi" in e) or ("kotabumi" in s and "metro" in e):
        return "warning"
        
    # Default Clear (Green) – semua jalur lainnya lancar
    return "clear"

# ---------------------------------------------------------------------------
# Fuel estimation helpers
# ---------------------------------------------------------------------------

def estimate_fuel_saved(optimized_km: float, naive_km: float) -> tuple[float, float]:
    """
    Compare optimized route distance with naive (input-order) distance.

    Returns
    -------
    (fuel_saved_liters, fuel_saved_pct)
    """
    if naive_km <= 0:
        return 0.0, 0.0

    saved_km = naive_km - optimized_km
    saved_liters = saved_km / AVG_FUEL_KM_PER_L
    saved_pct = (saved_km / naive_km) * 100

    return round(max(saved_liters, 0.0), 2), round(max(saved_pct, 0.0), 2)


def naive_route_distance(coords: list[tuple[float, float]], names: list[str]) -> tuple[float, float]:
    """Total distance and total cost if destinations are visited in the original input order."""
    total_km = 0.0
    total_cost = 0.0
    n = len(coords)
    
    distance_matrix = build_distance_matrix(coords, names)
    
    for i in range(n - 1):
        total_km += _haversine_km(*coords[i], *coords[i + 1])
        total_cost += distance_matrix[i][i+1] / 1000.0
    
    # Add return to origin to match OR-Tools closed loop
    if n > 1:
        total_km += _haversine_km(*coords[-1], *coords[0])
        total_cost += distance_matrix[n-1][0] / 1000.0
        
    return round(total_km, 2), round(total_cost, 2)
