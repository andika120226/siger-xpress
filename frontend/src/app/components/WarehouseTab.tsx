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
}
