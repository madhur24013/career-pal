import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { GeneratedImage } from '../types.ts';
import GuideTooltip from './GuideTooltip.tsx';
import * as db from '../lib/db.ts';

const ImageView: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '3:4' | '4:3' | '9:16' | '16:9'>('1:1');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [usePro, setUsePro] = useState(false);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [systemError, setSystemError] = useState<string | null>(null);
  const [showKeyPrompt, setShowKeyPrompt] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    const stored = await db.getImages();
    setImages(stored);
  };

  const handleClearHistory = async () => {
    if (window.confirm("Delete all generated photos from your history?")) {
      await db.clearImages();
      setImages([]);
    }
  };

  const checkAndGenerate = async () => {
    if (!prompt.trim()) return;
    
    if (usePro) {
      if (!(await (window as any).aistudio.hasSelectedApiKey())) {
        setShowKeyPrompt(true);
        return;
      }
    }
    
    generateImage();
  };

  const handleOpenKeySelector = async () => {
    await (window as any).aistudio.openSelectKey();
    setShowKeyPrompt(false);
    generateImage();
  };

  const generateImage = async (customPrompt?: string) => {
    const finalPrompt = customPrompt || prompt;
    if (!finalPrompt.trim()) return;

    setIsGenerating(true);
    setSystemError(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = usePro ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
      
      const contents: any = {
        parts: [{ text: finalPrompt + ", professional executive portrait, studio lighting, minimal cinematic aesthetic, high resolution" }]
      };

      if (refImage) {
        const base64Data = refImage.split(',')[1];
        const mimeType = refImage.split(';')[0].split(':')[1];
        contents.parts.unshift({ inlineData: { data: base64Data, mimeType } });
      }

      const response = await ai.models.generateContent({
        model: model,
        contents,
        config: { 
          imageConfig: { 
            aspectRatio,
            ...(usePro ? { imageSize } : {})
          },
          ...(usePro ? { tools: [{ googleSearch: {} }] } : {})
        }
      });

      let imageUrl = '';
      const candidate = response.candidates?.[0];
      if (candidate) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (imageUrl) {
        const newImage = { id: Date.now().toString(), url: imageUrl, prompt: finalPrompt, timestamp: new Date() };
        await db.saveImage(newImage);
        setImages(prev => [newImage, ...prev]);
        setPrompt('');
      } else {
        throw new Error("Looks like I couldn't make the image this time.");
      }
    } catch (error: any) {
      console.error('Image Error:', error);
      setSystemError("I hit a bit of a snag while making that. Mind checking the settings?");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    await db.deleteImage(id);
    setImages(prev => prev.filter(img => img.id !== id));
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b1619] overflow-hidden">
      <header className="px-10 py-6 glass border-b border-white/5 flex items-center justify-between z-20 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 bg-[#13c8ec] rounded-full animate-pulse-soft shadow-[0_0_8px_#13c8ec]"></div>
          <h2 className="text-sm font-bold text-slate-300 tracking-tight uppercase tracking-widest">Picture Pal</h2>
          <div className="h-4 w-px bg-white/10 mx-2"></div>
          <button onClick={handleClearHistory} className="px-4 py-1.5 rounded-lg bg-white/5 text-[10px] font-bold text-slate-500 hover:text-white border border-white/5 transition-all active:scale-95">
            Clear History
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-premium ${usePro ? 'bg-[#13c8ec]/10 border-[#13c8ec]/30' : 'bg-white/5 border-white/5'}`}>
            <span className={`text-[9px] font-bold uppercase tracking-widest ${usePro ? 'text-[#13c8ec]' : 'text-slate-500'}`}>High-Def</span>
            <button 
              onClick={() => setUsePro(!usePro)}
              className={`w-8 h-4 rounded-full relative transition-premium ${usePro ? 'bg-[#13c8ec]' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-premium ${usePro ? 'left-4.5' : 'left-0.5'}`}></div>
            </button>
          </div>
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onloadend = () => setRefImage(reader.result as string);
              reader.readAsDataURL(file);
            }
          }} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-premium border ${
              refImage ? 'bg-[#13c8ec]/20 border-[#13c8ec]/40 text-[#13c8ec]' : 'bg-white/5 text-slate-500 border-white/5 hover:text-slate-300'
            }`}
          >
            {refImage ? 'Photo Loaded' : 'Add Inspiration'}
          </button>
        </div>
      </header>

      <div className="flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar">
        <div className="max-w-5xl mx-auto space-y-10">
          {showKeyPrompt && (
            <div className="p-10 bg-[#13c8ec]/5 border border-[#13c8ec]/20 rounded-3xl flex flex-col items-center text-center space-y-6 animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-2xl bg-[#13c8ec]/10 flex items-center justify-center text-[#13c8ec] text-2xl border border-[#13c8ec]/20 shadow-xl">
                <i className="fas fa-key"></i>
              </div>
              <div className="max-w-md">
                <h3 className="text-lg font-bold text-white uppercase tracking-tighter">Need a Paid Key for This</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">High-def photos need a key from a paid project. But don't worry, the normal version is always here for you!</p>
              </div>
              <button onClick={handleOpenKeySelector} className="bg-[#13c8ec] hover:bg-white text-[#0b1619] px-10 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-premium">
                Select a Key
              </button>
            </div>
          )}

          {systemError && (
            <div className="p-8 bg-red-500/5 border border-red-500/20 rounded-2xl flex items-center gap-8 animate-in slide-in-from-top-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 shadow-lg">
                <i className="fas fa-exclamation-circle"></i>
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white uppercase tracking-widest">Something went wrong</p>
                <p className="text-xs text-slate-400 mt-1">{systemError}</p>
              </div>
            </div>
          )}

          <div className="command-input-container p-10 rounded-3xl space-y-8 shadow-2xl">
            {refImage && (
              <div className="flex items-center gap-6 p-6 bg-white/[0.02] rounded-xl border border-white/5">
                <img src={refImage} className="w-20 h-20 rounded-lg object-cover border border-[#13c8ec]/20" />
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-[#13c8ec] uppercase tracking-widest">Inspiration Active</p>
                  <p className="text-xs text-slate-500 mt-1">Tell me how you want to change this photo!</p>
                </div>
                <button onClick={() => setRefImage(null)} className="text-slate-600 hover:text-red-500 transition-premium"><i className="fas fa-times"></i></button>
              </div>
            )}

            <div className="space-y-4">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-widest ml-1">Your Picture Idea</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A warm, professional photo of me in a cozy library with soft lighting..."
                className="w-full h-32 rounded-xl px-8 py-6 text-sm font-medium outline-none text-slate-200 placeholder:text-slate-800 bg-white/5"
              />
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-white/5">
              <div className="flex items-center gap-6">
                <div className="flex gap-2">
                  {(['1:1', '4:3', '16:9'] as const).map(ratio => (
                    <button 
                      key={ratio}
                      onClick={() => setAspectRatio(ratio)}
                      className={`px-5 py-2 rounded-lg text-[10px] font-bold border transition-premium ${
                        aspectRatio === ratio ? 'bg-[#13c8ec] border-[#13c8ec] text-[#0b1619]' : 'bg-white/5 border-white/5 text-slate-600 hover:text-slate-300'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>
              <button 
                onClick={checkAndGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="bg-[#13c8ec] hover:bg-white disabled:opacity-20 text-[#0b1619] px-10 py-3 rounded-lg transition-premium font-bold text-[11px] uppercase tracking-widest shadow-xl active:scale-95"
              >
                {isGenerating ? 'Working on it...' : 'Make it happen'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-10">
            {images.map(img => (
              <div key={img.id} className="glass rounded-2xl overflow-hidden group border border-white/5 shadow-2xl animate-in fade-in transition-premium relative">
                <div className="relative aspect-square overflow-hidden bg-slate-900">
                  <img src={img.url} className="w-full h-full object-cover transition-premium duration-1000" />
                  <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-premium flex flex-col justify-end p-8">
                    <p className="text-[9px] text-[#13c8ec] font-bold uppercase tracking-widest mb-2">Portfolio Asset</p>
                    <p className="text-xs text-slate-400 italic line-clamp-2 mb-6">"{img.prompt}"</p>
                    <div className="flex gap-3">
                       <a href={img.url} download className="flex-1 py-3 bg-[#13c8ec] text-[#0b1619] rounded-lg text-[10px] font-bold uppercase tracking-widest text-center hover:bg-white transition-premium">Save</a>
                       <button onClick={() => handleDelete(img.id)} className="p-3 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"><i className="fas fa-trash text-xs"></i></button>
                       <button onClick={() => setRefImage(img.url)} className="p-3 bg-white/5 rounded-lg text-white hover:bg-[#13c8ec]/20 transition-colors"><i className="fas fa-redo-alt text-xs"></i></button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageView;