// Honest, dependency-free charts. They render ONLY when there is real data
// (no fake dashboards) and are simple enough to explain in an interview.

export function BarChart({ data, height = 160, emptyLabel = 'No data yet' }) {
  if (!data || data.length === 0) {
    return <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }} role="img" aria-label="Bar chart">
      {data.map((d) => (
        <div key={String(d.label ?? d.day)} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1">
          <span className="absolute -top-5 hidden rounded bg-foreground px-1.5 py-0.5 text-xs text-background group-hover:block">
            {d.count}
          </span>
          <div
            className="w-full max-w-10 rounded-t bg-primary/80 transition-colors group-hover:bg-primary"
            style={{ height: `${Math.max(4, (d.count / max) * (height - 24))}px` }}
          />
          <span className="truncate text-[10px] text-muted-foreground">{d.shortLabel ?? d.label ?? d.day}</span>
        </div>
      ))}
    </div>
  );
}

export function HBarList({ data, emptyLabel = 'No data yet', valueSuffix = '' }) {
  if (!data || data.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyLabel}</p>;
  }
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex items-center justify-between gap-2 text-sm">
            <span className="min-w-0 truncate">{d.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{d.count}{valueSuffix}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary/80" style={{ width: `${(d.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// Simple SVG donut for status distribution.
export function DonutChart({ segments, size = 140, emptyLabel = 'No data yet' }) {
  const data = (segments || []).filter((s) => s.value > 0);
  if (data.length === 0) {
    return <p className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: size }}>{emptyLabel}</p>;
  }
  const total = data.reduce((sum, s) => sum + s.value, 0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox="0 0 140 140" role="img" aria-label="Donut chart">
        <circle cx="70" cy="70" r={radius} fill="none" strokeWidth="16" className="stroke-muted" />
        {data.map((s) => {
          const fraction = s.value / total;
          const dash = fraction * circumference;
          const el = (
            <circle
              key={s.label}
              cx="70" cy="70" r={radius} fill="none" strokeWidth="16"
              className={s.colorClass}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 70 70)"
            />
          );
          offset += dash;
          return el;
        })}
        <text x="70" y="66" textAnchor="middle" className="fill-foreground text-lg font-semibold">{total}</text>
        <text x="70" y="84" textAnchor="middle" className="fill-muted-foreground text-[10px]">total</text>
      </svg>
      <ul className="space-y-1.5 text-sm">
        {data.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${s.colorClass.replace('stroke-', 'bg-').replace(/\/\d+$/, '')}`} />
            {s.label} <span className="tabular-nums text-muted-foreground">({s.value})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
