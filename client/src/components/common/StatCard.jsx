import { Card, CardContent } from '../ui/card';

export function StatCard({ label, value, icon: Icon, hint, to }) {
  const body = (
    <CardContent className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
        )}
      </div>
    </CardContent>
  );
  return to ? (
    <a href={to} className="block rounded-lg transition-shadow hover:shadow-md">
      <Card>{body}</Card>
    </a>
  ) : (
    <Card>{body}</Card>
  );
}

export function StatGrid({ children, cols = 4 }) {
  const gridCols = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-2 lg:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4' }[cols] || 'sm:grid-cols-2';
  return <div className={`grid grid-cols-1 gap-4 ${gridCols}`}>{children}</div>;
}
