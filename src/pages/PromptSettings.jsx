import React, { useEffect, useMemo, useState } from 'react';
import { Braces, Check, Megaphone, PenLine, RotateCcw, Save, Settings2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiJson } from '../lib/workflows';
import { Badge, Button, Card, PageHeader, Spinner, TONES } from '../components/ui';

const EMPTY_PROMPTS = {
  proposalSystemInstruction: '',
  proposalUserInstruction: '',
  leadUserInstruction: '',
};

const PROMPT_SECTIONS = [
  {
    key: 'proposalSystemInstruction',
    title: 'Voice & rules',
    detail: 'The main instructions: your voice, structure and banned phrases. Used by the full workflow, quick drafts and lead messages.',
    icon: Settings2,
    tone: 'flamingo',
    tokens: ['{{PORTFOLIO_CONTEXT}}'],
  },
  {
    key: 'proposalUserInstruction',
    title: 'Quick draft prompt',
    detail: 'Job analysis and JSON format for Quick draft mode in the Writer.',
    icon: PenLine,
    tone: 'ultraviolet',
    tokens: ['{{PERSONA}}', '{{JOB_DESCRIPTION}}'],
  },
  {
    key: 'leadUserInstruction',
    title: 'Lead message prompt',
    detail: 'Instructions for cold outreach messages on the Leads page.',
    icon: Megaphone,
    tone: 'sunbeam',
    tokens: ['{{CONTEXT}}'],
  },
];

export default function PromptSettings() {
  const [prompts, setPrompts] = useState(EMPTY_PROMPTS);
  const [savedPrompts, setSavedPrompts] = useState(EMPTY_PROMPTS);
  const [active, setActive] = useState(PROMPT_SECTIONS[0].key);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [status, setStatus] = useState(null);
  const [copiedToken, setCopiedToken] = useState('');

  const changed = useMemo(() => Object.fromEntries(
    PROMPT_SECTIONS.map(({ key }) => [key, prompts[key] !== savedPrompts[key]])
  ), [prompts, savedPrompts]);
  const hasChanges = Object.values(changed).some(Boolean);

  useEffect(() => {
    apiJson('/api/ai/prompts')
      .then((data) => {
        setPrompts(data);
        setSavedPrompts(data);
      })
      .catch((error) => setStatus({ type: 'error', message: error.message }))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);
    try {
      const data = await apiJson('/api/ai/prompts', { method: 'PUT', body: JSON.stringify(prompts) });
      setPrompts(data);
      setSavedPrompts(data);
      setStatus({ type: 'success', message: 'Prompts saved.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Restore all three prompts to the defaults? Your edits will be lost.')) return;
    setIsResetting(true);
    setStatus(null);
    try {
      const data = await apiJson('/api/ai/prompts/reset', { method: 'POST' });
      setPrompts(data);
      setSavedPrompts(data);
      setStatus({ type: 'success', message: 'Default prompts restored.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsResetting(false);
    }
  };

  const copyToken = async (token) => {
    await navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 1200);
  };

  const section = PROMPT_SECTIONS.find((s) => s.key === active);
  const value = prompts[active] || '';

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI prompts"
        title="Tune how the AI"
        highlight="writes for you"
        description="Edit the instructions behind every proposal and message. Placeholders in {{BRACES}} are filled in automatically."
        actions={(
          <>
            {status && <span className={cn('text-sm', status.type === 'error' ? 'text-danger' : 'text-lagoon')}>{status.message}</span>}
            <Button variant="secondary" icon={RotateCcw} onClick={handleReset} loading={isResetting} disabled={isSaving || isLoading}>Reset</Button>
            <Button icon={Save} onClick={handleSave} loading={isSaving} disabled={!hasChanges || isResetting}>Save prompts</Button>
          </>
        )}
      />

      {isLoading ? (
        <Card className="p-10 flex justify-center"><Spinner label="Loading your prompts…" /></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[17rem_minmax(0,1fr)] gap-5 items-start">
          <div className="flex lg:flex-col gap-2 overflow-x-auto" role="tablist" aria-label="Prompts">
            {PROMPT_SECTIONS.map((item) => (
              <button
                key={item.key}
                role="tab"
                aria-selected={active === item.key}
                onClick={() => setActive(item.key)}
                className={cn('flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all min-w-[13rem] lg:min-w-0',
                  active === item.key ? 'bg-surface border-line-strong shadow-sm' : 'border-transparent hover:bg-surface-2')}
              >
                <span className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', TONES[item.tone].icon)}><item.icon className="w-4 h-4" /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink">{item.title}</span>
                  <span className="block text-xs text-ink-3">{changed[item.key] ? 'Unsaved changes' : `${(prompts[item.key] || '').length.toLocaleString()} characters`}</span>
                </span>
                {changed[item.key] && <span className="ml-auto w-2 h-2 rounded-full bg-sunbeam shrink-0" />}
              </button>
            ))}
          </div>

          <Card className="overflow-hidden">
            <div className={cn('h-1', TONES[section.tone].dot)} />
            <div className="p-5 border-b border-line flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink">{section.title}</h2>
                <p className="text-sm text-ink-2 mt-0.5">{section.detail}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {section.tokens.map((token) => (
                  <button key={token} onClick={() => copyToken(token)} title="Copy placeholder"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ultraviolet bg-ultraviolet-soft px-2.5 py-1 font-mono text-xs text-ultraviolet hover:bg-ultraviolet-soft">
                    {copiedToken === token ? <Check className="w-3 h-3" /> : <Braces className="w-3 h-3" />}{token}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              value={value}
              onChange={(event) => setPrompts((current) => ({ ...current, [active]: event.target.value }))}
              spellCheck={false}
              aria-label={section.title}
              className="w-full min-h-[32rem] bg-surface-2 text-ink p-5 font-mono text-[0.83rem] leading-6 resize-y focus:outline-none focus:bg-surface"
            />
            <div className="px-5 py-3 border-t border-line flex flex-wrap items-center justify-between gap-2 text-xs text-ink-3">
              <span>{value.split('\n').length} lines · {value.length.toLocaleString()} / 40,000 characters</span>
              {section.tokens.some((token) => !value.includes(token)) && (
                <Badge tone="sunbeam">Missing placeholder: {section.tokens.filter((token) => !value.includes(token)).join(', ')}</Badge>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
