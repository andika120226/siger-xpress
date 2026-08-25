"use client";

import { useEffect, useState } from "react";
import RouteTab from "./components/RouteTab";
import WarehouseTab from "./components/WarehouseTab";
import VehicleTab from "./components/VehicleTab";
import ForecastingTab from "./components/ForecastingTab";
import Toast from "./components/Toast";

type Tab = "route" | "warehouse" | "vehicle" | "forecasting";

interface HealthStatus {
  backend: "online" | "offline" | "checking";
  aiService: "connected" | "disconnected" | "checking";
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/v1";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("route");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "error" | "info">("info");
  const [health, setHealth] = useState<HealthStatus>({
    backend: "checking",
    aiService: "checking",
  });

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        setHealth({
          backend: "online",
          aiService: data.ai_service_status === "connected" ? "connected" : "disconnected",
        });
      } else {
        setHealth({ backend: "offline", aiService: "disconnected" });
      }
    } catch {
      setHealth({ backend: "offline", aiService: "disconnected" });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const triggerToast = (message: string, type: "success" | "error" | "info" = "error") => {
    setToastMessage(message);
    setToastType(type);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "route", label: "Route & Eta Optimization" },
    { id: "warehouse", label: "Warehouse Management" },
    { id: "vehicle", label: "Vechicle Matching" },
    { id: "forecasting", label: "Demand Forecasting" },
  ];

  return (
    <div className="flex-1 w-full min-h-screen bg-grid-pattern px-4 pb-8 pt-8 sm:px-6 lg:px-8 flex flex-col items-center">
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}

      <div className="w-full max-w-[1075px] flex flex-col gap-8">
        <header className="flex flex-col items-center gap-6">
          <div className="relative w-[202px] h-[86px] text-[var(--color-primary)]">
            <p className="font-audiowide text-[36px] leading-none tracking-[1.8px]">SIGER</p>
            <p className="absolute left-[58px] top-[36px] font-michroma text-[24px] leading-none tracking-[1.2px]">
              X-press
            </p>
          </div>

          <nav className="figma-nav" aria-label="Primary navigation">
            <div className="figma-nav-items">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="figma-nav-rule" />
          </nav>

          <div className="flex flex-wrap justify-center gap-3 text-[10px] text-[var(--color-text-muted)]">
            <span className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${health.backend === "online" ? "bg-[var(--color-success)]" : health.backend === "offline" ? "bg-[var(--color-error)]" : "bg-[var(--color-warning)]"}`} />
              Backend {health.backend}
            </span>
            <span className="flex items-center gap-2">
              <span className={`size-2 rounded-full ${health.aiService === "connected" ? "bg-[var(--color-success)]" : health.aiService === "disconnected" ? "bg-[var(--color-error)]" : "bg-[var(--color-warning)]"}`} />
              AI Service {health.aiService}
            </span>
          </div>
        </header>

        <main className="w-full">
          {activeTab === "route" && (
            <RouteTab onError={(msg) => triggerToast(msg, "error")} />
          )}
          {activeTab === "warehouse" && (
            <WarehouseTab onError={(msg) => triggerToast(msg, "error")} />
          )}
          {activeTab === "vehicle" && (
            <VehicleTab onError={(msg) => triggerToast(msg, "error")} />
          )}
          {activeTab === "forecasting" && (
            <ForecastingTab onError={(msg) => triggerToast(msg, "error")} />
          )}
        </main>

        <footer className="text-center py-4 text-xs text-[var(--color-text-muted)] font-medium">
          SIGER-XPRESS AI &copy; 2026. COMPFEST 18 AI Innovation Challenge (AIC).
        </footer>
      </div>
    </div>
  );
}
