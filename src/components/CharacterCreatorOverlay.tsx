import React, { useState, useRef } from 'react';
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
  evaluateCharacterInteractionMemory,
  posePendingQuestionFromAgent,
  resolveTenantDisposition,
  PendingTenantQuestion,
  StudioWindowId,
  StudioWindowState,
  getArchetypeDefaults,
  FacialExpressionType,
  ScheduledActivityGesture,
  resolveDailyLocationCoords,
  GlobalAnimationFps,
  ALLOWED_GLOBAL_ANIMATION_FPS,
  DEFAULT_GLOBAL_ANIMATION_FPS,
  GOOGLE_AI_ANIMATION_PRESETS,
  GoogleAiCharacterAnimationClipSpec,
  synthesizeGoogleAiCharacterAnimationClip,
  GEMINI_PREBUILT_VOICES,
  GeminiPrebuiltVoiceName,
  CharacterVoiceProfile,
  inferVoiceProfileFromArchetypeAndName
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
  onChangeGameTimeMinutes: (nextMinutes: number, eventNote?: string, triggerRandomAnomalies?: boolean) => void;
  savedInteractions: SavedInteractionEntry[];
  onRecordInteraction: (entry: SavedInteractionEntry) => void;
  timeOfDayEvents: TimeOfDayEventLog[];
  onChangeAppearance: (next: CharacterAppearance) => void;
  onChangeStats: (next: CharacterStats) => void;
  onChangeTraits: (next: string[]) => void;
  onSaveCharacterRig: (newRig: HotelAgentProfile) => void;
  onExportCharacterRig: (rig: HotelAgentProfile) => void;
  agents?: HotelAgentProfile[];
  onUpdateAgentSchedule?: (agentId: string, nextSchedule: DailyActionEntry[]) => void;
  globalAnimationFps?: GlobalAnimationFps;
  onChangeGlobalAnimationFps?: (fps: GlobalAnimationFps) => void;
}

const ARCHETYPES: CharacterAppearance['archetype'][] = [
  'Elderly Matron',
  'Detective Clerk',
  'Night Bellhop',
  'Occult Archivist',
  'Eccentric Socialite',
  'Long-Term Resident'
];

const HEAD_SHAPES: CharacterAppearance['headShape'][] = [
  'proportional_human',
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
  'silver_bun',
  'permed_silver',
  'swept_pompadour',
  'messy_curls',
  'bob_cut',
  'bowler_hat'
];

const FACIAL_EXPRESSIONS: FacialExpressionType[] = [
  'hollow_stare',
  'side_eye_glare',
  'paranoid_twitch',
  'cryptic_whisper',
  'suspicious',
  'weary',
  'alarmed',
  'smirk',
  'grimace',
  'shocked',
  'neutral'
];

const SCHEDULE_LOCATIONS = [
  'Lobby West Parlor (Social Hour)',
  'Front Desk & Switchboard',
  'Room 101 (Floor 1)',
  'Room 104 (Floor 1)',
  'Floor 1 Corridor',
  'Suite 201 (Floor 2)',
  'Suite 202 (Floor 2)',
  'Room 304 (Floor 3)',
  'Basement Boiler Sub-Vault'
];

const ACTIVITY_GESTURES: { value: ScheduledActivityGesture; label: string }[] = [
  { value: 'parlor_social', label: '☕ Parlor Social / Converse' },
  { value: 'wall_listen', label: '👂 Listen at Wall / Door' },
  { value: 'inspect_ledger', label: '📖 Inspect Ledger / Notes' },
  { value: 'pace_corridor', label: '🚶 Pace Corridor / Patrol' },
  { value: 'sleepwalk_trance', label: '🌀 33Hz Sleepwalk Trance' },
  { value: 'idle_observe', label: '👁️ Stand & Observe' }
];

const MOUTH_STYLES: CharacterAppearance['mouthStyle'][] = [
  'slight_smirk',
  'nervous_frown',
  'stitched_grin',
  'calm_neutral'
];

const OUTFIT_COLORS = ['#78352f', '#450a0a', '#1e3a8a', '#0f766e', '#581c87', '#374151', '#4b5563'];
const HAIR_COLORS = ['#451a03', '#1f2937', '#991b1b', '#d97706', '#9ca3af', '#d1d5db', '#581c87'];

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
  onExportCharacterRig,
  agents = [],
  onUpdateAgentSchedule,
  globalAnimationFps = DEFAULT_GLOBAL_ANIMATION_FPS,
  onChangeGlobalAnimationFps
}) => {
  const [rightTab, setRightTab] = useState<'ai_persona' | 'daily_history' | 'stats_traits'>('ai_persona');
  const [charName, setCharName] = useState('Vincent Graves');
  const [googleAnimSelectedGesture, setGoogleAnimSelectedGesture] = useState<ScheduledActivityGesture>('idle_observe');
  const [googleAnimCustomPrompt, setGoogleAnimCustomPrompt] = useState(
    GOOGLE_AI_ANIMATION_PRESETS.idle_observe.motionPromptDirective
  );
  const [googleAnimBaking, setGoogleAnimBaking] = useState(false);
  const [googleAnimStatusNote, setGoogleAnimStatusNote] = useState<string | null>(null);
  const [targetRoom, setTargetRoom] = useState<{ floor: FloorId; room: string }>({
    floor: 'floor2',
    room: 'Suite 202'
  });
  const [selectedScheduleAgentId, setSelectedScheduleAgentId] = useState<string>('custom_creator');

  const [aiSeedPrompt, setAiSeedPrompt] = useState(
    'Observant boutique hotel night clerk who guards the brass passkeys and hears footsteps behind Suite 202'
  );
  const [aiGenerating, setAiGenerating] = useState(false);
  const [voiceProfile, setVoiceProfile] = useState<CharacterVoiceProfile>(() =>
    appearance.voiceProfile ||
    inferVoiceProfileFromArchetypeAndName('Vincent Graves', appearance.archetype, '')
  );
  const [voiceStyle, setVoiceStyle] = useState(
    '1970s Old New York Mid-Atlantic accent · Hushed, gravel-edged, world-weary baritone'
  );
  const [voiceAuditionBusy, setVoiceAuditionBusy] = useState(false);
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
    'Speak exclusively as Vincent Graves inside The Alderney Arms Hotel universe. Maintain your locked accent, vocal tone, and cadence throughout the entire playthrough. Never use internet knowledge or out-of-game references.'
  );
  const [dailySchedule, setDailySchedule] = useState<DailyActionEntry[]>(DEFAULT_DAILY_SCHEDULE);

  const [dialogueInput, setDialogueInput] = useState('What have you noticed near Suite 202 tonight?');
  const [dialogueBusy, setDialogueBusy] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const updateLockedVoiceProfile = (updates: Partial<CharacterVoiceProfile>) => {
    const nextProfile: CharacterVoiceProfile = {
      ...voiceProfile,
      ...updates,
      persistAcrossPlaythrough: true
    };
    setVoiceProfile(nextProfile);
    const nextVoiceSummary = `${nextProfile.accent} accent · ${nextProfile.vocalTone} (${nextProfile.cadenceStyle})`;
    setVoiceStyle(nextVoiceSummary);
    onChangeAppearance({
      ...appearance,
      facialExpression: updates.baselineExpression || appearance.facialExpression || nextProfile.baselineExpression,
      voiceProfile: nextProfile
    });
  };

  const speakReplyAloud = async (text: string, overrideExpr?: FacialExpressionType) => {
    const cleanSpeech = text.replace(/\*[^*]+\*/g, '').trim();
    if (!cleanSpeech) return;

    try {
      const res = await fetch('/api/agent/speak-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: {
            id: `char_${charName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
            name: charName,
            occupation: appearance.archetype,
            voiceStyle,
            voiceProfile,
            activeFacialExpression: overrideExpr || appearance.facialExpression || voiceProfile.baselineExpression,
            appearance
          },
          text: cleanSpeech,
          overrideExpression: overrideExpr || appearance.facialExpression || voiceProfile.baselineExpression
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audioDataUrl && typeof Audio !== 'undefined') {
          const audio = new Audio(data.audioDataUrl);
          await audio.play();
          return;
        }
      }
    } catch {
      // Fall back to locked pitch/rate Web Speech synthesis below
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanSpeech);
        utterance.rate = Math.max(0.75, Math.min(1.25, voiceProfile.speakingRate || 0.94));
        utterance.pitch = Math.max(0.7, Math.min(1.3, voiceProfile.pitchMultiplier || 0.92));
        window.speechSynthesis.speak(utterance);
      } catch {
        // speech synthesis fallback
      }
    }
  };

  const handleAuditionCharacterVoice = async () => {
    setVoiceAuditionBusy(true);
    const activeExpr = appearance.facialExpression || voiceProfile.baselineExpression || 'suspicious';
    const sampleLine = `I am ${charName} of ${targetRoom.room}. I maintain my ${voiceProfile.accent} accent and ${voiceProfile.vocalTone.toLowerCase()} throughout the entire playthrough.`;
    setSaveFeedback(
      `🔊 Auditioning ${charName}'s locked voice (${voiceProfile.prebuiltVoiceName} · ${voiceProfile.accent}) & "${activeExpr.replace(/_/g, ' ')}" facial expression...`
    );
    await speakReplyAloud(sampleLine, activeExpr);
    setVoiceAuditionBusy(false);
  };

  const handleSynthesizeGoogleAiAnimations = async () => {
    setGoogleAnimBaking(true);
    setGoogleAnimStatusNote(null);
    const cleanApp: CharacterAppearance = {
      ...appearance,
      spineCurvature: 0,
      hasWalkingCane: false,
      voiceProfile
    };
    try {
      const response = await fetch('/api/forge/google-animate-rig', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterName: charName,
          appearance: cleanApp,
          gesture: googleAnimSelectedGesture,
          bakeAllGestures: true,
          globalFps: globalAnimationFps,
          customMotionPrompt: googleAnimCustomPrompt,
          facialExpression: appearance.facialExpression || voiceProfile.baselineExpression,
          voiceProfile
        })
      });
      if (!response.ok) {
        throw new Error('Google AI Studio animation endpoint fallback');
      }
      const data = await response.json();
      const nextAnimations = data.animations as Partial<
        Record<ScheduledActivityGesture, GoogleAiCharacterAnimationClipSpec>
      >;
      onChangeAppearance({
        ...cleanApp,
        meshyRigTaskId: data.rigTaskId,
        googleAiAnimations: nextAnimations,
        meshyAnimations: nextAnimations
      });
      const primary =
        nextAnimations?.[googleAnimSelectedGesture] ||
        (data.primaryClip as GoogleAiCharacterAnimationClipSpec | undefined);
      setGoogleAnimStatusNote(
        `Google AI Studio (gemini-3.1-flash-lite) synthesized 6 clips @ ${globalAnimationFps} FPS (${
          primary
            ? `${primary.originalFrameCount}→${primary.decimatedFrameCount} kf, -${primary.keyframeReductionPct}% load, face: ${primary.dominantExpression}`
            : 'synced with 3D facial rig'
        })`
      );
    } catch {
      const fallbackAnimations: Partial<
        Record<ScheduledActivityGesture, GoogleAiCharacterAnimationClipSpec>
      > = {};
      (Object.keys(GOOGLE_AI_ANIMATION_PRESETS) as ScheduledActivityGesture[]).forEach((g) => {
        fallbackAnimations[g] = synthesizeGoogleAiCharacterAnimationClip(
          cleanApp,
          g,
          globalAnimationFps,
          {
            customMotionPrompt: g === googleAnimSelectedGesture ? googleAnimCustomPrompt : undefined,
            facialExpression: appearance.facialExpression || voiceProfile.baselineExpression
          }
        );
      });
      onChangeAppearance({
        ...cleanApp,
        googleAiAnimations: fallbackAnimations,
        meshyAnimations: fallbackAnimations
      });
      const clip = fallbackAnimations[googleAnimSelectedGesture];
      setGoogleAnimStatusNote(
        `Google AI Studio synthesized 6 low-frame clips @ ${globalAnimationFps} FPS (${
          clip?.originalFrameCount ?? 120
        }→${clip?.decimatedFrameCount ?? 16} kf, -${clip?.keyframeReductionPct ?? 87}% load)`
      );
    } finally {
      setGoogleAnimBaking(false);
    }
  };

  const toggleSpeechRecognition = () => {
    if (isListeningVoice) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListeningVoice(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSaveFeedback('Speech Recognition is not supported in this browser. Please type directly.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListeningVoice(true);
        setSaveFeedback('🎙️ Listening... Speak directly to the character now.');
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setDialogueInput(transcript);
          setIsListeningVoice(false);
          setSaveFeedback(`🎙️ Heard: "${transcript}" — Sending to character...`);
          handleSendTestDialogue(transcript);
        }
      };

      recognition.onerror = () => {
        setIsListeningVoice(false);
        setSaveFeedback('Microphone input completed or timed out.');
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListeningVoice(false);
      setSaveFeedback('Could not access microphone.');
    }
  };

  // AI Episodic & Relational Memory State (Disposition, Trust/Suspicion, Game Day & Multi-Day Pending Questions)
  const [gameDay, setGameDay] = useState<number>(1);
  const [trustLevel, setTrustLevel] = useState<number>(60);
  const [suspicionLevel, setSuspicionLevel] = useState<number>(20);
  const [pendingQuestions, setPendingQuestions] = useState<PendingTenantQuestion[]>([
    {
      id: 'pq_starter_202',
      questionText:
        'Did you check behind the Suite 202 fireplace wall to see if the brass latch is unbolted?',
      askedOnDay: 1,
      askedAtTimeFormatted: '07:30 PM',
      expectedTopics: ['fireplace', '202', 'latch', 'passkey', 'key', 'unbolted', 'checked', 'yes'],
      resolved: false
    }
  ]);
  const [lastMemoryInfluence, setLastMemoryInfluence] = useState<string | null>(null);

  const derived = calculateDerivedStats(stats, assignedTraits);
  const timeInfo = getTimeOfDayInfo(gameTimeMinutes);
  const activeDaily = getActiveDailyAction(dailySchedule, gameTimeMinutes);
  const currentDisposition = resolveTenantDisposition(trustLevel, suspicionLevel);
  const unresolvedQuestions = pendingQuestions.filter((q) => !q.resolved);

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
    const activeExpr: FacialExpressionType =
      appearance.facialExpression || voiceProfile.baselineExpression || 'neutral';
    const lockedVoice: CharacterVoiceProfile = {
      ...voiceProfile,
      baselineExpression: activeExpr,
      persistAcrossPlaythrough: true
    };

    return {
      id: `char_rig_${Date.now()}`,
      name: charName.trim() || 'Custom Low-Poly Character',
      role: 'tenant',
      roomNumber: targetRoom.room,
      floor: targetRoom.floor,
      position: [2.8, 0, -2.5],
      status: 'present',
      occupation: `${appearance.archetype.trim()} (${targetRoom.room})`,
      personality: `Voice: ${voiceStyle} | Accent: ${lockedVoice.accent} | Tone: ${lockedVoice.vocalTone} | Demeanor: ${demeanor} | Likes: ${likes.join(', ')} | Dislikes: ${dislikes.join(', ')}`,
      voiceStyle,
      voiceProfile: lockedVoice,
      activeFacialExpression: activeExpr,
      demeanor,
      likes,
      dislikes,
      personalInstructionSet,
      dailySchedule,
      interactionHistory: charHistory,
      pendingQuestions,
      disposition: currentDisposition,
      lastInteractionDay: gameDay,
      secretTruth: `Behind the ${targetRoom.room} fireplace wainscoting is a pivoted brass latch that opens into the hidden service shaft.`,
      knownFacts: knownFacts.length > 0 ? knownFacts : [`Spawn Zone: ${targetRoom.room}`],
      memories: [
        `Created in ArchitectForge Character Studio (${appearance.headShape}).`,
        `Locked Voice Identity: ${lockedVoice.prebuiltVoiceName} · ${lockedVoice.accent} accent · ${lockedVoice.vocalTone} (${lockedVoice.cadenceStyle})`,
        `Demeanor: ${demeanor}`,
        ...charHistory.map(
          (h) =>
            `[Day ${h.gameDay ?? 1} ${h.gameTimeFormatted}] "${h.userMessage}" -> "${h.agentReply}" (${h.gameplayInfluenceSummary || 'Logged'})`
        )
      ],
      suspicionLevel,
      trustLevel,
      appearance: {
        ...appearance,
        spineCurvature: 0,
        hasWalkingCane: false,
        facialExpression: activeExpr,
        voiceProfile: lockedVoice
      },
      stats,
      assignedTraits
    };
  };

  const handleAIGeneratePersonality = async () => {
    setAiGenerating(true);
    setSaveFeedback('AI Persona Editor: Generating game-specific voice, tone, accent, demeanor, likes/dislikes & schedule...');
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
      if (p.voiceProfile) {
        setVoiceProfile({ ...p.voiceProfile, persistAcrossPlaythrough: true });
        onChangeAppearance({
          ...appearance,
          spineCurvature: 0,
          hasWalkingCane: false,
          facialExpression: p.voiceProfile.baselineExpression || appearance.facialExpression,
          voiceProfile: { ...p.voiceProfile, persistAcrossPlaythrough: true }
        });
      }
      setDemeanor(p.demeanor);
      setLikesText(Array.isArray(p.likes) ? p.likes.join(', ') : likesText);
      setDislikesText(Array.isArray(p.dislikes) ? p.dislikes.join(', ') : dislikesText);
      setKnownFactsText(Array.isArray(p.knownFacts) ? p.knownFacts.join('\n') : knownFactsText);
      setPersonalInstructionSet(p.personalInstructionSet || personalInstructionSet);
      if (Array.isArray(p.dailySchedule) && p.dailySchedule.length > 0) {
        setDailySchedule(p.dailySchedule);
      }
      setSaveFeedback(`AI Persona & Locked Voice/Accent generated for "${charName}" (Offline Game-Lore Sandbox)!`);
    } catch {
      const fallback = buildProceduralPersonaFromPrompt(
        charName,
        appearance.archetype.trim(),
        aiSeedPrompt,
        targetRoom.room
      );
      setVoiceStyle(fallback.voiceStyle);
      setVoiceProfile(fallback.voiceProfile);
      onChangeAppearance({
        ...appearance,
        spineCurvature: 0,
        hasWalkingCane: false,
        facialExpression: fallback.voiceProfile.baselineExpression || appearance.facialExpression,
        voiceProfile: fallback.voiceProfile
      });
      setDemeanor(fallback.demeanor);
      setLikesText(fallback.likes.join(', '));
      setDislikesText(fallback.dislikes.join(', '));
      setKnownFactsText(fallback.knownFacts.join('\n'));
      setPersonalInstructionSet(fallback.personalInstructionSet);
      setDailySchedule(fallback.dailySchedule);
      setSaveFeedback(`Applied game-specific AI personality, locked voice/accent & schedule for "${charName}"!`);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSendTestDialogue = async (overrideMessage?: string) => {
    const promptMsg = (overrideMessage !== undefined ? overrideMessage : dialogueInput).trim();
    if (!promptMsg) return;
    setDialogueBusy(true);
    const currentRig = buildRigPayload();
    const localMemEval = evaluateCharacterInteractionMemory(
      currentRig,
      promptMsg,
      gameTimeMinutes,
      gameDay
    );

    // Apply relational & episodic memory updates immediately
    setTrustLevel(localMemEval.resultingTrust);
    setSuspicionLevel(localMemEval.resultingSuspicion);
    if (localMemEval.updatedAgent.pendingQuestions) {
      setPendingQuestions(localMemEval.updatedAgent.pendingQuestions);
    }
    setLastMemoryInfluence(localMemEval.gameplayInfluenceSummary);

    try {
      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: currentRig,
          message: promptMsg,
          globalInstructionSet,
          gameTimeMinutes,
          gameDay,
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
        agentReply: replyText,
        gameDay,
        trustDelta: localMemEval.trustDelta,
        suspicionDelta: localMemEval.suspicionDelta,
        resultingTrust: localMemEval.resultingTrust,
        resultingSuspicion: localMemEval.resultingSuspicion,
        resultingDisposition: localMemEval.resultingDisposition,
        triggeredLikes: localMemEval.triggeredLikes,
        triggeredDislikes: localMemEval.triggeredDislikes,
        answeredQuestionId: localMemEval.answeredQuestion?.id || null,
        answeredQuestionFromDay: localMemEval.answeredQuestion?.askedOnDay || null,
        pendingQuestionAsked: localMemEval.newlyAskedQuestion?.questionText || null,
        unansweredQuestionDaysWaiting: localMemEval.unansweredDaysWaiting,
        gameplayInfluenceSummary: localMemEval.gameplayInfluenceSummary,
        unlockedClueId: localMemEval.unlockedClueId
      };
      onRecordInteraction(entry);
      speakReplyAloud(replyText);
      if (overrideMessage === undefined) {
        setDialogueInput('');
      }
      setSaveFeedback(
        `Saved interaction & memory on Day ${gameDay} (${localMemEval.resultingDisposition.toUpperCase()}, Trust ${localMemEval.resultingTrust}/100)!`
      );
    } catch {
      const fallbackReply = localMemEval.answeredQuestion
        ? `*${currentRig.name} nods with relief on Day ${gameDay}.* "I've been waiting since Day ${localMemEval.answeredQuestion.askedOnDay} for your answer! Here is what I know about ${targetRoom.room}: ${currentRig.secretTruth}"`
        : localMemEval.oldestUnansweredQuestion && localMemEval.unansweredDaysWaiting >= 1
          ? `*${currentRig.name} frowns on Day ${gameDay}.* "I asked you ${localMemEval.unansweredDaysWaiting} day(s) ago on Day ${localMemEval.oldestUnansweredQuestion.askedOnDay}: '${localMemEval.oldestUnansweredQuestion.questionText}' — I'm still waiting for your answer!"`
          : localMemEval.triggeredDislikes.length > 0
            ? `*${currentRig.name} turns cold (${localMemEval.resultingDisposition.toUpperCase()}).* "I despise ${localMemEval.triggeredDislikes[0]}, Clerk. My door stays locked to you."`
            : `*${currentRig.name} speaks in a ${voiceStyle.toLowerCase()}.* "During ${timeInfo.phase.toLowerCase()} while ${activeDaily.action.toLowerCase()}, I keep my attention strictly on ${targetRoom.room}."`;

      const entry: SavedInteractionEntry = {
        id: `int_${Date.now()}`,
        timestamp: new Date().toISOString(),
        gameTimeFormatted: timeInfo.formattedTime,
        phase: timeInfo.phase,
        timeOfDayEvent: timeInfo.activeWorldEvent,
        dailyActionAtTime: `${activeDaily.action} (${activeDaily.location})`,
        characterName: currentRig.name,
        userMessage: promptMsg,
        agentReply: fallbackReply,
        gameDay,
        trustDelta: localMemEval.trustDelta,
        suspicionDelta: localMemEval.suspicionDelta,
        resultingTrust: localMemEval.resultingTrust,
        resultingSuspicion: localMemEval.resultingSuspicion,
        resultingDisposition: localMemEval.resultingDisposition,
        triggeredLikes: localMemEval.triggeredLikes,
        triggeredDislikes: localMemEval.triggeredDislikes,
        answeredQuestionId: localMemEval.answeredQuestion?.id || null,
        answeredQuestionFromDay: localMemEval.answeredQuestion?.askedOnDay || null,
        pendingQuestionAsked: localMemEval.newlyAskedQuestion?.questionText || null,
        unansweredQuestionDaysWaiting: localMemEval.unansweredDaysWaiting,
        gameplayInfluenceSummary: localMemEval.gameplayInfluenceSummary,
        unlockedClueId: localMemEval.unlockedClueId
      };
      onRecordInteraction(entry);
      speakReplyAloud(fallbackReply);
      if (overrideMessage === undefined) {
        setDialogueInput('');
      }
      setSaveFeedback(`Saved offline dialogue & memory state on Day ${gameDay}!`);
    } finally {
      setDialogueBusy(false);
    }
  };

  const activeScheduleTargetList: DailyActionEntry[] =
    selectedScheduleAgentId === 'custom_creator'
      ? dailySchedule
      : agents.find((a) => a.id === selectedScheduleAgentId)?.dailySchedule || DEFAULT_DAILY_SCHEDULE;

  const handleUpdateScheduleEntry = (
    index: number,
    updates: Partial<DailyActionEntry>
  ) => {
    const updatedList = activeScheduleTargetList.map((item, idx) => {
      if (idx !== index) return item;
      const next = { ...item, ...updates };
      if (updates.location) {
        const resolved = resolveDailyLocationCoords(updates.location, targetRoom.floor, [0, 0, 0]);
        next.targetFloor = resolved.floor;
        next.targetPosition = resolved.position;
      }
      return next;
    });

    if (selectedScheduleAgentId === 'custom_creator') {
      setDailySchedule(updatedList);
    } else if (onUpdateAgentSchedule) {
      onUpdateAgentSchedule(selectedScheduleAgentId, updatedList);
      setSaveFeedback(`Updated live Daily Schedule for tenant (${selectedScheduleAgentId})!`);
    }
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
        badgeText="3D Hull, Face & Google AI Anim"
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
                  const nextArch = e.target.value as CharacterAppearance['archetype'];
                  const defaults = getArchetypeDefaults(nextArch);
                  const nextVoice = inferVoiceProfileFromArchetypeAndName(charName, nextArch, '');
                  setVoiceProfile(nextVoice);
                  setVoiceStyle(`${nextVoice.accent} accent · ${nextVoice.vocalTone} (${nextVoice.cadenceStyle})`);
                  onChangeAppearance({
                    ...appearance,
                    ...defaults,
                    archetype: nextArch,
                    spineCurvature: 0,
                    hasWalkingCane: false,
                    voiceProfile: nextVoice
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

          {/* 3D Facial Expression Rig */}
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] font-bold text-slate-600">3D Facial Expression</span>
              <select
                value={appearance.facialExpression || 'neutral'}
                onChange={(e) => {
                  e.currentTarget.blur();
                  onChangeAppearance({
                    ...appearance,
                    facialExpression: e.target.value as FacialExpressionType
                  });
                }}
                className="mt-0.5 w-full bg-slate-50 border border-slate-300 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-800 capitalize"
              >
                {FACIAL_EXPRESSIONS.map((expr) => (
                  <option key={expr} value={expr}>
                    {expr.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>

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
                className="mt-0.5 w-full bg-slate-50 border border-slate-300 rounded-full px-2.5 py-1 text-xs font-semibold text-slate-800"
              >
                {HEAD_SHAPES.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </label>
          </div>

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

          {/* Persistent Facial Expression & Locked Playthrough Voice / Tone / Accent Identity */}
          <div
            data-testid="character-voice-expression-panel"
            className="bg-slate-900/95 border border-sky-500/30 text-slate-100 rounded-2xl p-2.5 space-y-2 shadow-inner"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-extrabold text-sky-300 flex items-center gap-1">
                🎭 Facial Expression &amp; Locked Voice/Accent
              </span>
              <span className="text-[9px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/40 px-1.5 py-0.5 rounded-md">
                🔒 Playthrough Locked
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <label className="block">
                <span className="text-[10px] font-bold text-slate-300">Gemini Voice Timbre:</span>
                <select
                  data-testid="voice-prebuilt-select"
                  value={voiceProfile.prebuiltVoiceName}
                  onChange={(e) =>
                    updateLockedVoiceProfile({
                      prebuiltVoiceName: e.target.value as GeminiPrebuiltVoiceName
                    })
                  }
                  className="mt-0.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-100"
                >
                  {GEMINI_PREBUILT_VOICES.map((v) => (
                    <option key={v.voiceName} value={v.voiceName}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[10px] font-bold text-slate-300">Signature Expression:</span>
                <select
                  data-testid="voice-baseline-expression-select"
                  value={appearance.facialExpression || voiceProfile.baselineExpression || 'neutral'}
                  onChange={(e) => {
                    const expr = e.target.value as FacialExpressionType;
                    updateLockedVoiceProfile({ baselineExpression: expr });
                  }}
                  className="mt-0.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-100"
                >
                  {FACIAL_EXPRESSIONS.map((fe) => (
                    <option key={fe} value={fe}>
                      {fe.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <label className="block">
                <span className="text-[10px] font-bold text-slate-300">Locked Regional Accent:</span>
                <input
                  type="text"
                  data-testid="voice-accent-input"
                  value={voiceProfile.accent}
                  onChange={(e) => updateLockedVoiceProfile({ accent: e.target.value })}
                  placeholder="e.g. 1970s Old New York Mid-Atlantic"
                  className="mt-0.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-slate-100"
                />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold text-slate-300">Locked Vocal Tone:</span>
                <input
                  type="text"
                  data-testid="voice-tone-input"
                  value={voiceProfile.vocalTone}
                  onChange={(e) => updateLockedVoiceProfile({ vocalTone: e.target.value })}
                  placeholder="e.g. Hushed, gravel-edged, world-weary"
                  className="mt-0.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-slate-100"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <div className="flex justify-between text-slate-300">
                  <span>Pitch Lock</span>
                  <span className="font-mono text-sky-300">{voiceProfile.pitchMultiplier.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.75}
                  max={1.25}
                  step={0.02}
                  value={voiceProfile.pitchMultiplier}
                  onChange={(e) =>
                    updateLockedVoiceProfile({ pitchMultiplier: parseFloat(e.target.value) })
                  }
                  className="w-full accent-sky-400 h-1"
                />
              </div>
              <div>
                <div className="flex justify-between text-slate-300">
                  <span>Cadence Rate</span>
                  <span className="font-mono text-sky-300">{voiceProfile.speakingRate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.8}
                  max={1.2}
                  step={0.02}
                  value={voiceProfile.speakingRate}
                  onChange={(e) =>
                    updateLockedVoiceProfile({ speakingRate: parseFloat(e.target.value) })
                  }
                  className="w-full accent-sky-400 h-1"
                />
              </div>
            </div>

            <button
              type="button"
              data-testid="audition-character-voice-btn"
              disabled={voiceAuditionBusy}
              onClick={handleAuditionCharacterVoice}
              className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 disabled:opacity-50 text-white font-extrabold text-[11px] shadow-xs transition-all cursor-pointer"
            >
              {voiceAuditionBusy
                ? '🔊 Synthesizing Locked Character Voice...'
                : `🔊 Audition Locked Voice (${voiceProfile.prebuiltVoiceName} · ${voiceProfile.accent})`}
            </button>
          </div>

          {/* Google AI Studio Character Animation & Low-Frame Stepper (gemini-3.1-flash-lite) */}
          <div
            data-testid="google-ai-animation-panel"
            className="pt-2 mt-1 border-t border-slate-200 bg-slate-900/95 text-slate-100 rounded-2xl p-2.5 space-y-2 shadow-inner"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-extrabold text-amber-300 flex items-center gap-1">
                ⚡ Google AI Studio Character Animation
              </span>
              <span className="text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-1.5 py-0.5 rounded-md">
                gemini-3.1-flash-lite · -{Math.round(((60 - globalAnimationFps) / 60) * 100)}% Load
              </span>
            </div>

            <p className="text-[10px] text-slate-300 leading-tight">
              Synthesizes low-frame skeletal Euler keyframes &amp; synchronized 60Hz 3D facial expression curves via Google AI Studio (<code className="text-amber-300">gemini-3.1-flash-lite</code>). Ready for external rigging pipelines.
            </p>

            {/* Global Character Animation Step Rate (Strictly Global across all characters) */}
            <div>
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="font-bold text-slate-300">Global Step Rate (Engine-Wide):</span>
                <span className="font-mono font-bold text-amber-300">{globalAnimationFps} FPS</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {ALLOWED_GLOBAL_ANIMATION_FPS.map((fpsVal) => (
                  <button
                    key={fpsVal}
                    type="button"
                    data-testid={`global-anim-fps-${fpsVal}`}
                    onClick={() => onChangeGlobalAnimationFps?.(fpsVal)}
                    className={`py-1 rounded-lg text-[10px] font-bold transition-all border ${
                      globalAnimationFps === fpsVal
                        ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-xs'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    {fpsVal} FPS
                  </button>
                ))}
              </div>
            </div>

            {/* Google AI Studio Action Preset Selector */}
            <label className="block">
              <span className="text-[10px] font-bold text-slate-300">
                Google AI Animation Sequence (<code className="text-amber-300">gesture</code>):
              </span>
              <select
                data-testid="google-ai-gesture-select"
                value={googleAnimSelectedGesture}
                onChange={(e) => {
                  const nextG = e.target.value as ScheduledActivityGesture;
                  setGoogleAnimSelectedGesture(nextG);
                  setGoogleAnimCustomPrompt(GOOGLE_AI_ANIMATION_PRESETS[nextG].motionPromptDirective);
                }}
                className="mt-0.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-100"
              >
                {Object.values(GOOGLE_AI_ANIMATION_PRESETS).map((preset) => (
                  <option key={preset.gesture} value={preset.gesture}>
                    {preset.categoryLabel} ({preset.cycleDurationSec}s · {preset.defaultFacialExpression})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] font-bold text-slate-300">
                Motion &amp; Expression Directive:
              </span>
              <input
                type="text"
                data-testid="google-ai-motion-prompt-input"
                value={googleAnimCustomPrompt}
                onChange={(e) => setGoogleAnimCustomPrompt(e.target.value)}
                placeholder="Describe low-frame gesture & facial micro-expression..."
                className="mt-0.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-slate-100"
              />
            </label>

            <button
              type="button"
              data-testid="google-ai-bake-animation-btn"
              disabled={googleAnimBaking}
              onClick={handleSynthesizeGoogleAiAnimations}
              className="w-full py-1.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 text-slate-950 font-extrabold text-[11px] shadow-xs transition-all cursor-pointer"
            >
              {googleAnimBaking
                ? '⏳ Synthesizing Google AI Studio Keyframes...'
                : `⚡ Synthesize Google AI Studio Clips (${globalAnimationFps} FPS)`}
            </button>

            {googleAnimStatusNote && (
              <div
                data-testid="google-ai-bake-status-note"
                className="text-[10px] font-mono text-emerald-300 bg-slate-950/80 border border-emerald-500/30 rounded-lg px-2 py-1"
              >
                ✓ {googleAnimStatusNote}
              </div>
            )}

            <div className="grid grid-cols-3 gap-1 text-[9px] text-slate-300 pt-0.5">
              <div className="bg-slate-800/90 border border-slate-700 rounded-md px-1.5 py-1">
                <div className="font-bold text-amber-300">Alt 1 · Decimated</div>
                <div>
                  {appearance.googleAiAnimations?.[googleAnimSelectedGesture]
                    ? `${appearance.googleAiAnimations[googleAnimSelectedGesture]?.decimatedFrameCount} kf baked`
                    : `${Math.round(GOOGLE_AI_ANIMATION_PRESETS[googleAnimSelectedGesture].cycleDurationSec * globalAnimationFps)} kf / cycle`}
                </div>
              </div>
              <div className="bg-slate-800/90 border border-slate-700 rounded-md px-1.5 py-1">
                <div className="font-bold text-sky-300">Alt 2 · Face Rig</div>
                <div>60Hz Eyes &amp; Jaw</div>
              </div>
              <div className="bg-slate-800/90 border border-slate-700 rounded-md px-1.5 py-1">
                <div className="font-bold text-emerald-300">Alt 3 · Dist LOD</div>
                <div>12m / 24m / 35m</div>
              </div>
            </div>
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
              2 · Schedule &amp; Memory ({savedInteractions.length})
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
              {/* AI EPISODIC & RELATIONAL MEMORY ENGINE PANEL */}
              <div
                data-testid="ai-memory-engine-panel"
                className="bg-amber-50/90 border border-amber-300 rounded-2xl p-2.5 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-amber-950">
                    🧠 AI Relational &amp; Multi-Day Memory
                  </span>
                  <span
                    data-testid="tenant-disposition-badge"
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      currentDisposition === 'hostile' || currentDisposition === 'cold'
                        ? 'bg-rose-600 text-white'
                        : currentDisposition === 'confidant' || currentDisposition === 'cordial'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-200 text-amber-950'
                    }`}
                  >
                    {currentDisposition} · Trust {trustLevel}% · Susp {suspicionLevel}%
                  </span>
                </div>

                <div className="text-[10px] font-semibold text-slate-700">
                  {currentDisposition === 'hostile' || currentDisposition === 'cold'
                    ? `⚠️ ${charName} dislikes you — Withholds ${targetRoom.room} secret passage clues & warns Registrar.`
                    : currentDisposition === 'confidant' || currentDisposition === 'cordial'
                      ? `✓ ${charName} trusts you — Volunteers hidden latch & passkey clues in ${targetRoom.room}.`
                      : `Guarded attitude — Mention their Likes or answer their pending question to earn trust.`}
                </div>

                {/* Unanswered Question Tracker */}
                {unresolvedQuestions.length > 0 ? (
                  <div
                    data-testid="pending-question-card"
                    className="bg-white border border-amber-300 rounded-xl p-2 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] font-bold text-amber-900">
                      <span>⏳ Waiting for Your Answer</span>
                      <button
                        type="button"
                        data-testid="quick-answer-pending-question-btn"
                        onClick={() =>
                          handleSendTestDialogue(
                            `About your question: Yes, I checked the Suite 202 fireplace latch and found the brass passkey.`
                          )
                        }
                        className="px-2 py-0.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold"
                      >
                        Answer Now
                      </button>
                    </div>
                    <div className="text-[11px] font-medium text-slate-800 italic">
                      &ldquo;{unresolvedQuestions[0].questionText}&rdquo;
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1 text-[10px] text-emerald-900 font-semibold">
                    <span>✓ All tenant questions answered!</span>
                    <button
                      type="button"
                      onClick={() => {
                        const posed = posePendingQuestionFromAgent(
                          buildRigPayload(),
                          gameTimeMinutes,
                          gameDay
                        );
                        setPendingQuestions(posed.updatedAgent.pendingQuestions || [posed.question]);
                        setSaveFeedback(`Tenant asked a new pending question!`);
                      }}
                      className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-bold"
                    >
                      + New Question
                    </button>
                  </div>
                )}

                {/* Quick Memory Simulation Buttons */}
                <div className="grid grid-cols-2 gap-1 pt-0.5">
                  <button
                    type="button"
                    data-testid="memory-provoke-dislike-btn"
                    onClick={() =>
                      handleSendTestDialogue(
                        `You're a liar and a suspect! I know about the missing ledger pages and drafty airshafts!`
                      )
                    }
                    className="py-1 px-2 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-[10px]"
                  >
                    ⚡ Test Dislike / Hostile
                  </button>
                  <button
                    type="button"
                    data-testid="memory-build-trust-btn"
                    onClick={() =>
                      handleSendTestDialogue(
                        `Please accept my thanks — I brought polished brass keys and classic jazz cassettes for your ledger audit.`
                      )
                    }
                    className="py-1 px-2 rounded-full bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-[10px]"
                  >
                    ✨ Test Liked Topic (+Trust)
                  </button>
                </div>

                {lastMemoryInfluence && (
                  <div
                    data-testid="last-memory-influence-banner"
                    className="text-[10px] font-mono bg-amber-100/90 border border-amber-300 rounded-xl px-2 py-1 text-amber-950"
                  >
                    {lastMemoryInfluence}
                  </div>
                )}
              </div>

              {/* CHARACTER POSITION & ACTIVITY PRESETS MANAGER */}
              <div
                data-testid="daily-schedule-manager-panel"
                className="bg-slate-100 border border-slate-300 rounded-2xl p-2.5 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-extrabold text-slate-800">
                    📍 Tenant Position &amp; Activity Presets
                  </span>
                  <button
                    type="button"
                    data-testid="trigger-random-ai-schedule-btn"
                    onClick={() => {
                      onChangeGameTimeMinutes(
                        gameTimeMinutes,
                        'Triggered Random AI Tenant Activity & Relocation',
                        true
                      );
                      setSaveFeedback('🎲 Triggered Random AI Tenant Activity & Position Update!');
                    }}
                    className="px-2 py-0.5 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] shadow-2xs"
                  >
                    🎲 Random AI Event Now
                  </button>
                </div>

                {/* Target Tenant Selector (Edit Creator Rig or Live Hotel AI Tenants) */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-600 shrink-0">Preset For:</span>
                  <select
                    aria-label="Select Tenant for Daily Schedule"
                    value={selectedScheduleAgentId}
                    onChange={(e) => setSelectedScheduleAgentId(e.target.value)}
                    className="flex-1 bg-white border border-slate-300 rounded-full px-2 py-0.5 text-[10px] font-bold text-slate-800"
                  >
                    <option value="custom_creator">✨ {charName} (Creator Rig)</option>
                    {agents
                      .filter((a) => a.role !== 'helper_entity')
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          🏨 {a.name} ({a.roomNumber} · Now on {a.floor.toUpperCase()})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {activeScheduleTargetList.map((entry, idx) => (
                    <div
                      key={entry.phase}
                      className={`p-2 rounded-xl border text-[10px] space-y-1 ${
                        entry.phase === timeInfo.phase
                          ? 'bg-emerald-50 border-emerald-400 shadow-2xs'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>
                          {entry.phase === timeInfo.phase ? '● ' : ''}
                          Routine Slot {idx + 1} · {entry.phase}
                        </span>
                        <label className="flex items-center gap-1 text-[9px] font-semibold text-purple-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={entry.randomEventsEnabled !== false}
                            onChange={(e) =>
                              handleUpdateScheduleEntry(idx, {
                                randomEventsEnabled: e.target.checked
                              })
                            }
                            className="rounded text-purple-600"
                          />
                          <span>🎲 AI Random Events</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-1">
                        <select
                          aria-label={`${entry.phase} Location Target`}
                          value={
                            SCHEDULE_LOCATIONS.includes(entry.location)
                              ? entry.location
                              : SCHEDULE_LOCATIONS[0]
                          }
                          onChange={(e) =>
                            handleUpdateScheduleEntry(idx, { location: e.target.value })
                          }
                          className="bg-slate-50 border border-slate-300 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold text-[#0284c7]"
                        >
                          {!SCHEDULE_LOCATIONS.includes(entry.location) && (
                            <option value={entry.location}>{entry.location}</option>
                          )}
                          {SCHEDULE_LOCATIONS.map((loc) => (
                            <option key={loc} value={loc}>
                              📍 {loc}
                            </option>
                          ))}
                        </select>

                        <select
                          aria-label={`${entry.phase} Activity Gesture`}
                          value={entry.activityGesture || 'idle_observe'}
                          onChange={(e) =>
                            handleUpdateScheduleEntry(idx, {
                              activityGesture: e.target.value as ScheduledActivityGesture
                            })
                          }
                          className="bg-slate-50 border border-slate-300 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800"
                        >
                          {ACTIVITY_GESTURES.map((g) => (
                            <option key={g.value} value={g.value}>
                              {g.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <input
                        type="text"
                        value={entry.action}
                        onChange={(e) =>
                          handleUpdateScheduleEntry(idx, { action: e.target.value })
                        }
                        aria-label={`${entry.phase} Daily Action`}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-0.5 text-[10px] text-slate-800"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-700">
                    Live Sandboxed Dialogue &amp; Saved Memory Log
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
                    placeholder="Speak to character (saved to memory)..."
                    className="flex-1 bg-white border border-slate-300 rounded-full px-3 py-1 text-xs text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    aria-label="Speak Live to Character via Microphone"
                    title="Speak Live to Character via Microphone (Speech-to-Text)"
                    className={`px-2.5 py-1 font-bold rounded-full text-xs flex items-center gap-1 shrink-0 transition-all ${
                      isListeningVoice
                        ? 'bg-rose-600 animate-pulse text-white shadow-xs'
                        : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                    }`}
                  >
                    <span>🎙️</span>
                    <span>{isListeningVoice ? 'Listening...' : 'Speak'}</span>
                  </button>
                  <button
                    type="button"
                    data-testid="talk-and-save-dialogue-btn"
                    disabled={dialogueBusy}
                    onClick={() => handleSendTestDialogue()}
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
                      No interactions recorded yet — click &ldquo;Talk &amp; Save&rdquo; to log in-character dialogue &amp; relational memory.
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
                            <span>{item.characterName}</span>
                            {item.resultingDisposition && (
                              <span
                                className={`px-1.5 py-0.2 rounded-full text-[9px] uppercase ${
                                  item.resultingDisposition === 'hostile' ||
                                  item.resultingDisposition === 'cold'
                                    ? 'bg-rose-100 text-rose-800'
                                    : item.resultingDisposition === 'confidant' ||
                                        item.resultingDisposition === 'cordial'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-900'
                                }`}
                              >
                                {item.resultingDisposition} ({item.resultingTrust ?? 50}%)
                              </span>
                            )}
                          </div>
                          <div className="text-slate-600">
                            <span className="font-bold">You:</span> {item.userMessage}
                          </div>
                          <div className="text-slate-900 font-medium">
                            <span className="font-bold text-emerald-700">{item.characterName}:</span>{' '}
                            {item.agentReply}
                          </div>
                          {item.gameplayInfluenceSummary && (
                            <div className="text-[10px] font-mono text-amber-800 bg-amber-50 rounded px-1.5 py-0.5 mt-0.5">
                              🧠 {item.gameplayInfluenceSummary}
                            </div>
                          )}
                        </div>
                      ))
                  )}
                </div>
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
