"""
Router for the Vehicle-Cargo Matching endpoint.
POST /match-vehicle
"""

from fastapi import APIRouter, HTTPException

from schemas.vehicle_schema import (
    VehicleMatchRequest,
    VehicleMatchResponse,
    MatchResult,
)
from services.constraint_matcher import match_vehicles_cargo

router = APIRouter(tags=["Vehicle-Cargo Matching"])


@router.post(
    "/match-vehicle",
    response_model=VehicleMatchResponse,
    summary="Match cargo to vehicles using AI (constraint satisfaction)",
    description=(
        "Receives a list of available vehicles and cargo items, then "
        "matches each cargo to the most suitable vehicle using weighted "
        "constraint satisfaction scoring (temperature, weight, type)."
    ),
)
async def match_vehicle(payload: VehicleMatchRequest) -> VehicleMatchResponse:
    """
    Core vehicle-cargo matching endpoint.

    Flow:
    1. Convert vehicles and cargo to dicts.
    2. Run constraint matching algorithm.
    3. Return match results + fleet utilisation.
    """

    # --- 1. Prepare data -----------------------------------------------------
    vehicles = [
        {
            "name": v.name,
            "type": v.type.value,
            "max_weight_kg": v.max_weight_kg,
        }
        for v in payload.vehicles
    ]

    cargo_items = [
        {
            "name": c.name,
            "type": c.type.value,
            "weight_kg": c.weight_kg,
        }
        for c in payload.cargo
    ]

    # --- 2. Run matcher ------------------------------------------------------
    try:
        result = match_vehicles_cargo(vehicles, cargo_items)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Vehicle matching failed: {exc}",
        ) from exc

    # --- 3. Build response ---------------------------------------------------
    matches = [MatchResult(**m) for m in result.matches]

    return VehicleMatchResponse(
        matches=matches,
        unmatched_cargo=result.unmatched_cargo,
        fleet_utilization_pct=result.fleet_utilization_pct,
    )
