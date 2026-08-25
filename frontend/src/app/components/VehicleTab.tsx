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
}