import { forwardRef, useId, cloneElement, isValidElement } from 'react';
import { cn } from '../../lib/utils';

const baseField =
  'flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/30';

export const Input = forwardRef(({ className, type = 'text', ...props }, ref) => (
  <input ref={ref} type={type} className={cn(baseField, 'h-9', className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef(({ className, rows = 4, ...props }, ref) => (
  <textarea ref={ref} rows={rows} className={cn(baseField, 'min-h-16 resize-y', className)} {...props} />
));
Textarea.displayName = 'Textarea';

// Native select — accessible by default, styled to match the design system.
export const Select = forwardRef(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(baseField, 'h-9 appearance-none bg-[position:right_0.5rem_center] bg-no-repeat pr-8', className)}
    style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23717a84' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
    }}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';

export const Label = forwardRef(({ className, ...props }, ref) => (
  <label ref={ref} className={cn('mb-1.5 block text-sm font-medium leading-none', className)} {...props} />
));
Label.displayName = 'Label';

// FormField: label + control + error message in one consistent block.
// When `error` is set, the message renders beside/below the control and the
// control itself is wired for screen readers via aria-invalid +
// aria-describedby (and `invalid` styles the border red).
export function FormField({ label, error, hint, required, children, className }) {
  const errorId = useId();
  const hintId = useId();

  const describedBy = error ? errorId : hint ? hintId : undefined;
  const control = isValidElement(children)
    ? cloneElement(children, {
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })
    : children;

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <Label>
          {label}
          {required && <span className="ml-0.5 text-destructive">*</span>}
        </Label>
      )}
      {control}
      {hint && !error && (
        <p id={hintId} className="mt-1 text-xs text-muted-foreground">{hint}</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 flex items-start gap-1 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export function Checkbox({ className, label, ...props }) {
  return (
    <label className={cn('inline-flex cursor-pointer select-none items-center gap-2 text-sm', className)}>
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
        {...props}
      />
      {label}
    </label>
  );
}
