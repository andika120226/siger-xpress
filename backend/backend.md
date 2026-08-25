# BACKEND SPECIFICATION & PRD — MARTA-EXPRESS AI

---

## 📌 Context & Role

The Backend service acts as a **lightweight, synchronous API Proxy / Bridge** between the Next.js Frontend and the Python FastAPI AI-Service.

**Flow:** Frontend → Backend (validate & forward) → AI-Service (compute) → Backend → Frontend

> Backend tidak melakukan komputasi AI apapun. Tugasnya hanya: validasi input, forward ke AI-Service, dan kembalikan hasilnya.

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 LTS |
| Framework | **Express.js** (TypeScript) |
| HTTP Client | Native `fetch` (Node 18+ built-in) |
| Validation | `zod` (runtime schema validation) |
| Containerization | Docker (Dockerfile) |

> **Keputusan:** Express.js dipilih terpisah dari Frontend (Next.js) untuk memenuhi aturan arsitektur modular COMPFEST — pemisahan terisolasi antara Frontend, Backend, dan AI-Service.

---

## ⚠️ Strictly MVP Rules (COMPFEST Requirement)

- **NO** background jobs / message queues (Celery, RabbitMQ, BullMQ).
- **NO** distributed database or complex caching layers.
- **NO** ORM / database — murni stateless proxy.
- **MUST** handle requests **synchronously**.
- **MUST** be runnable via Docker Compose (`docker-compose.yml`).

---

## ⚙️ Server Configuration

| Config | Value |
|--------|-------|
| Port | `5000` |
| Base Path | `/api/v1` |
| AI-Service URL | `http://ai-service:8000` (Docker internal) |
| CORS Origin | `http://localhost:3000` (Frontend) |
| Request Timeout | 30 seconds |

---

## 🛣 API Endpoints

### 1. `POST /api/v1/route/optimize` — Route Optimization Proxy

**Action:** Validate input → Forward payload to `http://ai-service:8000/optimize-route` → Return result.

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

**Success Response (200):** Forward AI-Service response directly.

**Error Responses:**

| Status | Condition |
|--------|-----------|
| `400` | Invalid input (missing fields, wrong types) |
| `502` | AI-Service unreachable / returned error |
| `500` | Unexpected internal error |

---

### 2. `POST /api/v1/warehouse/optimize` — Warehouse Optimization Proxy

**Action:** Validate input → Forward payload to `http://ai-service:8000/optimize-warehouse` → Return result.

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

**Success Response (200):** Forward AI-Service response directly.

**Error Responses:** Same as endpoint 1.

---

### 3. `POST /api/v1/vehicle/match` — Vehicle-Cargo Matching Proxy

**Action:** Validate input → Forward payload to `http://ai-service:8000/match-vehicle` → Return result.

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

**Success Response (200):** Forward AI-Service response directly.

**Error Responses:** Same as endpoint 1.

---

## 🏥 Health Check Endpoint

### `GET /api/v1/health`

**Response (200):**

```json
{
  "status": "healthy",
  "service": "marta-backend",
  "version": "1.0.0",
  "ai_service_status": "connected"
}
```

---

## 🚨 Error Response Format (Standard)

Semua error response menggunakan format konsisten:

```json
{
  "error": true,
  "status": 400,
  "message": "Validation failed: 'destinations' must contain at least 2 items.",
  "timestamp": "2026-08-10T12:00:00Z"
}
```

---

## 📁 Folder Structure (Target)

```
backend/
├── backend.md             # PRD & Specification (this file)
├── Dockerfile             # Container build config
├── package.json           # Node.js dependencies
├── tsconfig.json          # TypeScript config
├── src/
│   ├── index.ts           # Express app entry point
│   ├── routes/
│   │   ├── route.ts           # POST /api/v1/route/optimize
│   │   ├── warehouse.ts       # POST /api/v1/warehouse/optimize
│   │   ├── vehicle.ts         # POST /api/v1/vehicle/match
│   │   └── health.ts          # GET /api/v1/health
│   ├── middleware/
│   │   ├── errorHandler.ts    # Global error handler
│   │   └── validator.ts       # Zod validation middleware
│   ├── schemas/
│   │   ├── routeSchema.ts     # Zod schema for route input
│   │   ├── warehouseSchema.ts # Zod schema for warehouse input
│   │   └── vehicleSchema.ts   # Zod schema for vehicle input
│   └── utils/
│       └── aiServiceClient.ts # HTTP client to AI-Service
└── .env.example           # Environment variables template
```
