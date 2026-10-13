import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Check, ClipboardCopy, Megaphone } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiFetch } from '../lib/api';
import ProfileSetupNotice from '../components/shared/ProfileSetupNotice';
import { Card, EmptyState, IconButton, PageHeader } from '../components/ui';

const SUGGESTIONS = [
  'A dental clinic chain whose booking site is slow on mobile',
  'A SaaS founder on LinkedIn hiring their first designer',
  'An e-commerce brand with abandoned carts and no email flows',
];

function AssistantBubble({ content, isError }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex gap-3 max-w-[92%] sm:max-w-[80%] animate-rise">
      <span className="w-8 h-8 rounded-xl bg-sunbeam text-on-sunbeam flex items-center justify-center shrink-0 mt-1"><Megaphone className="w-4 h-4" /></span>
      <div className={cn('group relative rounded-2xl rounded-tl-md border px-4 py-3 text-[0.95rem] leading-7 whitespace-pre-wrap',
        isError ? 'border-danger bg-danger-soft text-danger' : 'border-line bg-surface text-ink')}>
        {content}
        {!isError && (
          <IconButton icon={copied ? Check : ClipboardCopy} label={copied ? 'Copied' : 'Copy message'} onClick={copy}
            className="absolute -right-2 -top-2 w-8 h-8 bg-surface border border-line shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100" />
        )}
      </div>
    </div>
  );
}

export default function ClientLeadGeneration() {
  const [messages, setMessages] = useState([]);
  const [inputContext, setInputContext] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isTyping]);

  const send = async (text) => {
    const context = text.trim();
    if (!context || isTyping) return;

    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', content: context }]);
    setInputContext('');
    setIsTyping(true);

    try {
      const response = await apiFetch('/api/ai/generate-lead', {
        method: 'POST',
        body: JSON.stringify({ context }),
      });
      if (response.status === 429) throw new Error('Too many requests. Please wait a minute and try again.');
      const data = await response.json();
      if (!data.success || !data.data) throw new Error(data.message || 'Failed to generate lead message.');
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'assistant', content: data.data }]);
    } catch (error) {
      setMessages((prev) => [...prev, { id: Date.now() + 2, role: 'assistant', content: error.message, isError: true }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send(inputContext);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Lead generation"
        title="Cold outreach that"
        highlight="gets replies"
        description="Describe a prospect: who they are, what's broken, where you'll reach them. Get a short, specific message back."
      />

      <ProfileSetupNotice />

      <Card className="flex flex-col h-[calc(100vh-17rem)] min-h-[30rem] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {!messages.length && (
            <EmptyState icon={Megaphone} tone="sunbeam" title="Who are you reaching out to?" className="h-full">
              <span className="block mb-4">Pick an example or describe your own prospect below.</span>
              <span className="flex flex-col gap-2 items-stretch">
                {SUGGESTIONS.map((suggestion) => (
                  <button key={suggestion} onClick={() => send(suggestion)} className="text-sm rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-ink hover:border-sunbeam hover:bg-sunbeam-soft transition-colors text-left">
                    {suggestion}
                  </button>
                ))}
              </span>
            </EmptyState>
          )}

          {messages.map((message) => (message.role === 'user' ? (
            <div key={message.id} className="flex justify-end animate-rise">
              <div className="max-w-[92%] sm:max-w-[75%] rounded-2xl rounded-tr-md bg-lagoon text-on-accent px-4 py-3 text-[0.95rem] leading-7 whitespace-pre-wrap">
                {message.content}
              </div>
            </div>
          ) : (
            <AssistantBubble key={message.id} content={message.content} isError={message.isError} />
          )))}

          {isTyping && (
            <div className="flex gap-3">
              <span className="w-8 h-8 rounded-xl bg-sunbeam text-on-sunbeam flex items-center justify-center shrink-0"><Megaphone className="w-4 h-4" /></span>
              <div className="rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-4 flex gap-1.5">
                {[0, 1, 2].map((i) => <span key={i} className="w-2 h-2 rounded-full bg-sunbeam animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="border-t border-line p-3 sm:p-4 bg-surface-2">
          <div className="relative">
            <textarea
              value={inputContext}
              onChange={(e) => setInputContext(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send(inputContext);
                }
              }}
              placeholder="Describe the prospect… (Enter to send, Shift+Enter for a new line)"
              rows={2}
              disabled={isTyping}
              aria-label="Prospect description"
              className="field resize-none pr-14 py-3"
            />
            <button
              type="submit"
              disabled={isTyping || inputContext.trim().length < 5}
              aria-label="Generate message"
              className="absolute right-2.5 bottom-2.5 w-10 h-10 rounded-xl bg-sunbeam text-on-sunbeam flex items-center justify-center transition hover:brightness-110 disabled:bg-surface-3 disabled:text-ink-3"
            >
              <ArrowUp className="w-5 h-5" />
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
