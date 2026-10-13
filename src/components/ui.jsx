// BoostWork UI kit. Every page is built from these pieces so both themes stay consistent.
import React, { useEffect } from 'react';
import { Loader2, Monitor, Moon, Sun, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../context/ThemeContext';

// Accent "tones" (full class strings so Tailwind can see them)
export const TONES = {
  // Orange removed: ember/flamingo are aliases of the yellow tone
  ember: { soft: 'bg-sunbeam-soft text-ink border-sunbeam', solid: 'bg-sunbeam text-on-sunbeam', icon: 'bg-sunbeam text-on-sunbeam', dot: 'bg-sunbeam', ring: 'ring-sunbeam' },
  flamingo: { soft: 'bg-surface text-ink border-lagoon', solid: 'bg-lagoon text-on-accent', icon: 'bg-lagoon text-on-accent', dot: 'bg-lagoon', ring: 'ring-lagoon' },
  ultraviolet: { soft: 'bg-ultraviolet-soft text-ultraviolet border-ultraviolet', solid: 'bg-ultraviolet text-on-accent', icon: 'bg-ultraviolet text-on-accent', dot: 'bg-ultraviolet', ring: 'ring-ultraviolet' },
  lagoon: { soft: 'bg-lagoon-soft text-lagoon border-lagoon', solid: 'bg-lagoon text-on-accent', icon: 'bg-lagoon text-on-accent', dot: 'bg-lagoon', ring: 'ring-lagoon' },
  sunbeam: { soft: 'bg-sunbeam-soft text-ink border-sunbeam', solid: 'bg-sunbeam text-on-sunbeam', icon: 'bg-sunbeam text-on-sunbeam', dot: 'bg-sunbeam', ring: 'ring-sunbeam' },
  sky: { soft: 'bg-sky-soft text-sky border-sky', solid: 'bg-sky text-on-accent', icon: 'bg-sky text-on-accent', dot: 'bg-sky', ring: 'ring-sky' },
  danger: { soft: 'bg-danger-soft text-danger border-danger', solid: 'bg-danger text-on-accent', icon: 'bg-danger-soft text-danger', dot: 'bg-danger', ring: 'ring-danger' },
  ink: { soft: 'bg-ink-soft text-ink border-ink', solid: 'bg-ink text-bg', icon: 'bg-ink text-bg', dot: 'bg-ink', ring: 'ring-ink' },
  neutral: { soft: 'bg-surface-3 text-ink-2 border-line', solid: 'bg-ink text-bg', icon: 'bg-surface-3 text-ink-2', dot: 'bg-ink-3', ring: 'ring-line' },
};

const BUTTON_VARIANTS = {
  primary: 'bg-sunbeam text-on-sunbeam hover:brightness-110',
  secondary: 'bg-surface text-ink border border-line hover:border-line-strong hover:bg-surface-2',
  ghost: 'text-ink-2 hover:text-ink hover:bg-surface-2',
  success: 'bg-lagoon text-on-accent hover:brightness-110',
  highlight: 'bg-sunbeam text-on-sunbeam hover:brightness-105',
  danger: 'text-danger hover:bg-danger-soft border border-transparent hover:border-danger',
};

const BUTTON_SIZES = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-xl',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[0.95rem] gap-2 rounded-2xl',
};

export function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, className, children, disabled, ...props }) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all duration-200 active:scale-[0.98] disabled:bg-surface-3 disabled:text-ink-3 disabled:border-line disabled:pointer-events-none',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon ? <Icon className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} /> : null}
      {children}
    </button>
  );
}

export function IconButton({ icon: Icon, label, tone, className, ...props }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center w-9 h-9 rounded-xl text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink disabled:text-ink-3',
        tone === 'danger' && 'hover:text-danger hover:bg-danger-soft',
        className
      )}
      {...props}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

export function Card({ className, children, as: Tag = 'div', ...props }) {
  return <Tag className={cn('card', className)} {...props}>{children}</Tag>;
}

export function Badge({ tone = 'neutral', className, children, dot }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap', TONES[tone].soft, className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', TONES[tone].dot)} />}
      {children}
    </span>
  );
}

export function IconTile({ icon: Icon, tone = 'ember', className, size = 'md' }) {
  return (
    <span className={cn('inline-flex items-center justify-center shrink-0', size === 'lg' ? 'w-12 h-12 rounded-2xl' : 'w-10 h-10 rounded-xl', TONES[tone].icon, className)}>
      <Icon className={size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'} />
    </span>
  );
}

export function PageHeader({ eyebrow, title, highlight, description, actions }) {
  return (
    <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 animate-rise">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-3xl md:text-[2.6rem] leading-[1.05] font-bold text-ink">
          {title} {highlight && <span className="text-brand">{highlight}</span>}
        </h1>
        {description && <p className="text-ink-2 mt-2.5 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ icon: Icon, tone = 'ember', title, aside, className }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 mb-4', className)}>
      <h2 className="text-lg font-semibold text-ink flex items-center gap-2.5">
        {Icon && <IconTile icon={Icon} tone={tone} className="w-8 h-8 rounded-lg [&>svg]:w-4 [&>svg]:h-4" />}
        {title}
      </h2>
      {aside}
    </div>
  );
}

export function EmptyState({ icon: Icon, tone = 'ultraviolet', title, children, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center px-6 py-12', className)}>
      {Icon && <IconTile icon={Icon} tone={tone} size="lg" className="mb-4" />}
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {children && <p className="text-sm text-ink-2 mt-1.5 max-w-sm">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Notice({ tone = 'sunbeam', icon: Icon, children, action, className }) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border px-4 py-3 text-sm', TONES[tone].soft, className)}>
      {Icon && <Icon className="w-5 h-5 shrink-0" />}
      <div className="flex-1 text-ink">{children}</div>
      {action}
    </div>
  );
}

export function Spinner({ className, label }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-ink-2 text-sm', className)}>
      <Loader2 className="w-4 h-4 animate-spin text-sunbeam-ink" /> {label}
    </span>
  );
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'lg', busy }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose, busy]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-overlay" onClick={busy ? undefined : onClose} />
      <div className={cn(
        'relative w-full max-h-[92vh] flex flex-col overflow-hidden card rounded-b-none sm:rounded-b-[var(--radius-2xl)] animate-pop',
        size === 'lg' ? 'sm:max-w-3xl' : 'sm:max-w-xl'
      )}>
        <div className="h-1 bg-lagoon shrink-0" />
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-line">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-ink">{title}</h2>
            {subtitle && <div className="mt-1.5">{subtitle}</div>}
          </div>
          <IconButton icon={X} label="Close" onClick={onClose} disabled={busy} className="-mr-2 -mt-1" />
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-line bg-surface-2 flex flex-wrap items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Logo({ className, compact }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span className="relative w-9 h-9 rounded-[0.85rem] bg-sunbeam flex items-center justify-center">
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#000000" aria-hidden="true"><path d="M13.3 2 5.6 13.2h5.2L9.9 22l8.5-11.6h-5.3z" /></svg>
      </span>
      {!compact && (
        <span className="font-display text-xl font-bold tracking-tight text-ink">
          Boost<span className="text-lagoon">Work</span>
        </span>
      )}
    </span>
  );
}

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor };
const THEME_LABELS = { light: 'Light theme', dark: 'Dark theme', system: 'Match system theme' };

export function ThemeToggle({ className }) {
  const { mode, cycle } = useTheme();
  const Icon = THEME_ICONS[mode];
  return (
    <button
      onClick={cycle}
      title={`${THEME_LABELS[mode]} (click to change)`}
      aria-label={`${THEME_LABELS[mode]}. Click to change theme.`}
      className={cn('relative inline-flex items-center justify-center w-10 h-10 rounded-xl border border-line bg-surface text-ink-2 hover:text-ink hover:border-line-strong transition-colors', className)}
    >
      <Icon key={mode} className="w-[1.1rem] h-[1.1rem] animate-pop" />
    </button>
  );
}

/** Small horizontal score bar (0..max). */
export function Meter({ value, max = 5, tone }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const auto = value / max >= 0.8 ? 'lagoon' : value / max >= 0.6 ? 'sunbeam' : 'danger';
  return (
    <div className="h-2 rounded-full bg-surface-3 overflow-hidden">
      <div className={cn('h-full rounded-full transition-all duration-700', TONES[tone || auto].dot)} style={{ width: `${pct}%` }} />
    </div>
  );
}
