import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Badge } from '../ui';

const LEVEL_TONE = { high: 'lagoon', medium: 'sunbeam', low: 'neutral' };

export function LevelBadge({ label, level }) {
  return <Badge tone={LEVEL_TONE[level] || 'neutral'}>{label}: {level}</Badge>;
}

/** Citation chips; web sources link to their URL, other refs show their title on hover. */
export function RefChips({ refs = [], sources = [] }) {
  if (!refs.length) return null;
  const byRef = new Map(sources.map((s) => [s.ref, s]));

  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {refs.map((ref) => {
        const source = byRef.get(ref);
        const className = 'inline-flex items-center h-5 px-1.5 rounded-md font-mono text-[10.5px] font-medium bg-ultraviolet-soft text-ultraviolet border border-ultraviolet';
        return source?.url ? (
          <a key={ref} href={source.url} target="_blank" rel="noopener noreferrer" title={source.title} className={cn(className, 'hover:bg-ultraviolet-soft')}>{ref}</a>
        ) : (
          <span key={ref} title={source?.title || ref} className={className}>{ref}</span>
        );
      })}
    </span>
  );
}

/** Renders text with inline [S1] citations turned into chips. */
export function CitedText({ text = '', sources = [] }) {
  const parts = text.split(/(\[(?:S\d+(?:,\s*)?)+\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const refs = part.match(/S\d+/g);
        return part.startsWith('[') && refs ? <RefChips key={i} refs={refs} sources={sources} /> : <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}

export function Findings({ findings = [], sources = [] }) {
  if (!findings.length) return <p className="text-sm text-ink-3">No evidence-backed findings.</p>;

  return (
    <ul className="grid gap-3">
      {findings.map((finding, i) => (
        <li key={finding._id || i} className="rounded-2xl border border-line bg-surface-2 p-4 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-semibold text-ink">{finding.statement}</p>
            <LevelBadge label="Confidence" level={finding.confidence} />
          </div>
          {finding.evidence && <p className="text-sm text-ink-2"><span className="text-ink-3">Evidence · </span>{finding.evidence}</p>}
          {finding.limitations && <p className="text-xs text-ink-3">Limitations · {finding.limitations}</p>}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {finding.category && <span className="eyebrow">{finding.category}</span>}
            <RefChips refs={finding.sourceRefs} sources={sources} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function SourceList({ sources = [] }) {
  const web = sources.filter((s) => s.url);
  if (!web.length) return null;

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {web.map((source) => (
        <li key={source.ref} className={cn('rounded-2xl border border-line bg-surface-2 p-3.5 flex gap-3', source.relevant === false && 'text-ink-3')}>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-ultraviolet-soft text-ultraviolet font-mono text-xs shrink-0">{source.ref}</span>
          <div className="min-w-0">
            <a href={source.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-sm text-ink hover:text-sunbeam-ink inline-flex items-start gap-1 break-words">
              <span className="line-clamp-2">{source.title || source.url}</span> <ExternalLink className="w-3 h-3 shrink-0 mt-1" />
            </a>
            <p className="text-xs text-ink-3 mt-0.5">
              {source.domain || new URL(source.url).hostname}
              {' · '}{source.publishedAt ? `published ${String(source.publishedAt).slice(0, 10)}` : 'no date'}
              {source.retrievedAt && ` · read ${new Date(source.retrievedAt).toLocaleDateString()}`}
            </p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {source.outdated && <Badge tone="sunbeam">Over 2 years old</Badge>}
              {source.fetched === false && <Badge tone="sunbeam">Snippet only</Badge>}
              {source.relevant === false && <Badge tone="neutral">Not used</Badge>}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
