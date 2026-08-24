"""
Smoke test for all 3 AI-Service endpoints.
===========================================
Usage:  python test_smoke.py
Requires the server to be running on http://localhost:8000
"""

import json
import urllib.request
import sys

BASE_URL = "http://localhost:8000"


def post_json(path: str, payload: dict) -> dict:
    """Send a POST request with JSON body and return parsed response."""
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def get_json(path: str) -> dict:
    """Send a GET request and return parsed response."""
    req = urllib.request.Request(f"{BASE_URL}{path}")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def pp(data: dict) -> None:
    """Pretty-print JSON."""
    print(json.dumps(data, indent=2, ensure_ascii=False))


# ═══════════════════════════════════════════════════════════════════════════
# TEST 0: Health Check
# ═══════════════════════════════════════════════════════════════════════════
def test_health():
    print("=" * 60)
    print("TEST 0: GET /health")
    print("=" * 60)
    result = get_json("/health")
    pp(result)
    assert result["status"] == "healthy", "Health check failed!"
    print("✅ PASSED\n")


# ═══════════════════════════════════════════════════════════════════════════
# TEST 1: Route Optimization
# ═══════════════════════════════════════════════════════════════════════════
def test_route_optimization():
    print("=" * 60)
    print("TEST 1: POST /optimize-route")
    print("=" * 60)
    payload = {
        "origin": {
            "name": "Gudang Jakarta",
            "lat": -6.2088,
            "lng": 106.8456,
        },
        "destinations": [
            {"name": "Toko Bogor", "lat": -6.5971, "lng": 106.8060},
            {"name": "Toko Bandung", "lat": -6.9175, "lng": 107.6191},
            {"name": "Toko Depok", "lat": -6.4025, "lng": 106.7942},
            {"name": "Toko Bekasi", "lat": -6.2383, "lng": 106.9756},
        ],
    }
    result = post_json("/optimize-route", payload)
    pp(result)

    assert len(result["optimal_sequence"]) == 5, "Should have 5 stops"
    assert result["optimal_sequence"][0]["type"] == "origin", "First stop must be origin"
    assert result["total_distance_km"] > 0, "Distance must be positive"
    assert result["fuel_saved_pct"] >= 0, "Fuel saved must be non-negative"
    print("✅ PASSED\n")


# ═══════════════════════════════════════════════════════════════════════════
# TEST 2: Warehouse Optimization
# ═══════════════════════════════════════════════════════════════════════════
def test_warehouse_optimization():
    print("=" * 60)
    print("TEST 2: POST /optimize-warehouse")
    print("=" * 60)
    payload = {
        "warehouse_dim": {
            "length_m": 20,
            "width_m": 15,
            "height_m": 6,
        },
        "items": [
            {"name": "Karton Elektronik", "qty": 100, "size": "medium", "weight_kg": 12},
            {"name": "Pallet Beras", "qty": 20, "size": "large", "weight_kg": 50},
            {"name": "Box Obat", "qty": 200, "size": "small", "weight_kg": 2},
            {"name": "Drum Minyak", "qty": 15, "size": "large", "weight_kg": 80},
            {"name": "Paket Dokumen", "qty": 500, "size": "small", "weight_kg": 0.5},
        ],
    }
    result = post_json("/optimize-warehouse", payload)
    pp(result)

    assert len(result["rack_allocation"]) >= 1, "Should have at least 1 rack"
    assert 0 <= result["space_utilization_pct"] <= 100, "Utilization must be 0-100%"
    assert result["total_racks_used"] >= 1, "Must use at least 1 rack"
    assert result["remaining_capacity_pct"] >= 0, "Remaining must be non-negative"
    print("✅ PASSED\n")


# ═══════════════════════════════════════════════════════════════════════════
# TEST 3: Vehicle-Cargo Matching
# ═══════════════════════════════════════════════════════════════════════════
def test_vehicle_matching():
    print("=" * 60)
    print("TEST 3: POST /match-vehicle")
    print("=" * 60)
    payload = {
        "vehicles": [
            {"name": "Truk Pendingin Alpha", "type": "refrigerated", "max_weight_kg": 5000},
            {"name": "Box Truck Beta", "type": "box", "max_weight_kg": 3000},
            {"name": "Motor Kurir Gamma", "type": "motorcycle", "max_weight_kg": 50},
            {"name": "Pickup Delta", "type": "pickup", "max_weight_kg": 1500},
            {"name": "Trailer Epsilon", "type": "trailer", "max_weight_kg": 10000},
        ],
        "cargo": [
            {"name": "Ikan Beku Surabaya", "type": "frozen", "weight_kg": 2000},
            {"name": "TV LED 55 inch", "type": "fragile", "weight_kg": 800},
            {"name": "Surat Kontrak Legal", "type": "standard", "weight_kg": 5},
            {"name": "Bahan Kimia Industri", "type": "hazardous", "weight_kg": 1500},
            {"name": "Buah Segar Malang", "type": "perishable", "weight_kg": 500},
        ],
    }
    result = post_json("/match-vehicle", payload)
    pp(result)

    assert len(result["matches"]) == 5, "Should have 5 match results"
    # Frozen cargo MUST be in refrigerated truck
    frozen_match = next(m for m in result["matches"] if m["cargo"] == "Ikan Beku Surabaya")
    assert frozen_match["status"] == "Matched", "Frozen cargo must be matched"
    assert frozen_match["match_score"] > 0, "Score must be positive"
    assert result["fleet_utilization_pct"] > 0, "Fleet must be partially used"
    print("✅ PASSED\n")


# ═══════════════════════════════════════════════════════════════════════════
# Run all tests
# ═══════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print("\n🚀 MARTA AI-SERVICE — Smoke Test Suite\n")
    tests = [test_health, test_route_optimization, test_warehouse_optimization, test_vehicle_matching]
    passed = 0
    failed = 0

    for test_fn in tests:
        try:
            test_fn()
            passed += 1
        except Exception as e:
            print(f"❌ FAILED: {e}\n")
            failed += 1

    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed, {len(tests)} total")
    print("=" * 60)

    if failed > 0:
        sys.exit(1)
