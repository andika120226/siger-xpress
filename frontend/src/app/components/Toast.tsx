"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

const ICONS: Record<ToastType, string> = {
  success: "\u2713",
  error: "\u2717",
  info: "\u24D8",
};

const COLORS: Record<ToastType, string> = {
  success: "border-[var(--color-success)] bg-[rgba(34,197,94,0.1)]",
  error: "border-[var(--color-error)] bg-[rgba(239,68,68,0.1)]",
  info: "border-[var(--color-primary)] bg-[rgba(14,165,233,0.1)]",
};

export default function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border
        ${COLORS[type]} backdrop-blur-sm shadow-lg
        transition-all duration-300 max-w-md
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}
    >
      <span className="text-lg font-bold">{ICONS[type]}</span>
      <p className="text-sm text-[var(--color-text)] flex-1">{message}</p>
      <button
        onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
        className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] text-lg leading-none"
      >
        &times;
      </button>
    </div>
  );
}
