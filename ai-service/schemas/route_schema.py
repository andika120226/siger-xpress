"""
Pydantic schemas for the Route Optimization endpoint.
Defines request/response models for POST /optimize-route.
"""

from pydantic import BaseModel, Field, field_validator


class Location(BaseModel):
    """A single geographic point with a human-readable name."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Human-readable location name.",
        examples=["Gudang Jakarta"],
    )
    lat: float = Field(
        ...,
        ge=-90,
        le=90,
        description="Latitude coordinate.",
        examples=[-6.2088],
    )
    lng: float = Field(
        ...,
        ge=-180,
        le=180,
        description="Longitude coordinate.",
        examples=[106.8456],
    )


class RouteOptimizeRequest(BaseModel):
    """Request body for POST /optimize-route."""

    origin: Location = Field(
        ...,
        description="Starting warehouse / origin location.",
    )
    destinations: list[Location] = Field(
        ...,
        min_length=2,
        max_length=20,
        description="List of destination locations (2–20 items).",
    )

    @field_validator("destinations")
    @classmethod
    def validate_destinations_count(cls, v: list[Location]) -> list[Location]:
        if len(v) < 2:
            raise ValueError("Minimum 2 destinations required.")
        if len(v) > 20:
            raise ValueError("Maximum 20 destinations allowed.")
        return v


class RouteStop(BaseModel):
    """A single stop in the optimized route sequence."""

    order: int
    name: str
    type: str  # "origin" or "destination"
    lat: float
    lng: float


class TrafficSegment(BaseModel):
    """Traffic condition between two stops."""

    start_idx: int
    end_idx: int
    start_name: str
    end_name: str
    status: str  # "clear", "warning", "congested"
    distance_km: float

class RouteOptimizeResponse(BaseModel):
    """Response body for POST /optimize-route."""

    optimal_sequence: list[RouteStop]
    traffic_segments: list[TrafficSegment]
    total_distance_km: float
    estimated_time_hours: float
    fuel_saved_liters: float
    fuel_saved_pct: float
