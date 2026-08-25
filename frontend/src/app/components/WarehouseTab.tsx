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
  
]