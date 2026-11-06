import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
        success: 'border-transparent bg-emerald-100 text-emerald-800',
        warning: 'border-transparent bg-amber-100 text-amber-800',
        danger: 'border-transparent bg-red-100 text-red-800',
        info: 'border-transparent bg-sky-100 text-sky-800',
        neutral: 'border-transparent bg-slate-100 text-slate-700',
        violet: 'border-transparent bg-violet-100 text-violet-800',
      },
    },
    defaultVariants: { variant: 'secondary' },
  }
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// Application pipeline status -> consistent badge color.
const APP_STATUS_VARIANTS = {
  APPLIED: 'neutral',
  IN_REVIEW: 'info',
  SHORTLISTED: 'violet',
  INTERVIEW: 'warning',
  OFFERED: 'success',
  REJECTED: 'danger',
  WITHDRAWN: 'neutral',
};

export function StatusBadge({ status, label }) {
  return (
    <Badge variant={APP_STATUS_VARIANTS[status] || 'neutral'}>
      {label || status}
    </Badge>
  );
}

const JOB_STATUS_VARIANTS = { DRAFT: 'neutral', PUBLISHED: 'success', CLOSED: 'warning', ARCHIVED: 'neutral' };

export function JobStatusBadge({ status }) {
  return <Badge variant={JOB_STATUS_VARIANTS[status] || 'neutral'}>{status}</Badge>;
}
