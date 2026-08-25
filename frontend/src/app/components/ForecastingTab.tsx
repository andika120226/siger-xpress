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
  const [commodityPreset, setCommodityPreset] = useState('Kopi Liwa');
  const [commodity, setCommodity] = useState('Kopi Liwa');
  const [months, setMonths] = useState('6');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DemandResult | null>(null);

  const metrics = useMemo(() => {
    if (!result || result.forecast_data.length === 0) {
      return {
        totalVolume: 0,
        peakMonth: '0',
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
      { totalVolume: 0, peakMonth: '-', peakVolume: 0, maxVolume: 1 }
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
      onError('Silakan masukkan nama komoditas atau lintasan.');
      return;
    }

    if (Number.isNaN(parsedMonths) || parsedMonths < 3 || parsedMonths > 24) {
      onError('Prediksi bulan harus berada di rentang 3 sampai 24 bulan.');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/demand/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commodity, months: parsedMonths }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || err.message || 'Request failed');
      }

      setResult(await res.json());
    } catch (err: any) {
      onError(err.message || 'Gagal menghubungi server.');
    } finally {
      setLoading(false);
    }
  };
  const chartData = result?.forecast_data || [];
  const chartScaleMax = Math.max(100, Math.ceil(metrics.maxVolume / 25) * 25);
  const yAxisTicks = [1, 0.75, 0.5, 0.25, 0].map((ratio) => chartScaleMax * ratio);
  const averageLinePosition = result
    ? Math.min(100, Math.max(0, (result.average_volume_tons / chartScaleMax) * 100))
    : 0;

  return (
    <div className="animate-fade-in-up flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <h1 className="text-[28px] sm:text-[40px] leading-normal text-[var(--color-primary)] tracking-[2px]">
          Hasil Demand Forecasting
        </h1>
      </section>

      <section className="forecast-metric-grid">
        <article className="forecast-metric-card">
          <span>Total Estimasi Volume</span>
          <strong>
            {formatNumber(metrics.totalVolume)} <small>ton</small>
          </strong>
        </article>
        <article className="forecast-metric-card">
          <span>Bulan Pencapaian Tertinggi</span>
          <strong>
            {metrics.peakMonth} <small>({formatNumber(metrics.peakVolume, 1)} ton)</small>
          </strong>
        </article>
      </section>
      <section className="figma-panel forecast-chart-panel">
        {loading && <LoadingSpinner text="Menganalisis tren historis dan permintaan..." />}

        {!loading && !result && <div className="forecast-empty-state">Tidak Ada Data</div>}

        {!loading && result && (
          <>
            <div className="forecast-chart-header">
              <h2>Proyeksi : {result.commodity}</h2>
              <span>Rata-rata : {formatNumber(result.average_volume_tons)} ton/bln</span>
            </div>

            <div className="forecast-chart-shell">
              <div className="forecast-y-axis" aria-hidden="true">
                {yAxisTicks.map((tick) => (
                  <span key={tick}>{formatNumber(tick, 0)}</span>
                ))}
              </div>

              <div
                className="forecast-chart"
                role="img"
                aria-label={`Grafik proyeksi demand ${result.commodity}`}
              >
                <div className="forecast-grid-lines" aria-hidden="true">
                  {yAxisTicks.map((tick) => (
                    <span key={tick} />
                  ))}
                </div>
                <div
                  className="forecast-average-line"
                  style={{ bottom: `calc(34px + ${averageLinePosition * 0.88}%)` }}
                >
                  <span>Avg {formatNumber(result.average_volume_tons, 0)} ton</span>
                </div>

                {chartData.map((point) => {
                  const height = Math.max(8, (point.predicted_volume_tons / chartScaleMax) * 100);
                  return (
                    <div className="forecast-bar-group" key={point.month}>
                      <div className="forecast-bar-track">
                        <div
                          className={`forecast-bar ${point.is_spike ? 'is-spike' : ''}`}
                          style={{ height: `${height}%` }}
                          title={`${point.month}: ${formatNumber(point.predicted_volume_tons)} ton`}
                        >
                          <span>{formatNumber(point.predicted_volume_tons, 0)}</span>
                        </div>
                      </div>
                      <span>{point.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </section>
      <section className="figma-panel forecast-recommendation-panel">
        <h2>Rekomedasi Strategi Optimal</h2>

        {!result && !loading && <div className="forecast-empty-state compact">Tidak Ada Data</div>}

        {result && (
          <div className="forecast-recommendation-list">
            {result.recommendations.map((recommendation, idx) => (
              <article key={`${recommendation}-${idx}`} className="forecast-recommendation-item">
                <span>{idx + 1}</span>
                <p>{recommendation}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="figma-panel grid min-h-[111px] grid-cols-1 items-center gap-4 px-6 py-6 sm:grid-cols-[minmax(260px,1fr)_minmax(320px,560px)] sm:px-[48px]">
        <h2 className="text-[20px] sm:text-[24px] tracking-[1.2px]">Skenario Simulasi</h2>
        <select
          className="input-field select-field h-[60px] text-center text-[16px] sm:text-[20px]"
          onChange={(event) => applyScenario(event.target.value)}
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
      <section className="figma-panel min-h-[237px] p-6 sm:p-8">
        <h2 className="mb-6 text-center text-[20px] sm:text-[24px] tracking-[1.2px]">
          Kolom Input Data
        </h2>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
          <label className="forecast-input-block">
            <span>Prediksi Bulan ke-Depan</span>
            <input
              className="input-field coordinate-field h-[60px] text-center text-[16px] sm:text-[20px]"
              type="number"
              min="3"
              max="24"
              value={months}
              onChange={(event) => {
                setMonths(event.target.value);
                setResult(null);
              }}
            />
          </label>

          <label className="forecast-input-block">
            <span>Komoditas / Lintasan</span>
            <select
              className="input-field select-field h-[60px] text-[15px] sm:text-[18px]"
              value={commodityPreset}
              onChange={(event) => applyCommodityPreset(event.target.value)}
            >
              {PRESET_COMMODITIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="forecast-input-block mt-5">
          <span>Nama Forecast</span>
          <input
            className="input-field text-field h-[60px] text-[15px] sm:text-[18px]"
            value={commodity}
            onChange={(event) => {
              setCommodity(event.target.value);
              setResult(null);
            }}
            placeholder="Contoh: Kopi Liwa"
          />
        </label>
      </section>

      <button
        className="btn-primary h-[65px] w-full rounded-[10px] text-[20px] sm:text-[24px]"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? 'Membuat Data...' : 'Membuat Data'}
      </button>
    </div>
  );
}
