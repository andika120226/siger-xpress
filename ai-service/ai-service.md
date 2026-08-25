# AI-SERVICE SPECIFICATION & PRD — MARTA-ROUTE AI

---

## 📌 Context & Core Inference Role

This service handles **pure mathematical optimization and AI inference**. It receives static input payloads from the Backend and returns optimal logistics solutions **synchronously**.

> Tidak ada state, tidak ada database, tidak ada background job. Murni compute & return.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Python 3.10+ |
| Framework | FastAPI + Uvicorn |
| Data Validation | Pydantic v2 schemas |
| Route Optimization | `ortools` (Google OR-Tools — VRP/TSP solver) |
| Math & Matrix | `numpy`, `scipy` |
| Containerization | Docker (Dockerfile) |

---

## ⚠️ Strictly MVP Rules (COMPFEST Requirement)

- Core inference **MUST** be static during demonstration (parameter tetap, tidak berubah saat demo).
- **NO** auto-tuning loops, **NO** live web scraping, **NO** bulk background testing scripts.
- Pure REST API returning JSON responses.
- Containerized via `Dockerfile` for Docker Compose execution.
- **NO** database — semua perhitungan stateless.

---

## ⚙️ Service Endpoints & Core Logic

**Base URL:** `http://ai-service:8000` (Docker internal network)

---

### 1. `POST /optimize-route` — Route Optimization (TSP/VRP Solver)

**Purpose:** Menghitung urutan rute pengiriman paling efisien dari satu origin ke banyak destinasi.

**Algorithm Detail:**
- Menggunakan Google OR-Tools `RoutingModel` dengan `RoutingIndexManager`
- Distance matrix dihitung menggunakan **Haversine formula** (jarak koordinat GPS)
- Solver strategy: `PATH_CHEAPEST_ARC` (first solution) + `GUIDED_LOCAL_SEARCH` (metaheuristic)
- Time limit solver: 5 detik (parameter statis)

**Request Body:**

```json
{
  "origin": {
    "name": "Gudang Jakarta",
    "lat": -6.2088,
    "lng": 106.8456
  },
  "destinations": [
    { "name": "Toko Bogor", "lat": -6.5971, "lng": 106.8060 },
    { "name": "Toko Bandung", "lat": -6.9175, "lng": 107.6191 },
    { "name": "Toko Depok", "lat": -6.4025, "lng": 106.7942 }
  ]
}
```

**Input Validation:**
- `destinations`: Minimum 2, maksimum 20 titik.
- `lat`: Range -90 s/d 90. `lng`: Range -180 s/d 180.
- `name`: String, tidak boleh kosong, max 100 karakter.

**Success Response (200):**

```json
{
  "optimal_sequence": [
    { "order": 1, "name": "Gudang Jakarta", "type": "origin" },
    { "order": 2, "name": "Toko Depok", "type": "destination" },
    { "order": 3, "name": "Toko Bogor", "type": "destination" },
    { "order": 4, "name": "Toko Bandung", "type": "destination" }
  ],
  "total_distance_km": 175.5,
  "estimated_time_hours": 3.2,
  "fuel_saved_liters": 14.2,
  "fuel_saved_pct": 18.3
}
```

**Error Response (422):**

```json
{
  "detail": "Minimum 2 destinations required."
}
```

---

### 2. `POST /optimize-warehouse` — Warehouse Space Optimization

**Purpose:** Mengalokasikan item kargo ke rak gudang secara optimal berdasarkan dimensi gudang dan karakteristik item.

**Algorithm Detail:**
- **First Fit Decreasing (FFD)** bin packing algorithm
- Item diurutkan dari volume terbesar ke terkecil, lalu dialokasikan ke rak yang tersedia
- Kalkulasi utilisasi ruang: `(total_volume_items / total_volume_gudang) × 100%`
- Rak dibagi menjadi blok-blok berdasarkan dimensi gudang

**Request Body:**

```json
{
  "warehouse_dim": {
    "length_m": 10,
    "width_m": 10,
    "height_m": 5
  },
  "items": [
    { "name": "Box A", "qty": 50, "size": "small", "weight_kg": 5 },
    { "name": "Box B", "qty": 30, "size": "medium", "weight_kg": 15 },
    { "name": "Pallet C", "qty": 10, "size": "large", "weight_kg": 50 }
  ]
}
```

**Input Validation:**
- `warehouse_dim`: Semua dimensi > 0, max 1000 meter.
- `items`: Minimum 1 item, maksimum 50 item.
- `size`: Enum — `"small"`, `"medium"`, `"large"`.
- `qty`: Minimum 1, maksimum 10000.

**Success Response (200):**

```json
{
  "rack_allocation": [
    { "item": "Pallet C", "qty": 10, "assigned_rack": "Rack-1 (Blok A)", "zone": "Heavy Load" },
    { "item": "Box B", "qty": 30, "assigned_rack": "Rack-2 (Blok B)", "zone": "Medium Load" },
    { "item": "Box A", "qty": 50, "assigned_rack": "Rack-3 (Blok C)", "zone": "Light Load" }
  ],
  "space_utilization_pct": 87.5,
  "total_racks_used": 3,
  "remaining_capacity_pct": 12.5
}
```

---

### 3. `POST /match-vehicle` — Vehicle-Cargo Matching

**Purpose:** Mencocokkan jenis kargo dengan armada kendaraan yang paling sesuai berdasarkan constraint (suhu, berat, tipe).

**Algorithm Detail:**
- **Constraint satisfaction** matching dengan priority scoring
- Constraints yang dievaluasi:
  1. **Temperature compatibility** — Frozen food → Refrigerated truck (WAJIB)
  2. **Weight capacity** — Total berat kargo ≤ kapasitas kendaraan
  3. **Cargo type compatibility** — Dokumen → Kurir motor, barang besar → Box truck
- Scoring: Match terbaik = skor tertinggi berdasarkan weighted constraints

**Request Body:**

```json
{
  "vehicles": [
    { "name": "Refrigerated Truck A", "type": "refrigerated", "max_weight_kg": 5000 },
    { "name": "Box Truck B", "type": "box", "max_weight_kg": 3000 },
    { "name": "Courier Motor C", "type": "motorcycle", "max_weight_kg": 50 }
  ],
  "cargo": [
    { "name": "Frozen Food", "type": "frozen", "weight_kg": 2000 },
    { "name": "Electronics", "type": "fragile", "weight_kg": 500 },
    { "name": "Documents", "type": "standard", "weight_kg": 10 }
  ]
}
```

**Input Validation:**
- `vehicles`: Minimum 1, maksimum 20.
- `cargo`: Minimum 1, maksimum 30.
- `type` (vehicle): Enum — `"refrigerated"`, `"box"`, `"motorcycle"`, `"pickup"`, `"trailer"`.
- `type` (cargo): Enum — `"frozen"`, `"fragile"`, `"hazardous"`, `"standard"`, `"perishable"`.

**Success Response (200):**

```json
{
  "matches": [
    {
      "cargo": "Frozen Food",
      "assigned_vehicle": "Refrigerated Truck A",
      "status": "Matched",
      "match_score": 0.95,
      "reason": "Temperature-controlled vehicle required for frozen cargo"
    },
    {
      "cargo": "Electronics",
      "assigned_vehicle": "Box Truck B",
      "status": "Matched",
      "match_score": 0.88,
      "reason": "Enclosed vehicle suitable for fragile items"
    },
    {
      "cargo": "Documents",
      "assigned_vehicle": "Courier Motor C",
      "status": "Matched",
      "match_score": 0.92,
      "reason": "Lightweight cargo ideal for motorcycle delivery"
    }
  ],
  "unmatched_cargo": [],
  "fleet_utilization_pct": 100.0
}
```

---

## 🏥 Health Check Endpoint

### `GET /health`

**Response (200):**

```json
{
  "status": "healthy",
  "service": "marta-ai-service",
  "version": "1.0.0"
}
```

---

## 📁 Folder Structure (Target)

```
ai-service/
├── ai-service.md          # PRD & Specification (this file)
├── Dockerfile             # Container build config
├── requirements.txt       # Python dependencies
├── main.py                # FastAPI app entry point
├── routers/
│   ├── route_optimizer.py     # POST /optimize-route
│   ├── warehouse_optimizer.py # POST /optimize-warehouse
│   └── vehicle_matcher.py     # POST /match-vehicle
├── services/
│   ├── tsp_solver.py          # OR-Tools TSP/VRP logic
│   ├── bin_packing.py         # FFD warehouse allocation
│   └── constraint_matcher.py  # Vehicle-cargo matching
└── schemas/
    ├── route_schema.py
    ├── warehouse_schema.py
    └── vehicle_schema.py
```
