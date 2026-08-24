"""
Pydantic schemas for the AI Demand Forecasting endpoint.
Defines request/response models for POST /predict-demand.
"""

from pydantic import BaseModel, Field


class DemandPredictRequest(BaseModel):
    """Request body for POST /predict-demand."""
    commodity: str = Field(..., description="Name of the commodity (e.g., Kopi Liwa, Pisang, Lada)")
    months: int = Field(6, ge=3, le=24, description="Number of months to forecast")


class ForecastPoint(BaseModel):
    """A single data point in the forecast."""
    month: str
    predicted_volume_tons: float
    is_spike: bool


class DemandPredictResponse(BaseModel):
    """Response body for POST /predict-demand."""
    commodity: str
    forecast_data: list[ForecastPoint]
    average_volume_tons: float
    recommendations: list[str]
