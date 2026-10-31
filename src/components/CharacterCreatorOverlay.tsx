import React, { useState } from 'react';
import {
  CharacterAppearance,
  CharacterStats,
  TRAIT_LIBRARY,
  FloorId,
  allocateStatPoint,
  calculateDerivedStats,
  HotelAgentProfile,
  DailyActionEntry,
  SavedInteractionEntry,
  TimeOfDayEventLog,
  DEFAULT_GLOBAL_INSTRUCTION_SET,
  DEFAULT_DAILY_SCHEDULE,
  getTimeOfDayInfo,
  getActiveDailyAction,
  buildProceduralPersonaFromPrompt,
  StudioWindowId,
  StudioWindowState
} from '../game/rules';
import { StudioWindowFrame } from './StudioWindowFrame';

interface CharacterCreatorOverlayProps {
  windows: Record<StudioWindowId, StudioWindowState>;
  onFocusWindow: (id: StudioWindowId) => void;
  onMoveWindow: (id: StudioWindowId, nextX: number, nextY: number) => void;
  onResizeWindow: (id: StudioWindowId, nextW: number, nextH: number) => void;
  onToggleMinimizeWindow: (id: StudioWindowId) => void;
  onToggleMaximizeWindow: (id: StudioWindowId) => void;
  onCloseWindow: (id: StudioWindowId) => void;
  appearance: CharacterAppearance;
  stats: CharacterStats;
  assignedTraits: string[];
  globalInstructionSet: string;
  onChangeGlobalInstructionSet: (next: string) => void;
  gameTimeMinutes: number;
  onChangeGameTimeMinutes: (nextMinutes: number, eventNote?: string) => void;
  savedInteractions: SavedInteractionEntry[];
  onRecordInteraction: (entry: SavedInteractionEntry) => void;
  timeOfDayEvents: TimeOfDayEventLog[];
  onChangeAppearance: (next: CharacterAppearance) => void;
  onChangeStats: (next: CharacterStats) => void;
  onChangeTraits: (next: string[]) => void;
  onSaveCharacterRig: (newRig: HotelAgentProfile) => void;
  onExportCharacterRig: (rig: HotelAgentProfile) => void;
}

const ARCHETYPES: CharacterAppearance['archetype'][] = [
  'Detective Clerk',
  'Night Bellhop',
  'Occult Archivist',
  ' eccentric Socialite'
];

const HEAD_SHAPES: CharacterAppearance['headShape'][] = [
  'chibi_block',
  'rounded_toon',
  'tall_noir'
];

const EYE_STYLES: CharacterAppearance['eyeStyle'][] = [
  'wide_amber',
  'narrow_suspicious',
  'hollow_glow',
  'button_dark'
];

const HAIR_STYLES: CharacterAppearance['hairStyle'][] = [
  'swept_pompadour',
  'messy_curls',
  'bob_cut',
  'bowler_hat'
];

const MOUTH_STYLES: CharacterAppearance['mouthStyle'][] = [
  'slight_smirk',
  'nervous_frown',
  'stitched_grin',
  'calm_neutral'
];

const OUTFIT_COLORS = ['#78352f', '#450a0a', '#1e3a8a', '#0f766e', '#581c87', '#374151'];
const HAIR_COLORS = ['#451a03', '#1f2937', '#991b1b', '#d97706', '#9ca3af', '#581c87'];

export const CharacterCreatorOverlay: React.FC<CharacterCreatorOverlayProps> = ({
  windows,
  onFocusWindow,
  onMoveWindow,
  onResizeWindow,
  onToggleMinimizeWindow,
  onToggleMaximizeWindow,
  onCloseWindow,
  appearance,
  stats,
  assignedTraits,
  globalInstructionSet,
  onChangeGlobalInstructionSet,
  gameTimeMinutes,
  onChangeGameTimeMinutes,
  savedInteractions,
  onRecordInteraction,
  timeOfDayEvents,
  onChangeAppearance,
  onChangeStats,
  onChangeTraits,
  onSaveCharacterRig,
  onExportCharacterRig
}) => {
  const [rightTab, setRightTab] = useState<'ai_persona' | 'daily_history' | 'stats_traits'>('ai_persona');
  const [charName, setCharName] = useState('Vincent Graves');
  const [targetRoom, setTargetRoom] = useState<{ floor: FloorId; room: string }>({
    floor: 'floor2',
    room: 'Suite 202'
  });

  const [aiSeedPrompt, setAiSeedPrompt] = useState(
    'Observant boutique hotel night clerk who guards the brass passkeys and hears footsteps behind Suite 202'
  );
  const [aiGenerating, setAiGenerating] = useState(false);
  const [voiceStyle, setVoiceStyle] = useState(
    'Crisp Mid-Atlantic concierge cadence, hushed and deliberate'
  );
  const [demeanor, setDemeanor] = useState(
    'Polite, meticulous, quietly unnerved by noises behind the brickwork'
  );
  const [likesText, setLikesText] = useState(
    'Polished brass keys, Warm radiator steam, Accurate guest ledgers, Classic jazz cassettes'
  );
  const [dislikesText, setDislikesText] = useState(
    'Drafty airshafts, Missing ledger pages, Unexplained knocking after midnight'
  );
  const [knownFactsText, setKnownFactsText] = useState(
    [
      'Assigned to Suite 202 on the 2nd Floor of The Alderney Arms Hotel.',
      'Heard a metallic latch click behind the brick fireplace at 11:45 PM.',
      'Knows Registrar Arthur keeps the master skeleton key locked at the Front Desk.'
    ].join('\n')
  );
  const [personalInstructionSet, setPersonalInstructionSet] = useState(
    'Speak exclusively as Vincent Graves inside The Alderney Arms Hotel universe. Never use internet knowledge or out-of-game references. Only share facts from Starting Known Information and respond according to your current Time-of-Day Daily Action.'
  );
  const [dailySchedule, setDailySchedule] = useState<DailyActionEntry[]>(DEFAULT_DAILY_SCHEDULE);

  const [dialogueInput, setDialogueInput] = useState('What have you noticed near Suite 202 tonight?');
  const [dialogueBusy, setDialogueBusy] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const derived = calculateDerivedStats(stats, assignedTraits);
  const timeInfo = getTimeOfDayInfo(gameTimeMinutes);
  const activeDaily = getActiveDailyAction(dailySchedule, gameTimeMinutes);

  const parseCommaList = (raw: string): string[] =>
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  const parseLinesList = (raw: string): string[] =>
    raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

  const handleToggleTrait = (id: string) => {
    if (assignedTraits.includes(id)) {
      onChangeTraits(assignedTraits.filter((t) => t !== id));
    } else if (assignedTraits.length < 4) {
      onChangeTraits([...assignedTraits, id]);
    }
  };

  const buildRigPayload = (): HotelAgentProfile => {
    const likes = parseCommaList(likesText);
    const dislikes = parseCommaList(dislikesText);
    const knownFacts = parseLinesList(knownFactsText);
    const charHistory = savedInteractions.filter((item) => item.characterName === charName.trim());

    return {
      id: `char_rig_${Date.now()}`,
      name: charName.trim() || 'Custom Low-Poly Character',
      role: 'tenant',
      roomNumber: targetRoom.room,
      floor: targetRoom.floor,
      position: [2.8, 0, -2.5],
      status: 'present',
      occupation: `${appearance.archetype.trim()} (${targetRoom.room})`,
      personality: `Voice: ${voiceStyle} | Demeanor: ${demeanor} | Likes: ${likes.join(', ')} | Dislikes: ${dislikes.join(', ')}`,
      voiceStyle,
      demeanor,
      likes,
      dislikes,
      personalInstructionSet,
      dailySchedule,
      interactionHistory: charHistory,
      secretTruth: 'Exportable NPC behavioral & dialogue seed (Offline Game-Lore Sandboxed).',
      knownFacts: knownFacts.length > 0 ? knownFacts : [`Spawn Zone: ${targetRoom.room}`],
      memories: [
        `Created in ArchitectForge Character Studio (${appearance.headShape}).`,
        `Voice: ${voiceStyle}`,
        `Demeanor: ${demeanor}`,
        ...charHistory.map((h) => `[${h.gameTimeFormatted}] "${h.userMessage}" -> "${h.agentReply}"`)
      ],
      suspicionLevel: 15,
      trustLevel: 70,
      appearance,
      stats,
      assignedTraits
    };
  };

  const handleAIGeneratePersonality = async () => {
    setAiGenerating(true);
    setSaveFeedback('AI Persona Editor: Generating game-specific voice, demeanor, likes/dislikes & schedule...');
    try {
      const res = await fetch('/api/agent/generate-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: charName,
          archetype: appearance.archetype.trim(),
          roomNumber: targetRoom.room,
          seedPrompt: aiSeedPrompt,
          globalInstructionSet
        })
      });
      const data = await res.json();
      const p =
        data.persona ||
        buildProceduralPersonaFromPrompt(
          charName,
          appearance.archetype.trim(),
          aiSeedPrompt,
          targetRoom.room
        );
      setVoiceStyle(p.voiceStyle);
      setDemeanor(p.demeanor);
      setLikesText(Array.isArray(p.likes) ? p.likes.join(', ') : likesText);
      setDislikesText(Array.isArray(p.dislikes) ? p.dislikes.join(', ') : dislikesText);
      setKnownFactsText(Array.isArray(p.knownFacts) ? p.knownFacts.join('\n') : knownFactsText);
      setPersonalInstructionSet(p.personalInstructionSet || personalInstructionSet);
      if (Array.isArray(p.dailySchedule) && p.dailySchedule.length > 0) {
        setDailySchedule(p.dailySchedule);
      }
      setSaveFeedback(`AI Persona generated & saved for "${charName}" (Offline Game-Lore Sandbox)!`);
    } catch {
      const fallback = buildProceduralPersonaFromPrompt(
        charName,
        appearance.archetype.trim(),
        aiSeedPrompt,
        targetRoom.room
      );
      setVoiceStyle(fallback.voiceStyle);
      setDemeanor(fallback.demeanor);
      setLikesText(fallback.likes.join(', '));
      setDislikesText(fallback.dislikes.join(', '));
      setKnownFactsText(fallback.knownFacts.join('\n'));
      setPersonalInstructionSet(fallback.personalInstructionSet);
      setDailySchedule(fallback.dailySchedule);
      setSaveFeedback(`Applied game-specific AI personality & schedule for "${charName}"!`);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSendTestDialogue = async () => {
    const promptMsg = dialogueInput.trim();
    if (!promptMsg) return;
    setDialogueBusy(true);
    const currentRig = buildRigPayload();
    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: currentRig,
          message: promptMsg,
          globalInstructionSet,
          gameTimeMinutes,
          history: savedInteractions.slice(-4).flatMap((h) => [
            { role: 'user' as const, text: h.userMessage },
            { role: 'model' as const, text: h.agentReply }
          ])
        })
      });
      const data = await res.json();
      const replyText =
        data.reply ||
        `*${currentRig.name} (${demeanor}) glances around ${activeDaily.location} at ${timeInfo.formattedTime}.* "I only speak of what I've witnessed here in ${targetRoom.room}."`;

      const entry: SavedInteractionEntry = {
        id: `int_${Date.now()}`,
        timestamp: new Date().toISOString(),
        gameTimeFormatted: timeInfo.formattedTime,
        phase: timeInfo.phase,
        timeOfDayEvent: timeInfo.activeWorldEvent,
        dailyActionAtTime: `${activeDaily.action} (${activeDaily.location})`,
        characterName: currentRig.name,
        userMessage: promptMsg,
        agentReply: replyText
      };
      onRecordInteraction(entry);
      setDialogueInput('');
      setSaveFeedback(
        `Saved dialogue & time-of-day state at ${timeInfo.formattedTime} (${timeInfo.phase})!`
      );
    } catch {
      const entry: SavedInteractionEntry = {
        id: `int_${Date.now()}`,
        timestamp: new Date().toISOString(),
        gameTimeFormatted: timeInfo.formattedTime,
        phase: timeInfo.phase,
        timeOfDayEvent: timeInfo.activeWorldEvent,
        dailyActionAtTime: `${activeDaily.action} (${activeDaily.location})`,
        characterName: currentRig.name,
        userMessage: promptMsg,
        agentReply: `*${currentRig.name} speaks in a ${voiceStyle.toLowerCase()}.* "During ${timeInfo.phase.toLowerCase()} while ${activeDaily.action.toLowerCase()}, I keep my attention strictly on ${targetRoom.room}."`
      };
      onRecordInteraction(entry);
      setDialogueInput('');
      setSaveFeedback(`Saved offline dialogue & daily action log at ${timeInfo.formattedTime}!`);
    } finally {
      setDialogueBusy(false);
    }
  };

  const handleUpdateDailyAction = (index: number, field: 'action' | 'location', value: string) => {
    setDailySchedule((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleAddRigToPack = () => {
    const rig = buildRigPayload();
    onSaveCharacterRig(rig);
    setSaveFeedback(
      `Saved "${rig.name}" (with AI personality, offline instructions, daily schedule & history) to Scene & LocalStorage!`
    );
  };

  const handleExportRigJson = () => {
    const rig = buildRigPayload();
    onExportCharacterRig(rig);
    setSaveFeedback(`Exported "${rig.name}.json" with full personality, instructions & history!`);
  };

  return (
    <>
      {/* 1. CREATE-A-CHARACTER APPEARANCE & MESH RIG WINDOW */}
      <StudioWindowFrame
        windowState={windows.char_appearance}
        badgeText="3D Toon Mesh"
        onFocus={onFocusWindow}
        onMove={onMoveWindow}
        onResize={onResizeWindow}
        onToggleMinimize={onToggleMinimizeWindow}
        onToggleMaximize={onToggleMaximizeWindow}
        onClose={onCloseWindow}
      >
        <div className="space-y-2 text-xs">
          <label className="block">
            <span className="text-[11px] font-bold text-slate-600">Character Name</span>
            <input
              type="text"
              value={charName}
              onChange={(e) => setCharName(e.target.value)}
              aria-label="Character Rig Name"
              className="mt-0.5 w-full bg-slate-50 border border-slate-300 rounded-full px-3 py-1 text-xs font-bold text-slate-800"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] font-bold text-slate-600">Archetype Role</span>
              <select
                value={appearance.archetype}
                onChange={(e) => {
                  e.currentTarget.blur();
                  onChangeAppearance({
                    ...appearance,
                    archetype: e.target.value as CharacterAppearance['archetype']
                  });
                }}
                className="mt-0.5 w-full bg-slate-50 border border-slate-300 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-800"
              >
                {ARCHETYPES.map((a) => (
                  <option key={a} value={a}>
                    {a.trim()}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] font-bold text-slate-600">Assigned Suite</span>
              <input
                type="text"
                value={targetRoom.room}
                onChange={(e) => setTargetRoom({ ...targetRoom, room: e.target.value })}
                aria-label="Assigned Suite"
                className="mt-0.5 w-full bg-slate-50 border border-slate-300 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-800"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] font-bold text-slate-600">Head Mesh Shape</span>
            <select
              value={appearance.headShape}
              onChange={(e) => {
                e.currentTarget.blur();
                onChangeAppearance({
                  ...appearance,
                  headShape: e.target.value as CharacterAppearance['headShape']
                });
              }}
              className="mt-0.5 w-full bg-slate-50 border border-slate-300 rounded-full px-3 py-1 text-xs font-semibold text-slate-800"
            >
              {HEAD_SHAPES.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] font-bold text-slate-600">Eye Style</span>
              <select
                value={appearance.eyeStyle}
                onChange={(e) => {
                  e.currentTarget.blur();
                  onChangeAppearance({
                    ...appearance,
                    eyeStyle: e.target.value as CharacterAppearance['eyeStyle']
                  });
                }}
                className="mt-0.5 w-full bg-slate-50 border border-slate-300 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-800"
              >
                {EYE_STYLES.map((ey) => (
                  <option key={ey} value={ey}>
                    {ey}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[11px] font-bold text-slate-600">Hair / Hat</span>
              <select
                value={appearance.hairStyle}
                onChange={(e) => {
                  e.currentTarget.blur();
                  onChangeAppearance({
                    ...appearance,
                    hairStyle: e.target.value as CharacterAppearance['hairStyle']
                  });
                }}
                className="mt-0.5 w-full bg-slate-50 border border-slate-300 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-800"
              >
                {HAIR_STYLES.map((hr) => (
                  <option key={hr} value={hr}>
                    {hr}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] font-bold text-slate-600">Mouth Expression</span>
            <select
              value={appearance.mouthStyle}
              onChange={(e) => {
                e.currentTarget.blur();
                onChangeAppearance({
                  ...appearance,
                  mouthStyle: e.target.value as CharacterAppearance['mouthStyle']
                });
              }}
              className="mt-0.5 w-full bg-slate-50 border border-slate-300 rounded-full px-3 py-1 text-xs font-semibold text-slate-800"
            >
              {MOUTH_STYLES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[11px] font-bold text-slate-600">Outfit Swatch:</span>
            <div className="flex items-center gap-1">
              {OUTFIT_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => onChangeAppearance({ ...appearance, outfitColor: col })}
                  className={`w-5 h-5 rounded-full border ${
                    appearance.outfitColor === col ? 'ring-2 ring-[#10b981] scale-110' : 'border-slate-300'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-600">Hair Swatch:</span>
            <div className="flex items-center gap-1">
              {HAIR_COLORS.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => onChangeAppearance({ ...appearance, hairColor: col })}
                  className={`w-5 h-5 rounded-full border ${
                    appearance.hairColor === col ? 'ring-2 ring-[#10b981] scale-110' : 'border-slate-300'
                  }`}
                  style={{ backgroundColor: col }}
                />
              ))}
            </div>
          </div>

          <div className="pt-1 space-y-1.5 border-t border-slate-200">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-600">Height Scale</span>
              <span className="font-mono font-bold text-[#0284c7]">{appearance.heightScale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              aria-label="Character Height Scale"
              min={0.8}
              max={1.25}
              step={0.05}
              value={appearance.heightScale}
              onChange={(e) =>
                onChangeAppearance({ ...appearance, heightScale: parseFloat(e.target.value) })
              }
              className="w-full accent-[#10b981]"
            />

            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-600">Head Scale</span>
              <span className="font-mono font-bold text-[#0284c7]">{appearance.headScale.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              aria-label="Character Head Scale"
              min={0.8}
              max={1.35}
              step={0.05}
              value={appearance.headScale}
              onChange={(e) =>
                onChangeAppearance({ ...appearance, headScale: parseFloat(e.target.value) })
              }
              className="w-full accent-[#10b981]"
            />
          </div>
        </div>
      </StudioWindowFrame>

      {/* 2. AI MIND, OFFLINE LORE SANDBOX, DAILY ACTIONS & SAVED HISTORY WINDOW */}
      <StudioWindowFrame
        windowState={windows.char_ai}
        badgeText="🔒 Offline Lore Only"
        onFocus={onFocusWindow}
        onMove={onMoveWindow}
        onResize={onResizeWindow}
        onToggleMinimize={onToggleMinimizeWindow}
        onToggleMaximize={onToggleMaximizeWindow}
        onClose={onCloseWindow}
      >
        <div data-testid="character-ai-studio-panel" className="space-y-2.5">
          {/* Sub-Panel Mode Switcher */}
          <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-full">
            <button
              type="button"
              onClick={() => setRightTab('ai_persona')}
              className={`py-1 px-2 rounded-full text-[11px] font-bold transition-all ${
                rightTab === 'ai_persona'
                  ? 'bg-[#0284c7] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              1 · AI Persona &amp; Rules
            </button>
            <button
              type="button"
              onClick={() => setRightTab('daily_history')}
              className={`py-1 px-2 rounded-full text-[11px] font-bold transition-all ${
                rightTab === 'daily_history'
                  ? 'bg-[#0284c7] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              2 · Time &amp; History ({savedInteractions.length})
            </button>
            <button
              type="button"
              onClick={() => setRightTab('stats_traits')}
              className={`py-1 px-2 rounded-full text-[11px] font-bold transition-all ${
                rightTab === 'stats_traits'
                  ? 'bg-[#0284c7] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3 · Stats &amp; Traits
            </button>
          </div>

          {rightTab === 'ai_persona' && (
            <div className="space-y-2 text-xs">
              <div className="bg-[#f0f9ff] border border-[#bae6fd] rounded-2xl p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-[#0369a1]">
                    ✨ AI Personality &amp; Lore Seed Editor
                  </span>
                  <span className="text-[10px] font-semibold text-[#0284c7]">
                    Google gemini-3.1-flash-lite · Offline
                  </span>
                </div>
                <input
                  type="text"
                  value={aiSeedPrompt}
                  onChange={(e) => setAiSeedPrompt(e.target.value)}
                  aria-label="AI Personality Seed Prompt"
                  placeholder="Describe character quirk, voice, secrets..."
                  className="w-full bg-white border border-sky-200 rounded-full px-3 py-1 text-xs text-slate-800"
                />
                <button
                  type="button"
                  disabled={aiGenerating}
                  onClick={handleAIGeneratePersonality}
                  className="w-full py-1.5 px-3 bg-gradient-to-r from-[#0ea5e9] to-[#0284c7] hover:from-[#0284c7] hover:to-[#0369a1] text-white font-bold rounded-full text-xs shadow-2xs"
                >
                  {aiGenerating
                    ? 'Synthesizing Sandboxed Personality...'
                    : '✨ AI Generate Personality, Known Facts & Schedule'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[11px] font-bold text-slate-600">Voice Style</span>
                  <input
                    type="text"
                    value={voiceStyle}
                    onChange={(e) => setVoiceStyle(e.target.value)}
                    aria-label="Character Voice Style"
                    className="mt-0.5 w-full bg-slate-50 border border-slate-300 rounded-2xl px-2.5 py-1 text-xs text-slate-800"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold text-slate-600">Demeanor</span>
                  <input
                    type="text"
                    value={demeanor}
                    onChange={(e) => setDemeanor(e.target.value)}
                    aria-label="Character Demeanor"
                    className="mt-0.5 w-full bg-slate-50 border border-slate-300 rounded-2xl px-2.5 py-1 text-xs text-slate-800"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-[11px] font-bold text-emerald-700">Likes (comma-separated)</span>
                  <input
                    type="text"
                    value={likesText}
                    onChange={(e) => setLikesText(e.target.value)}
                    aria-label="Character Likes"
                    className="mt-0.5 w-full bg-emerald-50/60 border border-emerald-300 rounded-2xl px-2.5 py-1 text-xs text-slate-800"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold text-rose-700">Dislikes (comma-separated)</span>
                  <input
                    type="text"
                    value={dislikesText}
                    onChange={(e) => setDislikesText(e.target.value)}
                    aria-label="Character Dislikes"
                    className="mt-0.5 w-full bg-rose-50/60 border border-rose-300 rounded-2xl px-2.5 py-1 text-xs text-slate-800"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-[11px] font-bold text-slate-700">
                  Starting Known Information (One in-world fact per line)
                </span>
                <textarea
                  rows={2}
                  value={knownFactsText}
                  onChange={(e) => setKnownFactsText(e.target.value)}
                  aria-label="Starting Known Information"
                  className="mt-0.5 w-full bg-slate-50 border border-slate-300 rounded-2xl px-3 py-1.5 text-[11px] text-slate-800 leading-snug"
                />
              </label>

              <label className="block">
                <span className="text-[11px] font-bold text-slate-700">
                  Personal Instruction Set (Character-Specific Guardrails)
                </span>
                <textarea
                  rows={2}
                  value={personalInstructionSet}
                  onChange={(e) => setPersonalInstructionSet(e.target.value)}
                  aria-label="Personal Instruction Set"
                  className="mt-0.5 w-full bg-slate-50 border border-slate-300 rounded-2xl px-3 py-1.5 text-[11px] text-slate-800 leading-snug"
                />
              </label>

              <label className="block">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-amber-900">
                    Global Instruction Set (All Agents · No Internet Access)
                  </span>
                  <button
                    type="button"
                    onClick={() => onChangeGlobalInstructionSet(DEFAULT_GLOBAL_INSTRUCTION_SET)}
                    className="text-[10px] font-bold text-[#0284c7] hover:underline"
                  >
                    Reset Default
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={globalInstructionSet}
                  onChange={(e) => onChangeGlobalInstructionSet(e.target.value)}
                  aria-label="Global Instruction Set"
                  className="mt-0.5 w-full bg-amber-50/70 border border-amber-300 rounded-2xl px-3 py-1.5 text-[11px] text-slate-800 leading-snug"
                />
              </label>
            </div>
          )}

          {rightTab === 'daily_history' && (
            <div className="space-y-2.5 text-xs">
              <div className="bg-slate-900 text-white rounded-2xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-sky-300 font-bold block">
                      Gameplay Time &amp; Time-of-Day Event
                    </span>
                    <div className="text-sm font-extrabold font-mono text-emerald-300">
                      {timeInfo.formattedTime} · {timeInfo.phase}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeGameTimeMinutes(
                        (gameTimeMinutes + 60) % 1440,
                        `Advanced clock +1h`
                      )
                    }
                    className="px-2.5 py-1 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px]"
                  >
                    +1 Hr Clock
                  </button>
                </div>
                <div className="text-[11px] text-slate-200">
                  <span className="font-bold text-amber-300">World Event:</span> {timeInfo.activeWorldEvent}
                </div>
                <div className="text-[11px] text-emerald-200">
                  <span className="font-bold">Active Daily Action:</span> {activeDaily.action} ({activeDaily.location})
                </div>
                <div className="grid grid-cols-4 gap-1 pt-1">
                  {(
                    [
                      { label: 'Morning', mins: 8 * 60 + 30 },
                      { label: 'Afternoon', mins: 14 * 60 },
                      { label: 'Evening', mins: 19 * 60 + 30 },
                      { label: 'Late Night', mins: 23 * 60 + 45 }
                    ] as const
                  ).map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() =>
                        onChangeGameTimeMinutes(
                          preset.mins,
                          `Triggered ${preset.label} Time-of-Day Event`
                        )
                      }
                      className={`py-1 rounded-full text-[10px] font-bold transition-all ${
                        timeInfo.phase === preset.label
                          ? 'bg-sky-500 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-700">
                  Basic Daily Actions Schedule (Saved per Phase):
                </span>
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                  {dailySchedule.map((entry, idx) => (
                    <div
                      key={entry.phase}
                      className={`p-2 rounded-2xl border text-[11px] space-y-1 ${
                        entry.phase === timeInfo.phase
                          ? 'bg-emerald-50 border-emerald-300'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-slate-700">
                        <span>
                          {entry.phase} ({entry.timeRange})
                        </span>
                        <span className="text-[10px] text-[#0284c7]">{entry.location}</span>
                      </div>
                      <input
                        type="text"
                        value={entry.action}
                        onChange={(e) => handleUpdateDailyAction(idx, 'action', e.target.value)}
                        aria-label={`${entry.phase} Daily Action`}
                        className="w-full bg-white border border-slate-300 rounded-full px-2.5 py-0.5 text-[11px] text-slate-800"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-700">
                    Live Sandboxed Dialogue &amp; Saved History
                  </span>
                  <span className="text-[10px] font-mono text-emerald-700">
                    Auto-Saved ({savedInteractions.length} logs)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={dialogueInput}
                    onChange={(e) => setDialogueInput(e.target.value)}
                    aria-label="Test Character Dialogue Input"
                    placeholder="Speak to character (saved to history)..."
                    className="flex-1 bg-white border border-slate-300 rounded-full px-3 py-1 text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    disabled={dialogueBusy}
                    onClick={handleSendTestDialogue}
                    className="px-3 py-1 bg-[#0284c7] hover:bg-[#0369a1] text-white font-bold rounded-full text-xs shrink-0"
                  >
                    {dialogueBusy ? '...' : 'Talk & Save'}
                  </button>
                </div>

                <div
                  data-testid="saved-interaction-history"
                  className="max-h-28 overflow-y-auto space-y-1.5 pt-1 pr-1"
                >
                  {savedInteractions.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic py-1">
                      No interactions recorded yet — click &ldquo;Talk &amp; Save&rdquo; to log in-character dialogue.
                    </div>
                  ) : (
                    savedInteractions
                      .slice()
                      .reverse()
                      .map((item) => (
                        <div
                          key={item.id}
                          className="bg-white border border-slate-200 rounded-xl p-2 text-[11px] space-y-0.5"
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-[#0284c7]">
                            <span>
                              {item.characterName} · {item.gameTimeFormatted} ({item.phase})
                            </span>
                            <span className="text-slate-400 truncate max-w-36">{item.dailyActionAtTime}</span>
                          </div>
                          <div className="text-slate-600">
                            <span className="font-bold">You:</span> {item.userMessage}
                          </div>
                          <div className="text-slate-900 font-medium">
                            <span className="font-bold text-emerald-700">{item.characterName}:</span>{' '}
                            {item.agentReply}
                          </div>
                        </div>
                      ))
                  )}
                </div>

                {timeOfDayEvents.length > 0 && (
                  <div className="text-[10px] text-slate-500 border-t border-slate-200 pt-1">
                    Latest Saved Time Event: {timeOfDayEvents[timeOfDayEvents.length - 1].formattedTime} (
                    {timeOfDayEvents[timeOfDayEvents.length - 1].phase}) —{' '}
                    {timeOfDayEvents[timeOfDayEvents.length - 1].eventTitle}
                  </div>
                )}
              </div>
            </div>
          )}

          {rightTab === 'stats_traits' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-600">Attribute Point Pool</span>
                <span className="font-bold text-[#10b981]">Pts Remaining: {stats.pointsRemaining}</span>
              </div>

              <div className="space-y-1.5">
                {(
                  [
                    { key: 'physic', label: 'Physic', val: stats.physic },
                    { key: 'agility', label: 'Agility', val: stats.agility },
                    { key: 'mind', label: 'Mind', val: stats.mind },
                    { key: 'endurance', label: 'Endurance', val: stats.endurance }
                  ] as const
                ).map((row) => (
                  <div
                    key={row.key}
                    className="flex items-center justify-between text-xs bg-slate-50 rounded-full px-3 py-1"
                  >
                    <span className="font-bold text-slate-700">{row.label}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onChangeStats(allocateStatPoint(stats, row.key, -1))}
                        className="w-5 h-5 rounded-full bg-white border border-slate-300 font-bold text-slate-700"
                      >
                        -
                      </button>
                      <span className="w-4 text-center font-mono font-bold text-[#0284c7]">{row.val}</span>
                      <button
                        type="button"
                        onClick={() => onChangeStats(allocateStatPoint(stats, row.key, 1))}
                        className="w-5 h-5 rounded-full bg-white border border-slate-300 font-bold text-slate-700"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1 pt-1">
                <span className="text-[11px] font-bold text-slate-600">
                  Assigned Character Traits ({assignedTraits.length}/4):
                </span>
                <div className="max-h-32 overflow-y-auto flex flex-col gap-1 pr-1">
                  {TRAIT_LIBRARY.map((trait) => {
                    const active = assignedTraits.includes(trait.id);
                    return (
                      <button
                        key={trait.id}
                        type="button"
                        onClick={() => handleToggleTrait(trait.id)}
                        className={`w-full text-left px-3 py-1.5 rounded-2xl text-xs transition-all border ${
                          active
                            ? 'bg-[#ecfdf5] border-[#10b981] text-[#065f46] font-bold'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div>{trait.name}</div>
                        <div className="text-[10px] opacity-75 truncate">{trait.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-[10px] font-mono text-slate-500 bg-slate-50 rounded-2xl px-3 py-1.5 flex justify-between">
                <span>HP {derived.maxHealth}</span>
                <span>STEALTH {derived.stealthRating}%</span>
                <span>SPEED {derived.moveSpeedPct}%</span>
              </div>
            </div>
          )}

          {/* Persistent Action Footer */}
          <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-200">
            <button
              type="button"
              onClick={handleAddRigToPack}
              className="w-full py-1.5 px-3 bg-gradient-to-r from-[#10b981] to-[#059669] text-white font-bold rounded-full text-xs shadow-xs"
            >
              + Save &amp; Place Character Rig in Scene
            </button>
            <button
              type="button"
              onClick={handleExportRigJson}
              className="w-full py-1.5 px-3 bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0369a1] font-bold rounded-full text-xs"
            >
              Export Character, Instructions &amp; History (.json)
            </button>
          </div>

          {saveFeedback && (
            <div className="text-[11px] font-semibold text-[#059669] text-center">
              {saveFeedback}
            </div>
          )}
        </div>
      </StudioWindowFrame>
    </>
  );
};
