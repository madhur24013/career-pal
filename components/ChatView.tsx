

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { Message } from '../types.ts';
import GuideTooltip from './GuideTooltip.tsx';

const ChatView: React.FC = () => {
  const STORAGE_KEY = 'smart_resume_chats_v11';

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      } catch (e) { return []; }
    }
    return [];
  });

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isThinkingMode, setIsThinkingMode] = useState(false);
  const [attachedResume, setAttachedResume] = useState<{ data: string; mimeType: string; name: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const limitedMessages = messages.slice(-100);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedMessages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedResume({
          data: (reader.result as string).split(',')[1],
          mimeType: file.type || 'application/octet-stream',
          name: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(id);
      setTimeout(() => setCopyStatus(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleReset = () => {
    if (window.confirm("Confirm reset? This will clear history.")) {
      setMessages([]);
      setInputText('');
      setAttachedResume(null);
    }
  };

  const handleOpenKeySelector = async () => {
    if ((window as any).aistudio) {
      try {
        await (window as any).aistudio.openSelectKey();
        setShowKeyPrompt(false);
      } catch (e) {
        console.error("Key selection failed", e);
      }
    }
  };

  const callWithRetry = async (fn: () => Promise<any>, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        const is429 = error?.message?.includes('429') || error?.status === 429 || error?.message?.includes('quota');
        if (is429 && i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        throw error;
      }
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() && !attachedResume) return;

    const thinking = isThinkingMode;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText || `Uploaded Asset: ${attachedResume?.name}`,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputText;
    const currentResume = attachedResume;

    setInputText('');
    setAttachedResume(null);
    setIsLoading(true);

    try {
      // Create a fresh instance for the call to ensure the latest API key is used
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const history = messages
        .slice(-10)
        .filter(m => !m.text.startsWith('⚠️') && !m.text.startsWith('System Error'))
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        }));

      const baseInstruction = `
        CORE IDENTITY: You are a warm, professional AI career assistant.
        
        STRICT FORMATTING REQUIREMENTS:
        - NEVER use markdown symbols. This means no asterisks (*), no underscores (_), no hash symbols (#), and no backticks (\`).
        - DO NOT bold or italicize any words.
        - DO NOT use emojis or graphical icons.
        - DO NOT use theatrical stage directions like [smiles] or italics for actions.
        - Use simple plain text only.
        - Use double line breaks between paragraphs to ensure a clean, airy spacing.
        - For lists, use simple numbers (1. Item) or plain dashes (- Item) without any bolding or markdown.
        - Your output must resemble a clean, high-end professional transcript.
        - Focus on being concise, helpful, and direct.
      `;

      const tacticalInstruction = `
        ${baseInstruction}
        GOAL: Help the user polish their resume and career assets through clear, plain-text dialogue.
      `;

      const strategicInstruction = `
        ${baseInstruction}
        GOAL: Provide deep career strategy and industry insights using a clean, professional communication style. Use Google Search to find relevant trends but report them in plain text.
      `;

      const parts: any[] = [{ text: currentInput || "Hey! I'd like some help with my career goals today." }];
      if (currentResume) {
        parts.push({
          inlineData: {
            data: currentResume.data,
            mimeType: currentResume.mimeType
          }
        });
      }

      const modelName = thinking ? 'gemini-2.0-flash' : 'gemini-2.0-flash';

      const chat = ai.chats.create({
        model: modelName,
        config: {
          systemInstruction: thinking ? strategicInstruction : tacticalInstruction,
          tools: [{ googleSearch: {} }],
        },
        history: history
      });

      // FIX: The `message` property in `chat.sendMessage` expects a `Part` or `Part[]`. 
      // Passing `{ message: parts }` ensures it matches the expected `PartUnion[]` structure.
      const response = await callWithRetry(() => chat.sendMessage({ message: parts }));

      const urls = response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.filter(c => c.web)
        .map(c => ({
          uri: c.web.uri,
          title: c.web.title || new URL(c.web.uri).hostname
        })) || [];

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: response.text || "I encountered an error processing your request. Please try again.",
        groundingUrls: urls,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error(error);
      const msg = (error?.message || "").toLowerCase();
      let displayError = "I am having trouble connecting right now. Please try your message again shortly.";

      if (msg.includes('quota') || msg.includes('429')) {
        displayError = "The system has reached its current usage limit. Please try again later.";
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: displayError,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex-1 flex flex-col h-full relative transition-all duration-1000 ${isThinkingMode ? 'bg-[#0a0712]' : 'bg-[#0b1619]'}`}>
      <header className={`px-10 py-6 glass border-b border-white/5 flex items-center justify-between z-10 shadow-xl transition-all duration-700 ${isThinkingMode ? 'bg-[#120b24]/60' : 'bg-[#101f22]/60'}`}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${isLoading ? 'bg-[#13c8ec] animate-pulse shadow-[0_0_20px_#13c8ec]' : 'opacity-20 bg-slate-500'}`}></div>
            <h2 className={`text-sm font-bold tracking-tight uppercase tracking-widest transition-colors duration-500 ${isThinkingMode ? 'text-purple-400' : 'text-slate-300'}`}>
              {isThinkingMode ? 'Deep Chat' : 'Resume Helper'}
            </h2>
          </div>
          <div className="h-4 w-px bg-white/10"></div>
          <button
            onClick={() => setIsThinkingMode(!isThinkingMode)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md transition-all border active:scale-95 ${isThinkingMode
              ? 'bg-purple-500/10 border-purple-500/40 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
              : 'bg-transparent border-transparent text-slate-600 hover:text-slate-400'
              }`}
          >
            <i className={`fas fa-brain text-[10px] ${isThinkingMode ? 'animate-pulse' : ''}`}></i>
            <span className="text-[10px] font-black uppercase tracking-widest">Deep Thoughts</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          {(window as any).aistudio && (
            <button onClick={handleOpenKeySelector} className="w-8 h-8 rounded-full bg-white/5 hover:bg-[#13c8ec]/20 text-slate-400 hover:text-[#13c8ec] transition-all flex items-center justify-center border border-transparent hover:border-[#13c8ec]/30">
              <i className="fas fa-key text-xs"></i>
            </button>
          )}
          <button onClick={handleReset} className="px-5 py-2 rounded-lg bg-white/5 text-[10px] font-bold text-slate-400 hover:text-white border border-white/5 transition-all active:scale-95">
            Clear History
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 md:p-16 space-y-12 custom-scrollbar relative">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-4">
            <i className="fas fa-smile text-6xl mb-4"></i>
            <p className="text-[10px] font-black uppercase tracking-[0.5em]">Ready to discuss your career strategy</p>
          </div>
        )}
        {messages.map((msg) => {
          return (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in duration-500`}>
              <div className={`relative max-w-[85%] md:max-w-[70%] transition-all ${msg.role === 'user'
                ? 'bg-[#101f22]/90 border-white/10 text-slate-300 border px-8 py-6 rounded-2xl shadow-xl'
                : 'glass-dark text-slate-200 border border-white/5 px-8 py-6 rounded-2xl shadow-xl'
                }`}>
                {msg.role === 'assistant' && (
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => copyToClipboard(msg.text, msg.id)} className="p-2 text-slate-600 hover:text-[#13c8ec] transition-all active:scale-90">
                      <i className={`fas ${copyStatus === msg.id ? 'fa-check text-emerald-500' : 'fa-copy'} text-xs`}></i>
                    </button>
                  </div>
                )}

                <div className="whitespace-pre-wrap text-sm font-medium leading-relaxed">
                  {msg.text}
                </div>

                {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                    <p className="text-[9px] font-bold text-[#13c8ec] uppercase tracking-widest">Industry references found</p>
                    <div className="flex flex-wrap gap-2">
                      {msg.groundingUrls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-white/5 hover:bg-[#13c8ec]/10 border border-white/5 hover:border-[#13c8ec]/30 rounded-lg text-[10px] text-slate-400 hover:text-white transition-all flex items-center gap-2 active:scale-95"
                        >
                          <i className="fas fa-link text-[8px]"></i>
                          {url.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className="flex justify-start animate-in slide-in-from-left-4 duration-500">
            <div className={`flex items-center gap-6 glass-dark rounded-2xl border ${isThinkingMode ? 'border-purple-500/40' : 'border-[#13c8ec]/40'} shadow-2xl px-10 py-6`}>
              <div className="flex gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isThinkingMode ? 'bg-purple-500 shadow-[0_0_10px_#A855F7]' : 'bg-[#13c8ec] shadow-[0_0_10px_#13c8ec]'} animate-bounce [animation-delay:-0.3s]`}></div>
                <div className={`w-1.5 h-1.5 rounded-full ${isThinkingMode ? 'bg-purple-500 shadow-[0_0_10px_#A855F7]' : 'bg-[#13c8ec] shadow-[0_0_10px_#13c8ec]'} animate-bounce [animation-delay:-0.15s]`}></div>
                <div className={`w-1.5 h-1.5 rounded-full ${isThinkingMode ? 'bg-purple-500 shadow-[0_0_10px_#A855F7]' : 'bg-[#13c8ec] shadow-[0_0_10px_#13c8ec]'} animate-bounce`}></div>
              </div>
              <div className="flex flex-col">
                <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isThinkingMode ? 'text-purple-400' : 'text-[#13c8ec]'}`}>
                  Processing
                </span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={`p-8 border-t border-white/5 transition-all duration-1000 ${isThinkingMode ? 'bg-[#0a0712]/95' : 'bg-[#0b1619]/95'} backdrop-blur-3xl relative overflow-hidden`}>
        <div className="max-w-4xl mx-auto space-y-4">
          {attachedResume && (
            <div className="flex items-center gap-5 p-5 glass-dark rounded-[1.5rem] border border-[#13c8ec]/20 animate-in slide-in-from-bottom-2">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-[#13c8ec]/10 border border-[#13c8ec]/20 text-[#13c8ec]">
                <i className="fas fa-file-pdf text-xl"></i>
              </div>
              <p className="flex-1 text-sm text-white font-bold truncate">{attachedResume.name}</p>
              <button onClick={() => setAttachedResume(null)} className="w-10 h-10 rounded-full bg-white/5 hover:text-red-500 transition-all flex items-center justify-center active:scale-90">
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
          )}

          <div className={`command-input-container rounded-[2rem] flex flex-col overflow-hidden relative transition-all duration-700 ${isLoading ? 'animate-processing shadow-[0_0_60px_rgba(19,200,236,0.15)] ring-2 ring-[#13c8ec]/30' : ''}`}>
            {isLoading && (
              <>
                <div className="shimmer-bar !h-[4px] opacity-100 z-10">
                  <div className={`shimmer-line ${isThinkingMode ? '!bg-purple-500' : '!bg-[#13c8ec]'}`}></div>
                </div>
                <div className="absolute inset-0 bg-[#13c8ec]/5 animate-pulse pointer-events-none"></div>
              </>
            )}

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={isLoading ? "Processing information..." : "Provide career details or attach a resume for analysis"}
              disabled={isLoading}
              className={`w-full bg-transparent border-none focus:ring-0 px-10 py-8 text-sm font-medium text-slate-200 h-32 resize-none transition-all duration-500 ${isLoading ? 'opacity-20' : 'opacity-100'}`}
            />

            <div className={`flex items-center justify-between px-8 py-5 transition-colors duration-500 border-t border-white/5 ${isLoading ? 'bg-white/[0.01]' : 'bg-white/[0.02]'}`}>
              <div className="flex gap-2">
                <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/png,image/jpeg" onChange={handleFileUpload} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className={`p-2.5 transition-all flex items-center gap-3 active:scale-95 ${isLoading ? 'opacity-20 cursor-not-allowed' : 'text-slate-600 hover:text-slate-300'}`}
                >
                  <i className="fas fa-paperclip text-sm"></i>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest">Attach Files</span>
                </button>
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={sendMessage}
                  disabled={isLoading || (!inputText.trim() && !attachedResume)}
                  className={`px-12 py-3.5 rounded-xl transition-all duration-500 font-black text-[11px] uppercase tracking-widest active:scale-95 relative overflow-hidden ${isLoading
                    ? 'bg-slate-800 text-slate-500 cursor-wait'
                    : isThinkingMode
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                      : 'bg-[#13c8ec] text-[#0b1619] shadow-lg shadow-[#13c8ec]/20'
                    }`}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-3">
                      <i className="fas fa-sync-alt animate-spin"></i>
                      Analysing
                    </span>
                  ) : 'Send Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showKeyPrompt && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-[#101f22] border border-[#13c8ec]/20 p-8 rounded-2xl max-w-md w-full text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-[#13c8ec]/10 rounded-full flex items-center justify-center mx-auto mb-6 text-[#13c8ec] text-2xl border border-[#13c8ec]/20 shadow-xl">
              <i className="fas fa-key"></i>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-tight">Authentication Required</h3>
            <p className="text-slate-400 text-sm mb-8 leading-relaxed">This high-performance mode requires an active API key to proceed with the analysis. Please select a key from a paid project to continue.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowKeyPrompt(false)} className="flex-1 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 font-bold text-[10px] uppercase tracking-widest transition-colors">Dismiss</button>
              <button onClick={() => { handleOpenKeySelector(); setShowKeyPrompt(false); }} className="flex-1 py-3.5 rounded-xl bg-[#13c8ec] hover:bg-white text-[#0b1619] font-bold text-[10px] uppercase tracking-widest transition-colors shadow-lg active:scale-95">Select Key</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatView;
