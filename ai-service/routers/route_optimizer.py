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
