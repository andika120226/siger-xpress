"use client";

import { useState } from "react";
import LoadingSpinner from "../LoadingSpinner";

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
]