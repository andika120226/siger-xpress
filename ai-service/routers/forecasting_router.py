Router for the Demand Forecasting endpoint.
POST /predict-demand
"""

import math
import random
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException

from schemas.forecasting_schema import (
    DemandPredictRequest,
    DemandPredictResponse,
    ForecastPoint,
)

router = APIRouter(tags=["Demand Forecasting"])

def generate_trend(base_val: float, month_idx: int, seasonality: float) -> float:
    """Generates a mock volume trend with some seasonality and noise."""
    trend = base_val + (month_idx * 2) # Slight upward trend
    season_factor = math.sin(month_idx * seasonality) * (base_val * 0.3)
    noise = random.uniform(-base_val * 0.1, base_val * 0.1)
    return round(max(trend + season_factor + noise, 10.0), 2)