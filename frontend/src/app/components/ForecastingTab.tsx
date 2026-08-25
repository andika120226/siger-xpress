'use client';

import { useMemo, useState } from 'react';
import LoadingSpinner from './LoadingSpinner';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api/v1';

interface ForecastPoint {
  month: string;
  predicted_volume_tons: number;
  is_spike: boolean;
}

interface DemandResult {
  commodity: string;
  forecast_data: ForecastPoint[];
  average_volume_tons: number;
  recommendations: string[];
}
const PRESET_COMMODITIES = [
  'Arus Truk Penyeberangan Bakauheni',
  'Kopi Liwa',
  'Kopi Robusta Tanggamus',
  'Pisang Muli Lampung',
  'Kargo Logistik Campuran',
];

const SIMULATION_SCENARIOS = [
  { name: 'Optimasi Rute Zig-Zag Lampung', commodity: 'Kopi Liwa', months: 6 },
  {
    name: 'Lonjakan Penyeberangan Bakauheni',
    commodity: 'Arus Truk Penyeberangan Bakauheni',
    months: 8,
  },
  { name: 'Distribusi Komoditas UKM', commodity: 'Pisang Muli Lampung', months: 6 },
  { name: 'Kargo Campuran Regional', commodity: 'Kargo Logistik Campuran', months: 12 },
];

const formatNumber = (value: number, digits = 2) =>
  value.toLocaleString('id-ID', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
export default function ForecastingTab({ onError }: { onError: (msg: string) => void }) {
  const [commodityPreset, setCommodityPreset] = useState("Kopi Liwa");
  const [commodity, setCommodity] = useState("Kopi Liwa");
  const [months, setMonths] = useState("6");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DemandResult | null>(null);

  const metrics = useMemo(() => {
    if (!result || result.forecast_data.length === 0) {
      return {
        totalVolume: 0,
        peakMonth: "0",
        peakVolume: 0,
        maxVolume: 1,
      };
    }

    return result.forecast_data.reduce(
      (acc, item) => {
        const volume = Number(item.predicted_volume_tons) || 0;
        acc.totalVolume += volume;
        acc.maxVolume = Math.max(acc.maxVolume, volume);
        if (volume > acc.peakVolume) {
          acc.peakVolume = volume;
          acc.peakMonth = item.month;
        }
        return acc;
      },
      { totalVolume: 0, peakMonth: "-", peakVolume: 0, maxVolume: 1 }
    );
  }, [result]);
  const applyCommodityPreset = (value: string) => {
    setCommodityPreset(value);
    setCommodity(value);
    setResult(null);
  };

  const applyScenario = (scenarioIndex: string) => {
    if (!scenarioIndex) return;
    const scenario = SIMULATION_SCENARIOS[parseInt(scenarioIndex)];
    setCommodityPreset(scenario.commodity);
    setCommodity(scenario.commodity);
    setMonths(String(scenario.months));
    setResult(null);
  };

  const handleSubmit = async () => {
    const parsedMonths = parseInt(months);

    if (!commodity.trim()) {
      onError("Silakan masukkan nama komoditas atau lintasan.");
      return;
    }

    if (Number.isNaN(parsedMonths) || parsedMonths < 3 || parsedMonths > 24) {
      onError("Prediksi bulan harus berada di rentang 3 sampai 24 bulan.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/demand/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commodity, months: parsedMonths }),
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