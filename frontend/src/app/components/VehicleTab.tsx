"use client";

import { useState } from "react";
import LoadingSpinner from "./LoadingSpinner";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/v1";

interface VehicleInput {
  name: string;
  type: string;
  max_weight_kg: string;
}

interface CargoInput {
  name: string;
  type: string;
  weight_kg: string;
}

interface MatchItem {
  cargo: string;
  assigned_vehicle: string;
  status: string;
  match_score: number;
  reason: string;
}

interface MatchResult {
  matches: MatchItem[];
  unmatched_cargo: string[];
  fleet_utilization_pct: number;
}

const VEHICLE_TYPES = [
  { value: "refrigerated", label: "Truk Pendingin" },
  { value: "box", label: "Box Truck" },
  { value: "motorcycle", label: "Motor Kurir" },
  { value: "pickup", label: "Pickup" },
  { value: "trailer", label: "Trailer" },
];

const CARGO_TYPES = [
  { value: "frozen", label: "Beku / Cold Chain" },
  { value: "perishable", label: "Mudah Busuk" },
  { value: "dry_food", label: "Pangan Kering" },
  { value: "fragile", label: "Rapuh" },
  { value: "hazardous", label: "Berbahaya / Kimia" },
  { value: "standard", label: "Standar" },
];

const SIMULATION_SCENARIOS = [
  {
    name: "Pengiriman Makanan Beku",
    vehicles: [
      { name: "Truk Pendingin Alpha", type: "refrigerated", max_weight_kg: "5000" },
      { name: "Truk Pendingin Beta", type: "refrigerated", max_weight_kg: "3000" },
      { name: "Motor Kurir Gamma", type: "motorcycle", max_weight_kg: "50" },
    ],
    cargo: [
      { name: "Ikan Beku", type: "frozen", weight_kg: "2000" },
      { name: "Daging Sapi", type: "frozen", weight_kg: "1500" },
      { name: "Dokumen Pengiriman", type: "standard", weight_kg: "5" },
    ],
  },
  {
    name: "Elektronik & Dokumen",
    vehicles: [
      { name: "Box Truck Delta", type: "box", max_weight_kg: "3000" },
      { name: "Motor Kurir Epsilon", type: "motorcycle", max_weight_kg: "50" },
      { name: "Motor Kurir Zeta", type: "motorcycle", max_weight_kg: "30" },
    ],
    cargo: [
      { name: "TV LED 55 Inch", type: "fragile", weight_kg: "500" },
      { name: "Laptop & Aksesoris", type: "fragile", weight_kg: "200" },
      { name: "Surat Kontrak", type: "standard", weight_kg: "3" },
      { name: "Faktur & Invoice", type: "standard", weight_kg: "2" },
    ],
  },
  {
    name: "Logistik Campuran",
    vehicles: [
      { name: "Truk Pendingin Eta", type: "refrigerated", max_weight_kg: "5000" },
      { name: "Box Truck Theta", type: "box", max_weight_kg: "3000" },
      { name: "Pickup Iota", type: "pickup", max_weight_kg: "1500" },
      { name: "Motor Kurir Kappa", type: "motorcycle", max_weight_kg: "50" },
    ],
    cargo: [
      { name: "Udang Beku", type: "frozen", weight_kg: "1800" },
      { name: "Karton Elektronik", type: "fragile", weight_kg: "800" },
      { name: "Cat Industri", type: "hazardous", weight_kg: "600" },
      { name: "Dokumen Legal", type: "standard", weight_kg: "5" },
    ],
  },
  {
    name: "Armada Tidak Cocok",
    vehicles: [
      { name: "Box Truck Mu", type: "box", max_weight_kg: "1000" },
      { name: "Motor Kurir Nu", type: "motorcycle", max_weight_kg: "50" },
    ],
    cargo: [
      { name: "Mesin Pabrik", type: "standard", weight_kg: "3000" },
      { name: "Bahan Kimia", type: "hazardous", weight_kg: "500" },
      { name: "Surat Penting", type: "standard", weight_kg: "5" },
    ],
  },
  {
    name: "Risiko Kontaminasi Silang",
    vehicles: [
      { name: "Box Truck Bersama", type: "box", max_weight_kg: "2000" },
    ],
    cargo: [
      { name: "Keripik Pisang & Beras", type: "dry_food", weight_kg: "500" },
      { name: "Pupuk Kimia Pertanian", type: "hazardous", weight_kg: "800" },
      { name: "Kopi Kemasan UKM", type: "dry_food", weight_kg: "200" },
    ],
  },
];

const scoreClass = (score: number) => {
  if (score >= 0.9) return "vehicle-score-good";
  if (score >= 0.7) return "vehicle-score-warn";
  return "vehicle-score-bad";
};

const vehicleIconType = (vehicleName: string) => {
  const name = vehicleName.toLowerCase();
  if (name.includes("motor")) return "motorcycle";
  if (name.includes("pickup")) return "pickup";
  if (name.includes("trailer")) return "trailer";
  if (name.includes("pendingin") || name.includes("refrigerated")) return "refrigerated";
  return "truck";
};

function VehicleIcon({ type = "truck" }: { type?: string }) {
  if (type === "motorcycle") {
    return (
      <svg viewBox="0 0 64 40" aria-hidden="true">
        <path d="M18 28h13l7-12h8" />
        <path d="M28 16h9l6 12" />
        <path d="M43 16h7" />
        <circle cx="16" cy="30" r="6" />
        <circle cx="48" cy="30" r="6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 76 44" aria-hidden="true">
      <path d="M6 12h38v22H6z" />
      <path d="M44 19h13l10 9v6H44z" />
      <path d="M52 22h5l5 5H52z" />
      {type === "refrigerated" && (
        <>
          <path d="M17 19v9M13 22l8 5M21 22l-8 5" />
          <path d="M29 18v10" />
        </>
      )}
      {type === "trailer" && <path d="M6 8h44" />}
      {type === "pickup" && <path d="M18 12v-4h26v4" />}
      <circle cx="22" cy="35" r="5" />
      <circle cx="58" cy="35" r="5" />
    </svg>
  );
}

export default function VehicleTab({ onError }: { onError: (msg: string) => void }) {
  const [vehicles, setVehicles] = useState<VehicleInput[]>([
    { name: "Truk Pendingin Alpha", type: "refrigerated", max_weight_kg: "5000" },
    { name: "Box Truck Beta", type: "box", max_weight_kg: "3000" },
    { name: "Motor Kurir Gamma", type: "motorcycle", max_weight_kg: "50" },
  ]);
  const [cargo, setCargo] = useState<CargoInput[]>([
    { name: "Ikan Beku", type: "frozen", weight_kg: "2000" },
    { name: "TV LED", type: "fragile", weight_kg: "500" },
    { name: "Dokumen", type: "standard", weight_kg: "5" },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);

  const utilization = result?.fleet_utilization_pct || 0;
  const emptyPct = Math.max(0, 100 - utilization);
  const hasMismatch = Boolean(
    result && (
      result.unmatched_cargo.length > 0 ||
      result.matches.some((match) => match.status !== "Matched" || match.match_score < 0.7)
    )
  );

  const addVehicle = () => setVehicles([...vehicles, { name: "", type: "box", max_weight_kg: "" }]);
  const removeVehicle = (idx: number) => {
    setResult(null);
    setVehicles(vehicles.filter((_, i) => i !== idx));
  };
  const updateVehicle = (idx: number, field: keyof VehicleInput, value: string) => {
    setResult(null);
    const updated = [...vehicles];
    updated[idx] = { ...updated[idx], [field]: value };
    setVehicles(updated);
  };

  const addCargo = () => setCargo([...cargo, { name: "", type: "standard", weight_kg: "" }]);
  const removeCargo = (idx: number) => {
    setResult(null);
    setCargo(cargo.filter((_, i) => i !== idx));
  };
  const updateCargo = (idx: number, field: keyof CargoInput, value: string) => {
    setResult(null);
    const updated = [...cargo];
    updated[idx] = { ...updated[idx], [field]: value };
    setCargo(updated);
  };

  const handleSubmit = async () => {
    if (vehicles.length < 1) {
      onError("Minimal 1 kendaraan diperlukan.");
      return;
    }
    if (cargo.length < 1) {
      onError("Minimal 1 kargo diperlukan.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/vehicle/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicles: vehicles.map((vehicle) => ({
            name: vehicle.name,
            type: vehicle.type,
            max_weight_kg: parseFloat(vehicle.max_weight_kg),
          })),
          cargo: cargo.map((item) => ({
            name: item.name,
            type: item.type,
            weight_kg: parseFloat(item.weight_kg),
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.message || "Request failed");
      }

      setResult(await res.json());
    } catch (err: any) {
      onError(err.message || "Gagal menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h1 className="text-[28px] sm:text-[40px] leading-normal text-[var(--color-primary)] tracking-[2px]">
          Armada
        </h1>
        <div className="vehicle-progress">
          <div className="vehicle-progress-track">
            <div className="vehicle-progress-fill" style={{ width: `${Math.min(100, utilization)}%` }} />
          </div>
          <span>{emptyPct.toFixed(0)}% empty</span>
        </div>
      </section>

      <section className="figma-panel vehicle-match-panel">
        <h2 className="vehicle-section-title">Pencocokan Muatan Kendaraan</h2>

        {loading && <LoadingSpinner text="Mencocokkan armada dengan logistik..." />}

        {!result && !loading && (
          <div className="vehicle-empty-state">Belum Ada Data</div>
        )}

        {result && !loading && (
          <div className="vehicle-results">
            {hasMismatch && (
              <div className="vehicle-mismatch-note">
                Note: armada dan logistik tidak cocok untuk sebagian muatan. Periksa kapasitas, jenis kendaraan, atau risiko kontaminasi sebelum pengiriman.
              </div>
            )}

            <div className="vehicle-result-grid">
              {result.matches.map((match, idx) => {
                const matched = match.status === "Matched" && match.match_score >= 0.7;
                return (
                  <article key={`${match.cargo}-${idx}`} className={`vehicle-match-card ${matched ? "is-matched" : "is-unmatched"}`}>
                    <div>
                      <span className="vehicle-card-kicker">Logistik</span>
                      <h3>{match.cargo}</h3>
                    </div>
                    <div className="vehicle-card-route">
                      <span className="vehicle-card-icon">
                        <VehicleIcon type={vehicleIconType(match.assigned_vehicle)} />
                      </span>
                      <strong>{match.assigned_vehicle || "Tidak Ada Armada Cocok"}</strong>
                    </div>
                    <div className="vehicle-card-footer">
                      <span className={scoreClass(match.match_score)}>
                        {(match.match_score * 100).toFixed(0)}%
                      </span>
                      <em>{matched ? "Cocok" : "Tidak Cocok"}</em>
                    </div>
                    <p>{match.reason}</p>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <section className="figma-panel grid min-h-[111px] grid-cols-1 items-center gap-4 px-6 py-6 sm:grid-cols-[minmax(260px,1fr)_minmax(320px,560px)] sm:px-[48px]">
        <h2 className="text-[20px] sm:text-[24px] tracking-[1.2px]">Skenario Simulasi</h2>
        <select
          className="input-field select-field h-[60px] text-center text-[16px] sm:text-[20px]"
          onChange={(event) => {
            if (!event.target.value) return;
            setResult(null);
            const scenario = SIMULATION_SCENARIOS[parseInt(event.target.value)];
            setVehicles(scenario.vehicles);
            setCargo(scenario.cargo);
          }}
          defaultValue=""
        >
          <option value="" disabled>
            Pilih Skenario Simulasi
          </option>
          {SIMULATION_SCENARIOS.map((scenario, idx) => (
            <option key={scenario.name} value={idx}>
              {scenario.name}
            </option>
          ))}
        </select>
      </section>

      <section className="figma-panel min-h-[349px] p-6 sm:p-8">
        <h2 className="mb-6 text-center text-[20px] sm:text-[24px] tracking-[1.2px]">Kolom Input Data</h2>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs text-[var(--color-text-muted)]">Armada Kendaraan ({vehicles.length})</label>
              <button className="btn-secondary" onClick={addVehicle}>Tambah Armada</button>
            </div>
            <div className="space-y-3">
              {vehicles.map((vehicle, idx) => (
                <div key={idx} className="destination-card rounded-[10px] border-2 border-[var(--color-primary)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs text-[var(--color-primary)]">
                      <span className="vehicle-form-icon"><VehicleIcon type={vehicle.type} /></span>
                      Armada {idx + 1}
                    </span>
                    <button className="btn-danger" onClick={() => removeVehicle(idx)} title="Hapus armada">Hapus</button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <input className="input-field text-field !py-1.5" placeholder="Nama kendaraan" value={vehicle.name} onChange={(event) => updateVehicle(idx, "name", event.target.value)} />
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <select className="input-field select-field !py-1.5 text-xs" value={vehicle.type} onChange={(event) => updateVehicle(idx, "type", event.target.value)}>
                        {VEHICLE_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                      <input className="input-field coordinate-field !py-1.5" placeholder="Maks berat (Kg)" value={vehicle.max_weight_kg} onChange={(event) => updateVehicle(idx, "max_weight_kg", event.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs text-[var(--color-text-muted)]">Logistik / Kargo ({cargo.length})</label>
              <button className="btn-secondary" onClick={addCargo}>Tambah Logistik</button>
            </div>
            <div className="space-y-3">
              {cargo.map((item, idx) => (
                <div key={idx} className="destination-card rounded-[10px] border-2 border-[var(--color-primary)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-[var(--color-primary)]">Logistik {idx + 1}</span>
                    <button className="btn-danger" onClick={() => removeCargo(idx)} title="Hapus logistik">Hapus</button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <input className="input-field text-field !py-1.5" placeholder="Nama logistik" value={item.name} onChange={(event) => updateCargo(idx, "name", event.target.value)} />
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <select className="input-field select-field !py-1.5 text-xs" value={item.type} onChange={(event) => updateCargo(idx, "type", event.target.value)}>
                        {CARGO_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                      <input className="input-field coordinate-field !py-1.5" placeholder="Berat (Kg)" value={item.weight_kg} onChange={(event) => updateCargo(idx, "weight_kg", event.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <button className="btn-primary h-[65px] w-full rounded-[10px] text-[16px] sm:text-[24px]" onClick={handleSubmit} disabled={loading}>
        {loading ? "Menganalisa Kecocokan..." : "Analisa Kecocokan Armada dan Logistik"}
      </button>
    </div>
  );
}
