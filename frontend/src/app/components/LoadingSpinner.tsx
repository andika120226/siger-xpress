"use client";

export default function LoadingSpinner({ text = "Memproses..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 animate-fade-in-up">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-[var(--color-border)]" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[var(--color-primary)] animate-spin-slow" />
      </div>
      <p className="text-sm text-[var(--color-text-muted)] font-medium">{text}</p>
    </div>
  );
}
