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