import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, BarChart3, Check, Compass, Globe2, Lightbulb, RotateCcw, Trash2, UserCheck, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiJson, usePolling } from '../lib/workflows';
import WorkflowProgress from '../components/shared/WorkflowProgress';
import { Findings, LevelBadge, RefChips, SourceList } from '../components/shared/ReportParts';
import { Button, Card, EmptyState, IconButton, IconTile, PageHeader, SectionTitle, Spinner, TONES } from '../components/ui';

const REPORT_TYPES = {
  'profile-audit': { label: 'Profile audit', icon: UserCheck, tone: 'sunbeam', path: 'profile-audit', description: 'Finds vague positioning, unsupported skills and weak project write-ups, with before/after rewrites.' },
  'performance-analysis': { label: 'Performance analysis', icon: BarChart3, tone: 'sky', path: 'performance-analysis', description: 'Breaks down your results by budget, length, client and month, with honest sample sizes.' },
  'market-research': { label: 'Market research', icon: Globe2, tone: 'lagoon', path: 'market-research', description: 'Researches current sources on your field and turns cited evidence into next moves.' },
};

const isReportDone = (report) => ['completed', 'failed'].includes(report?.status);

export default function Strategy() {
  const [reports, setReports] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [researchReady, setResearchReady] = useState(null);
  const [focus, setFocus] = useState('');
  const [starting, setStarting] = useState('');
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    try {
      setReports(await apiJson('/api/strategy/reports'));
    } catch (loadError) {
      setError(loadError.message);
    }
  }, []);

  useEffect(() => {
    loadReports();
    apiJson('/api/research/status').then((s) => setResearchReady(s.configured)).catch(() => setResearchReady(false));
  }, [loadReports]);

  const { data: report } = usePolling(selectedId ? `/api/strategy/reports/${selectedId}` : null, { intervalMs: 2000, isDone: isReportDone });

  // Refresh the list when the open report finishes
  useEffect(() => {
    if (isReportDone(report)) loadReports();
  }, [report?.status, loadReports]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = async (type) => {
    setError('');
    setStarting(type);
    try {
      const data = await apiJson(`/api/strategy/${REPORT_TYPES[type].path}`, {
        method: 'POST',
        body: JSON.stringify(type === 'market-research' ? { focus } : {}),
      });
      setSelectedId(data.reportId);
      await loadReports();
    } catch (startError) {
      setError(startError.message);
    } finally {
      setStarting('');
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this report?')) return;
    try {
      await apiJson(`/api/strategy/reports/${id}`, { method: 'DELETE' });
      if (selectedId === id) setSelectedId(null);
      await loadReports();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Strategy"
        title="Know what to"
        highlight="change next"
        description="Evidence-based reports on your profile, your results and your market. Every finding shows its evidence and how sure we are."
      />

      {error && <p className="rounded-2xl border border-danger bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Object.entries(REPORT_TYPES).map(([type, meta]) => {
          const needsSearch = type === 'market-research';
          const blocked = needsSearch && researchReady === false;
          return (
            <Card key={type} className="relative overflow-hidden p-5 flex flex-col gap-4">
              <div className={cn('absolute inset-x-0 top-0 h-1', TONES[meta.tone].dot)} />
              <div className="relative flex items-center gap-3">
                <IconTile icon={meta.icon} tone={meta.tone} size="lg" />
                <h2 className="text-lg font-bold text-ink">{meta.label}</h2>
              </div>
              <p className="relative text-sm text-ink-2 flex-1">{meta.description}</p>
              {needsSearch && !blocked && (
                <input value={focus} onChange={(e) => setFocus(e.target.value)} maxLength={300}
                  placeholder="Optional focus, e.g. Shopify app development" className="field relative h-10 text-sm" />
              )}
              {blocked && <p className="relative text-xs text-sunbeam-ink">Needs web search on the server (SEARCH_PROVIDER and SEARCH_API_KEY).</p>}
              <Button variant="secondary" className="relative justify-between" onClick={() => start(type)} loading={starting === type} disabled={Boolean(starting) || blocked}>
                Run {meta.label.toLowerCase()} <ArrowRight className="w-4 h-4" />
              </Button>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[18rem_minmax(0,1fr)] gap-5 items-start">
        <Card className="p-2 xl:sticky xl:top-28 max-h-[70vh] overflow-y-auto">
          <p className="eyebrow px-3 pt-2 pb-2">Your reports</p>
          {!reports.length && <p className="text-sm text-ink-3 px-3 py-4">No reports yet. Run one above.</p>}
          {reports.map((item) => {
            const meta = REPORT_TYPES[item.reportType];
            const open = item.recommendations?.filter((r) => r.userStatus === 'new').length || 0;
            return (
              <button
                key={item._id}
                onClick={() => setSelectedId(item._id)}
                className={cn('w-full text-left rounded-xl px-3 py-2.5 flex items-start gap-3 transition-colors', selectedId === item._id ? 'bg-surface-2 ring-1 ring-line' : 'hover:bg-surface-2')}
              >
                <span className={cn('mt-1.5 w-2 h-2 rounded-full shrink-0', TONES[meta?.tone || 'neutral'].dot)} />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink truncate">{item.title || meta?.label}</span>
                  <span className="block text-xs text-ink-3">
                    {new Date(item.createdAt).toLocaleDateString()}
                    {item.status !== 'completed' && <span className={item.status === 'failed' ? 'text-danger' : 'text-sunbeam-ink'}> · {item.status}</span>}
                    {item.status === 'completed' && open > 0 && <span> · {open} to review</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </Card>

        <div className="min-w-0">
          {!selectedId && (
            <Card><EmptyState icon={Compass} tone="ultraviolet" title="Pick a report" className="py-16">Run a report above or open one from your list.</EmptyState></Card>
          )}
          {selectedId && !report && <Card className="p-10 flex justify-center"><Spinner label="Loading report…" /></Card>}
          {selectedId && report && <ReportView report={report} onDelete={() => remove(report._id)} onRetry={() => start(report.reportType)} onUpdated={loadReports} />}
        </div>
      </div>
    </div>
  );
}

function ReportView({ report, onDelete, onRetry, onUpdated }) {
  const meta = REPORT_TYPES[report.reportType];
  const [recommendations, setRecommendations] = useState(report.recommendations || []);
  const [updating, setUpdating] = useState('');

  useEffect(() => {
    setRecommendations(report.recommendations || []);
  }, [report._id, report.status]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = async (rec, userStatus) => {
    setUpdating(rec._id);
    try {
      const updated = await apiJson(`/api/strategy/reports/${report._id}/recommendations/${rec._id}`, {
        method: 'PATCH',
        body: JSON.stringify({ userStatus }),
      });
      setRecommendations((list) => list.map((r) => (r._id === rec._id ? updated : r)));
      onUpdated?.();
    } finally {
      setUpdating('');
    }
  };

  if (!isReportDone(report)) {
    return <WorkflowProgress run={report.run} title={`${meta?.label}: generating`} />;
  }

  if (report.status === 'failed') {
    return (
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-bold text-ink">{meta?.label} couldn't finish</h2>
        <p className="text-sm text-danger">{report.error || 'The report could not be generated.'}</p>
        <div className="flex gap-2">
          <Button icon={RotateCcw} onClick={onRetry}>Try again</Button>
          <Button variant="ghost" onClick={onDelete}>Delete</Button>
        </div>
      </Card>
    );
  }

  const sources = report.sourceRefs || [];

  return (
    <div className="space-y-5 animate-rise">
      <Card className="relative overflow-hidden p-6">
        <div className={cn('absolute inset-x-0 top-0 h-1', TONES[meta?.tone || 'neutral'].dot)} />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{meta?.label} · {new Date(report.createdAt).toLocaleString()}</p>
            <h2 className="text-2xl font-bold text-ink mt-1.5">{report.title}</h2>
          </div>
          <IconButton icon={Trash2} label="Delete report" tone="danger" onClick={onDelete} />
        </div>
        <p className="text-ink-2 leading-relaxed mt-3">{report.summary}</p>
        {report.reportType === 'performance-analysis' && report.metrics?.totals && <MetricsSummary metrics={report.metrics} />}
      </Card>

      <Card className="p-6">
        <SectionTitle icon={Lightbulb} tone="sunbeam" title="Findings" />
        <Findings findings={report.findings} sources={sources} />
      </Card>

      <Card className="p-6">
        <SectionTitle icon={Check} tone="lagoon" title="Recommendations"
          aside={<span className="text-xs text-ink-3">{recommendations.filter((r) => r.userStatus === 'new').length} to review</span>} />
        {!recommendations.length && <p className="text-sm text-ink-3">No recommendations.</p>}
        <ul className="space-y-3">
          {recommendations.map((rec) => (
            <li key={rec._id} className={cn('rounded-2xl border p-4 space-y-3 transition-opacity',
              rec.userStatus === 'rejected' ? 'border-line text-ink-3' : rec.userStatus === 'completed' ? 'border-lagoon bg-lagoon-soft' : 'border-line bg-surface-2')}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-bold text-ink">{rec.title}</p>
                <div className="flex flex-wrap gap-1.5">
                  <LevelBadge label="Effort" level={rec.estimatedEffort} />
                  <LevelBadge label="Confidence" level={rec.confidence} />
                </div>
              </div>
              {rec.description && <p className="text-sm text-ink">{rec.description}</p>}
              {(rec.rationale || rec.expectedBenefit) && (
                <div className="grid sm:grid-cols-2 gap-2 text-sm">
                  {rec.rationale && <p className="text-ink-2"><span className="eyebrow block mb-0.5">Why</span>{rec.rationale}</p>}
                  {rec.expectedBenefit && <p className="text-ink-2"><span className="eyebrow block mb-0.5">Benefit</span>{rec.expectedBenefit}</p>}
                </div>
              )}
              {rec.dependencies && <p className="text-xs text-ink-3">Depends on: {rec.dependencies}</p>}
              {(rec.before || rec.after) && (
                <div className="grid md:grid-cols-2 gap-2">
                  <div className="rounded-xl bg-danger-soft border border-danger p-3">
                    <p className="eyebrow !text-danger mb-1">Before</p>
                    <p className="text-sm text-ink-2 whitespace-pre-wrap">{rec.before || '—'}</p>
                  </div>
                  <div className="rounded-xl bg-lagoon-soft border border-lagoon p-3">
                    <p className="eyebrow !text-lagoon mb-1">Suggested</p>
                    <p className="text-sm text-ink whitespace-pre-wrap">{rec.after || '—'}</p>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <RefChips refs={rec.sourceRefs} sources={sources} />
                <div className="flex items-center gap-1.5 ml-auto">
                  <StatusButton active={rec.userStatus === 'accepted'} tone="lagoon" disabled={updating === rec._id} onClick={() => setStatus(rec, rec.userStatus === 'accepted' ? 'new' : 'accepted')} icon={<Check className="w-3.5 h-3.5" />} label="Accept" />
                  <StatusButton active={rec.userStatus === 'rejected'} tone="danger" disabled={updating === rec._id} onClick={() => setStatus(rec, rec.userStatus === 'rejected' ? 'new' : 'rejected')} icon={<X className="w-3.5 h-3.5" />} label="Reject" />
                  <StatusButton active={rec.userStatus === 'completed'} tone="ultraviolet" disabled={updating === rec._id} onClick={() => setStatus(rec, rec.userStatus === 'completed' ? 'new' : 'completed')} icon={<Check className="w-3.5 h-3.5" />} label="Done" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {(report.limitations?.length > 0 || sources.some((s) => s.url)) && (
        <Card className="p-6 space-y-5">
          {report.limitations?.length > 0 && (
            <div>
              <p className="eyebrow mb-2">Limitations</p>
              <ul className="list-disc pl-5 text-sm text-ink-2 space-y-1">{report.limitations.map((l, i) => <li key={i}>{l}</li>)}</ul>
            </div>
          )}
          {sources.some((s) => s.url) && (
            <div>
              <p className="eyebrow mb-2">Sources</p>
              <SourceList sources={sources} />
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function StatusButton({ active, onClick, icon, label, disabled, tone }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn('h-8 px-3 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all disabled:text-ink-3',
        active ? TONES[tone].soft : 'border-line bg-surface text-ink-2 hover:text-ink')}
    >
      {icon} {label}
    </button>
  );
}

function MetricsSummary({ metrics }) {
  const { totals } = metrics;
  const items = [
    ['Submitted', totals.n, 'sky'],
    ['Response rate', totals.responseRatePct == null ? '—' : `${totals.responseRatePct}%`, 'ultraviolet'],
    ['Win rate', totals.winRatePct == null ? '—' : `${totals.winRatePct}%`, 'lagoon'],
    ['Median days to reply', metrics.medianDaysToResponse ?? '—', 'sunbeam'],
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-5">
      {items.map(([label, value, tone]) => (
        <div key={label} className={cn('rounded-2xl border px-4 py-3', TONES[tone].soft)}>
          <p className="text-[11px] font-semibold uppercase tracking-wider">{label}</p>
          <p className="font-display text-2xl font-bold text-ink mt-0.5">{value}</p>
        </div>
      ))}
    </div>
  );
}

