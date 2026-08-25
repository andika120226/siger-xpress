"""
Router for the Warehouse Optimization endpoint.
POST /optimize-warehouse
"""

from fastapi import APIRouter, HTTPException

from schemas.warehouse_schema import (
    WarehouseOptimizeRequest,
    WarehouseOptimizeResponse,
    RackAllocation,
)
from services.bin_packing import allocate_warehouse

router = APIRouter(tags=["Warehouse Optimization"])


@router.post(
    "/optimize-warehouse",
    response_model=WarehouseOptimizeResponse,
    summary="Optimize warehouse rack allocation using AI (FFD bin packing)",
    description=(
        "Receives warehouse dimensions and a list of cargo items, then "
        "allocates items to racks using a First Fit Decreasing bin-packing "
        "algorithm with weight-based zone classification."
    ),
)
async def optimize_warehouse(
    payload: WarehouseOptimizeRequest,
) -> WarehouseOptimizeResponse:
    """
    Core warehouse optimization endpoint.

    Flow:
    1. Calculate total warehouse volume.
    2. Convert items to dicts for the allocator.
    3. Run FFD bin-packing algorithm.
    4. Return rack assignments + utilisation metrics.
    """

    # --- 1. Warehouse volume -------------------------------------------------
    total_volume = payload.warehouse_dim.total_volume_m3

    # --- 2. Prepare items ----------------------------------------------------
    items = [
        {
            "name": item.name,
            "qty": item.qty,
            "size": item.size.value,
            "weight_kg": item.weight_kg,
        }
        for item in payload.items
    ]

    # --- 3. Run allocator ----------------------------------------------------
    try:
        result = allocate_warehouse(total_volume, items)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Warehouse optimization failed: {exc}",
        ) from exc

    # --- 4. Build response ---------------------------------------------------
    rack_allocations = [
        RackAllocation(**alloc) for alloc in result.allocations
    ]

    return WarehouseOptimizeResponse(
        rack_allocation=rack_allocations,
        space_utilization_pct=result.space_utilization_pct,
        total_racks_used=result.total_racks_used,
        remaining_capacity_pct=result.remaining_capacity_pct,
        rack_grid=result.rack_grid,
    )
