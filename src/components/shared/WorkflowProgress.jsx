import React from 'react';
import { Check, Loader2, Minus, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Card } from '../ui';

const STATE = {
  completed: { icon: Check, className: 'bg-lagoon text-on-accent' },
  running: { icon: Loader2, className: 'bg-sunbeam text-on-sunbeam', spin: true },
  failed: { icon: X, className: 'bg-danger text-on-accent' },
  skipped: { icon: Minus, className: 'bg-surface-3 text-ink-3' },
  pending: { icon: null, className: 'bg-surface-2 border-2 border-line' },
};

/** Vertical step timeline for a background workflow run. */
export default function WorkflowProgress({ run, className, title = 'Progress' }) {
  if (!run) return null;
  const done = run.steps?.filter((s) => s.status === 'completed' || s.status === 'skipped').length || 0;
  const total = run.steps?.length || 1;

  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-ink">{title}</p>
        <span className="text-xs font-semibold text-ink-3">{run.status === 'queued' ? 'Queued…' : `${done}/${total}`}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden mb-5">
        <div className="h-full bg-lagoon rounded-full transition-all duration-700" style={{ width: `${(done / total) * 100}%` }} />
      </div>
      <ol className="relative">
        {run.steps?.map((step, i) => {
          const state = STATE[step.status] || STATE.pending;
          const isLast = i === run.steps.length - 1;
          return (
            <li key={step.name} className="relative flex gap-3.5 pb-4 last:pb-0">
              {!isLast && <span className={cn('absolute left-[13px] top-7 bottom-0 w-0.5 rounded', step.status === 'completed' ? 'bg-lagoon-soft' : 'bg-line')} />}
              <span className={cn('relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all', state.className)}>
                {state.icon && <state.icon className={cn('w-3.5 h-3.5', state.spin && 'animate-spin')} strokeWidth={3} />}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className={cn('text-sm', step.status === 'pending' ? 'text-ink-3' : 'text-ink', step.status === 'running' && 'font-semibold')}>{step.label || step.name}</p>
                {step.detail && <p className="text-xs text-ink-3 mt-0.5">{step.detail}</p>}
              </div>
            </li>
          );
        })}
      </ol>
      {run.status === 'failed' && run.error && (
        <p className="mt-4 rounded-xl border border-danger bg-danger-soft px-3.5 py-2.5 text-sm text-danger">{run.error}</p>
      )}
    </Card>
  );
}
