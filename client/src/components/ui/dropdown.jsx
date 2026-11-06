import { useEffect, useRef, useState, cloneElement, isValidElement } from 'react';
import { cn } from '../../lib/utils';

// Click-outside dropdown (used for user menus, row actions...).
// Accessibility: the trigger announces itself as a menu button (aria-haspopup,
// aria-expanded), Escape closes, and ArrowDown/ArrowUp move between items.
export function Dropdown({ trigger, children, align = 'end', className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        ref.current?.querySelector('button')?.focus();
      }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && ref.current) {
        e.preventDefault();
        const items = Array.from(ref.current.querySelectorAll('[role="menuitem"]:not([disabled])'));
        if (items.length === 0) return;
        const idx = items.indexOf(document.activeElement);
        const next = e.key === 'ArrowDown'
          ? items[(idx + 1) % items.length]
          : items[(idx - 1 + items.length) % items.length];
        next.focus();
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const triggerProps = {
    'aria-haspopup': 'menu',
    'aria-expanded': open,
  };

  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((v) => !v)}>
        {isValidElement(trigger) ? cloneElement(trigger, triggerProps) : trigger}
      </div>
      {open && (
        <div
          role="menu"
          aria-label="Menu"
          className={cn(
            'absolute z-40 mt-1 min-w-44 overflow-hidden rounded-md border bg-card py-1 shadow-lg focus:outline-none',
            align === 'end' ? 'right-0' : 'left-0',
            className
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ className, destructive, ...props }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none',
        destructive && 'text-destructive hover:bg-destructive/10',
        className
      )}
      {...props}
    />
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-border" role="separator" />;
}
