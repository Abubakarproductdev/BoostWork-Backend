import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { useJobContext } from '../context/JobContext';
import { apiFetch } from '../lib/api';

export default function ProposalWriting() {
  const { addJob } = useJobContext();
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      role: 'system', 
      content: 'Hello! Paste a job title and description below, and I will generate a custom proposal for you based on your customized profile context. I will also save this job to your performance tracker automatically as a Draft.' 
    }
  ]);
  const [inputTitle, setInputTitle] = useState('');
  const [inputDescription, setInputDescription] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputTitle.trim() || !inputDescription.trim()) return;

    const capturedTitle = inputTitle;
    const capturedDesc = inputDescription;

    // 1. Add user message to UI
    const userMsg = { id: Date.now(), role: 'user', title: capturedTitle, content: capturedDesc };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    setInputTitle('');
    setInputDescription('');

    try {
      // ---------------------------------------------------------
      // STEP 1: Call the Gemini AI Backend
      // ---------------------------------------------------------
      const aiResponse = await apiFetch(`/api/ai/generate-proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription: capturedDesc })
      });

      if (aiResponse.status === 429) {
        throw new Error('Too many requests. Please wait a minute and try again.');
      }

      const aiData = await aiResponse.json();
      
      let finalProposalText = '';

      if (aiData.success && aiData.data) {
        // Stitch the AI JSON output into a single string
        finalProposalText = `${aiData.data.hook}\n\n${aiData.data.body}\n\n${aiData.data.portfolio_proof}`;
      } else {
        throw new Error(aiData.message || 'Failed to generate AI response.');
      }

      // Add AI generated proposal to the Chat UI
      const aiMsg = { id: Date.now() + 1, role: 'system', content: finalProposalText };
      setMessages(prev => [...prev, aiMsg]);

      // ---------------------------------------------------------
      // STEP 2: Save to MongoDB as a 'Draft'
      // ---------------------------------------------------------
      // Map to the nested Mongoose schema we established earlier
      const dbPayload = {
        title: capturedTitle,
        status: 'draft', // Saved as a draft/incomplete by default
        jobDetails: {
          description: capturedDesc,
          connectsCost: 0,
          jobPostedDate: new Date().toISOString(),
        },
        proposalText: finalProposalText,
        submissionDate: new Date().toISOString()
      };

      const dbResponse = await apiFetch(`/api/proposals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbPayload)
      });

      const dbData = await dbResponse.json();

      if (dbData.success) {
        addJob(dbData.data);
      } else {
        console.error("Failed to save to database:", dbData.message);
      }

    } catch (error) {
      console.error('Error generating proposal:', error);
      const errorMsg = { 
        id: Date.now() + 2, 
        role: 'system', 
        content: `❌ Error: ${error.message}. Please check your API key and backend connection.` 
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
            <Sparkles className="w-8 h-8 text-yellow-400" />
            AI Proposal Writer
          </h1>
          <p className="text-stone-400 mt-1">Generate highly converting proposals instantly</p>
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
                  : "bg-yellow-600/20 text-yellow-400 border-yellow-500/30"
              )}>
                {msg.role === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={cn(
                "p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
                msg.role === 'user' 
                  ? "bg-amber-600 text-white rounded-br-none" 
                  : "bg-[#292524] text-stone-200 rounded-bl-none border border-[#44403c]"
              )}>
                {msg.title && <strong className="block text-white mb-2 text-base">{msg.title}</strong>}
                {msg.content}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-4 max-w-[85%]">
               <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 border bg-yellow-600/20 text-yellow-400 border-yellow-500/30">
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
          <form onSubmit={handleSend} className="max-w-4xl mx-auto space-y-3">
            <input 
              type="text" 
              value={inputTitle}
              onChange={e => setInputTitle(e.target.value)}
              placeholder="Job Title (e.g. Need Senior React Developer)" 
              disabled={isTyping}
              className="w-full bg-[#292524] text-white border border-[#44403c] rounded-xl px-4 py-2.5 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors disabled:opacity-50"
            />
            <div className="relative">
              <textarea 
                value={inputDescription}
                onChange={e => setInputDescription(e.target.value)}
                placeholder="Paste the full job description here..." 
                rows={3}
                disabled={isTyping}
                className="w-full bg-[#292524] text-white border border-[#44403c] rounded-xl pl-4 pr-14 pt-3 pb-3 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-colors resize-none disabled:opacity-50"
              />
              <button 
                type="submit" 
                disabled={isTyping || !inputTitle.trim() || !inputDescription.trim()}
                className="absolute right-3 bottom-3 p-2 bg-yellow-600 hover:bg-yellow-500 disabled:bg-stone-700 text-white rounded-lg transition-colors shadow-lg active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}