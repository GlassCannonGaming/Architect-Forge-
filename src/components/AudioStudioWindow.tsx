import React, { useState, useEffect, useRef } from 'react';
import {
  audioEngine,
  SoundEffectSpec,
  SoundEffectType,
  MusicTrackSpec,
  BUILTIN_SOUND_EFFECTS,
  BUILTIN_BGM_TRACKS
} from '../game/audioEngine';
import { StudioWindowId, StudioWindowState } from '../game/rules';
import { StudioWindowFrame } from './StudioWindowFrame';

interface AudioStudioWindowProps {
  windowState: StudioWindowState;
  onFocus: (id: StudioWindowId) => void;
  onMove: (id: StudioWindowId, nextX: number, nextY: number) => void;
  onResize: (id: StudioWindowId, nextW: number, nextH: number) => void;
  onToggleMinimize: (id: StudioWindowId) => void;
  onToggleMaximize: (id: StudioWindowId) => void;
  onClose: (id: StudioWindowId) => void;
  onSaveToLocalFolder: (
    category: 'audio_sfx' | 'audio_music',
    name: string,
    payload: unknown,
    uniqueSuffix?: string
  ) => void;
  walkthroughBgmEnabled: boolean;
  onToggleWalkthroughBgm: (enabled: boolean) => void;
  footstepsEnabled: boolean;
  onToggleFootsteps: (enabled: boolean) => void;
}

export const AudioStudioWindow: React.FC<AudioStudioWindowProps> = ({
  windowState,
  onFocus,
  onMove,
  onResize,
  onToggleMinimize,
  onToggleMaximize,
  onClose,
  onSaveToLocalFolder,
  walkthroughBgmEnabled,
  onToggleWalkthroughBgm,
  footstepsEnabled,
  onToggleFootsteps
}) => {
  const [activeTab, setActiveTab] = useState<'sfx' | 'bgm' | 'settings'>('sfx');

  // SFX State
  const [selectedPresetType, setSelectedPresetType] = useState<SoundEffectType>('brass_bell');
  const [activeSfxSpec, setActiveSfxSpec] = useState<SoundEffectSpec>({
    ...BUILTIN_SOUND_EFFECTS.brass_bell
  });
  const [aiSfxPrompt, setAiSfxPrompt] = useState('Heavy brass door lock latching shut');
  const [aiSfxBusy, setAiSfxBusy] = useState(false);
  const [sfxFeedback, setSfxFeedback] = useState<string | null>(null);

  // BGM State
  const [activeBgmTrack, setActiveBgmTrack] = useState<MusicTrackSpec>(BUILTIN_BGM_TRACKS[0]);
  const [isBgmPlaying, setIsBgmPlaying] = useState(false);
  const [aiMusicPrompt, setAiMusicPrompt] = useState('Moody retro boutique hotel lounge noir jazz');
  const [aiMusicBusy, setAiMusicBusy] = useState(false);
  const [bgmFeedback, setBgmFeedback] = useState<string | null>(null);

  // Audio Canvas Visualizer
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Animate audio waveform canvas
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dataArray = new Uint8Array(128);

    const draw = () => {
      animId = requestAnimationFrame(draw);
      audioEngine.getAnalyserData(dataArray);

      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = isBgmPlaying ? '#38bdf8' : '#e2e8f0';
      ctx.beginPath();

      const sliceWidth = (canvas.width * 1.0) / dataArray.length;
      let x = 0;

      for (let i = 0; i < dataArray.length; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Subtle frequency energy bars along bottom
      const barWidth = canvas.width / 32;
      for (let i = 0; i < 32; i++) {
        const val = dataArray[i * 4] || 0;
        const barHeight = (val / 255) * (canvas.height * 0.4);
        ctx.fillStyle = isBgmPlaying ? 'rgba(56, 189, 248, 0.35)' : 'rgba(226, 232, 240, 0.2)';
        ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isBgmPlaying]);

  // Sync BGM playing state from audio engine
  useEffect(() => {
    const checkState = () => {
      const state = audioEngine.getActiveBgm();
      setIsBgmPlaying(state.isPlaying);
    };
    checkState();
    const interval = setInterval(checkState, 400);
    return () => clearInterval(interval);
  }, []);

  // Handle Preset Sound Selection
  const handleSelectPreset = (type: SoundEffectType) => {
    setSelectedPresetType(type);
    const spec = BUILTIN_SOUND_EFFECTS[type];
    setActiveSfxSpec({ ...spec });
    audioEngine.playSoundEffect(spec);
    setSfxFeedback(`Previewing: ${spec.name}`);
  };

  // Play Active SFX Spec
  const handlePlayActiveSfx = () => {
    audioEngine.playSoundEffect(activeSfxSpec);
  };

  // AI Generate SFX via Gemini 3.1 Flash-Lite
  const handleAiGenerateSfx = async () => {
    if (!aiSfxPrompt.trim() || aiSfxBusy) return;
    setAiSfxBusy(true);
    setSfxFeedback('Synthesizing sound parameters with Gemini Flash-Lite...');
    try {
      const res = await fetch('/api/audio/generate-sfx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiSfxPrompt.trim() })
      });
      const data = await res.json();
      if (data && data.spec) {
        setActiveSfxSpec(data.spec);
        audioEngine.playSoundEffect(data.spec);
        setSfxFeedback(`Generated: "${data.spec.name}" (${data.modelUsed || 'Gemini Flash-Lite'})`);
      }
    } catch {
      setSfxFeedback('Generated using procedural fallback synthesis.');
      audioEngine.playSoundEffect(activeSfxSpec);
    } finally {
      setAiSfxBusy(false);
    }
  };

  // Download WAV Blob for SFX
  const handleDownloadSfxWav = () => {
    const blob = audioEngine.exportSfxToWavBlob(activeSfxSpec);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSfxSpec.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.wav`;
    a.click();
    URL.revokeObjectURL(url);
    setSfxFeedback(`Exported 16-bit WAV: ${activeSfxSpec.name}`);
  };

  // Save SFX to Local Dedicated Folder
  const handleSaveSfxToLocalFolder = () => {
    const blob = audioEngine.exportSfxToWavBlob(activeSfxSpec);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Audio = reader.result as string;
      const payload = {
        schemaVersion: '2.0.0',
        savedAt: new Date().toISOString(),
        category: 'audio_sfx',
        spec: activeSfxSpec,
        audioWavBase64: base64Audio
      };
      onSaveToLocalFolder('audio_sfx', activeSfxSpec.name, payload, activeSfxSpec.type);
      setSfxFeedback(`Saved "${activeSfxSpec.name}" to local audio/sound_effects/`);
    };
    reader.readAsDataURL(blob);
  };

  // Handle BGM Play / Stop Toggle
  const handleToggleBgmPlay = (track: MusicTrackSpec) => {
    if (isBgmPlaying && activeBgmTrack.id === track.id) {
      audioEngine.stopBgm();
      setIsBgmPlaying(false);
      setBgmFeedback('BGM stopped.');
    } else {
      setActiveBgmTrack(track);
      audioEngine.playBgm(track);
      setIsBgmPlaying(true);
      setBgmFeedback(`Now playing: ${track.title} (${track.bpm} BPM)`);
    }
  };

  // AI Generate BGM via Gemini 3.1 Flash-Lite
  const handleAiGenerateMusic = async () => {
    if (!aiMusicPrompt.trim() || aiMusicBusy) return;
    setAiMusicBusy(true);
    setBgmFeedback('Composing multi-track ambient score with Gemini Flash-Lite...');
    try {
      const res = await fetch('/api/audio/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiMusicPrompt.trim() })
      });
      const data = await res.json();
      if (data && data.track) {
        setActiveBgmTrack(data.track);
        audioEngine.playBgm(data.track);
        setIsBgmPlaying(true);
        setBgmFeedback(`Composed: "${data.track.title}" (${data.modelUsed || 'Gemini Flash-Lite'})`);
      }
    } catch {
      setBgmFeedback('Generated using procedural jazz waltz fallback.');
    } finally {
      setAiMusicBusy(false);
    }
  };

  // Download BGM WAV Loop
  const handleDownloadBgmWav = () => {
    const blob = audioEngine.exportBgmToWavBlob(activeBgmTrack);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeBgmTrack.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_loop.wav`;
    a.click();
    URL.revokeObjectURL(url);
    setBgmFeedback(`Exported 16-bit WAV loop: ${activeBgmTrack.title}`);
  };

  // Save BGM to Local Dedicated Folder
  const handleSaveBgmToLocalFolder = () => {
    const blob = audioEngine.exportBgmToWavBlob(activeBgmTrack);
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Audio = reader.result as string;
      const payload = {
        schemaVersion: '2.0.0',
        savedAt: new Date().toISOString(),
        category: 'audio_music',
        track: activeBgmTrack,
        audioWavBase64: base64Audio
      };
      onSaveToLocalFolder('audio_music', activeBgmTrack.title, payload, activeBgmTrack.id);
      setBgmFeedback(`Saved "${activeBgmTrack.title}" to local audio/background_music/`);
    };
    reader.readAsDataURL(blob);
  };

  return (
    <StudioWindowFrame
      windowState={windowState}
      badgeText="Web Audio Synth"
      onFocus={onFocus}
      onMove={onMove}
      onResize={onResize}
      onToggleMinimize={onToggleMinimize}
      onToggleMaximize={onToggleMaximize}
      onClose={onClose}
    >
      <div className="flex flex-col h-full bg-slate-900 text-slate-100 select-none text-xs">
        {/* Top Header & Visualizer Canvas */}
        <div className="p-3 bg-slate-950 border-b border-slate-800 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base font-extrabold text-amber-400">🎵 Audio & Sound Studio</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-500/40">
                16-bit WAV · Offline Standalone
              </span>
            </div>
          </div>

        {/* Live Audio Oscilloscope Canvas */}
        <div className="relative rounded overflow-hidden border border-slate-800 bg-black">
          <canvas ref={canvasRef} width={540} height={48} className="w-full h-12 block" />
          <div className="absolute top-1 right-2 flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isBgmPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
              }`}
            />
            {isBgmPlaying ? `BGM: ${activeBgmTrack.title}` : 'Audio Engine Ready'}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 pt-1">
          <button
            onClick={() => setActiveTab('sfx')}
            className={`px-3 py-1.5 rounded-t text-xs font-bold transition-colors ${
              activeTab === 'sfx'
                ? 'bg-slate-800 text-amber-300 border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-white bg-slate-950'
            }`}
          >
            🔊 Sound Effects (SFX)
          </button>
          <button
            onClick={() => setActiveTab('bgm')}
            className={`px-3 py-1.5 rounded-t text-xs font-bold transition-colors ${
              activeTab === 'bgm'
                ? 'bg-slate-800 text-amber-300 border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-white bg-slate-950'
            }`}
          >
            🎶 Background Music (BGM)
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-t text-xs font-bold transition-colors ${
              activeTab === 'settings'
                ? 'bg-slate-800 text-amber-300 border-t-2 border-amber-400'
                : 'text-slate-400 hover:text-white bg-slate-950'
            }`}
          >
            ⚙️ In-Game Audio Config
          </button>
        </div>
      </div>

      {/* Main Tab Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-900">
        {/* ==================================================================== */}
        {/* SFX TAB */}
        {/* ==================================================================== */}
        {activeTab === 'sfx' && (
          <div className="space-y-3">
            {/* Built-in Sound Presets Grid */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Hotel Mystery Sound Presets
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {(Object.keys(BUILTIN_SOUND_EFFECTS) as SoundEffectType[]).map((type) => {
                  const spec = BUILTIN_SOUND_EFFECTS[type];
                  const isSelected = selectedPresetType === type;
                  return (
                    <button
                      key={type}
                      onClick={() => handleSelectPreset(type)}
                      className={`p-2 rounded text-left border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-950/40 border-amber-500 text-amber-200'
                          : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-[11px] truncate">{spec.name}</div>
                        <div className="text-[9px] text-slate-400 font-mono">
                          {spec.oscillatorType} · {spec.baseFrequency}Hz · {spec.durationSeconds}s
                        </div>
                      </div>
                      <span className="text-xs">▶</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI Foley Sound Generator */}
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300">
                  ✨ AI Sound Generator (Gemini Flash-Lite)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Parametric Synthesis</span>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={aiSfxPrompt}
                  onChange={(e) => setAiSfxPrompt(e.target.value)}
                  placeholder="e.g. Heavy iron vault door sliding open..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white placeholder-slate-500"
                />
                <button
                  onClick={handleAiGenerateSfx}
                  disabled={aiSfxBusy}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded text-xs transition-colors flex items-center gap-1"
                >
                  {aiSfxBusy ? 'Forging...' : 'Forge SFX'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1 text-[10px]">
                <span className="text-slate-500">Quick Prompts:</span>
                {[
                  'Distant radiator clank behind bedroom wall',
                  'Hollow brick pivot latch opening',
                  'Thunderbolt over Manhattan street',
                  'Grandfather clock ticking'
                ].map((qp) => (
                  <button
                    key={qp}
                    onClick={() => setAiSfxPrompt(qp)}
                    className="text-slate-400 hover:text-amber-300 underline"
                  >
                    {qp}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Sound Parameter Tuning */}
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300">
                  Active Preset: <span className="text-amber-300">{activeSfxSpec.name}</span>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handlePlayActiveSfx}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded text-xs transition-colors"
                  >
                    ▶ Play Sound
                  </button>
                  <button
                    onClick={handleDownloadSfxWav}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] border border-slate-700"
                    title="Download 16-bit PCM WAV File"
                  >
                    💾 WAV
                  </button>
                  <button
                    onClick={handleSaveSfxToLocalFolder}
                    className="px-2 py-1 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded text-[11px]"
                    title="Save to Dedicated audio/sound_effects Folder"
                  >
                    📁 Save to Local
                  </button>
                </div>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px]">
                <div>
                  <div className="flex justify-between text-slate-400">
                    <span>Base Freq</span>
                    <span>{Math.round(activeSfxSpec.baseFrequency)} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="2400"
                    value={activeSfxSpec.baseFrequency}
                    onChange={(e) =>
                      setActiveSfxSpec({ ...activeSfxSpec, baseFrequency: Number(e.target.value) })
                    }
                    className="w-full accent-amber-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-slate-400">
                    <span>Duration</span>
                    <span>{activeSfxSpec.durationSeconds.toFixed(2)} s</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="3.0"
                    step="0.05"
                    value={activeSfxSpec.durationSeconds}
                    onChange={(e) =>
                      setActiveSfxSpec({
                        ...activeSfxSpec,
                        durationSeconds: Number(e.target.value)
                      })
                    }
                    className="w-full accent-amber-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-slate-400">
                    <span>Noise Mix</span>
                    <span>{Math.round((activeSfxSpec.noiseMix || 0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={activeSfxSpec.noiseMix || 0}
                    onChange={(e) =>
                      setActiveSfxSpec({ ...activeSfxSpec, noiseMix: Number(e.target.value) })
                    }
                    className="w-full accent-amber-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-slate-400">
                    <span>Reverb</span>
                    <span>{Math.round((activeSfxSpec.reverb || 0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={activeSfxSpec.reverb || 0}
                    onChange={(e) =>
                      setActiveSfxSpec({ ...activeSfxSpec, reverb: Number(e.target.value) })
                    }
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>
            </div>

            {sfxFeedback && (
              <div className="p-2 rounded bg-amber-950/30 border border-amber-600/40 text-amber-300 font-mono text-[10px]">
                {sfxFeedback}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* BGM TAB */}
        {/* ==================================================================== */}
        {activeTab === 'bgm' && (
          <div className="space-y-3">
            {/* Built-in Tracks List */}
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Hotel Mystery Soundtracks
              </div>
              <div className="space-y-1.5">
                {BUILTIN_BGM_TRACKS.map((track) => {
                  const isCurrent = activeBgmTrack.id === track.id;
                  const isThisPlaying = isCurrent && isBgmPlaying;
                  return (
                    <div
                      key={track.id}
                      className={`p-2.5 rounded border transition-all flex items-center justify-between ${
                        isCurrent
                          ? 'bg-slate-800 border-amber-500'
                          : 'bg-slate-950 border-slate-800 hover:bg-slate-900'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-100 flex items-center gap-2">
                          <span>{track.title}</span>
                          <span className="text-[9px] bg-slate-800 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                            {track.bpm} BPM · {track.scale}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400">{track.mood}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleToggleBgmPlay(track)}
                          className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                            isThisPlaying
                              ? 'bg-rose-600 hover:bg-rose-500 text-white'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {isThisPlaying ? '⏸ Stop' : '▶ Play'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AI Music Composer Bar */}
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-300">
                  ✨ AI Music Composer (Gemini Flash-Lite)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Multi-Voice Loop</span>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={aiMusicPrompt}
                  onChange={(e) => setAiMusicPrompt(e.target.value)}
                  placeholder="e.g. Rainy boutique hotel lounge noir jazz..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-white placeholder-slate-500"
                />
                <button
                  onClick={handleAiGenerateMusic}
                  disabled={aiMusicBusy}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded text-xs transition-colors flex items-center gap-1"
                >
                  {aiMusicBusy ? 'Composing...' : 'Compose Track'}
                </button>
              </div>
              <div className="flex flex-wrap gap-1 text-[10px]">
                <span className="text-slate-500">Quick Themes:</span>
                {[
                  'Rainy casement window piano waltz',
                  'Eerie basement sub-vault frequency',
                  'Retro elevator lounge jazz',
                  'Late night radio static melody'
                ].map((qt) => (
                  <button
                    key={qt}
                    onClick={() => setAiMusicPrompt(qt)}
                    className="text-slate-400 hover:text-amber-300 underline"
                  >
                    {qt}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Track Controls & Export */}
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-200">
                  Track: <span className="text-amber-300">{activeBgmTrack.title}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Chords: {activeBgmTrack.chords.join(' → ')}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleDownloadBgmWav}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs border border-slate-700"
                  title="Download 16-bit PCM WAV Loop"
                >
                  💾 Export WAV Loop
                </button>
                <button
                  onClick={handleSaveBgmToLocalFolder}
                  className="px-2.5 py-1 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded text-xs"
                  title="Save to Dedicated audio/background_music Folder"
                >
                  📁 Save to Local
                </button>
              </div>
            </div>

            {bgmFeedback && (
              <div className="p-2 rounded bg-amber-950/30 border border-amber-600/40 text-amber-300 font-mono text-[10px]">
                {bgmFeedback}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* SETTINGS TAB */}
        {/* ==================================================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-3">
            <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-3">
              <div className="font-bold text-slate-200 text-sm">In-Game Sound & Music Setup</div>

              {/* Master Volume */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span className="font-bold">Master Volume</span>
                  <span className="font-mono text-amber-400">80%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  defaultValue="0.8"
                  onChange={(e) => audioEngine.setMasterVolume(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* SFX Volume */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span className="font-bold">Sound Effects (SFX) Volume</span>
                  <span className="font-mono text-amber-400">85%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  defaultValue="0.85"
                  onChange={(e) => audioEngine.setSfxVolume(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* BGM Volume */}
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span className="font-bold">Background Music (BGM) Volume</span>
                  <span className="font-mono text-amber-400">50%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  defaultValue="0.5"
                  onChange={(e) => audioEngine.setBgmVolume(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <hr className="border-slate-800 my-2" />

              {/* Walkthrough Ambient Music Toggle */}
              <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                <div>
                  <div className="font-bold text-slate-200">First-Person Walkthrough BGM</div>
                  <div className="text-[10px] text-slate-400">
                    Plays atmospheric mystery lounge soundtrack while exploring 3D corridors
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={walkthroughBgmEnabled}
                    onChange={(e) => onToggleWalkthroughBgm(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              {/* First-Person Footsteps Toggle */}
              <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
                <div>
                  <div className="font-bold text-slate-200">First-Person Footstep SFX</div>
                  <div className="text-[10px] text-slate-400">
                    Plays acoustic corridor footsteps when navigating with WASD
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={footstepsEnabled}
                    onChange={(e) => onToggleFootsteps(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
        <div>
          Dedicated Local Folders:{' '}
          <span className="text-amber-400 font-mono">audio/sound_effects/</span> &{' '}
          <span className="text-amber-400 font-mono">audio/background_music/</span>
        </div>
        <div className="font-mono text-slate-500">ArchitectForge Audio Engine v2.0</div>
      </div>
    </div>
  </StudioWindowFrame>
  );
};
