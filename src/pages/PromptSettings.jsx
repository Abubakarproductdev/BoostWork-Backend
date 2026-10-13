import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, FileSliders, RefreshCw, RotateCcw, Save } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiFetch } from '../lib/api';

const EMPTY_PROMPTS = {
  proposalSystemInstruction: '',
  proposalUserInstruction: '',
  leadUserInstruction: '',
};

const PROMPT_SECTIONS = [
  {
    key: 'proposalSystemInstruction',
    title: 'Proposal system instructions',
    detail: 'Main behavior, voice, structure, portfolio context, and output rules.',
    rows: 20,
    tokens: ['{{PORTFOLIO_CONTEXT}}'],
  },
  {
    key: 'proposalUserInstruction',
    title: 'Proposal generation prompt',
    detail: 'Job-post analysis and JSON response format.',
    rows: 14,
    tokens: ['{{PERSONA}}', '{{JOB_DESCRIPTION}}'],
  },
  {
    key: 'leadUserInstruction',
    title: 'Lead generation prompt',
    detail: 'Cold outreach message instructions.',
    rows: 8,
    tokens: ['{{CONTEXT}}'],
  },
];

export default function PromptSettings() {
  const [prompts, setPrompts] = useState(EMPTY_PROMPTS);
  const [savedPrompts, setSavedPrompts] = useState(EMPTY_PROMPTS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [status, setStatus] = useState(null);

  const hasChanges = useMemo(() => (
    JSON.stringify(prompts) !== JSON.stringify(savedPrompts)
  ), [prompts, savedPrompts]);

  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        const response = await apiFetch(`/api/ai/prompts`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to load prompt settings.');
        }

        setPrompts(data.data);
        setSavedPrompts(data.data);
      } catch (error) {
        setStatus({ type: 'error', message: error.message });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrompts();
  }, []);

  const updatePrompt = (key, value) => {
    setPrompts((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setStatus(null);

    try {
      const response = await apiFetch(`/api/ai/prompts`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prompts),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to save prompt settings.');
      }

      setPrompts(data.data);
      setSavedPrompts(data.data);
      setStatus({ type: 'success', message: 'Prompt settings saved.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    setStatus(null);

    try {
      const response = await apiFetch(`/api/ai/prompts/reset`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to reset prompt settings.');
      }

      setPrompts(data.data);
      setSavedPrompts(data.data);
      setStatus({ type: 'success', message: 'Default prompts restored.' });
    } catch (error) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-stone-400">
          <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
          Loading AI prompt settings...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 h-full overflow-y-auto pr-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between sticky top-0 bg-[#0a0f1c]/90 backdrop-blur-md z-10 py-4 -my-4 border-b border-[#292524]">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileSliders className="w-8 h-8 text-amber-500" />
            AI Prompts
          </h1>
          <p className="text-stone-400 mt-1">Instructions currently used by proposal and lead generation</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={isSaving || isResetting}
            className="px-4 py-2.5 rounded-xl font-semibold text-stone-300 hover:text-white hover:bg-white/5 border border-[#44403c] transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            <RotateCcw className="w-4 h-4" />
            {isResetting ? 'Resetting...' : 'Reset'}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || isSaving || isResetting}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Prompts'}
          </button>
        </div>
      </div>

      {status && (
        <div className={cn(
          'rounded-xl border px-4 py-3 text-sm flex items-center gap-2',
          status.type === 'success'
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
            : 'border-red-500/30 bg-red-500/10 text-red-200'
        )}>
          {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {status.message}
        </div>
      )}

      <div className="space-y-5">
        {PROMPT_SECTIONS.map((section) => (
          <section key={section.key} className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-5 py-4 border-b border-[#292524] bg-[#1c1917]/70 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">{section.title}</h2>
                <p className="text-sm text-stone-400 mt-1">{section.detail}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {section.tokens.map((token) => (
                  <span key={token} className="text-xs font-mono text-amber-200 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1">
                    {token}
                  </span>
                ))}
              </div>
            </div>

            <textarea
              value={prompts[section.key]}
              onChange={(event) => updatePrompt(section.key, event.target.value)}
              rows={section.rows}
              spellCheck={false}
              className="w-full bg-[#0f0d0c] text-stone-100 border-0 p-5 font-mono text-sm leading-6 resize-y focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500/50 placeholder:text-stone-500"
            />
          </section>
        ))}
      </div>
    </div>
  );
}
