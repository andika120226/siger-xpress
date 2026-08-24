/**
 * Smoke Test for MARTA Backend API Proxy
 * =======================================
 * Tests all backend endpoints by sending requests through the proxy
 * and verifying they reach AI-Service and return correct responses.
 *
 * Prerequisites:
 *   - AI-Service running on http://localhost:8000
 *   - Backend running on http://localhost:5000
 *
 * Usage:  npx tsx test_smoke.ts
 */

const BASE_URL = "http://localhost:5000/api/v1";

async function postJson(path: string, body: unknown): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

async function getJson(path: string): Promise<any> {
  const res = await fetch(`${BASE_URL}${path}`);
  return { status: res.status, data: await res.json() };
}

function pp(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

// ============================================================
// TEST 0: Health Check
// ============================================================
async function testHealth(): Promise<void> {
  console.log("=".repeat(60));
  console.log("TEST 0: GET /api/v1/health");
  console.log("=".repeat(60));

  const { status, data } = await getJson("/health");
  pp(data);

  console.assert(status === 200, `Expected 200, got ${status}`);
  console.assert(data.status === "healthy", "Backend should be healthy");
  console.assert(
    data.ai_service_status === "connected",
    "AI-Service should be connected"
  );
  console.log("[PASSED]\n");
}

// ============================================================
// TEST 1: Route Optimization Proxy
// ============================================================
async function testRouteOptimize(): Promise<void> {
  console.log("=".repeat(60));
  console.log("TEST 1: POST /api/v1/route/optimize");
  console.log("=".repeat(60));

  const { status, data } = await postJson("/route/optimize", {
    origin: { name: "Gudang Jakarta", lat: -6.2088, lng: 106.8456 },
    destinations: [
      { name: "Toko Bogor", lat: -6.5971, lng: 106.806 },
      { name: "Toko Bandung", lat: -6.9175, lng: 107.6191 },
      { name: "Toko Depok", lat: -6.4025, lng: 106.7942 },
    ],
  });
  pp(data);

  console.assert(status === 200, `Expected 200, got ${status}`);
  console.assert(
    Array.isArray(data.optimal_sequence),
    "Should have optimal_sequence array"
  );
  console.assert(
    data.optimal_sequence.length === 4,
    "Should have 4 stops (1 origin + 3 dest)"
  );
  console.assert(data.total_distance_km > 0, "Distance must be positive");
  console.log("[PASSED]\n");
}

// ============================================================
// TEST 2: Warehouse Optimization Proxy
// ============================================================
async function testWarehouseOptimize(): Promise<void> {
  console.log("=".repeat(60));
  console.log("TEST 2: POST /api/v1/warehouse/optimize");
  console.log("=".repeat(60));

  const { status, data } = await postJson("/warehouse/optimize", {
    warehouse_dim: { length_m: 20, width_m: 15, height_m: 6 },
    items: [
      { name: "Karton Elektronik", qty: 100, size: "medium", weight_kg: 12 },
      { name: "Pallet Beras", qty: 20, size: "large", weight_kg: 50 },
      { name: "Box Obat", qty: 200, size: "small", weight_kg: 2 },
    ],
  });
  pp(data);

  console.assert(status === 200, `Expected 200, got ${status}`);
  console.assert(
    Array.isArray(data.rack_allocation),
    "Should have rack_allocation array"
  );
  console.assert(
    data.space_utilization_pct >= 0 && data.space_utilization_pct <= 100,
    "Utilization must be 0-100%"
  );
  console.assert(data.total_racks_used >= 1, "Must use at least 1 rack");
  console.log("[PASSED]\n");
}

// ============================================================
// TEST 3: Vehicle-Cargo Matching Proxy
// ============================================================
async function testVehicleMatch(): Promise<void> {
  console.log("=".repeat(60));
  console.log("TEST 3: POST /api/v1/vehicle/match");
  console.log("=".repeat(60));

  const { status, data } = await postJson("/vehicle/match", {
    vehicles: [
      {
        name: "Truk Pendingin Alpha",
        type: "refrigerated",
        max_weight_kg: 5000,
      },
      { name: "Box Truck Beta", type: "box", max_weight_kg: 3000 },
      { name: "Motor Kurir Gamma", type: "motorcycle", max_weight_kg: 50 },
    ],
    cargo: [
      { name: "Ikan Beku", type: "frozen", weight_kg: 2000 },
      { name: "TV LED", type: "fragile", weight_kg: 500 },
      { name: "Dokumen", type: "standard", weight_kg: 5 },
    ],
  });
  pp(data);

  console.assert(status === 200, `Expected 200, got ${status}`);
  console.assert(Array.isArray(data.matches), "Should have matches array");
  console.assert(data.matches.length === 3, "Should have 3 match results");

  const frozenMatch = data.matches.find(
    (m: any) => m.cargo === "Ikan Beku"
  );
  console.assert(
    frozenMatch?.status === "Matched",
    "Frozen cargo must be matched"
  );
  console.assert(
    frozenMatch?.assigned_vehicle === "Truk Pendingin Alpha",
    "Frozen must go to refrigerated truck"
  );
  console.log("[PASSED]\n");
}

// ============================================================
// Run all tests
// ============================================================
async function main(): Promise<void> {
  console.log("\nMARTA BACKEND -- Smoke Test Suite\n");

  const tests = [
    testHealth,
    testRouteOptimize,
    testWarehouseOptimize,
    testVehicleMatch,
  ];
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test();
      passed++;
    } catch (err: any) {
      console.log(`[FAILED]: ${err.message}\n`);
      failed++;
    }
  }

  console.log("=".repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed, ${tests.length} total`);
  console.log("=".repeat(60));

  if (failed > 0) process.exit(1);
}

main();
