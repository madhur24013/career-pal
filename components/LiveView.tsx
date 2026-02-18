import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import GuideTooltip from './GuideTooltip.tsx';

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

function encodePCM(data: Float32Array): string {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const FULL_INTERVIEW_PROMPT = `
CORE IDENTITY: You are a strict Executive Talent Acquisition Director.
GOAL: Conduct a realistic corporate interview simulation.

STRICT FORMATTING RULES FOR TRANSCRIPTION:
1. NO MARKDOWN: Never use symbols like asterisks, underscores, or hash signs.
2. NO BOLDING OR ITALICS: Do not use any text formatting.
3. NO EMOJIS: Do not use any graphical symbols.
4. CLEAN DIALOGUE: Use clear, uniform plain text only.

CRITICAL PROTOCOL:
1. START IMMEDIATELY: State your name (Director Sterling) and demand the candidate's name and intended role.
2. FEEDBACK: Evaluate posture if video is active, or verbal clarity if audio only.
3. STYLE: Maintain a distant, professional, and analytical tone.
`;

interface AnalysisResult {
  summary: string;
  strengths: string[];
  improvements: string[];
}

const LiveView: React.FC = () => {
  const TRANSCRIPT_STORAGE_KEY = 'smart_interview_transcripts_v1';
  const REPORT_STORAGE_KEY = 'smart_interview_report_v1';

  const [isActive, setIsActive] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(() => !!localStorage.getItem(REPORT_STORAGE_KEY));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [transcriptions, setTranscriptions] = useState<{ role: string, text: string }[]>(() => {
    const saved = localStorage.getItem(TRANSCRIPT_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [finalReport, setFinalReport] = useState<AnalysisResult | null>(() => {
    const saved = localStorage.getItem(REPORT_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });
  const [isInitializing, setIsInitializing] = useState(false);
  const [connectionError, setConnectionError] = useState<{msg: string, isBlocked: boolean} | null>(null);
  const [timer, setTimer] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Standby');
  const [isAudioOnly, setIsAudioOnly] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<any>(null);
  const frameIntervalRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const transcriptionEndRef = useRef<HTMLDivElement>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    localStorage.setItem(TRANSCRIPT_STORAGE_KEY, JSON.stringify(transcriptions));
  }, [transcriptions]);

  useEffect(() => {
    if (finalReport) {
      localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(finalReport));
    } else {
      localStorage.removeItem(REPORT_STORAGE_KEY);
    }
  }, [finalReport]);

  useEffect(() => {
    transcriptionEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptions]);

  const handleClearLogs = () => {
    if (window.confirm("Permanently delete all interview transcripts and reports?")) {
      setTranscriptions([]);
      setFinalReport(null);
      setShowAnalysis(false);
    }
  };

  const generateFinalAudit = async (chatHistory: typeof transcriptions) => {
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const historyText = chatHistory.map(t => `${t.role}: ${t.text}`).join('\n');
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Evaluate this interview transcript professionally in plain-text JSON format without any markdown or styling symbols: ${historyText}`,
        config: { responseMimeType: "application/json" }
      });
      const report = JSON.parse(response.text || '{}');
      setFinalReport(report);
    } catch (e) {
      setFinalReport({ summary: "Could not generate assessment report.", strengths: [], improvements: [] });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const stopSession = useCallback(async (isError: boolean = false) => {
    setIsActive(false);
    setIsInitializing(false);
    setStatusMessage(isError ? 'System Error' : 'Assessment Concluded');
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      await inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    audioSourcesRef.current.forEach(source => source.stop());
    audioSourcesRef.current.clear();
    if (sessionRef.current) {
      await sessionRef.current.close();
      sessionRef.current = null;
    }
    if (transcriptions.length > 0 && !isError) {
      setShowAnalysis(true);
      await generateFinalAudit(transcriptions);
    }
  }, [transcriptions]);

  const startSession = async () => {
    setIsInitializing(true);
    setConnectionError(null);
    setIsAudioOnly(false);

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      } catch (e: any) {
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
          throw { name: 'Blocked', message: "Access was blocked by the browser." };
        }
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsAudioOnly(true);
      }

      streamRef.current = stream;
      if (videoRef.current && !isAudioOnly) videoRef.current.srcObject = stream;

      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsInitializing(false);
            setStatusMessage('Assessment Active');
            
            const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmData = encodePCM(inputData);
              sessionPromise.then(s => s.sendRealtimeInput({ media: { data: pcmData, mimeType: 'audio/pcm;rate=16000' } }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContextRef.current!.destination);

            if (!isAudioOnly) {
              frameIntervalRef.current = window.setInterval(() => {
                if (!videoRef.current || !canvasRef.current) return;
                const canvas = canvasRef.current;
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
                const base64Data = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
                sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } }));
              }, 500);
            }
          },
          onmessage: async (msg) => {
            if (msg.serverContent?.outputTranscription) {
              setTranscriptions(p => [...p, { role: 'Interviewer', text: msg.serverContent!.outputTranscription!.text }]);
            }
            if (msg.serverContent?.inputTranscription) {
              setTranscriptions(p => [...p, { role: 'Candidate', text: msg.serverContent!.inputTranscription!.text }]);
            }
            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData) {
              const ctx = audioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decodeBase64(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              audioSourcesRef.current.add(source);
            }
          },
          onerror: () => stopSession(true),
          onclose: () => stopSession(false)
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } } },
          systemInstruction: FULL_INTERVIEW_PROMPT,
          outputAudioTranscription: {},
          inputAudioTranscription: {}
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (e: any) {
      setIsInitializing(false);
      if (e.name === 'Blocked') {
        setConnectionError({ msg: "Permissions Blocked", isBlocked: true });
      } else {
        setConnectionError({ msg: e.message || "Hardware connection failed.", isBlocked: false });
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b1619] overflow-hidden text-slate-100">
      <header className="h-16 px-8 flex items-center justify-between border-b border-white/5 bg-[#0e1618]">
        <div className="flex items-center gap-4">
          <div className="font-bold text-sm uppercase tracking-wider">Professional Assessment</div>
          <div className="text-[10px] uppercase text-slate-500">{statusMessage}</div>
          <div className="h-4 w-px bg-white/10 mx-2"></div>
          <button onClick={handleClearLogs} className="px-4 py-1.5 rounded-lg bg-white/5 text-[10px] font-bold text-slate-500 hover:text-white border border-white/5 transition-all active:scale-95">
            Clear Logs
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="font-mono text-xs">{formatTime(timer)}</div>
          {isActive && <button onClick={() => stopSession()} className="text-xs text-red-500 uppercase font-bold">Terminate Session</button>}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <section className="flex-1 relative bg-black flex items-center justify-center">
          {!isActive && !isInitializing ? (
            <div className="text-center p-12 max-w-xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">Assessment Initialisation</h2>
              {connectionError && (
                <div className={`mb-8 p-6 rounded-2xl border ${connectionError.isBlocked ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                  <div className="flex items-center justify-center gap-3 text-sm font-bold uppercase tracking-widest mb-4">
                    <i className="fas fa-exclamation-triangle"></i>
                    <span>{connectionError.msg}</span>
                  </div>
                  {connectionError.isBlocked ? (
                    <div className="text-left text-xs text-slate-400 space-y-3 leading-relaxed">
                      <p>To fix this and start your interview:</p>
                      <ul className="list-decimal list-inside space-y-2">
                        <li>Click the <strong>Camera/Lock icon</strong> in your browser address bar.</li>
                        <li>Toggle <strong>Camera</strong> and <strong>Microphone</strong> to "On" or "Reset permissions".</li>
                        <li>Refresh this page to try again.</li>
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">{connectionError.msg}</p>
                  )}
                </div>
              )}
              <button onClick={startSession} className="px-10 py-4 bg-[#13c8ec] text-[#0b1619] font-bold uppercase text-xs tracking-widest rounded transition-premium hover:bg-white active:scale-95 shadow-lg shadow-[#13c8ec]/20">Initiate Link</button>
              
              {showAnalysis && finalReport && (
                <div className="mt-12 text-left glass-dark p-8 rounded-2xl border border-white/5 animate-in fade-in slide-in-from-bottom-4">
                  <h3 className="text-[#13c8ec] text-[10px] font-black uppercase tracking-[0.3em] mb-4 text-center">Previous Audit Report</h3>
                  <p className="text-sm font-medium mb-6 leading-relaxed text-slate-300">{finalReport.summary}</p>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <h4 className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest mb-3">Core Strengths</h4>
                      <ul className="space-y-2">
                        {finalReport.strengths.map((s, i) => (
                          <li key={i} className="text-[11px] text-slate-400 flex gap-2"><span className="text-emerald-500">•</span> {s}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-[9px] font-bold text-[#13c8ec] uppercase tracking-widest mb-3">Growth Areas</h4>
                      <ul className="space-y-2">
                        {finalReport.improvements.map((s, i) => (
                          <li key={i} className="text-[11px] text-slate-400 flex gap-2"><span className="text-[#13c8ec]">•</span> {s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${isAudioOnly ? 'hidden' : ''}`} />
              {isAudioOnly && <div className="text-slate-500 uppercase text-xs tracking-widest animate-pulse">Audio Link Active</div>}
              <canvas ref={canvasRef} className="hidden" />
              {isInitializing && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-center p-12">
                   <div className="w-16 h-16 border-t-2 border-[#13c8ec] rounded-full animate-spin mb-6"></div>
                   <p className="text-xs uppercase font-bold tracking-[0.4em] text-[#13c8ec]">Handshaking Protocol...</p>
                </div>
              )}
            </>
          )}
        </section>

        <aside className="w-96 border-l border-white/5 bg-[#0e1618] flex flex-col">
          <div className="p-4 border-b border-white/5 font-bold text-xs uppercase text-slate-500">Conference Log</div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs custom-scrollbar">
            {transcriptions.map((t, i) => (
              <div key={i} className={t.role === 'Candidate' ? 'text-right' : 'text-left animate-in slide-in-from-bottom-2'}>
                <div className={`text-[10px] font-bold mb-1 ${t.role === 'Candidate' ? 'text-slate-500' : 'text-[#13c8ec]'}`}>{t.role}</div>
                <div className={`bg-white/5 p-3 rounded-xl inline-block max-w-[90%] ${t.role === 'Candidate' ? 'rounded-tr-none' : 'rounded-tl-none'}`}>{t.text}</div>
              </div>
            ))}
            {isAnalyzing && (
              <div className="text-center p-4 animate-pulse">
                <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-[#13c8ec]">Generating Final Audit...</span>
              </div>
            )}
            <div ref={transcriptionEndRef} />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default LiveView;