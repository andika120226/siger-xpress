"""
Pydantic schemas for the Warehouse Optimization endpoint.
Defines request/response models for POST /optimize-warehouse.
"""

from enum import Enum

from pydantic import BaseModel, Field, field_validator


class ItemSize(str, Enum):
    """Allowed cargo size categories."""

    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"


class WarehouseDimensions(BaseModel):
    """Physical dimensions of the warehouse in metres."""

    length_m: float = Field(..., gt=0, le=1000, description="Length in metres.")
    width_m: float = Field(..., gt=0, le=1000, description="Width in metres.")
    height_m: float = Field(..., gt=0, le=1000, description="Height in metres.")

    @property
    def total_volume_m3(self) -> float:
        return self.length_m * self.width_m * self.height_m


class CargoItem(BaseModel):
    """A single type of cargo item to be stored."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Item name.",
        examples=["Box A"],
    )
    qty: int = Field(
        ...,
        ge=1,
        le=10000,
        description="Number of units.",
        examples=[50],
    )
    size: ItemSize = Field(
        ...,
        description="Size category: small, medium, or large.",
        examples=["small"],
    )
    weight_kg: float = Field(
        ...,
        gt=0,
        le=50000,
        description="Weight per unit in kg.",
        examples=[5],
    )


class WarehouseOptimizeRequest(BaseModel):
    """Request body for POST /optimize-warehouse."""

    warehouse_dim: WarehouseDimensions
    items: list[CargoItem] = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Cargo items to allocate (1–50 items).",
    )

    @field_validator("items")
    @classmethod
    def validate_items_count(cls, v: list[CargoItem]) -> list[CargoItem]:
        if len(v) < 1:
            raise ValueError("Minimum 1 item required.")
        if len(v) > 50:
            raise ValueError("Maximum 50 items allowed.")
        return v


class RackAllocation(BaseModel):
    """A single rack assignment result."""

    item: str
    qty: int
    assigned_rack: str
    zone: str


class WarehouseOptimizeResponse(BaseModel):
    """Response body for POST /optimize-warehouse."""

    rack_allocation: list[RackAllocation]
    space_utilization_pct: float
    total_racks_used: int
    remaining_capacity_pct: float
    rack_grid: list[list[dict]]
