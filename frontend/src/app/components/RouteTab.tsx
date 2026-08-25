'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import LoadingSpinner from './LoadingSpinner';
import MetricCard from './MetricCard';

const RouteMap = dynamic(() => import('./RouteMap'), {
  ssr: false,
  loading: () => <LoadingSpinner text="Memuat Peta..." />,
});

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api/v1';

interface Location {
  name: string;
  lat: string;
  lng: string;
}

interface RouteStop {
  order: number;
  name: string;
  type: string;
  lat?: number;
  lng?: number;
}

interface TrafficSegment {
  start_idx: number;
  end_idx: number;
  start_name: string;
  end_name: string;
  status: 'clear' | 'warning' | 'congested';
  distance_km: number;
}

interface RouteResult {
  optimal_sequence: RouteStop[];
  traffic_segments: TrafficSegment[];
  total_distance_km: number;
  estimated_time_hours: number;
  fuel_saved_liters: number;
  fuel_saved_pct: number;
}

const EMPTY_DEST = (): Location => ({ name: '', lat: '', lng: '' });

const LOCATION_PRESETS = [
  { name: 'Gudang Bandar Lampung', lat: '-5.4292', lng: '105.2611' },
  { name: 'Hub Bakauheni', lat: '-5.8708', lng: '105.7533' },
  { name: 'Toko Metro', lat: '-5.1131', lng: '105.3067' },
  { name: 'Pasar Kotabumi', lat: '-4.8286', lng: '104.8829' },
  { name: 'Sentra Kopi Liwa', lat: '-5.0345', lng: '104.0754' },
];

const SIMULATION_SCENARIOS = [
  {
    name: 'Kemacetan: Bandar Lampung - Bakauheni - Metro',
    origin: { name: 'Gudang Bandar Lampung', lat: '-5.4292', lng: '105.2611' },
    destinations: [
      { name: 'Hub Bakauheni', lat: '-5.8708', lng: '105.7533' },
      { name: 'Toko Metro', lat: '-5.1131', lng: '105.3067' },
    ],
  },
  {
    name: 'Renovasi: Bakauheni - Metro - Kotabumi - Liwa',
    origin: { name: 'Hub Bakauheni', lat: '-5.8708', lng: '105.7533' },
    destinations: [
      { name: 'Toko Metro', lat: '-5.1131', lng: '105.3067' },
      { name: 'Pasar Kotabumi', lat: '-4.8286', lng: '104.8829' },
      { name: 'Sentra Kopi Liwa', lat: '-5.0345', lng: '104.0754' },
    ],
  },
  {
    name: 'Optimasi Rute Zig-Zag Lampung',
    origin: { name: 'Gudang Bandar Lampung', lat: '-5.4292', lng: '105.2611' },
    destinations: [
      { name: 'Hub Bakauheni', lat: '-5.8708', lng: '105.7533' },
      { name: 'Toko Metro', lat: '-5.1131', lng: '105.3067' },
      { name: 'Pasar Kotabumi', lat: '-4.8286', lng: '104.8829' },
      { name: 'Sentra Kopi Liwa', lat: '-5.0345', lng: '104.0754' },
    ],
  },
];

export default function RouteTab({ onError }: { onError: (msg: string) => void }) {
  const [origin, setOrigin] = useState<Location>({
    name: "Gudang Bandar Lampung",
    lat: "-5.4292",
    lng: "105.2611",
  });
  const [destinations, setDestinations] = useState<Location[]>([
    { name: "Hub Bakauheni", lat: "-5.8708", lng: "105.7533" },
    { name: "Toko Metro", lat: "-5.1131", lng: "105.3067" },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [simulationStep, setSimulationStep] = useState<number | null>(null);

   useEffect(() => {
    if (simulationStep !== null && result?.traffic_segments) {
      if (simulationStep < result.traffic_segments.length) {
        const timer = setTimeout(() => {
          setSimulationStep((step) => (step !== null ? step + 1 : null));
        }, 1500);
        return () => clearTimeout(timer);
      }

      const timer = setTimeout(() => setSimulationStep(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [simulationStep, result]);

  const clearRouteResult = () => {
    setResult(null);
    setSimulationStep(null);
  };

  const addDest = () => {
    clearRouteResult();
    setDestinations([...destinations, EMPTY_DEST()]);
  };

  const removeDest = (idx: number) => {
    clearRouteResult();
    setDestinations(destinations.filter((_, i) => i !== idx));
  };

  const updateDest = (idx: number, field: keyof Location, value: string) => {
    clearRouteResult();
    const updated = [...destinations];
    updated[idx] = { ...updated[idx], [field]: value };
    setDestinations(updated);
  };

  const updateOrigin = (field: keyof Location, value: string) => {
    clearRouteResult();
    setOrigin({ ...origin, [field]: value });
  };

  const handleSubmit = async () => {
    if (destinations.length < 2) {
      onError("Minimal 2 titik tujuan diperlukan.");
      return;
    }

    setLoading(true);
    setResult(null);
    setSimulationStep(null);

    try {
      const res = await fetch(`${API_BASE}/route/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { name: origin.name, lat: parseFloat(origin.lat), lng: parseFloat(origin.lng) },
          destinations: destinations.map((destination) => ({
            name: destination.name,
            lat: parseFloat(destination.lat),
            lng: parseFloat(destination.lng),
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

  const visibleTraffic =
    simulationStep === null ? result?.traffic_segments : result?.traffic_segments.slice(0, simulationStep);

  return (
    <div className="animate-fade-in-up flex flex-col gap-8">
      {result && (
        <section className="flex flex-col gap-2">
          <h1 className="text-[28px] sm:text-[40px] leading-normal text-[var(--color-primary)] tracking-[2px]">
            Hasil Analisa Rute X
          </h1>

          <div className="relative h-[431px] overflow-hidden rounded-[8px]">
            <RouteMap
              origin={origin}
              destinations={destinations}
              optimalSequence={result.optimal_sequence}
              trafficSegments={visibleTraffic}
            />

            <button
              onClick={() => setSimulationStep(1)}
              disabled={simulationStep !== null}
              className="absolute bottom-[22px] left-[39px] z-[400] h-[65px] rounded-[16px] bg-[var(--color-primary)] px-[21px] text-[18px] sm:text-[24px] text-white tracking-[1.2px] transition hover:bg-[var(--color-primary-dark)] disabled:opacity-80"
            >
              {simulationStep === null
                ? "Simulasikan Rute"
                : `Rute ${Math.min(simulationStep, result.traffic_segments.length)} / ${result.traffic_segments.length}`}
            </button>
          </div>
        </section>
      )}
