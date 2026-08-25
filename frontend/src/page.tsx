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

