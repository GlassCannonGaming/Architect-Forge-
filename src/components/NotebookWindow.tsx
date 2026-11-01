import React, { useState, useEffect, useRef } from 'react';
import {
  StudioWindowId,
  StudioWindowState,
  SavedInteractionEntry,
  NotebookMemoEntry,
  CorkboardThreadLink,
  createNotebookMemo,
  searchAndFilterNotebookMemos
} from '../game/rules';
import { StudioWindowFrame } from './StudioWindowFrame';
import { audioEngine } from '../game/audioEngine';

interface NotebookWindowProps {
  windowState: StudioWindowState;
  onFocus: (id: StudioWindowId) => void;
  onMove: (id: StudioWindowId, nextX: number, nextY: number) => void;
  onResize: (id: StudioWindowId, nextW: number, nextH: number) => void;
  onToggleMinimize: (id: StudioWindowId) => void;
  onToggleMaximize: (id: StudioWindowId) => void;
  onClose: (id: StudioWindowId) => void;
  gameDay: number;
  gameTimeFormatted: string;
  savedInteractions: SavedInteractionEntry[];
  memos: NotebookMemoEntry[];
  onAddMemo: (memo: NotebookMemoEntry) => void;
  onDeleteMemo: (id: string) => void;
  onTogglePinMemo: (id: string) => void;
}

const TAG_OPTIONS = [
  'All',
  '🎙️ Walkman Tape',
  'Suspect Motive',
  'Passkey Code',
  'Secret Passage',
  'Contradiction',
  'To Investigate'
];

export const NotebookWindow: React.FC<NotebookWindowProps> = ({
  windowState,
  onFocus,
  onMove,
  onResize,
  onToggleMinimize,
  onToggleMaximize,
  onClose,
  gameDay,
  gameTimeFormatted,
  savedInteractions,
  memos,
  onAddMemo,
  onDeleteMemo,
  onTogglePinMemo
}) => {
  const [activeTab, setActiveTab] = useState<'transcripts' | 'field_notes' | 'corkboard'>('field_notes');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteText, setNoteText] = useState('');
  const [selectedTag, setSelectedTag] = useState('To Investigate');
  const [filterTag, setFilterTag] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecordingDictaphone, setIsRecordingDictaphone] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<string | null>(null);
  const [tapeSpinAngle, setTapeSpinAngle] = useState(0);
  const [tapeCounter, setTapeCounter] = useState(142);
  const [hotLineActive, setHotLineActive] = useState(true);
  const [vuLevel, setVuLevel] = useState(0);
  const [activePlaybackId, setActivePlaybackId] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Animated Compact Cassette Walkman reels, 3-digit mechanical counter & stereo VU meter
  useEffect(() => {
    let lastTime = performance.now();
    let counterAccum = 0;
    const updateTape = () => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (isRecordingDictaphone || activePlaybackId !== null) {
        setTapeSpinAngle((prev) => (prev + dt * 280) % 360);
        counterAccum += dt * 4.5;
        if (counterAccum >= 1) {
          const step = Math.floor(counterAccum);
          counterAccum -= step;
          setTapeCounter((prev) => (prev + step) % 1000);
        }
        setVuLevel(0.45 + Math.sin(now * 0.018) * 0.32 + Math.random() * 0.22);
      } else {
        setVuLevel(0);
      }
      animationFrameRef.current = requestAnimationFrame(updateTape);
    };
    animationFrameRef.current = requestAnimationFrame(updateTape);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isRecordingDictaphone, activePlaybackId]);

  // Web Speech API speech-to-text for the Walkman Lapel Microphone
  const toggleDictaphoneRecording = () => {
    if (isRecordingDictaphone) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore stop error
        }
      }
      setIsRecordingDictaphone(false);
      setRecordingStatus('Walkman stopped · TDK D-C60 Cassette recorded.');
      audioEngine.playPresetSound('tape_recorder');
      return;
    }

    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      setRecordingStatus('External Lapel Mic offline in browser · Type in field pad below.');
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsRecordingDictaphone(true);
        setRecordingStatus('● REC: Walkman C-60 spinning via Lapel Mic... Speak your case theory.');
        audioEngine.playPresetSound('clue_discover');
      };

      rec.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setNoteText((prev) => {
            const separator = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
            return `${prev}${separator}${transcript.trim()}`;
          });
        }
      };

      rec.onerror = (e: any) => {
        setIsRecordingDictaphone(false);
        setRecordingStatus(`Walkman Mic paused: ${e.error || 'Mic input finished'}`);
      };

      rec.onend = () => {
        setIsRecordingDictaphone(false);
        setRecordingStatus('TDK D-C60 Tape recorded.');
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      setIsRecordingDictaphone(false);
      setRecordingStatus('Walkman Lapel Mic ready (type text below).');
    }
  };

  const handleSaveMemo = (source: 'typed' | 'voice_dictaphone' = 'typed') => {
    const content = noteText.trim();
    if (!content) return;

    const tags: string[] = [selectedTag];
    if (source === 'voice_dictaphone') tags.push('🎙️ Walkman Tape');

    const newMemo = createNotebookMemo(
      content,
      source,
      gameDay,
      gameTimeFormatted,
      tags,
      noteTitle.trim() || undefined
    );
    onAddMemo(newMemo);

    setNoteText('');
    setNoteTitle('');
    setRecordingStatus(`Saved memo: "${newMemo.title}"`);
    audioEngine.playPresetSound('tape_recorder');
  };

  // Play memo text with speech synthesis or vintage audio click
  const handlePlayMemoAudio = (memo: NotebookMemoEntry) => {
    if (activePlaybackId === memo.id) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      setActivePlaybackId(null);
      return;
    }

    audioEngine.playPresetSound('tape_recorder');
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(memo.content);
      utterance.rate = 0.95;
      utterance.pitch = 0.9;
      utterance.onstart = () => setActivePlaybackId(memo.id);
      utterance.onend = () => setActivePlaybackId(null);
      utterance.onerror = () => setActivePlaybackId(null);
      window.speechSynthesis.speak(utterance);
    } else {
      setActivePlaybackId(memo.id);
      setTimeout(() => setActivePlaybackId(null), 2500);
    }
  };

  const filteredMemos = searchAndFilterNotebookMemos(memos, searchQuery, filterTag);

  // Corkboard red string links (between memos and related tenant rooms)
  const defaultConnections: CorkboardThreadLink[] = [
    {
      id: 'yarn_1',
      fromId: 'pin_tenant_vincent',
      toId: 'pin_suite_202',
      threadColor: '#dc2626',
      label: 'Fireplace Latch'
    },
    {
      id: 'yarn_2',
      fromId: 'pin_suite_202',
      toId: 'pin_clue_key',
      threadColor: '#eab308',
      label: 'Passkey'
    }
  ];

  return (
    <StudioWindowFrame
      windowState={windowState}
      badgeText="1979 Walkman & Case Folio"
      onFocus={onFocus}
      onMove={onMove}
      onResize={onResize}
      onToggleMinimize={onToggleMinimize}
      onToggleMaximize={onToggleMaximize}
      onClose={onClose}
    >
      <div className="flex flex-col h-full bg-[#241c15] text-[#e8ded1] font-mono text-xs select-none">
        {/* Folio Top Navigation Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-[#1b140e] border-b border-[#3d2f24] text-[11px]">
          <div className="flex items-center gap-1 font-serif tracking-wider font-bold text-[#d4af37]">
            <span>THE ALDERNEY ARMS HOTEL · CASE FOLIO</span>
            <span className="text-[10px] bg-[#3a2717] text-[#e5c07b] px-1.5 py-0.5 rounded border border-[#5c4028]">
              Day {gameDay} · {gameTimeFormatted}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('field_notes')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                activeTab === 'field_notes'
                  ? 'bg-[#d4af37] text-[#1b140e] shadow'
                  : 'bg-[#2f2319] text-[#c9bfae] hover:bg-[#3d2e20]'
              }`}
            >
              🎧 Walkman & Field Pad
            </button>
            <button
              onClick={() => setActiveTab('transcripts')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                activeTab === 'transcripts'
                  ? 'bg-[#d4af37] text-[#1b140e] shadow'
                  : 'bg-[#2f2319] text-[#c9bfae] hover:bg-[#3d2e20]'
              }`}
            >
              📖 Transcripts ({savedInteractions.length})
            </button>
            <button
              onClick={() => setActiveTab('corkboard')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                activeTab === 'corkboard'
                  ? 'bg-[#d4af37] text-[#1b140e] shadow'
                  : 'bg-[#2f2319] text-[#c9bfae] hover:bg-[#3d2e20]'
              }`}
            >
              📌 Evidence Corkboard
            </button>
          </div>
        </div>

        {/* TAB 1: FIELD PAD & 1979/1980 EARLY CASSETTE WALKMAN WITH PLUG-IN LAPEL MICROPHONE */}
        {activeTab === 'field_notes' && (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2 p-2.5 overflow-hidden bg-[#241c15]">
            {/* Left: 1979/1980 Metallic-Blue & Brushed-Silver Walkman Cassette-Corder + Lapel Mic (5 cols) */}
            <div className="md:col-span-5 flex flex-col gap-2 bg-[#2d2218] p-2.5 rounded border border-[#4a3928] shadow-inner overflow-y-auto">
              {/* Early Portable Cassette Walkman Chassis (Sony TPS-L2 / TCS-300 Metallic Navy & Brushed Silver) */}
              <div className="bg-gradient-to-b from-[#1e3a6e] via-[#172c54] to-[#0f1d3a] p-2.5 rounded-lg border-2 border-[#94a3b8] shadow-xl flex flex-col gap-2 relative">
                {/* Brushed Silver Top Trim & Orange HOT LINE Button */}
                <div className="flex items-center justify-between bg-gradient-to-r from-[#cbd5e1] via-[#e2e8f0] to-[#94a3b8] text-[#0f172a] px-2 py-1 rounded-sm border border-[#64748b] shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black tracking-tighter text-[10px] text-[#0f172a]">
                      WALKMAN · TCS-300
                    </span>
                    <span className="text-[8px] font-bold bg-[#1e3a6e] text-sky-100 px-1 py-0.2 rounded">
                      STEREO CASSETTE-CORDER
                    </span>
                  </div>
                  {/* Iconic 1979 Orange HOT LINE Mic Override Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setHotLineActive((prev) => !prev);
                      audioEngine.playPresetSound('tape_recorder');
                    }}
                    title="1979 Orange HOT LINE Talk-Over Mic Circuit"
                    className={`px-1.5 py-0.5 rounded-sm text-[8px] font-black tracking-wider uppercase border transition-all ${
                      hotLineActive
                        ? 'bg-orange-500 text-white border-orange-700 shadow-inner'
                        : 'bg-orange-400/80 text-slate-950 border-orange-600'
                    }`}
                  >
                    ● HOT LINE
                  </button>
                </div>

                {/* Middle Row: Full-Size Compact Cassette Window + 3-Digit Counter + Plug-In Lapel Microphone */}
                <div className="grid grid-cols-12 gap-2 items-center">
                  {/* Compact Cassette Clear Acrylic Door Window (8 cols) */}
                  <div className="col-span-8 bg-[#0b1324] p-2 rounded border-2 border-[#64748b] shadow-inner relative overflow-hidden">
                    {/* TDK D-C60 Cassette Shell Label (Orange & Cream) */}
                    <div className="bg-[#f8fafc] border border-[#cbd5e1] rounded-sm px-2 py-1 flex flex-col gap-1">
                      <div className="flex items-center justify-between bg-[#ea580c] text-white px-1.5 py-0.2 rounded-xs text-[8px] font-bold tracking-wider">
                        <span>TDK · D-C60</span>
                        <span>NORMAL POSITION · SIDE A</span>
                      </div>

                      {/* Dual 6-Spoke Sprocket Reels & Center Tape Pack Window */}
                      <div className="relative h-12 bg-[#111827] border border-[#334155] rounded-sm flex items-center justify-between px-2.5 my-0.5">
                        {/* Left Supply Reel with 6 Sprocket Teeth */}
                        <div
                          className="w-9 h-9 rounded-full border-4 border-[#3b2516] bg-[#090d16] flex items-center justify-center relative shadow"
                          style={{ transform: `rotate(${tapeSpinAngle}deg)` }}
                        >
                          <div className="w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          </div>
                          <div className="absolute w-0.5 h-4 bg-slate-200" />
                          <div className="absolute w-4 h-0.5 bg-slate-200" />
                        </div>

                        {/* Center 100-50-0 Scale Window */}
                        <div className="flex flex-col items-center justify-center text-[7px] text-amber-200/80 font-mono">
                          <span>100 ── 50 ── 0</span>
                          <div className="w-10 h-1.5 bg-[#1e293b] border border-slate-600 rounded-xs overflow-hidden my-0.5">
                            <div
                              className="h-full bg-[#7c2d12] transition-all"
                              style={{ width: `${35 + (tapeCounter % 55)}%` }}
                            />
                          </div>
                          <span className="text-[7px] text-sky-300">HI-OUTPUT</span>
                        </div>

                        {/* Right Take-up Reel with 6 Sprocket Teeth */}
                        <div
                          className="w-9 h-9 rounded-full border-4 border-[#4a2e1b] bg-[#090d16] flex items-center justify-center relative shadow"
                          style={{ transform: `rotate(${tapeSpinAngle}deg)` }}
                        >
                          <div className="w-5 h-5 rounded-full border-2 border-slate-200 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                          </div>
                          <div className="absolute w-0.5 h-4 bg-slate-200" />
                          <div className="absolute w-4 h-0.5 bg-slate-200" />
                        </div>
                      </div>

                      {/* Bottom Magnetic Tape Ribbon & Capstan Pinch Roller */}
                      <div className="flex items-center justify-between px-1 text-[7px] text-slate-600 font-bold">
                        <span>◀ PLAY DIRECTION</span>
                        <span className="text-rose-700">
                          {isRecordingDictaphone ? '● MAGNETIC HEAD ENGAGED' : 'HEAD STANDBY'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Mechanical 3-Digit Counter + Plug-In Lapel Microphone (4 cols) */}
                  <div className="col-span-4 flex flex-col gap-1.5 items-stretch">
                    {/* Mechanical 3-Digit Tape Counter (`000`) */}
                    <div className="bg-[#090d16] border border-[#64748b] rounded p-1 flex items-center justify-between">
                      <span className="bg-black text-white font-mono text-[11px] font-bold px-1.5 py-0.5 rounded border border-slate-700 tracking-widest">
                        {String(tapeCounter).padStart(3, '0')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTapeCounter(0)}
                        title="Reset Mechanical Tape Counter"
                        className="w-4 h-4 rounded-full bg-slate-300 hover:bg-white text-slate-900 text-[8px] font-bold flex items-center justify-center shadow"
                      >
                        R
                      </button>
                    </div>

                    {/* REC/BATT Red LED Indicator */}
                    <div className="flex items-center justify-between bg-[#111e38] px-1.5 py-1 rounded border border-[#334155]">
                      <span className="text-[8px] font-bold text-slate-300">REC/BATT</span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full border ${
                          isRecordingDictaphone
                            ? 'bg-red-500 border-red-200 shadow-[0_0_8px_#ef4444] animate-pulse'
                            : 'bg-red-950 border-red-800'
                        }`}
                      />
                    </div>

                    {/* External Plug-In Dynamic Lapel Microphone with Coiled Cord & Mesh Grille */}
                    <button
                      type="button"
                      onClick={toggleDictaphoneRecording}
                      title="Click to Speak into Plug-In Walkman Lapel Microphone"
                      className={`p-1.5 rounded border flex flex-col items-center gap-0.5 transition-all ${
                        isRecordingDictaphone
                          ? 'bg-rose-900/90 border-rose-400 text-white shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                          : 'bg-[#1e293b] hover:bg-[#334155] border-[#94a3b8] text-slate-200'
                      }`}
                    >
                      {/* Stainless Steel Mesh Mic Capsule Visual */}
                      <div className="w-7 h-7 rounded-full bg-gradient-to-b from-slate-300 via-slate-400 to-slate-600 border-2 border-slate-200 flex items-center justify-center shadow-inner">
                        <div className="w-5 h-5 rounded-full border border-dotted border-slate-800 flex items-center justify-center text-[10px]">
                          🎤
                        </div>
                      </div>
                      <span className="text-[8px] font-bold tracking-tight uppercase">
                        {isRecordingDictaphone ? 'LIVE MIC ON' : 'LAPEL MIC'}
                      </span>
                      <span className="text-[7px] text-rose-300 font-mono">JACK: EXT MIC</span>
                    </button>
                  </div>
                </div>

                {/* Stereo L/R Peak Level Meter & Tactile Silver Piano-Key Transport Controls */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#334155]">
                  <div className="flex-1 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between text-[8px] text-sky-200/80">
                      <span>MIC LEVEL (L/R)</span>
                      <span>{hotLineActive ? 'HOT-LINE ON' : 'NORMAL'}</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#090d16] rounded overflow-hidden flex border border-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 transition-all duration-75"
                        style={{ width: `${Math.round(vuLevel * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Tactile Brushed-Silver Walkman Piano Keys */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={toggleDictaphoneRecording}
                      className={`px-2.5 py-1 rounded-sm text-[10px] font-black flex items-center gap-1 transition-all border shadow ${
                        isRecordingDictaphone
                          ? 'bg-rose-600 text-white border-rose-300 translate-y-0.5'
                          : 'bg-gradient-to-b from-[#f1f5f9] to-[#94a3b8] hover:from-white hover:to-[#cbd5e1] text-rose-700 border-slate-500'
                      }`}
                    >
                      <span>● REC</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isRecordingDictaphone) {
                          toggleDictaphoneRecording();
                        } else if (activePlaybackId) {
                          if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                          setActivePlaybackId(null);
                        }
                        audioEngine.playPresetSound('tape_recorder');
                      }}
                      className="px-2 py-1 rounded-sm text-[10px] font-black bg-gradient-to-b from-[#f1f5f9] to-[#94a3b8] hover:from-white hover:to-[#cbd5e1] text-slate-900 border border-slate-500 shadow"
                    >
                      ■ STOP
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTapeCounter((prev) => Math.max(0, prev - 25));
                        audioEngine.playPresetSound('tape_recorder');
                      }}
                      title="Rewind Cassette Tape"
                      className="px-1.5 py-1 rounded-sm text-[10px] font-black bg-gradient-to-b from-[#f1f5f9] to-[#94a3b8] hover:from-white hover:to-[#cbd5e1] text-slate-900 border border-slate-500 shadow"
                    >
                      ⏪
                    </button>
                  </div>
                </div>

                {recordingStatus && (
                  <p className="text-[10px] text-amber-200/95 italic truncate">{recordingStatus}</p>
                )}
              </div>

              {/* Typed Field Note Input Area (Aged Manila Pad) */}
              <div className="flex-1 flex flex-col gap-1.5 bg-[#f5ede0] text-[#261f18] p-2.5 rounded border border-[#c4b59f] shadow">
                <div className="flex items-center justify-between text-[10px] font-serif border-b border-[#d8cbbb] pb-1">
                  <span className="font-bold tracking-wider text-[#694e32]">INVESTIGATOR'S MEMO PAD</span>
                  <span className="text-[#876e51]">HOTEL DESK STATIONERY</span>
                </div>

                <input
                  type="text"
                  placeholder="Memo subject (e.g. Suite 202 Latch, Wardrobe)..."
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="bg-transparent border-b border-[#c9bba6] px-1 py-0.5 text-xs font-bold text-[#3d2e1f] focus:outline-none placeholder:text-[#a89b88]"
                />

                <textarea
                  rows={4}
                  placeholder="Type notes or click [● REC] / [LAPEL MIC] above to record onto the Walkman cassette..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="flex-1 bg-transparent border-none resize-none p-1 text-xs font-serif leading-relaxed text-[#261f18] focus:outline-none placeholder:text-[#a89b88]"
                />

                <div className="flex items-center justify-between gap-1 pt-1 border-t border-[#d8cbbb]">
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="bg-[#ebe0ce] border border-[#c4b59f] rounded px-1.5 py-0.5 text-[10px] font-semibold text-[#423323]"
                  >
                    <option value="To Investigate">To Investigate</option>
                    <option value="Suspect Motive">Suspect Motive</option>
                    <option value="Passkey Code">Passkey Code</option>
                    <option value="Secret Passage">Secret Passage</option>
                    <option value="Contradiction">Contradiction</option>
                  </select>

                  <button
                    onClick={() => handleSaveMemo('typed')}
                    disabled={!noteText.trim()}
                    className="px-2.5 py-1 bg-[#4a331e] hover:bg-[#614327] disabled:opacity-40 text-amber-100 rounded text-[11px] font-bold shadow"
                  >
                    + Save to Notebook
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Saved Field Memos & Audio Recordings (7 cols) */}
            <div className="md:col-span-7 flex flex-col gap-2 bg-[#1f1710] p-2.5 rounded border border-[#3d2e20] overflow-hidden">
              {/* Filter & Search Bar */}
              <div className="flex items-center justify-between gap-2 pb-1 border-b border-[#3d2e20]">
                <input
                  type="text"
                  placeholder="Search memos, rooms, clues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[#2d2218] border border-[#4d3a29] rounded px-2 py-1 text-[11px] text-[#e8ded1] placeholder:text-[#8a7a67] focus:outline-none flex-1"
                />

                <select
                  value={filterTag}
                  onChange={(e) => setFilterTag(e.target.value)}
                  className="bg-[#2d2218] border border-[#4d3a29] rounded px-2 py-1 text-[11px] text-[#d4af37]"
                >
                  {TAG_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Memo List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {filteredMemos.length === 0 ? (
                  <div className="text-center py-10 text-[#7a6a57] italic text-xs">
                    No field notes found. Record a voice memo or type observations to remember clues.
                  </div>
                ) : (
                  filteredMemos.map((memo) => (
                    <div
                      key={memo.id}
                      className="bg-[#291e15] border border-[#423120] hover:border-[#634b32] p-2.5 rounded shadow-sm flex flex-col gap-1 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#f5ede0]">{memo.title}</span>
                            {memo.source === 'voice_dictaphone' && (
                              <span className="bg-rose-950/80 text-rose-300 border border-rose-800 text-[9px] px-1.5 py-0.2 rounded font-mono">
                                🎙️ AUDIO TAPE
                              </span>
                            )}
                            {memo.linkedRoom && (
                              <span className="bg-[#422e1b] text-[#e5c07b] border border-[#69492b] text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
                                📍 {memo.linkedRoom}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#8c7964]">
                            Day {memo.gameDay} · {memo.gameTimeFormatted}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handlePlayMemoAudio(memo)}
                            className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                              activePlaybackId === memo.id
                                ? 'bg-amber-500 text-black border-amber-400 font-bold'
                                : 'bg-[#38281b] text-[#d4af37] border-[#573f2a] hover:bg-[#4a3624]'
                            }`}
                            title="Listen to memo playback"
                          >
                            {activePlaybackId === memo.id ? '■ Stop' : '▶ Play'}
                          </button>
                          <button
                            onClick={() => onTogglePinMemo(memo.id)}
                            className={`px-1.5 py-0.5 rounded text-[10px] border transition-colors ${
                              memo.isPinnedToBoard
                                ? 'bg-[#5c2317] text-amber-200 border-rose-900'
                                : 'bg-[#38281b] text-[#8a7862] border-[#573f2a] hover:bg-[#4a3624]'
                            }`}
                            title="Pin to Corkboard"
                          >
                            📌 {memo.isPinnedToBoard ? 'Pinned' : 'Pin'}
                          </button>
                          <button
                            onClick={() => onDeleteMemo(memo.id)}
                            className="px-1.5 py-0.5 bg-[#2b1715] hover:bg-rose-900/60 text-rose-300 rounded text-[10px] border border-rose-950"
                            title="Discard memo"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      <p className="font-serif text-[#d6c7b2] text-[11px] leading-relaxed whitespace-pre-wrap pl-1 border-l-2 border-[#573f2a]">
                        {memo.content}
                      </p>

                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        {memo.tags.map((tag) => (
                          <span
                            key={tag}
                            className="bg-[#1b140e] text-[#a3927d] border border-[#3d2e20] text-[9px] px-1.5 py-0.2 rounded"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONVERSATION DOSSIER & TRANSCRIPTS */}
        {activeTab === 'transcripts' && (
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[#1f1710]">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#3d2f24] text-[11px] text-[#a3937c]">
              <span className="font-bold text-[#d4af37]">STENOGRAPHIC INTERROGATION TRANSCRIPTS</span>
              <span>{savedInteractions.length} RECORDED INTERACTION(S)</span>
            </div>

            {savedInteractions.length === 0 ? (
              <div className="text-center py-14 text-[#7a6a57] italic">
                No conversations logged yet. Talk to tenants in Build Mode or hold [V] in Walkthrough mode to question them!
              </div>
            ) : (
              savedInteractions.map((log) => (
                <div
                  key={log.id}
                  className="bg-[#291e15] border border-[#423120] p-3 rounded shadow-sm flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between border-b border-[#3d2c1e] pb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#f5ede0]">{log.characterName}</span>
                      <span className="text-[10px] text-[#a8967f]">
                        Day {log.gameDay ?? 1} · {log.gameTimeFormatted} ({log.phase})
                      </span>
                    </div>

                    {log.resultingDisposition && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-[#38281b] text-[#e5c07b] border border-[#5c4028]">
                        {log.resultingDisposition} · Trust {log.resultingTrust ?? 50}%
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-[#e8ded1] font-mono">
                    <span className="text-amber-400 font-bold">Investigator: </span>
                    <span>"{log.userMessage}"</span>
                  </div>

                  <div className="text-[11px] text-[#d6c7b2] font-serif leading-relaxed italic bg-[#1c150e] p-2 rounded border border-[#382718]">
                    <span className="text-emerald-400 font-bold not-italic font-mono">
                      {log.characterName}:{' '}
                    </span>
                    <span>{log.agentReply}</span>
                  </div>

                  {log.gameplayInfluenceSummary && (
                    <div className="text-[10px] text-[#c9a767] bg-[#332213] px-2 py-1 rounded border border-[#543920] flex items-center gap-1 font-sans">
                      <span>🧠 Relational Impact:</span>
                      <span>{log.gameplayInfluenceSummary}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 3: EVIDENCE CORKBOARD & RED YARN (Proposal B) */}
        {activeTab === 'corkboard' && (
          <div className="flex-1 relative overflow-hidden bg-[#573922] p-3 border-inner border-4 border-[#331f12]">
            {/* Corkboard texture background */}
            <div
              className="absolute inset-0 opacity-80 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(#402816 1px, transparent 1px), radial-gradient(#6e4b2d 1px, #573922 1px)',
                backgroundSize: '24px 24px',
                backgroundPosition: '0 0, 12px 12px'
              }}
            />

            {/* SVG Connecting Red Strings */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
              {defaultConnections.map((conn) => (
                <g key={conn.id}>
                  <line
                    x1="24%"
                    y1="32%"
                    x2="68%"
                    y2="42%"
                    stroke={conn.threadColor}
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    strokeOpacity="0.85"
                  />
                  {conn.label && (
                    <text
                      x="46%"
                      y="35%"
                      fill="#fef08a"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {conn.label}
                    </text>
                  )}
                </g>
              ))}
            </svg>

            {/* Corkboard Pins: Suspects, Secrets & Player Memos */}
            <div className="relative w-full h-full z-20 flex flex-wrap gap-4 items-start p-2 overflow-y-auto">
              {/* Pinned Suspect Polaroid 1 */}
              <div
                id="pin_tenant_vincent"
                className="w-44 bg-[#f5ede0] text-[#1c1917] p-2 rounded shadow-2xl border border-[#d6c7b2] transform -rotate-2 relative"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-rose-600 border border-rose-800 shadow absolute -top-1.5 left-1/2 -translate-x-1/2" />
                <div className="w-full h-20 bg-[#2b241c] flex items-center justify-center text-amber-200 text-xs font-serif font-bold">
                  VINCENT GRAVES
                </div>
                <div className="pt-1.5 text-[10px] font-mono leading-tight">
                  <p className="font-bold">Concierge Clerk · Suite 202</p>
                  <p className="text-[#785b39] italic">"Heard clicking behind the brickwork at 11:45 PM."</p>
                </div>
              </div>

              {/* Pinned Secret Passage Index Card */}
              <div
                id="pin_suite_202"
                className="w-48 bg-[#fef3c7] text-[#451a03] p-2.5 rounded shadow-2xl border-2 border-[#f59e0b] transform rotate-1 relative"
              >
                <div className="w-3.5 h-3.5 rounded-full bg-amber-500 border border-amber-700 shadow absolute -top-1.5 left-1/2 -translate-x-1/2" />
                <span className="text-[9px] bg-amber-200 font-bold px-1 rounded uppercase tracking-wider">
                  SECRET EVIDENCE
                </span>
                <p className="text-xs font-bold font-serif pt-1">Suite 202 Fireplace Latch</p>
                <p className="text-[10px] font-mono pt-0.5 leading-snug">
                  Pivoting wainscoting opens into the hidden service shaft between Floor 1 and Floor 2.
                </p>
              </div>

              {/* Dynamic Pinned Memos from Player Notebook */}
              {memos
                .filter((m) => m.isPinnedToBoard)
                .map((memo, idx) => (
                  <div
                    key={memo.id}
                    className="w-48 bg-[#fffbeb] text-[#1c1917] p-2.5 rounded shadow-2xl border border-[#e5d5b8] relative"
                    style={{
                      transform: `rotate(${((idx % 5) - 2) * 2}deg)`
                    }}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-rose-600 border border-rose-800 shadow absolute -top-1.5 left-1/2 -translate-x-1/2" />
                    <div className="flex items-center justify-between text-[9px] text-[#78614a] font-mono">
                      <span>{memo.source === 'voice_dictaphone' ? '🎙️ VOICE MEMO' : 'FIELD NOTE'}</span>
                      <span>Day {memo.gameDay}</span>
                    </div>
                    <p className="text-xs font-bold font-serif pt-0.5 text-[#332212]">{memo.title}</p>
                    <p className="text-[10px] font-mono pt-1 leading-snug line-clamp-4">{memo.content}</p>
                    {memo.linkedRoom && (
                      <span className="inline-block mt-1 bg-amber-200/80 text-amber-900 text-[8px] font-bold px-1 rounded">
                        {memo.linkedRoom}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </StudioWindowFrame>
  );
};
