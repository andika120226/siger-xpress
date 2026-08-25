'use client';

interface MetricCardProps {
  icon?: string;
  label: string;
  value: string | number;
  unit?: string;
}
export default function MetricCard({ icon, label, value, unit }: MetricCardProps) {
  return (
    <div className="h-[111px] rounded-[10px] border-2 border-[var(--color-primary)] bg-[var(--color-bg)] p-4 animate-fade-in-up flex flex-col justify-center gap-2">
      <div className="flex items-center justify-center gap-2 text-center">
        {icon && <span className="text-lg">{icon}</span>}
        <span className="text-[10px] sm:text-xs font-medium text-[var(--color-text-muted)] uppercase">
          {label}
        </span>
      </div>
      <div className="flex items-baseline justify-center gap-1 text-center">
        <span className="text-lg sm:text-2xl text-[var(--color-primary)]">{value}</span>
        {unit && (
          <span className="text-xs sm:text-sm text-[var(--color-text-secondary)]">{unit}</span>
        )}
      </div>
    </div>
  );
}
