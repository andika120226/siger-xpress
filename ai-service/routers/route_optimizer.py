"""
Router for the Route Optimization endpoint.
POST /optimize-route
"""

from fastapi import APIRouter, HTTPException

from schemas.route_schema import (
    Location,
    RouteOptimizeRequest,
    RouteOptimizeResponse,
    RouteStop,
    TrafficSegment,
)
from services.tsp_solver import (
    AVG_SPEED_KMH,
    solve_tsp,
    naive_route_distance,
    estimate_fuel_saved,
    get_traffic_status,
    _haversine_km,
)

router = APIRouter(tags=["Route Optimization"])


@router.post(
    "/optimize-route",
    response_model=RouteOptimizeResponse,
    summary="Optimize delivery route using AI (TSP solver)",
    description=(
        "Receives an origin and list of destinations, then computes the most "
        "efficient delivery route using Google OR-Tools TSP solver with a "
        "Haversine-based local distance matrix."
    ),
)
async def optimize_route(payload: RouteOptimizeRequest) -> RouteOptimizeResponse:
    """
    Core route optimization endpoint.

    Flow:
    1. Build coordinate list (origin first, then destinations).
    2. Compute naive (input-order) distance for fuel-saving comparison.
    3. Run OR-Tools TSP solver.
    4. Calculate fuel savings vs naive route.
    5. Return ordered sequence + metrics.
    """

    # --- 1. Build coordinate list -------------------------------------------
    all_locations: list[Location] = [payload.origin] + list(payload.destinations)
    coords: list[tuple[float, float]] = [
        (loc.lat, loc.lng) for loc in all_locations
    ]
    names: list[str] = [loc.name for loc in all_locations]

    # --- 2. Naive distance (for fuel-saving comparison) ----------------------
    naive_km, naive_cost = naive_route_distance(coords, names)

    # --- 3. Solve TSP --------------------------------------------------------
    try:
        result = solve_tsp(coords, names)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Route optimization failed: {exc}",
        ) from exc

    # --- 4. Fuel savings -----------------------------------------------------
    fuel_saved_l, fuel_saved_pct = estimate_fuel_saved(result.total_cost_km, naive_cost)

    # --- 5. Build response ---------------------------------------------------
    optimal_sequence: list[RouteStop] = []
    for order_num, idx in enumerate(result.ordered_indices, start=1):
        loc = all_locations[idx]
        optimal_sequence.append(
            RouteStop(
                order=order_num,
                name=loc.name,
                type="origin" if idx == 0 else "destination",
                lat=loc.lat,
                lng=loc.lng,
            )
        )

    # --- 6. Build Traffic Segments & Topographical ETA -----------------------
    traffic_segments: list[TrafficSegment] = []
    n_stops = len(optimal_sequence)
    total_eta_hours = 0.0

    for i in range(n_stops):
        start_stop = optimal_sequence[i]
        end_stop = optimal_sequence[(i + 1) % n_stops]  # Closed loop back to origin
        
        dist = _haversine_km(start_stop.lat, start_stop.lng, end_stop.lat, end_stop.lng)
        status = get_traffic_status(start_stop.name, end_stop.name)
        
        traffic_segments.append(
            TrafficSegment(
                start_idx=i,
                end_idx=(i + 1) % n_stops,
                start_name=start_stop.name,
                end_name=end_stop.name,
                status=status,
                distance_km=round(dist, 2)
            )
        )

        # Topographical Penalty Logic
        s_name = start_stop.name.lower()
        e_name = end_stop.name.lower()
        
        # Default speed
        speed = AVG_SPEED_KMH
        
        # Pegunungan Liwa (berkelok dan lambat untuk truk berat)
        if "liwa" in s_name or "liwa" in e_name:
            speed = 20.0
        # Tol Trans Sumatera (datar dan cepat)
        elif ("tol" in s_name or "tol" in e_name) or ("bakauheni" in s_name and "bandar lampung" in e_name) or ("bandar lampung" in s_name and "bakauheni" in e_name):
            speed = 60.0
            
        # Traffic condition penalty
        if status == "congested":
            speed *= 0.5
        elif status == "warning":
            speed *= 0.75
            
        total_eta_hours += (dist / speed)

    estimated_hours = round(total_eta_hours, 2)

    return RouteOptimizeResponse(
        optimal_sequence=optimal_sequence,
        traffic_segments=traffic_segments,
        total_distance_km=result.total_distance_km,
        estimated_time_hours=estimated_hours,
        fuel_saved_liters=fuel_saved_l,
        fuel_saved_pct=fuel_saved_pct,
    )
