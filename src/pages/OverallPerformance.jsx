import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowUpRight, Coins, Info, PenLine, Send, Wallet } from 'lucide-react';
import { useJobContext } from '../context/JobContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { computeMetrics, MIN_SAMPLE_FOR_RATES } from '../lib/metrics';
import { cn } from '../lib/utils';
import { Button, Card, EmptyState, IconTile, Notice } from '../components/ui';

const TIMEFRAMES = [
  { value: 1, label: 'Today' },
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 0, label: 'All time' },
];

const formatRate = (value) => (value === null ? '—' : `${Math.round(value * 100)}%`);
const formatMoney = (value) => `$${Math.round(value).toLocaleString()}`;

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 5) return 'Burning the midnight oil';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

function RateRing({ label, value, detail, tone }) {
  const { palette } = useTheme();
  const pct = value === null ? 0 : Math.max(0, Math.min(1, value));
  const radius = 34;
  const circumference = 2 * Math.PI * radius;

  return (
    <Card className="p-5 flex items-center gap-4">
      <div className="relative w-[84px] h-[84px] shrink-0">
        <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90">
          <circle cx="42" cy="42" r={radius} fill="none" stroke={palette.surface2} strokeWidth="9" />
          <circle
            cx="42" cy="42" r={radius} fill="none" stroke={palette[tone]} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={circumference * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.2,0.8,0.2,1)' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold text-ink">{formatRate(value)}</span>
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-ink">{label}</p>
        <p className="text-xs text-ink-3 mt-0.5">{detail}</p>
      </div>
    </Card>
  );
}

function Funnel({ steps }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className="space-y-3.5">
      {steps.map((step, i) => (
        <div key={step.name}>
          <div className="flex items-baseline justify-between text-sm mb-1.5">
            <span className="font-semibold">{step.name}</span>
            <span>
              <span className="font-display font-bold text-base">{step.value}</span>
              {i > 0 && steps[0].value > 0 && <span className="text-xs ml-1.5">{Math.round((step.value / steps[0].value) * 100)}%</span>}
            </span>
          </div>
          <div className="h-3 rounded-full bg-[#000000] overflow-hidden">
            <div className={cn('h-full rounded-full transition-all duration-700', step.bar)} style={{ width: `${Math.max(step.value ? 4 : 0, (step.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs">
      <p className="font-semibold text-ink mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center gap-2 text-ink-2">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          {entry.name}: <span className="font-semibold text-ink">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export default function OverallPerformance() {
  const { jobs, isLoading } = useJobContext();
  const { user } = useAuth();
  const { palette } = useTheme();
  const [timeframe, setTimeframe] = useState(30);

  const metrics = useMemo(() => computeMetrics(jobs, { days: timeframe || null }), [jobs, timeframe]);
  const of = (count) => (metrics.submitted ? `${count} of ${metrics.submitted} submitted` : 'Nothing submitted yet');
  const hasActivity = metrics.submitted + metrics.drafted > 0;
  const firstName = (user?.name || user?.email || '').split(/[\s@]/)[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <p className="eyebrow mb-2">{greeting()}{firstName ? `, ${firstName}` : ''}</p>
          <h1 className="text-4xl md:text-5xl font-bold text-ink leading-[1.02]">
            Your momentum, at a glance
          </h1>
        </div>
        <div className="inline-flex p-1 rounded-2xl bg-surface border border-line shadow-sm self-start lg:self-auto overflow-x-auto max-w-full" role="tablist" aria-label="Time period">
          {TIMEFRAMES.map((option) => (
            <button
              key={option.value}
              role="tab"
              aria-selected={timeframe === option.value}
              onClick={() => setTimeframe(option.value)}
              className={cn('h-9 px-3.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all',
                timeframe === option.value ? 'bg-ink text-bg' : 'text-ink-2 hover:text-ink')}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {metrics.smallSample && (
        <Notice tone="sunbeam" icon={Info}>
          Only {metrics.submitted} proposal{metrics.submitted === 1 ? '' : 's'} submitted in this period. Rates based on fewer than {MIN_SAMPLE_FOR_RATES} can swing a lot, so treat them as rough.
        </Notice>
      )}

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-[var(--radius-2xl)] bg-sunbeam p-6 text-on-sunbeam md:row-span-2 flex flex-col justify-between min-h-[15rem]">
          <div className="relative flex items-center justify-between">
            <span className="w-11 h-11 rounded-2xl bg-on-sunbeam text-sunbeam flex items-center justify-center"><Send className="w-5 h-5" /></span>
            <span className="text-xs font-semibold bg-on-sunbeam text-sunbeam rounded-full px-2.5 py-1">{TIMEFRAMES.find((t) => t.value === timeframe)?.label}</span>
          </div>
          <div className="relative">
            <p className="font-display text-7xl font-extrabold leading-none">{isLoading ? '…' : metrics.submitted}</p>
            <p className="font-semibold mt-2">Proposals submitted</p>
            <p className="text-sm mt-0.5">{metrics.drafted} draft{metrics.drafted === 1 ? '' : 's'} waiting to be sent</p>
          </div>
        </div>

        <RateRing label="View rate" value={metrics.viewRate} detail={of(metrics.viewed)} tone="ultraviolet" />
        <RateRing label="Response rate" value={metrics.responseRate} detail={of(metrics.responded)} tone="sunbeam" />
        <RateRing label="Win rate" value={metrics.winRate} detail={of(metrics.won)} tone="lagoon" />

        <Card className="p-5 flex items-start gap-4 xl:col-span-2">
          <IconTile icon={Wallet} tone="lagoon" size="lg" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-2">Confirmed earnings</p>
            <p className="font-display text-3xl font-bold text-ink mt-0.5">{formatMoney(metrics.confirmedEarnings)}</p>
            <p className="text-xs text-ink-3 mt-1">
              {metrics.estimatedEarnings
                ? `+ ~${formatMoney(metrics.estimatedEarnings)} estimated from fixed budgets`
                : metrics.wonWithoutEarnings ? `${metrics.wonWithoutEarnings} win(s) with no amount recorded` : 'From wins with a final amount'}
            </p>
          </div>
        </Card>

        <Card className="p-5 flex items-start gap-4">
          <IconTile icon={Coins} tone="sunbeam" size="lg" />
          <div>
            <p className="text-sm font-semibold text-ink-2">Connects spent</p>
            <p className="font-display text-3xl font-bold text-ink mt-0.5">{metrics.connectsSpent.toLocaleString()}</p>
            <p className="text-xs text-ink-3 mt-1">On submitted proposals</p>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="p-6 xl:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-ink">Daily activity</h2>
            <div className="flex items-center gap-4 text-xs text-ink-2">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-lagoon" />Submitted</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sunbeam" />Drafts</span>
            </div>
          </div>
          <div className="h-[280px]">
            {hasActivity ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.series} margin={{ top: 6, right: 6, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 6" stroke={palette.line} vertical={false} />
                  <XAxis dataKey="date" stroke={palette.ink3} fontSize={12} tickLine={false} axisLine={false} minTickGap={20} />
                  <YAxis stroke={palette.ink3} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: palette.line, strokeWidth: 2 }} />
                  <Area isAnimationActive={false} type="monotone" name="Submitted" dataKey="submitted" stroke={palette.lagoon} strokeWidth={3} fill="none" />
                  <Area isAnimationActive={false} type="monotone" name="Drafts" dataKey="drafted" stroke={palette.sunbeam} strokeWidth={2.5} fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={PenLine} tone="flamingo" title="No activity in this period" className="h-full py-0"
                action={<Link to="/write"><Button size="sm" icon={ArrowUpRight}>Write a proposal</Button></Link>}>
                Write or log a proposal and it shows up here.
              </EmptyState>
            )}
          </div>
        </Card>

        {/* Solid teal card: black text, black tracks, cream/yellow/teal bars */}
        <Card className="p-6 bg-lagoon border-lagoon text-[#000000]">
          <h2 className="text-lg font-semibold mb-5">Conversion funnel</h2>
          {metrics.submitted ? (
            <Funnel steps={[
              { name: 'Submitted', value: metrics.submitted, bar: 'bg-[#fbf6ea]' },
              { name: 'Viewed', value: metrics.viewed, bar: 'bg-[#fbf6ea]' },
              { name: 'Responded', value: metrics.responded, bar: 'bg-sunbeam' },
              { name: 'Won', value: metrics.won, bar: 'bg-lagoon' },
            ]} />
          ) : (
            <p className="text-sm py-10 text-center">The funnel appears once you've submitted proposals in this period.</p>
          )}
        </Card>
      </div>

      <details className="card p-5 text-sm text-ink-2 group">
        <summary className="cursor-pointer font-semibold text-ink list-none flex items-center gap-2">
          <Info className="w-4 h-4 text-ultraviolet" /> How these numbers are calculated
        </summary>
        <ul className="mt-3 space-y-1.5 list-disc pl-5">
          <li><strong className="text-ink">Period:</strong> "N days" is today plus the previous N−1 days, in your local time. Sent proposals are dated by their submission date, drafts by when they were created.</li>
          <li><strong className="text-ink">Submitted:</strong> status Submitted, Viewed, Responded, Won or Lost. Drafts and archived proposals are not counted.</li>
          <li><strong className="text-ink">View rate:</strong> (Viewed + Responded + Won) ÷ Submitted. A response or a win implies the client viewed it.</li>
          <li><strong className="text-ink">Response rate:</strong> (Responded + Won) ÷ Submitted. <strong className="text-ink">Win rate:</strong> Won ÷ Submitted.</li>
          <li><strong className="text-ink">Confirmed earnings:</strong> the Final Earnings on won jobs. The estimate uses fixed-price budgets of wins with no final amount; hourly wins can't be estimated.</li>
          <li>Rates show "—" when nothing was submitted, and a warning below {MIN_SAMPLE_FOR_RATES} submissions. A higher rate doesn't prove a particular proposal style caused it.</li>
        </ul>
      </details>
    </div>
  );
}
