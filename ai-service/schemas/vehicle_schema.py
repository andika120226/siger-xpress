"""
Pydantic schemas for the Vehicle-Cargo Matching endpoint.
Defines request/response models for POST /match-vehicle.
"""

from enum import Enum

from pydantic import BaseModel, Field, field_validator


class VehicleType(str, Enum):
    """Allowed vehicle types."""

    REFRIGERATED = "refrigerated"
    BOX = "box"
    MOTORCYCLE = "motorcycle"
    PICKUP = "pickup"
    TRAILER = "trailer"


class CargoType(str, Enum):
    """Allowed cargo types."""

    FROZEN = "frozen"
    FRAGILE = "fragile"
    HAZARDOUS = "hazardous"
    STANDARD = "standard"
    PERISHABLE = "perishable"
    DRY_FOOD = "dry_food"


class Vehicle(BaseModel):
    """A single vehicle in the fleet."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Vehicle name.",
        examples=["Refrigerated Truck A"],
    )
    type: VehicleType = Field(
        ...,
        description="Vehicle type category.",
        examples=["refrigerated"],
    )
    max_weight_kg: float = Field(
        ...,
        gt=0,
        le=100000,
        description="Maximum weight capacity in kg.",
        examples=[5000],
    )


class Cargo(BaseModel):
    """A single cargo item to be matched with a vehicle."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Cargo name.",
        examples=["Frozen Food"],
    )
    type: CargoType = Field(
        ...,
        description="Cargo type category.",
        examples=["frozen"],
    )
    weight_kg: float = Field(
        ...,
        gt=0,
        le=100000,
        description="Total cargo weight in kg.",
        examples=[2000],
    )


class VehicleMatchRequest(BaseModel):
    """Request body for POST /match-vehicle."""

    vehicles: list[Vehicle] = Field(
        ...,
        min_length=1,
        max_length=20,
        description="Available fleet vehicles (1–20).",
    )
    cargo: list[Cargo] = Field(
        ...,
        min_length=1,
        max_length=30,
        description="Cargo items to match (1–30).",
    )

    @field_validator("vehicles")
    @classmethod
    def validate_vehicles(cls, v: list[Vehicle]) -> list[Vehicle]:
        if len(v) > 20:
            raise ValueError("Maximum 20 vehicles allowed.")
        return v

    @field_validator("cargo")
    @classmethod
    def validate_cargo(cls, v: list[Cargo]) -> list[Cargo]:
        if len(v) > 30:
            raise ValueError("Maximum 30 cargo items allowed.")
        return v


class MatchResult(BaseModel):
    """A single cargo-to-vehicle match result."""

    cargo: str
    assigned_vehicle: str
    status: str  # "Matched" or "Unmatched"
    match_score: float
    reason: str


class VehicleMatchResponse(BaseModel):
    """Response body for POST /match-vehicle."""

    matches: list[MatchResult]
    unmatched_cargo: list[str]
    fleet_utilization_pct: float
