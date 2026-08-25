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

]