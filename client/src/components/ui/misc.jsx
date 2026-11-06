import { AlertTriangle, RotateCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

export function Skeleton({ className, ...props }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />;
}

export function Spinner({ className }) {
  return (
    <span
      className={cn('inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent', className)}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-muted-foreground">
      <Spinner className="h-6 w-6" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function Avatar({ name, src, className }) {
  const initials = (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
  return (
    <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-xs font-semibold text-secondary-foreground', className)}>
      {src ? <img src={src} alt={name} className="h-full w-full object-cover" /> : initials}
    </span>
  );
}

export function CompanyLogo({ name, src, size = 'md' }) {
  const sizes = { sm: 'h-8 w-8 text-[10px]', md: 'h-10 w-10 text-xs', lg: 'h-14 w-14 text-sm' };
  return (
    <span className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-card font-semibold text-primary', sizes[size])}>
      {src ? <img src={src} alt={`${name} logo`} className="h-full w-full object-cover" />
        : (name || '?').slice(0, 2).toUpperCase()}
    </span>
  );
}

export function Separator({ className }) {
  return <div className={cn('h-px w-full bg-border', className)} />;
}

export function Progress({ value = 0, className }) {
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Alert({ variant = 'info', title, children, className }) {
  const styles = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    danger: 'border-red-200 bg-red-50 text-red-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  };
  return (
    <div className={cn('rounded-md border p-3 text-sm', styles[variant], className)} role="alert">
      {title && <p className="font-medium">{title}</p>}
      {children}
    </div>
  );
}

// Visible failure state with a retry action. Used everywhere a useFetch()
// request can fail — dashboards, analytics, lists — so a broken request is
// never a silent empty screen.
export function ErrorState({ title = 'Could not load this content', description, onRetry, className }) {
  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-card/50 px-6 py-10 text-center', className)}
    >
      <AlertTriangle className="h-9 w-9 text-amber-600" aria-hidden />
      <div>
        <p className="font-medium">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw className="h-4 w-4" /> Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-card/50 px-6 py-12 text-center', className)}>
      {Icon && <Icon className="h-10 w-10 text-muted-foreground/60" aria-hidden />}
      <div>
        <p className="font-medium">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
