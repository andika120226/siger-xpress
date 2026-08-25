"""
MARTA-EXPRESS AI Service
========================
FastAPI entry point for Smart Logistics AI inference.
Handles: Route Optimization, Warehouse Optimization, Vehicle-Cargo Matching.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import route_optimizer, warehouse_optimizer, vehicle_matcher, forecasting_router

app = FastAPI(
    title="MARTA AI-Service",
    description="Smart Logistics AI inference service for route optimization, warehouse management, and vehicle-cargo matching.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# CORS — allow Frontend (port 3000) and Backend (port 5000)
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5000",
        "http://frontend:3000",
        "http://backend:5000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(route_optimizer.router)
app.include_router(warehouse_optimizer.router)
app.include_router(vehicle_matcher.router)
app.include_router(forecasting_router.router)


# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "marta-ai-service",
        "version": "1.0.0",
    }


# ---------------------------------------------------------------------------
# Run directly: python main.py
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
