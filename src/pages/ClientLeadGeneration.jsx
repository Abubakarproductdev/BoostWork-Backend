import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, MessageSquarePlus } from 'lucide-react';
import { cn } from '../lib/utils';
import { apiFetch } from '../lib/api';

export default function ClientLeadGeneration() {
  const [messages, setMessages] = useState([
    { id: 1, role: 'system', content: 'Hello! Tell me about the prospective client you want to reach out to (e.g., industry, pain points, company name), and I will draft a highly converting cold outreach message for you.' }
  ]);
  const [inputContext, setInputContext] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputContext.trim()) return;

    // Add user message
    const userMsg = { id: Date.now(), role: 'user', content: inputContext };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    const capturedContext = inputContext;
    setInputContext('');

    try {
      const response = await apiFetch(`/api/ai/generate-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: capturedContext })
      });

      if (response.status === 429) {
        throw new Error('Too many requests. Please wait a minute and try again.');
      }

      const data = await response.json();

      if (data.success && data.data) {
        const aiMsg = { id: Date.now() + 1, role: 'system', content: data.data };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        throw new Error(data.message || 'Failed to generate lead message.');
      }
    } catch (error) {
      console.error('Error generating lead:', error);
      const errorMsg = { 
        id: Date.now() + 2, 
        role: 'system', 
        content: `❌ Error: ${error.message}` 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-4 h-[calc(100vh-4rem)] flex flex-col pt-2 pb-6">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
            <MessageSquarePlus className="w-8 h-8 text-amber-400" />
            Client Lead Generation
          </h1>
          <p className="text-stone-400 mt-1">Draft cold outreach messages and LinkedIn connection notes</p>
        </div>
      </div>

      <div className="flex-1 glass-panel rounded-2xl flex flex-col overflow-hidden border border-white/5 relative shadow-xl">
        
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          {messages.map(msg => (
            <div key={msg.id} className={cn("flex gap-4 max-w-[85%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0 border",
                msg.role === 'user' 
                  ? "bg-amber-600/20 text-amber-400 border-amber-500/30" 
                  : "bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
              )}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={cn(
                "p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
                msg.role === 'user' 
                  ? "bg-amber-600 text-white rounded-br-none" 
                  : "bg-[#292524] text-stone-200 rounded-bl-none border border-[#44403c]"
              )}>
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-4 max-w-[85%]">
               <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border bg-emerald-600/20 text-emerald-400 border-emerald-500/30">
                  <Bot className="w-5 h-5" />
               </div>
               <div className="p-4 rounded-2xl bg-[#292524] rounded-bl-none border border-[#44403c] flex gap-1.5 items-center">
                  <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-stone-400 rounded-full animate-bounce"></div>
               </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-[#1c1917] border-t border-[#44403c]">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto relative">
            <textarea 
              value={inputContext}
              onChange={e => setInputContext(e.target.value)}
              placeholder="Describe the client or attach context for the cold message..." 
              rows={3}
              disabled={isTyping}
              className="w-full bg-[#292524] text-white border border-[#44403c] rounded-xl pl-4 pr-14 pt-3 pb-3 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors resize-none disabled:opacity-50"
            />
            <button 
              type="submit" 
              disabled={isTyping || !inputContext.trim()}
              className="absolute right-3 bottom-3 p-2 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-700 text-white rounded-lg transition-colors shadow-lg active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
