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