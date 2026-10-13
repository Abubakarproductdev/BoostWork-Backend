import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Check, ClipboardCopy, FileSearch, HelpCircle, ListChecks, RotateCcw, Save,
  ShieldCheck, Sparkles, Wand2, Zap,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useJobContext } from '../context/JobContext';
import { apiJson, usePolling } from '../lib/workflows';
import ProfileSetupNotice from '../components/shared/ProfileSetupNotice';
import WorkflowProgress from '../components/shared/WorkflowProgress';
import { Badge, Button, Card, EmptyState, Meter, PageHeader, SectionTitle, TONES } from '../components/ui';

const RUN_KEY = 'proposal-workflow-run';
const countWords = (text) => (text.trim().match(/\S+/g) || []).length;

const SCORE_LABELS = {
  relevance: 'Relevance',
  specificity: 'Specificity',
  evidenceQuality: 'Evidence',
  tone: 'Tone',
  opening: 'Opening',
  length: 'Length',
};

export default function ProposalWriting() {
  const { addJob } = useJobContext();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quickMode, setQuickMode] = useState(false);
  const [runId, setRunId] = useState(() => sessionStorage.getItem(RUN_KEY));
  const [startError, setStartError] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [quickResult, setQuickResult] = useState(null);
  const [editedText, setEditedText] = useState('');
  const [saveState, setSaveState] = useState({ status: 'idle', message: '' });
  const [copied, setCopied] = useState(false);

  const { data: run, error: pollError } = usePolling(runId ? `/api/ai/proposal-workflows/${runId}` : null);
  const result = run?.status === 'completed' ? run.result : null;
  const isRunning = isStarting || (run && ['queued', 'running'].includes(run.status));

  // Load the finished proposal into the editor once
  useEffect(() => {
    if (result?.proposalText) setEditedText(result.proposalText);
  }, [result?.proposalText]);

  const startWorkflow = async (e) => {
    e.preventDefault();
    setStartError('');
    setSaveState({ status: 'idle', message: '' });
    setQuickResult(null);
    setIsStarting(true);

    try {
      if (quickMode) {
        const data = await apiJson('/api/ai/generate-proposal', {
          method: 'POST',
          body: JSON.stringify({ jobDescription: description }),
        });
        const text = [data.hook, data.body, data.portfolio_proof].filter(Boolean).join('\n\n');
        sessionStorage.removeItem(RUN_KEY);
        setRunId(null);
        setQuickResult({ title, jobDescription: description });
        setEditedText(text);
      } else {
        const started = await apiJson('/api/ai/proposal-workflows', {
          method: 'POST',
          body: JSON.stringify({ title, jobDescription: description }),
        });
        sessionStorage.setItem(RUN_KEY, started.id);
        setEditedText('');
        setRunId(started.id);
      }
    } catch (error) {
      setStartError(error.message);
    } finally {
      setIsStarting(false);
    }
  };

  const reset = () => {
    sessionStorage.removeItem(RUN_KEY);
    setRunId(null);
    setQuickResult(null);
    setEditedText('');
    setSaveState({ status: 'idle', message: '' });
  };

  const copy = async () => {
    await navigator.clipboard.writeText(editedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const saveDraft = async () => {
    setSaveState({ status: 'saving', message: '' });
    try {
      const saved = await apiJson('/api/proposals', {
        method: 'POST',
        body: JSON.stringify({
          title: result?.title || quickResult?.title || title,
          status: 'draft',
          jobDetails: {
            description: run?.input?.jobDescription || quickResult?.jobDescription || description,
            jobPostedDate: new Date().toISOString().slice(0, 10),
          },
          proposalText: editedText,
        }),
      });
      addJob(saved);
      setSaveState({ status: 'saved', message: 'Saved to Proposals as a draft.' });
    } catch (error) {
      setSaveState({ status: 'error', message: error.message });
    }
  };

  const hasOutput = Boolean(editedText) && (result || quickResult);
  const wordCount = useMemo(() => countWords(editedText), [editedText]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI Writer"
        title="Proposals that sound"
        highlight="like you, only sharper"
        description="Paste a job. BoostWork analyzes it, picks your best evidence, drafts, critiques, and checks every claim before you see it."
        actions={(runId || quickResult) && <Button variant="secondary" icon={RotateCcw} onClick={reset}>New proposal</Button>}
      />

      <ProfileSetupNotice />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-5 items-start">
        {/* Composer + progress */}
        <div className="space-y-5 xl:sticky xl:top-28">
          <Card as="form" onSubmit={startWorkflow} className="p-5 space-y-4">
            <div>
              <label className="label" htmlFor="job-title">Job title</label>
              <input id="job-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isRunning}
                placeholder="e.g. Senior React developer for a logistics dashboard" className="field" />
            </div>
            <div>
              <label className="label" htmlFor="job-description">Job description</label>
              <textarea id="job-description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={isRunning} rows={9}
                placeholder="Paste the full job post here…" className="field resize-y leading-relaxed" />
              <p className="text-xs text-ink-3 mt-1.5 text-right">{countWords(description)} words</p>
            </div>

            <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-surface-2 border border-line">
              {[
                { quick: false, icon: Wand2, label: 'Full workflow', hint: 'Analyze, draft, review' },
                { quick: true, icon: Zap, label: 'Quick draft', hint: 'One fast pass' },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  disabled={isRunning}
                  onClick={() => setQuickMode(option.quick)}
                  className={cn('rounded-xl px-3 py-2 text-left transition-all', quickMode === option.quick ? 'bg-surface shadow-sm ring-1 ring-line' : 'hover:bg-surface-2')}
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                    <option.icon className={cn('w-4 h-4', quickMode === option.quick ? (option.quick ? 'text-sunbeam-ink' : 'text-sunbeam-ink') : 'text-ink-3')} />
                    {option.label}
                  </span>
                  <span className="block text-xs text-ink-3 mt-0.5">{option.hint}</span>
                </button>
              ))}
            </div>

            <Button type="submit" size="lg" className="w-full" icon={Sparkles} loading={isRunning}
              disabled={title.trim().length < 3 || description.trim().length < 20}>
              {isRunning ? 'Working on it…' : 'Generate proposal'}
            </Button>
            {startError && <p className="text-sm text-danger">{startError}</p>}
          </Card>

          {run && <WorkflowProgress run={run} title="Workflow" />}
          {pollError && <p className="text-sm text-danger">Lost connection to the workflow: {pollError}</p>}
          {result && <JobAnalysis jobSpec={result.jobSpec} />}
        </div>

        {/* Output */}
        <div className="space-y-5 min-w-0">
          {!hasOutput && !isRunning && (
            <Card className="relative overflow-hidden">
              <EmptyState icon={Sparkles} tone="flamingo" title="Your proposal will appear here" className="py-20 relative">
                You'll be able to edit it, see which projects backed it up, and review any issues before saving.
              </EmptyState>
            </Card>
          )}

          {isRunning && !hasOutput && (
            <Card className="p-8 space-y-4">
              <div className="skeleton h-6 w-1/3" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-11/12" />
              <div className="skeleton h-4 w-4/5" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-4 w-2/3" />
              <p className="text-sm text-ink-3 pt-2">Usually takes 1–2 minutes on the free AI tier.</p>
            </Card>
          )}

          {hasOutput && (
            <Card className="overflow-hidden animate-rise">
              <div className="h-1 bg-lagoon" />
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-ink">Your proposal</h2>
                    {result && (result.passedChecks
                      ? <Badge tone="lagoon"><ShieldCheck className="w-3.5 h-3.5" />Passed checks</Badge>
                      : <Badge tone="sunbeam"><AlertTriangle className="w-3.5 h-3.5" />Review issues</Badge>)}
                  </div>
                  <span className={cn('text-xs font-semibold', wordCount > 230 || wordCount < 110 ? 'text-sunbeam-ink' : 'text-ink-3')}>{wordCount} words</span>
                </div>
                <textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={14}
                  aria-label="Proposal text"
                  className="w-full rounded-2xl border border-line bg-surface-2 p-5 text-[0.95rem] leading-7 text-ink focus:outline-none focus:border-lagoon focus:ring-4 focus:ring-lagoon resize-y"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="secondary" icon={copied ? Check : ClipboardCopy} onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
                  <Button variant="success" icon={saveState.status === 'saved' ? Check : Save} onClick={saveDraft}
                    loading={saveState.status === 'saving'} disabled={saveState.status === 'saved' || !editedText.trim()}>
                    {saveState.status === 'saved' ? 'Saved' : 'Save as draft'}
                  </Button>
                  {saveState.message && <span className={cn('text-sm', saveState.status === 'error' ? 'text-danger' : 'text-lagoon')}>{saveState.message}</span>}
                </div>
                {result?.clarificationQuestion && (
                  <div className="flex items-start gap-3 rounded-2xl bg-sky-soft border border-sky p-4">
                    <HelpCircle className="w-5 h-5 text-sky shrink-0 mt-0.5" />
                    <p className="text-sm text-ink"><span className="font-semibold">Worth asking the client: </span>{result.clarificationQuestion}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {result && (
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5">
              <QualityPanel result={result} />
              <EvidencePanel evidence={result.evidence} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QualityPanel({ result }) {
  const { critique, validation, uncertainties, revisions } = result;
  const issues = [
    ...validation.errors.map((e) => ({ severity: 'high', text: e.message, source: 'Rule check' })),
    ...critique.unsupportedClaims.map((c) => ({ severity: 'high', text: `Unsupported claim: "${c.claim}". ${c.reason}`, source: 'Reviewer' })),
    ...critique.issues.map((i) => ({ severity: i.severity, text: `${i.quote ? `"${i.quote}": ` : ''}${i.suggestion}`, source: i.category || 'Reviewer' })),
    ...validation.warnings.map((w) => ({ severity: 'medium', text: w.message, source: 'Evidence check' })),
  ];
  const severityTone = { high: 'danger', medium: 'sunbeam', low: 'neutral' };

  return (
    <Card className="p-5">
      <SectionTitle icon={ShieldCheck} tone="lagoon" title="Quality review"
        aside={<span className="text-xs text-ink-3">{revisions ? `Revised ${revisions}×` : 'First draft passed'}</span>} />
      {critique.summary && <p className="text-sm text-ink-2 mb-4">{critique.summary}</p>}

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-5">
        {Object.entries(SCORE_LABELS).map(([key, label]) => (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1.5"><span className="text-ink-2">{label}</span><span className="font-semibold text-ink">{critique.scores[key]}/5</span></div>
            <Meter value={critique.scores[key]} />
          </div>
        ))}
      </div>

      {issues.length ? (
        <ul className="space-y-2">
          {issues.map((issue, i) => (
            <li key={i} className={cn('rounded-xl border px-3 py-2 text-sm', TONES[severityTone[issue.severity] || 'neutral'].soft)}>
              <span className="text-ink">{issue.text}</span>
              <span className="block text-[11px] font-semibold uppercase tracking-wider mt-0.5">{issue.source}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-lagoon flex items-center gap-2"><Check className="w-4 h-4" /> No issues found.</p>
      )}

      {uncertainties?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-line">
          <p className="eyebrow mb-1.5">The AI wasn't sure about</p>
          <ul className="list-disc pl-5 text-sm text-ink-2 space-y-0.5">{uncertainties.map((u, i) => <li key={i}>{u}</li>)}</ul>
        </div>
      )}
    </Card>
  );
}

function EvidencePanel({ evidence }) {
  return (
    <Card className="p-5">
      <SectionTitle icon={FileSearch} tone="sky" title="Portfolio evidence" />
      {!evidence.length ? (
        <p className="text-sm text-ink-2">No portfolio projects yet, so the proposal doesn't reference past work. Add projects on your Profile.</p>
      ) : (
        <ul className="space-y-2">
          {evidence.map((item) => (
            <li key={item.ref} className={cn('rounded-xl border p-3 transition-colors', item.used ? 'border-sky bg-sky-soft' : 'border-line bg-surface-2')}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] text-ink-3">{item.ref}</span>
                <span className="font-semibold text-ink text-sm">{item.title}</span>
                {item.used && <Badge tone="sky">Used</Badge>}
              </div>
              <p className="text-xs text-ink-3 mt-1">
                {item.matchedTerms.length ? `Matches: ${item.matchedTerms.join(', ')}` : 'No direct keyword match'}
                {item.technologies.length ? ` · ${item.technologies.join(', ')}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function List({ label, items, tone }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="eyebrow mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => <Badge key={i} tone={tone} className="whitespace-normal text-left">{item}</Badge>)}
      </div>
    </div>
  );
}

function JobAnalysis({ jobSpec }) {
  return (
    <Card className="p-5 space-y-4">
      <SectionTitle icon={ListChecks} tone="ultraviolet" title="Job analysis" className="mb-0" />
      <p className="text-sm text-ink">{jobSpec.clientProblem}</p>
      <List label="Deliverables" items={jobSpec.deliverables} tone="flamingo" />
      <List label="Skills asked for" items={jobSpec.skills} tone="ultraviolet" />
      <List label="Constraints" items={jobSpec.constraints} tone="sunbeam" />
      <List label="Worth clarifying" items={jobSpec.unknowns} tone="sky" />
      <List label="Inferred (not stated)" items={jobSpec.inferredRequirements} tone="neutral" />
    </Card>
  );
}
