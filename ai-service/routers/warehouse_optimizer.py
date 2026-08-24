outer for the Warehouse Optimization endpoint.
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
