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
