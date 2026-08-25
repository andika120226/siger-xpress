"use client";

import { useMemo, useState } from "react";
import LoadingSpinner from "./LoadingSpinner";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/v1";

interface CargoItem {
  name: string;
  qty: string;
  size: string;
  weight_kg: string;
}

interface RackAllocation {
  item: string;
  qty: number;
  assigned_rack: string;
  zone: string;
}

nterface WarehouseResult {
  rack_allocation: RackAllocation[];
  space_utilization_pct: number;
  total_racks_used: number;
  remaining_capacity_pct: number;
  rack_grid: { id: string; zone: string }[][];
}

type WarehouseView = "visual" | "detail";

const EMPTY_ITEM = (): CargoItem => ({ name: "", qty: "", size: "small", weight_kg: "" });

const SIMULATION_SCENARIOS = [
   {
    name: "Kargo Ringan",
    dims: { length_m: "10", width_m: "10", height_m: "2" },
    items: [{ name: "Karton Elektronik", qty: "100", size: "small", weight_kg: "5" }],
  },
  {
    name: "Gudang Penuh",
    dims: { length_m: "10", width_m: "10", height_m: "2" },
    items: [{ name: "Dokumen Kurir", qty: "1272", size: "small", weight_kg: "2" }],
  },
  {
    name: "Kargo Ringan & Sedang",
    dims: { length_m: "10", width_m: "10", height_m: "2" },
    items: [
      { name: "Karton Elektronik", qty: "500", size: "small", weight_kg: "5" },
      { name: "Sparepart Motor", qty: "150", size: "medium", weight_kg: "25" },
    ],
  },
  {
    name: "Kargo Campuran",
    dims: { length_m: "10", width_m: "10", height_m: "2" },
    items: [
      { name: "Karton Elektronik", qty: "300", size: "small", weight_kg: "10" },
      { name: "Sparepart Motor", qty: "100", size: "medium", weight_kg: "30" },
      { name: "Pallet Semen", qty: "30", size: "large", weight_kg: "60" },
    ],
  },
];

const FALLBACK_GRID = Array.from({ length: 30 }, (_, idx) => {
  const zone = idx < 3 ? "fast_dispatch" : idx === 3 ? "heavy_zone" : idx < 4 ? "standard" : "empty";
  return { id: Rak ${idx + 1}, zone };
});
const zoneLabels: Record<string, string> = {
  empty: "Empty",
  heavy_zone: "Heavy Load",
  standard: "Normal",
  fast_dispatch: "Fast Dispatch",
  "Heavy Load": "Heavy Load",
  "Medium Load": "Normal",
  "Light Load": "Fast Dispatch",
};

const zoneClass = (zone: string) => {
  if (zone === "heavy_zone" || zone === "Heavy Load") return "warehouse-rack-heavy";
  if (zone === "standard" || zone === "Medium Load") return "warehouse-rack-normal";
  if (zone === "fast_dispatch" || zone === "Light Load") return "warehouse-rack-fast";
  return "warehouse-rack-empty";
};
export default function WarehouseTab({ onError }: { onError: (msg: string) => void }) {
    const [dims, setDims] = useState({ length_m: "10", width_m: "10", height_m: "2" });
  const [items, setItems] = useState<CargoItem[]>([
    { name: "Karton Elektronik", qty: "100", size: "small", weight_kg: "5" },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WarehouseResult | null>(null);
  const [activeView, setActiveView] = useState<WarehouseView>("visual");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const rowsPerPage = 5;

  const rackAllocationsByRack = useMemo(() => {
    const map: Record<string, RackAllocation[]> = {};
    result?.rack_allocation.forEach((allocation) => {
      if (!map[allocation.assigned_rack]) map[allocation.assigned_rack] = [];
      map[allocation.assigned_rack].push(allocation);
    });
    return map;
  }, [result]);
  const rackCells = result?.rack_grid?.flat() || FALLBACK_GRID;
  const remainingCapacity = result?.remaining_capacity_pct ?? 7.81;
  const progressWidth = Math.max(7.81, Math.min(100, result?.space_utilization_pct ?? 7.81));

  const filteredAllocations = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const rows = result?.rack_allocation || [
      { item: "Karton Elektronik", qty: 24, assigned_rack: "Rak 1A (b.a)", zone: "Light Load" },
    ];

    if (!term) return rows;
    return rows.filter((row) =>
      [row.item, row.assigned_rack, row.zone, String(row.qty)]
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [result, searchTerm]);
  const paginatedAllocations = filteredAllocations.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const addItem = () => setItems([...items, EMPTY_ITEM()]);

  const removeItem = (idx: number) => {
    setResult(null);
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof CargoItem, value: string) => {
    setResult(null);
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };
    const handleSubmit = async () => {
    if (items.length < 1) {
      onError("Minimal 1 item kargo diperlukan.");
      return;
    }

    setLoading(true);
    setResult(null);
    setCurrentPage(1);

    try {
      const res = await fetch(${API_BASE}/warehouse/optimize, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouse_dim: {
            length_m: parseFloat(dims.length_m),
            width_m: parseFloat(dims.width_m),
            height_m: parseFloat(dims.height_m),
          },
          items: items.map((item) => ({
            name: item.name,
            qty: parseInt(item.qty),
            size: item.size,
            weight_kg: parseFloat(item.weight_kg),
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.message || "Request failed");
      }

      setResult(await res.json());
      setActiveView("visual");
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
          Penyimpanan
        </h1>
        <div className="warehouse-progress">
          <div className="warehouse-progress-track">
            <div className="warehouse-progress-fill" style={{ width: ${progressWidth}% }} />
          </div>
          <span>{remainingCapacity.toFixed(2)}% free</span>
        </div>
      </section>

      {activeView === "visual" && (
        <section className="figma-panel warehouse-visual-panel">
          <h2 className="warehouse-section-title">Visualisasi Peta Penyimpanan</h2>
          <div className="warehouse-rack-grid">
            {rackCells.map((cell, idx) => {
              const allocations = rackAllocationsByRack[cell.id] || [];
              const title = allocations.length
                ? ${cell.id}: ${allocations.map((allocation) => `${allocation.qty}x ${allocation.item}).join(", ")}`
                : cell.id;

              return (
                <div
                  key={${cell.id}-${idx}}
                  className={warehouse-rack ${zoneClass(cell.zone)}}
                  title={title}
                />
              );
            })}
          </div>

          <div className="warehouse-legend">
            <span><i className="warehouse-rack-empty" /> Empty</span>
            <span><i className="warehouse-rack-heavy" /> Heavy Load</span>
            <span><i className="warehouse-rack-normal" /> Normal</span>
            <span><i className="warehouse-rack-fast" /> Fast Dispatch</span>
          </div>
        </section>
      )}

      {activeView === "detail" && (
        <section className="figma-panel warehouse-detail-panel">
          <h2 className="warehouse-section-title">Tabel Detail Alokasi Rak Penyimpanan</h2>

          <label className="warehouse-search">
            <input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Mencari"
            />
            <span aria-hidden="true">⌕</span>
          </label>

          <div className="warehouse-table-wrap">
            <table className="warehouse-table">
              <thead>
                <tr>
                  <th>Item Kargo</th>
                  <th>QTY</th>
                  <th>Nomor Rak</th>
                  <th>Zona</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rowsPerPage }).map((_, idx) => {
                  const row = paginatedAllocations[idx];
                  return (
                    <tr key={idx}>
                      <td>{row?.item || ""}</td>
                      <td>{row?.qty || ""}</td>
                      <td>{row?.assigned_rack || ""}</td>
                      <td className={row ? zoneClass(row.zone).replace("warehouse-rack", "warehouse-zone") : ""}>
                        {row ? zoneLabels[row.zone] || row.zone : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="warehouse-pagination">
            <span>
              Menampilkan {filteredAllocations.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, filteredAllocations.length)} dari {filteredAllocations.length} Data
            </span>
            <div>
              <button
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={currentPage === 1}
              >
                &larr; Prev
              </button>
              <button
                onClick={() => setCurrentPage((page) => page + 1)}
                disabled={currentPage * rowsPerPage >= filteredAllocations.length}
              >
                Next &rarr;
              </button>
            </div>
          </div>
        </section>
      )}

      <button
        type="button"
        className="warehouse-view-toggle"
        onClick={() => setActiveView(activeView === "visual" ? "detail" : "visual")}
      >
        {activeView === "visual" ? "Lihat Detail Alokasi Rak ->" : "<- Lihat Visual Peta Penyimpanan"}
      </button>

      <section className="figma-panel grid min-h-[111px] grid-cols-1 items-center gap-4 px-6 py-6 sm:grid-cols-[minmax(260px,1fr)_minmax(320px,560px)] sm:px-[48px]">
        <h2 className="text-[20px] sm:text-[24px] tracking-[1.2px]">Skenario Simulasi</h2>
        <select
          className="input-field select-field h-[60px] text-center text-[16px] sm:text-[20px]"
          onChange={(event) => {
            if (!event.target.value) return;
            setResult(null);
            setActiveView("visual");
            const scenario = SIMULATION_SCENARIOS[parseInt(event.target.value)];
            setDims(scenario.dims);
            setItems(scenario.items);
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

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-xs text-[var(--color-text-muted)]">Dimensi Gudang (meter)</label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input className="input-field coordinate-field" placeholder="Panjang" value={dims.length_m} onChange={(event) => setDims({ ...dims, length_m: event.target.value })} />
              <input className="input-field coordinate-field" placeholder="Lebar" value={dims.width_m} onChange={(event) => setDims({ ...dims, width_m: event.target.value })} />
              <input className="input-field coordinate-field" placeholder="Tinggi" value={dims.height_m} onChange={(event) => setDims({ ...dims, height_m: event.target.value })} />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs text-[var(--color-text-muted)]">Daftar Kargo ({items.length})</label>
              <button className="btn-secondary" onClick={addItem}>Tambah Barang</button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="destination-card rounded-[10px] border-2 border-[var(--color-primary)] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs text-[var(--color-primary)]">Kargo {idx + 1}</span>
                    <button className="btn-danger" onClick={() => removeItem(idx)} title="Hapus kargo">
                      Hapus
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(180px,1fr)_100px_150px_120px]">
                    <input className="input-field text-field !py-1.5" placeholder="Nama Kargo" value={item.name} onChange={(event) => updateItem(idx, "name", event.target.value)} />
                    <input className="input-field coordinate-field !py-1.5" placeholder="Qty" value={item.qty} onChange={(event) => updateItem(idx, "qty", event.target.value)} />
                    <select className="input-field select-field !py-1.5 text-xs" value={item.size} onChange={(event) => updateItem(idx, "size", event.target.value)}>
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                    <input className="input-field coordinate-field !py-1.5" placeholder="Kg" value={item.weight_kg} onChange={(event) => updateItem(idx, "weight_kg", event.target.value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {loading && <LoadingSpinner text="Menganalisis spasial gudang..." />}

      <button className="btn-primary h-[65px] w-full rounded-[10px] text-[20px] sm:text-[24px]" onClick={handleSubmit} disabled={loading}>
        {loading ? "Membuat Data..." : "Membuat Data"}
      </button>
    </div>
  );
}
