import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BookOpenCheck, Globe2, HelpCircle, Scale, Search, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiJson, usePolling } from '../lib/workflows';
import WorkflowProgress from '../components/shared/WorkflowProgress';
import { CitedText, Findings, SourceList } from '../components/shared/ReportParts';
import { Button, Card, EmptyState, Notice, PageHeader, SectionTitle } from '../components/ui';

const EXAMPLES = [
  'Which Shopify skills are clients asking for most this year?',
  'What do companies pay freelance React developers in 2026?',
  'Which AI automation services are small businesses buying right now?',
];

export default function Research() {
  const [question, setQuestion] = useState('');
  const [runs, setRuns] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const loadRuns = useCallback(async () => {
    try {
      setRuns(await apiJson('/api/research/jobs'));
    } catch (loadError) {
      setError(loadError.message);
    }
  }, []);

  useEffect(() => {
    loadRuns();
    apiJson('/api/research/status').then(setStatus).catch(() => setStatus({ configured: false }));
  }, [loadRuns]);

  const { data: run, isDone } = usePolling(selectedId ? `/api/research/jobs/${selectedId}` : null);

  useEffect(() => {
    if (isDone) loadRuns();
  }, [isDone, loadRuns]);

  const start = async (e) => {
    e.preventDefault();
    setError('');
    setIsStarting(true);
    try {
      const started = await apiJson('/api/research/jobs', { method: 'POST', body: JSON.stringify({ question }) });
      setSelectedId(started.id);
      setQuestion('');
      await loadRuns();
    } catch (startError) {
      setError(startError.message);
    } finally {
      setIsStarting(false);
    }
  };

  const ready = Boolean(status?.configured);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Research"
        title="Ask the web,"
        highlight="get receipts"
        description="Answers from current public sources. Every claim is cited and dated, and disagreements are called out."
      />

      {status && !ready && (
        <Notice tone="sunbeam" icon={AlertTriangle}>
          Web research isn't set up on the server yet. Add <code className="font-mono text-xs">SEARCH_PROVIDER</code> (tavily, brave or exa) and <code className="font-mono text-xs">SEARCH_API_KEY</code> to the backend's environment variables.
        </Notice>
      )}

      <form onSubmit={start} className="relative">
        <div className="relative card p-2 flex flex-col sm:flex-row gap-2 border-2 border-lagoon">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={500}
              disabled={!ready || isStarting}
              placeholder="What do you want to know about your market?"
              aria-label="Research question"
              className="w-full h-14 bg-transparent pl-12 pr-4 text-base text-ink placeholder:text-ink-3 focus:outline-none disabled:text-ink-3"
            />
          </div>
          <Button type="submit" variant="success" size="lg" icon={Sparkles} loading={isStarting} disabled={!ready || question.trim().length < 10}>
            Research
          </Button>
        </div>
      </form>
      {ready && !runs.length && (
        <div className="flex flex-wrap gap-2 -mt-2">
          {EXAMPLES.map((example) => (
            <button key={example} onClick={() => setQuestion(example)} className="text-xs font-medium rounded-full border border-line bg-surface px-3 py-1.5 text-ink-2 hover:text-ink hover:border-lagoon">
              {example}
            </button>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-1 xl:grid-cols-[18rem_minmax(0,1fr)] gap-5 items-start">
        <Card className="p-2 xl:sticky xl:top-28 max-h-[70vh] overflow-y-auto">
          <p className="eyebrow px-3 pt-2 pb-2">Past questions</p>
          {!runs.length && <p className="text-sm text-ink-3 px-3 py-4">Nothing yet.</p>}
          {runs.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={cn('w-full text-left rounded-xl px-3 py-2.5 transition-colors', selectedId === item.id ? 'bg-surface-2 ring-1 ring-line' : 'hover:bg-surface-2')}
            >
              <span className="block text-sm font-medium text-ink line-clamp-2">{item.input?.question}</span>
              <span className="block text-xs text-ink-3 mt-0.5">
                {new Date(item.createdAt).toLocaleDateString()}
                {item.status !== 'completed' && <span className={item.status === 'failed' ? 'text-danger' : 'text-sunbeam-ink'}> · {item.status}</span>}
              </span>
            </button>
          ))}
        </Card>

        <div className="space-y-5 min-w-0">
          {!selectedId && (
            <Card><EmptyState icon={Globe2} tone="lagoon" title="Ask something about your market" className="py-16">Your cited answer will appear here.</EmptyState></Card>
          )}
          {run && run.status !== 'completed' && <WorkflowProgress run={run} title={run.input?.question || 'Researching'} />}
          {run?.status === 'completed' && <ResearchResult result={run.result} />}
        </div>
      </div>
    </div>
  );
}

function ResearchResult({ result }) {
  const { sources } = result;
  const used = sources.filter((s) => s.relevant).length;

  return (
    <div className="space-y-5 animate-rise">
      <Card className="relative overflow-hidden p-6">
        <div className="absolute inset-x-0 top-0 h-1 bg-lagoon" />
        <p className="eyebrow">Answer · {used} source{used === 1 ? '' : 's'} · {new Date(result.retrievedAt).toLocaleString()}</p>
        <h2 className="text-2xl font-bold text-ink mt-1.5">{result.question}</h2>
        <p className="text-ink leading-8 mt-4 text-[1.02rem]"><CitedText text={result.summary} sources={sources} /></p>
      </Card>

      <Card className="p-6">
        <SectionTitle icon={BookOpenCheck} tone="lagoon" title="Findings" />
        <Findings findings={result.findings} sources={sources} />
      </Card>

      {(result.conflicts.length > 0 || result.gaps.length > 0) && (
        <div className="grid md:grid-cols-2 gap-5">
          {result.conflicts.length > 0 && (
            <Card className="p-6">
              <SectionTitle icon={Scale} tone="sunbeam" title="Where sources disagree" />
              <ul className="space-y-2 text-sm text-ink-2">
                {result.conflicts.map((c, i) => <li key={i}>{c.description} <CitedText text={c.sourceRefs.length ? `[${c.sourceRefs.join(', ')}]` : ''} sources={sources} /></li>)}
              </ul>
            </Card>
          )}
          {result.gaps.length > 0 && (
            <Card className="p-6">
              <SectionTitle icon={HelpCircle} tone="sky" title="Still unanswered" />
              <ul className="list-disc pl-5 space-y-1 text-sm text-ink-2">{result.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
            </Card>
          )}
        </div>
      )}

      <Card className="p-6">
        <SectionTitle icon={Globe2} tone="ultraviolet" title="Sources" />
        <SourceList sources={sources} />
        <p className="text-xs text-ink-3 mt-4">Searched for: {result.queries.join(' · ')}</p>
      </Card>
    </div>
  );
}
