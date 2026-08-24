"""
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

@router.post(
    "/predict-demand",
    response_model=DemandPredictResponse,
    summary="Predict demand volume for Lampung commodities",
    description="Generates historical/predictive volume trend for logistics planning.",
)
async def predict_demand(payload: DemandPredictRequest) -> DemandPredictResponse:
    try:
        forecast_data: list[ForecastPoint] = []
        base_volume = random.uniform(50.0, 150.0)
        
        # Base multiplier based on commodity name
        comm_lower = payload.commodity.lower()
        if "kopi" in comm_lower:
            base_volume = 120.0
            seasonality = 0.8
        elif "pisang" in comm_lower:
            base_volume = 200.0
            seasonality = 0.5
        elif "lada" in comm_lower:
            base_volume = 80.0
            seasonality = 1.2
        else:
            seasonality = 0.6
            
        current_date = datetime.now()
        
        # Start from 3 months ago to show some historical context
        start_date = current_date - timedelta(days=90)
        
        total_vol = 0.0
        
        for i in range(payload.months):
            # Calculate month label
            target_date = start_date + timedelta(days=30 * i)
            month_label = target_date.strftime("%b %Y")
            
            vol = generate_trend(base_volume, i, seasonality)
            total_vol += vol
            
            # Simple anomaly/spike detection (> 1.2x base)
            is_spike = vol > (base_volume * 1.3)
            
            forecast_data.append(
                ForecastPoint(
                    month=month_label,
                    predicted_volume_tons=vol,
                    is_spike=is_spike
                )
            )
            
        avg_vol = round(total_vol / payload.months, 2)
        
        # Generate recommendations based on the data
        recommendations = []
        spikes = [dp for dp in forecast_data if dp.is_spike]
        
        if len(spikes) > 0:
            spike_months = ", ".join([s.month for s in spikes])
            recommendations.append(f"Waspada lonjakan volume pengiriman pada bulan: {spike_months}. Siapkan tambahan kapasitas truk sebesar 30%.")
            recommendations.append(f"Prioritaskan Hub Bakauheni untuk menampung distribusi {payload.commodity} selama masa panen.")
        else:
            recommendations.append(f"Tren volume distribusi {payload.commodity} terpantau stabil di kisaran {avg_vol} Ton/Bulan.")
            recommendations.append(f"Optimalkan utilisasi gudang reguler tanpa perlu penambahan armada darurat.")

        return DemandPredictResponse(
            commodity=payload.commodity,
            forecast_data=forecast_data,
            average_volume_tons=avg_vol,
            recommendations=recommendations
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Forecasting prediction failed: {exc}",
        ) from exc
