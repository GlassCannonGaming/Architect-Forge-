/**
 * ============================================================================
 * ARCHITECTFORGE PROCEDURAL & AI AUDIO SYNTHESIS ENGINE
 * ============================================================================
 * Zero-dependency Web Audio API synthesizer for retro boutique hotel
 * sound effects (SFX) and multi-track looping background music (BGM).
 * Supports real-time playback, parametric modulation, and export to 16-bit PCM WAV.
 */

export type SoundEffectType =
  | 'footstep'
  | 'door_creak'
  | 'door_latch'
  | 'brass_bell'
  | 'key_turn'
  | 'elevator_chime'
  | 'telephone_ring'
  | 'steam_pipe'
  | 'tape_recorder'
  | 'thunder'
  | 'clue_discover'
  | 'heartbeat'
  | 'clock_tick'
  | 'hotel_ambience'
  | 'custom';

import {
  resolveChordVoicingFrequencies,
  computeSurfaceFootstepSpec,
  type AcousticReverbPreset,
  type FloorSurfaceMaterial,
  type MusicPadInstrument,
  type SfxNoiseColor
} from './rules';

export type { AcousticReverbPreset, FloorSurfaceMaterial, MusicPadInstrument, SfxNoiseColor };

export interface SoundEffectSpec {
  id: string;
  name: string;
  type: SoundEffectType;
  durationSeconds: number;
  oscillatorType: OscillatorType;
  baseFrequency: number;
  pitchBend?: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  filterType?: BiquadFilterType;
  filterCutoff?: number;
  filterResonance?: number;
  noiseMix?: number;
  noiseColor?: SfxNoiseColor;
  fmRatio?: number;
  fmDepth?: number;
  subOscMix?: number;
  distortion?: number;
  reverb?: number;
  reverbPreset?: AcousticReverbPreset;
}

export interface MusicNote {
  note: string; // e.g. "D4", "F#3", "A2"
  freq: number;
  timeOffset: number; // in beats
  duration: number; // in beats
  velocity: number; // 0 to 1
}

export interface MusicTrackSpec {
  id: string;
  title: string;
  mood: string;
  bpm: number;
  scale: string;
  rootNote: string;
  chords: string[];
  melody: MusicNote[];
  bass: MusicNote[];
  droneFreq: number;
  reverbAmount: number;
  reverbPreset?: AcousticReverbPreset;
  padInstrument?: MusicPadInstrument;
  stereoWidth?: number;
  filterCutoff: number;
}

// Note frequencies map
const NOTE_FREQS: Record<string, number> = {
  C2: 65.41, 'C#2': 69.3, D2: 73.42, 'D#2': 77.78, E2: 82.41, F2: 87.31, 'F#2': 92.5, G2: 98.0, 'G#2': 103.83, A2: 110.0, 'A#2': 116.54, B2: 123.47,
  C3: 130.81, 'C#3': 138.59, D3: 146.83, 'D#3': 155.56, E3: 164.81, F3: 174.61, 'F#3': 185.0, G3: 196.0, 'G#3': 207.65, A3: 220.0, 'A#3': 233.08, B3: 246.94,
  C4: 261.63, 'C#4': 277.18, D4: 293.66, 'D#4': 311.13, E4: 329.63, F4: 349.23, 'F#4': 369.99, G4: 392.0, 'G#4': 415.3, A4: 440.0, 'A#4': 466.16, B4: 493.88,
  C5: 523.25, 'C#5': 554.37, D5: 587.33, 'D#5': 622.25, E5: 659.25, F5: 698.46, 'F#5': 739.99, G5: 783.99, 'G#5': 830.61, A5: 880.0, 'A#5': 932.33, B5: 987.77
};

export function getNoteFrequency(noteName: string): number {
  return NOTE_FREQS[noteName] || 220.0;
}

// Built-in Sound Effect Presets
export const BUILTIN_SOUND_EFFECTS: Record<SoundEffectType, SoundEffectSpec> = {
  footstep: {
    id: 'sfx_footstep',
    name: 'Corridor Footstep',
    type: 'footstep',
    durationSeconds: 0.18,
    oscillatorType: 'sine',
    baseFrequency: 75,
    pitchBend: -35,
    attack: 0.01,
    decay: 0.08,
    sustain: 0.1,
    release: 0.08,
    filterType: 'lowpass',
    filterCutoff: 320,
    filterResonance: 1.0,
    noiseMix: 0.35,
    distortion: 0.05,
    reverb: 0.15
  },
  door_creak: {
    id: 'sfx_door_creak',
    name: 'Heavy Timber Door Creak',
    type: 'door_creak',
    durationSeconds: 0.75,
    oscillatorType: 'sawtooth',
    baseFrequency: 110,
    pitchBend: 45,
    attack: 0.06,
    decay: 0.35,
    sustain: 0.4,
    release: 0.3,
    filterType: 'bandpass',
    filterCutoff: 580,
    filterResonance: 3.5,
    noiseMix: 0.2,
    distortion: 0.25,
    reverb: 0.35
  },
  door_latch: {
    id: 'sfx_door_latch',
    name: 'Brass Tumbler Latch Click',
    type: 'door_latch',
    durationSeconds: 0.25,
    oscillatorType: 'triangle',
    baseFrequency: 420,
    pitchBend: -180,
    attack: 0.005,
    decay: 0.06,
    sustain: 0.05,
    release: 0.12,
    filterType: 'highpass',
    filterCutoff: 800,
    filterResonance: 2.0,
    noiseMix: 0.4,
    distortion: 0.1,
    reverb: 0.2
  },
  brass_bell: {
    id: 'sfx_brass_bell',
    name: 'Front Desk Brass Service Bell',
    type: 'brass_bell',
    durationSeconds: 1.4,
    oscillatorType: 'sine',
    baseFrequency: 1480,
    pitchBend: -15,
    attack: 0.002,
    decay: 0.45,
    sustain: 0.2,
    release: 0.8,
    filterType: 'bandpass',
    filterCutoff: 1800,
    filterResonance: 6.0,
    noiseMix: 0.05,
    distortion: 0.0,
    reverb: 0.45
  },
  key_turn: {
    id: 'sfx_key_turn',
    name: 'Skeleton Key in Brass Lock',
    type: 'key_turn',
    durationSeconds: 0.35,
    oscillatorType: 'square',
    baseFrequency: 290,
    pitchBend: -60,
    attack: 0.01,
    decay: 0.09,
    sustain: 0.15,
    release: 0.15,
    filterType: 'bandpass',
    filterCutoff: 1200,
    filterResonance: 4.0,
    noiseMix: 0.35,
    distortion: 0.15,
    reverb: 0.25
  },
  elevator_chime: {
    id: 'sfx_elevator_chime',
    name: 'Vintage Elevator Floor Chime',
    type: 'elevator_chime',
    durationSeconds: 1.2,
    oscillatorType: 'sine',
    baseFrequency: 660,
    pitchBend: 220,
    attack: 0.01,
    decay: 0.3,
    sustain: 0.3,
    release: 0.6,
    filterType: 'lowpass',
    filterCutoff: 1500,
    filterResonance: 2.5,
    noiseMix: 0.02,
    distortion: 0.0,
    reverb: 0.5
  },
  telephone_ring: {
    id: 'sfx_telephone_ring',
    name: 'Switchboard Telephone Ring',
    type: 'telephone_ring',
    durationSeconds: 0.9,
    oscillatorType: 'sine',
    baseFrequency: 440,
    pitchBend: 40,
    attack: 0.02,
    decay: 0.2,
    sustain: 0.5,
    release: 0.2,
    filterType: 'bandpass',
    filterCutoff: 950,
    filterResonance: 5.0,
    noiseMix: 0.1,
    distortion: 0.1,
    reverb: 0.3
  },
  steam_pipe: {
    id: 'sfx_steam_pipe',
    name: 'Cast-Iron Radiator Steam Hiss',
    type: 'steam_pipe',
    durationSeconds: 1.1,
    oscillatorType: 'triangle',
    baseFrequency: 120,
    pitchBend: -30,
    attack: 0.15,
    decay: 0.4,
    sustain: 0.4,
    release: 0.4,
    filterType: 'bandpass',
    filterCutoff: 1400,
    filterResonance: 1.5,
    noiseMix: 0.75,
    distortion: 0.05,
    reverb: 0.4
  },
  tape_recorder: {
    id: 'sfx_tape_recorder',
    name: 'Microcassette Button Click & Motor Whir',
    type: 'tape_recorder',
    durationSeconds: 0.55,
    oscillatorType: 'square',
    baseFrequency: 360,
    pitchBend: -120,
    attack: 0.005,
    decay: 0.15,
    sustain: 0.25,
    release: 0.2,
    filterType: 'lowpass',
    filterCutoff: 850,
    filterResonance: 3.0,
    noiseMix: 0.45,
    distortion: 0.15,
    reverb: 0.2
  },
  thunder: {
    id: 'sfx_thunder',
    name: 'Distant Midnight Thunder Rumble',
    type: 'thunder',
    durationSeconds: 2.2,
    oscillatorType: 'sine',
    baseFrequency: 48,
    pitchBend: -18,
    attack: 0.2,
    decay: 0.8,
    sustain: 0.5,
    release: 1.0,
    filterType: 'lowpass',
    filterCutoff: 220,
    filterResonance: 3.5,
    noiseMix: 0.65,
    distortion: 0.3,
    reverb: 0.6
  },
  clue_discover: {
    id: 'sfx_clue_discover',
    name: 'Secret Mystery Reveal Stinger',
    type: 'clue_discover',
    durationSeconds: 1.6,
    oscillatorType: 'triangle',
    baseFrequency: 523.25,
    pitchBend: 261.63,
    attack: 0.02,
    decay: 0.5,
    sustain: 0.3,
    release: 0.8,
    filterType: 'bandpass',
    filterCutoff: 1200,
    filterResonance: 4.5,
    noiseMix: 0.05,
    distortion: 0.0,
    reverb: 0.55
  },
  heartbeat: {
    id: 'sfx_heartbeat',
    name: 'Sanity Drop Heartbeat Thump',
    type: 'heartbeat',
    durationSeconds: 0.45,
    oscillatorType: 'sine',
    baseFrequency: 55,
    pitchBend: -25,
    attack: 0.02,
    decay: 0.18,
    sustain: 0.1,
    release: 0.2,
    filterType: 'lowpass',
    filterCutoff: 160,
    filterResonance: 2.0,
    noiseMix: 0.05,
    distortion: 0.1,
    reverb: 0.2
  },
  clock_tick: {
    id: 'sfx_clock_tick',
    name: 'Grandfather Clock Mechanical Tick',
    type: 'clock_tick',
    durationSeconds: 0.12,
    oscillatorType: 'square',
    baseFrequency: 880,
    pitchBend: -400,
    attack: 0.002,
    decay: 0.04,
    sustain: 0.02,
    release: 0.06,
    filterType: 'bandpass',
    filterCutoff: 1600,
    filterResonance: 4.0,
    noiseMix: 0.25,
    distortion: 0.1,
    reverb: 0.1
  },
  hotel_ambience: {
    id: 'sfx_hotel_ambience',
    name: 'Hotel Ambience Loop (Creaks & Whispers)',
    type: 'hotel_ambience',
    durationSeconds: 3.4,
    oscillatorType: 'sine',
    baseFrequency: 48,
    pitchBend: 16,
    attack: 0.7,
    decay: 1.1,
    sustain: 0.75,
    release: 1.2,
    filterType: 'bandpass',
    filterCutoff: 640,
    filterResonance: 3.2,
    noiseMix: 0.65,
    noiseColor: 'pink',
    fmRatio: 1.85,
    fmDepth: 55,
    subOscMix: 0.52,
    distortion: 0.08,
    reverb: 0.72,
    reverbPreset: 'grand_lobby'
  },
  custom: {
    id: 'sfx_custom_init',
    name: 'Atmospheric Corridor Resonance',
    type: 'custom',
    durationSeconds: 1.0,
    oscillatorType: 'sawtooth',
    baseFrequency: 180,
    pitchBend: -40,
    attack: 0.05,
    decay: 0.3,
    sustain: 0.4,
    release: 0.4,
    filterType: 'lowpass',
    filterCutoff: 650,
    filterResonance: 2.0,
    noiseMix: 0.2,
    distortion: 0.1,
    reverb: 0.35
  }
};

// Built-in Background Music Presets
export const BUILTIN_BGM_TRACKS: MusicTrackSpec[] = [
  {
    id: 'bgm_hotel_ambience',
    title: 'Hotel Paranormal Ambience Loop',
    mood: 'Distant timber creaks, muffled footsteps, and faint whispering across hollow walls',
    bpm: 48,
    scale: 'diminished',
    rootNote: 'C',
    chords: ['Cm', 'Cdim', 'Fm', 'G7b9'],
    droneFreq: 48.0,
    reverbAmount: 0.75,
    filterCutoff: 580,
    melody: [
      { note: 'C4', freq: 261.63, timeOffset: 0, duration: 2.5, velocity: 0.5 },
      { note: 'D#4', freq: 311.13, timeOffset: 2.5, duration: 1.5, velocity: 0.45 },
      { note: 'F#4', freq: 369.99, timeOffset: 4.0, duration: 2.0, velocity: 0.55 },
      { note: 'G4', freq: 392.0, timeOffset: 6.0, duration: 2.0, velocity: 0.5 }
    ],
    bass: [
      { note: 'C2', freq: 65.41, timeOffset: 0, duration: 4.0, velocity: 0.85 },
      { note: 'F#2', freq: 92.5, timeOffset: 4.0, duration: 2.0, velocity: 0.8 },
      { note: 'G2', freq: 98.0, timeOffset: 6.0, duration: 2.0, velocity: 0.85 }
    ]
  },
  {
    id: 'bgm_lobby_noir',
    title: 'Lobby Lounge Noir',
    mood: 'Moody, relaxed vintage hotel jazz',
    bpm: 72,
    scale: 'dorian',
    rootNote: 'D',
    chords: ['Dm7', 'G7', 'Bbmaj7', 'A7b9'],
    droneFreq: 73.42,
    reverbAmount: 0.45,
    filterCutoff: 950,
    melody: [
      { note: 'D4', freq: 293.66, timeOffset: 0, duration: 1.5, velocity: 0.75 },
      { note: 'F4', freq: 349.23, timeOffset: 1.5, duration: 0.5, velocity: 0.7 },
      { note: 'A4', freq: 440.0, timeOffset: 2.0, duration: 1.0, velocity: 0.8 },
      { note: 'G4', freq: 392.0, timeOffset: 3.0, duration: 1.0, velocity: 0.65 },
      { note: 'F4', freq: 349.23, timeOffset: 4.0, duration: 1.5, velocity: 0.7 },
      { note: 'E4', freq: 329.63, timeOffset: 5.5, duration: 0.5, velocity: 0.6 },
      { note: 'D4', freq: 293.66, timeOffset: 6.0, duration: 2.0, velocity: 0.75 }
    ],
    bass: [
      { note: 'D2', freq: 73.42, timeOffset: 0, duration: 2.0, velocity: 0.85 },
      { note: 'G2', freq: 98.0, timeOffset: 2.0, duration: 2.0, velocity: 0.8 },
      { note: 'A#2', freq: 116.54, timeOffset: 4.0, duration: 2.0, velocity: 0.85 },
      { note: 'A2', freq: 110.0, timeOffset: 6.0, duration: 2.0, velocity: 0.8 }
    ]
  },
  {
    id: 'bgm_corridor_whispers',
    title: 'Midnight Corridor Whispers',
    mood: 'Tense minimalist suspense, acoustic hollow partitions',
    bpm: 60,
    scale: 'natural_minor',
    rootNote: 'C',
    chords: ['Cm', 'Abmaj7', 'Fm', 'G7'],
    droneFreq: 65.41,
    reverbAmount: 0.65,
    filterCutoff: 650,
    melody: [
      { note: 'C4', freq: 261.63, timeOffset: 0, duration: 2.0, velocity: 0.6 },
      { note: 'D#4', freq: 311.13, timeOffset: 2.0, duration: 1.5, velocity: 0.65 },
      { note: 'D4', freq: 293.66, timeOffset: 3.5, duration: 0.5, velocity: 0.55 },
      { note: 'C4', freq: 261.63, timeOffset: 4.0, duration: 2.0, velocity: 0.6 },
      { note: 'G4', freq: 392.0, timeOffset: 6.0, duration: 2.0, velocity: 0.7 }
    ],
    bass: [
      { note: 'C2', freq: 65.41, timeOffset: 0, duration: 4.0, velocity: 0.9 },
      { note: 'G#2', freq: 103.83, timeOffset: 4.0, duration: 2.0, velocity: 0.85 },
      { note: 'G2', freq: 98.0, timeOffset: 6.0, duration: 2.0, velocity: 0.85 }
    ]
  },
  {
    id: 'bgm_rainy_alcove',
    title: 'Rainy Alcove Waltz',
    mood: 'Melancholic, contemplative rain on casement windows',
    bpm: 84,
    scale: 'harmonic_minor',
    rootNote: 'A',
    chords: ['Am', 'Dm', 'E7', 'Am'],
    droneFreq: 110.0,
    reverbAmount: 0.5,
    filterCutoff: 820,
    melody: [
      { note: 'E4', freq: 329.63, timeOffset: 0, duration: 1.0, velocity: 0.7 },
      { note: 'A4', freq: 440.0, timeOffset: 1.0, duration: 1.0, velocity: 0.75 },
      { note: 'B4', freq: 493.88, timeOffset: 2.0, duration: 1.0, velocity: 0.8 },
      { note: 'C5', freq: 523.25, timeOffset: 3.0, duration: 1.5, velocity: 0.85 },
      { note: 'B4', freq: 493.88, timeOffset: 4.5, duration: 0.5, velocity: 0.7 },
      { note: 'A4', freq: 440.0, timeOffset: 5.0, duration: 2.0, velocity: 0.75 }
    ],
    bass: [
      { note: 'A2', freq: 110.0, timeOffset: 0, duration: 2.0, velocity: 0.8 },
      { note: 'D3', freq: 146.83, timeOffset: 2.0, duration: 2.0, velocity: 0.8 },
      { note: 'E2', freq: 82.41, timeOffset: 4.0, duration: 2.0, velocity: 0.85 },
      { note: 'A2', freq: 110.0, timeOffset: 6.0, duration: 2.0, velocity: 0.8 }
    ]
  },
  {
    id: 'bgm_sub_vault',
    title: 'Sub-Vault Suspense',
    mood: 'Ominous deep drone, low boiler frequencies',
    bpm: 50,
    scale: 'phrygian',
    rootNote: 'E',
    chords: ['Em', 'F', 'Dm', 'Em'],
    droneFreq: 41.2, // Low E boiler hum
    reverbAmount: 0.7,
    filterCutoff: 480,
    melody: [
      { note: 'E3', freq: 164.81, timeOffset: 0, duration: 3.0, velocity: 0.65 },
      { note: 'F3', freq: 174.61, timeOffset: 3.0, duration: 1.0, velocity: 0.7 },
      { note: 'E3', freq: 164.81, timeOffset: 4.0, duration: 2.0, velocity: 0.6 },
      { note: 'B2', freq: 123.47, timeOffset: 6.0, duration: 2.0, velocity: 0.65 }
    ],
    bass: [
      { note: 'E2', freq: 82.41, timeOffset: 0, duration: 4.0, velocity: 0.95 },
      { note: 'F2', freq: 87.31, timeOffset: 4.0, duration: 2.0, velocity: 0.9 },
      { note: 'E2', freq: 82.41, timeOffset: 6.0, duration: 2.0, velocity: 0.95 }
    ]
  },
  {
    id: 'bgm_late_night_radio',
    title: 'Late Night Radio',
    mood: 'Lo-fi nostalgic broadcast, tape flutter warmth',
    bpm: 78,
    scale: 'blues',
    rootNote: 'G',
    chords: ['G7', 'C7', 'G7', 'D7'],
    droneFreq: 98.0,
    reverbAmount: 0.4,
    filterCutoff: 1100,
    melody: [
      { note: 'G4', freq: 392.0, timeOffset: 0, duration: 1.0, velocity: 0.7 },
      { note: 'A#4', freq: 466.16, timeOffset: 1.0, duration: 1.0, velocity: 0.75 },
      { note: 'C5', freq: 523.25, timeOffset: 2.0, duration: 0.5, velocity: 0.8 },
      { note: 'C#5', freq: 554.37, timeOffset: 2.5, duration: 0.5, velocity: 0.7 },
      { note: 'D5', freq: 587.33, timeOffset: 3.0, duration: 1.5, velocity: 0.85 },
      { note: 'A#4', freq: 466.16, timeOffset: 4.5, duration: 0.5, velocity: 0.7 },
      { note: 'G4', freq: 392.0, timeOffset: 5.0, duration: 2.0, velocity: 0.75 }
    ],
    bass: [
      { note: 'G2', freq: 98.0, timeOffset: 0, duration: 2.0, velocity: 0.85 },
      { note: 'C3', freq: 130.81, timeOffset: 2.0, duration: 2.0, velocity: 0.8 },
      { note: 'G2', freq: 98.0, timeOffset: 4.0, duration: 2.0, velocity: 0.85 },
      { note: 'D2', freq: 73.42, timeOffset: 6.0, duration: 2.0, velocity: 0.8 }
    ]
  }
];

class AudioEngineSingleton {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private impulseCache: Map<AcousticReverbPreset, AudioBuffer> = new Map();

  // BGM state
  private activeBgmTrack: MusicTrackSpec | null = null;
  private isBgmPlaying = false;
  private bgmIntervalId: number | null = null;
  private scheduledVoices: Array<{ stop: () => void }> = [];

  // Procedural Hotel Ambience Loop State (Creaks, Footsteps, Whispers)
  private ambienceGain: GainNode | null = null;
  private isAmbienceLoopActive = false;
  private ambienceIntervalId: number | null = null;
  private ambienceVoices: Array<{ stop: () => void }> = [];
  private suspicionTriggerState: {
    isActive: boolean;
    suspicionLevel: number;
    roomLabel: string;
    agentName: string;
  } = {
    isActive: false,
    suspicionLevel: 0,
    roomLabel: '',
    agentName: ''
  };

  // Settings
  private masterVol = 0.8;
  private sfxVol = 0.85;
  private bgmVol = 0.5;

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;

      this.masterCompressor = this.ctx.createDynamicsCompressor();
      this.masterCompressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
      this.masterCompressor.knee.setValueAtTime(18, this.ctx.currentTime);
      this.masterCompressor.ratio.setValueAtTime(4, this.ctx.currentTime);
      this.masterCompressor.attack.setValueAtTime(0.005, this.ctx.currentTime);
      this.masterCompressor.release.setValueAtTime(0.2, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVol, this.ctx.currentTime);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.bgmVol, this.ctx.currentTime);

      this.ambienceGain = this.ctx.createGain();
      this.ambienceGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);

      this.sfxGain.connect(this.masterCompressor);
      this.bgmGain.connect(this.masterCompressor);
      this.ambienceGain.connect(this.masterCompressor);
      this.masterCompressor.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /**
   * Generates and caches an algorithmic stereo impulse response buffer for realistic room acoustics.
   */
  private getImpulseBuffer(ctx: BaseAudioContext, preset: AcousticReverbPreset = 'grand_lobby'): AudioBuffer {
    if (ctx === this.ctx && this.impulseCache.has(preset)) {
      return this.impulseCache.get(preset)!;
    }

    const presetConfig: Record<AcousticReverbPreset, { duration: number; decay: number; damping: number; earlyReflections: number }> = {
      small_room: { duration: 0.75, decay: 3.8, damping: 0.35, earlyReflections: 0.018 },
      tiled_bathroom: { duration: 1.35, decay: 2.4, damping: 0.12, earlyReflections: 0.008 },
      grand_lobby: { duration: 2.1, decay: 2.2, damping: 0.28, earlyReflections: 0.028 },
      sub_vault: { duration: 2.8, decay: 1.6, damping: 0.55, earlyReflections: 0.042 },
      carpeted_corridor: { duration: 0.55, decay: 4.4, damping: 0.62, earlyReflections: 0.022 },
      wooden_parlor: { duration: 0.95, decay: 3.1, damping: 0.32, earlyReflections: 0.014 }
    };

    const cfg = presetConfig[preset] || presetConfig.grand_lobby;
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * cfg.duration));
    const impulse = ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      let lp = 0;
      const earlyStep = Math.max(1, Math.floor(sampleRate * cfg.earlyReflections));
      for (let i = 0; i < length; i++) {
        const norm = i / length;
        const envelope = Math.pow(1 - norm, cfg.decay);
        const rawNoise = Math.random() * 2 - 1;
        // One-pole lowpass damping for natural high-frequency absorption
        lp = lp * cfg.damping + rawNoise * (1 - cfg.damping);
        // Early reflection comb spikes in the first 90ms
        const isEarlySpike = i < sampleRate * 0.09 && i % earlyStep < 4 ? 1.65 : 1.0;
        data[i] = lp * envelope * isEarlySpike * 0.55;
      }
    }

    if (ctx === this.ctx) {
      this.impulseCache.set(preset, impulse);
    }
    return impulse;
  }

  /**
   * Builds a warm analog-style hyperbolic tangent distortion curve for WaveShaperNode.
   */
  private createDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
    const k = Math.max(0, amount) * 65;
    const samples = 1024;
    const curve = new Float32Array(new ArrayBuffer(samples * 4));
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = k === 0 ? x : Math.tanh(x * (1 + k * 0.12));
    }
    return curve;
  }

  /**
   * Generates shaped physical Foley noise (White, Pink 1/f, or Brown 1/f^2).
   */
  private createShapedNoiseBuffer(ctx: BaseAudioContext, duration: number, color: SfxNoiseColor = 'pink', amplitude = 1.0): AudioBuffer {
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    if (color === 'white') {
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * amplitude;
      }
    } else if (color === 'pink') {
      // Paul Kellet's refined Pink Noise filter
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const pink = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.15;
        b6 = white * 0.115926;
        output[i] = Math.max(-1, Math.min(1, pink * amplitude));
      }
    } else {
      // Brown (1/f^2) low-frequency rumble noise
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.04 * white) / 1.04;
        output[i] = Math.max(-1, Math.min(1, lastOut * 2.8 * amplitude));
      }
    }

    return buffer;
  }

  public setMasterVolume(v: number): void {
    this.masterVol = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.masterVol, this.ctx.currentTime);
    }
  }

  public setSfxVolume(v: number): void {
    this.sfxVol = Math.max(0, Math.min(1, v));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);
    }
  }

  public setBgmVolume(v: number): void {
    this.bgmVol = Math.max(0, Math.min(1, v));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.bgmVol, this.ctx.currentTime);
    }
  }

  public getAnalyserData(dataArray: Uint8Array<ArrayBuffer>): void {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(dataArray);
    } else {
      dataArray.fill(0);
    }
  }

  /**
   * Internal SOTA Multi-Stage DSP graph builder for SFX (supports live AudioContext + spatial destination).
   */
  private triggerSfxGraph(ctx: AudioContext, spec: SoundEffectSpec, destination: AudioNode): void {
    const now = ctx.currentTime;
    const duration = Math.max(0.05, spec.durationSeconds);

    // 1. Primary Carrier Oscillator
    const osc = ctx.createOscillator();
    osc.type = spec.oscillatorType;
    osc.frequency.setValueAtTime(spec.baseFrequency, now);
    if (spec.pitchBend) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, spec.baseFrequency + spec.pitchBend),
        now + duration
      );
    }

    // 2. FM Modulator Operator (for metallic bells, brass chimes, and wood creaks)
    const fmRatio = spec.fmRatio ?? (spec.type === 'brass_bell' || spec.type === 'elevator_chime' ? 2.756 : 1.5);
    const fmDepth = spec.fmDepth ?? (spec.type === 'brass_bell' ? 180 : spec.type === 'door_creak' ? 65 : 0);
    if (fmDepth > 1) {
      const fmOsc = ctx.createOscillator();
      fmOsc.type = 'sine';
      fmOsc.frequency.setValueAtTime(spec.baseFrequency * fmRatio, now);
      const fmGain = ctx.createGain();
      fmGain.gain.setValueAtTime(fmDepth, now);
      fmGain.gain.exponentialRampToValueAtTime(0.5, now + duration);
      fmOsc.connect(fmGain);
      fmGain.connect(osc.frequency);
      fmOsc.start(now);
      fmOsc.stop(now + duration + 0.05);
    }

    // 3. Sub-Oscillator Operator (-1 octave harmonic body)
    const voiceMixBus = ctx.createGain();
    osc.connect(voiceMixBus);

    const subMix = spec.subOscMix ?? 0.22;
    if (subMix > 0.01) {
      const subOsc = ctx.createOscillator();
      subOsc.type = 'triangle';
      subOsc.frequency.setValueAtTime(Math.max(20, spec.baseFrequency * 0.5), now);
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(subMix, now);
      subOsc.connect(subGain);
      subGain.connect(voiceMixBus);
      subOsc.start(now);
      subOsc.stop(now + duration + 0.05);
    }

    // 4. Shaped Physical Foley Noise Layer (White / Pink / Brown) cleanly routed BEFORE filter
    if (spec.noiseMix && spec.noiseMix > 0.02) {
      const noiseColor: SfxNoiseColor =
        spec.noiseColor ||
        (spec.type === 'thunder' || spec.type === 'footstep'
          ? 'brown'
          : spec.type === 'steam_pipe'
            ? 'pink'
            : 'pink');
      const noiseBuffer = this.createShapedNoiseBuffer(ctx, duration, noiseColor, spec.noiseMix);
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(spec.noiseMix, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      noiseSource.connect(noiseGain);
      noiseGain.connect(voiceMixBus);
      noiseSource.start(now);
      noiseSource.stop(now + duration);
    }

    // 5. Dynamic Resonant BiquadFilter with cutoff envelope sweep
    let stageNode: AudioNode = voiceMixBus;
    if (spec.filterType && spec.filterCutoff) {
      const filter = ctx.createBiquadFilter();
      filter.type = spec.filterType;
      const startCutoff = Math.min(12000, spec.filterCutoff * 1.35);
      filter.frequency.setValueAtTime(startCutoff, now);
      filter.frequency.exponentialRampToValueAtTime(Math.max(40, spec.filterCutoff * 0.7), now + duration);
      if (spec.filterResonance) {
        filter.Q.setValueAtTime(spec.filterResonance, now);
      }
      stageNode.connect(filter);
      stageNode = filter;
    }

    // 6. Warm Analog Saturation (WaveShaperNode)
    if (spec.distortion && spec.distortion > 0.02) {
      const shaper = ctx.createWaveShaper();
      shaper.curve = this.createDistortionCurve(spec.distortion);
      shaper.oversample = '2x';
      stageNode.connect(shaper);
      stageNode = shaper;
    }

    // 7. ADSR Amplitude Envelope
    const envGain = ctx.createGain();
    envGain.gain.setValueAtTime(0.0001, now);
    const attackEnd = now + Math.max(0.002, spec.attack);
    envGain.gain.linearRampToValueAtTime(1.0, attackEnd);
    const decayEnd = attackEnd + Math.max(0.01, spec.decay);
    const sustainLevel = Math.max(0.02, spec.sustain);
    envGain.gain.linearRampToValueAtTime(sustainLevel, decayEnd);
    const releaseStart = now + duration - Math.max(0.01, spec.release);
    if (releaseStart > decayEnd) {
      envGain.gain.setValueAtTime(sustainLevel, releaseStart);
    }
    envGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    stageNode.connect(envGain);

    // 8. Wet/Dry Convolution Reverb Routing
    const reverbAmount = Math.max(0, Math.min(1, spec.reverb ?? 0.25));
    const dryGain = ctx.createGain();
    dryGain.gain.setValueAtTime(1 - reverbAmount * 0.45, now);
    envGain.connect(dryGain);
    dryGain.connect(destination);

    if (reverbAmount > 0.03) {
      const convolver = ctx.createConvolver();
      convolver.buffer = this.getImpulseBuffer(ctx, spec.reverbPreset || 'small_room');
      const wetGain = ctx.createGain();
      wetGain.gain.setValueAtTime(reverbAmount * 0.85, now);
      envGain.connect(convolver);
      convolver.connect(wetGain);
      wetGain.connect(destination);
    }

    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  /**
   * Synthesizes and plays a SoundEffectSpec immediately via SOTA Multi-Stage Web Audio DSP.
   */
  public playSoundEffect(spec: SoundEffectSpec): void {
    try {
      const ctx = this.initContext();
      if (!this.sfxGain) return;
      this.triggerSfxGraph(ctx, spec, this.sfxGain);
    } catch (err) {
      console.warn('AudioEngine playSoundEffect error:', err);
    }
  }

  /**
   * Synthesizes and plays a 3D Spatial HRTF SoundEffectSpec positioned in 3D hotel coordinates.
   */
  public playSpatialSoundAt(
    spec: SoundEffectSpec,
    emitterPos: [number, number, number],
    listenerPos: [number, number, number] = [0, 1.7, 0]
  ): void {
    try {
      const ctx = this.initContext();
      if (!this.sfxGain) return;
      const now = ctx.currentTime;

      const listener = ctx.listener;
      if (listener.positionX) {
        listener.positionX.setValueAtTime(listenerPos[0], now);
        listener.positionY.setValueAtTime(listenerPos[1], now);
        listener.positionZ.setValueAtTime(listenerPos[2], now);
      } else {
        listener.setPosition(listenerPos[0], listenerPos[1], listenerPos[2]);
      }

      const panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 1.5;
      panner.maxDistance = 35;
      panner.rolloffFactor = 1.2;
      panner.positionX.setValueAtTime(emitterPos[0], now);
      panner.positionY.setValueAtTime(emitterPos[1], now);
      panner.positionZ.setValueAtTime(emitterPos[2], now);

      panner.connect(this.sfxGain);
      this.triggerSfxGraph(ctx, spec, panner);
    } catch (err) {
      console.warn('AudioEngine playSpatialSoundAt error:', err);
    }
  }

  /**
   * Plays a built-in sound effect by type name.
   */
  public playPresetSound(type: SoundEffectType): void {
    const spec = BUILTIN_SOUND_EFFECTS[type] || BUILTIN_SOUND_EFFECTS.footstep;
    this.playSoundEffect(spec);
  }

  /**
   * Synthesizes and plays a randomized floor-surface-specific footstep ('carpet' | 'wood' | 'linoleum')
   * for either the first-person player or a 3D spatialized AI character, remaining completely silent when crouching.
   */
  public playSurfaceFootstep(
    surface: FloorSurfaceMaterial,
    options?: {
      stepIndex?: number;
      jitterSeed?: number;
      isCrouching?: boolean;
      footstepsEnabled?: boolean;
      emitterPos?: [number, number, number];
      listenerPos?: [number, number, number];
      includeCaneTap?: boolean;
    }
  ): SoundEffectSpec | null {
    if (options?.isCrouching || options?.footstepsEnabled === false) {
      return null;
    }

    const stepIdx = options?.stepIndex ?? 0;
    const seed = options?.jitterSeed ?? Math.random();
    const isNpc = Boolean(options?.emitterPos);
    const computed = computeSurfaceFootstepSpec(surface, stepIdx, seed, { isNpc });
    const spec: SoundEffectSpec = {
      ...computed,
      id: `sfx_footstep_${surface}_${stepIdx}_${Math.round(seed * 1000)}`,
      type: 'footstep'
    };

    if (typeof window !== 'undefined') {
      if (options?.emitterPos) {
        this.playSpatialSoundAt(spec, options.emitterPos, options.listenerPos || [0, 1.62, 0]);
      } else {
        this.playSoundEffect(spec);
      }

      // Layer synchronized wooden cane ferrule tap on alternate strides for bent-spine characters (e.g. Mrs. Eleanor Vance)
      if (options?.includeCaneTap && stepIdx % 2 === 1) {
        const caneComputed = computeSurfaceFootstepSpec(surface, stepIdx, (seed + 0.37) % 1, {
          isCaneTap: true,
          isNpc
        });
        const caneSpec: SoundEffectSpec = {
          ...caneComputed,
          id: `sfx_canetap_${surface}_${stepIdx}`,
          type: 'footstep'
        };
        window.setTimeout(() => {
          if (options?.emitterPos) {
            this.playSpatialSoundAt(caneSpec, options.emitterPos, options.listenerPos || [0, 1.62, 0]);
          } else {
            this.playSoundEffect(caneSpec);
          }
        }, 65);
      }
    }

    return spec;
  }

  /**
   * Starts playing a looping polyphonic background music track with chord voicings, stereo width, and reverb.
   */
  public playBgm(track: MusicTrackSpec): void {
    this.stopBgm();
    this.activeBgmTrack = track;
    this.isBgmPlaying = true;

    const ctx = this.initContext();
    const beatSeconds = 60 / Math.max(30, track.bpm);
    const loopLengthSeconds = beatSeconds * 8; // 8 beats per measure cycle

    // Create shared stereo reverb bus for this BGM track
    const bgmDryBus = ctx.createGain();
    const reverbMix = Math.max(0.05, Math.min(0.9, track.reverbAmount ?? 0.45));
    bgmDryBus.gain.setValueAtTime(1.0 - reverbMix * 0.35, ctx.currentTime);
    if (this.bgmGain) bgmDryBus.connect(this.bgmGain);

    const bgmConvolver = ctx.createConvolver();
    bgmConvolver.buffer = this.getImpulseBuffer(ctx, track.reverbPreset || 'grand_lobby');
    const bgmWetBus = ctx.createGain();
    bgmWetBus.gain.setValueAtTime(reverbMix * 0.75, ctx.currentTime);
    bgmConvolver.connect(bgmWetBus);
    if (this.bgmGain) bgmWetBus.connect(this.bgmGain);

    const scheduleLoopCycle = (startTime: number) => {
      if (!this.isBgmPlaying || this.activeBgmTrack?.id !== track.id) return;

      // 1. Stereo Detuned Ambient Drone Pad
      [-6, 6].forEach((detuneCents, idx) => {
        const droneOsc = ctx.createOscillator();
        droneOsc.type = 'triangle';
        droneOsc.frequency.setValueAtTime(track.droneFreq, startTime);
        droneOsc.detune.setValueAtTime(detuneCents, startTime);

        const dronePanner = ctx.createStereoPanner();
        dronePanner.pan.setValueAtTime(idx === 0 ? -0.35 : 0.35, startTime);

        const droneGain = ctx.createGain();
        droneGain.gain.setValueAtTime(0.001, startTime);
        droneGain.gain.linearRampToValueAtTime(0.09, startTime + 0.9);
        droneGain.gain.setValueAtTime(0.09, startTime + loopLengthSeconds - 0.9);
        droneGain.gain.linearRampToValueAtTime(0.001, startTime + loopLengthSeconds);

        const droneFilter = ctx.createBiquadFilter();
        droneFilter.type = 'lowpass';
        droneFilter.frequency.setValueAtTime(track.filterCutoff, startTime);

        droneOsc.connect(droneFilter);
        droneFilter.connect(dronePanner);
        dronePanner.connect(droneGain);
        droneGain.connect(bgmDryBus);
        droneGain.connect(bgmConvolver);

        droneOsc.start(startTime);
        droneOsc.stop(startTime + loopLengthSeconds + 0.05);
        this.scheduledVoices.push({ stop: () => { try { droneOsc.stop(); } catch {} } });
      });

      // 2. Polyphonic Chord Progression Voicings (4 chords across 8 beats = 2 beats each)
      const chords = track.chords && track.chords.length > 0 ? track.chords : ['Dm7', 'G7', 'Bbmaj7', 'A7'];
      const beatsPerChord = 8 / chords.length;
      const chordDuration = beatsPerChord * beatSeconds;

      chords.forEach((chordSymbol, chordIdx) => {
        const chordStart = startTime + chordIdx * chordDuration;
        const freqs = resolveChordVoicingFrequencies(chordSymbol);

        freqs.forEach((freq, noteIdx) => {
          const padOsc = ctx.createOscillator();
          padOsc.type = track.padInstrument === 'noir_organ' ? 'sawtooth' : 'sine';
          padOsc.frequency.setValueAtTime(freq, chordStart);
          padOsc.detune.setValueAtTime((noteIdx - 1.5) * 4, chordStart);

          // Subtle electric-piano / Rhodes FM tine harmonic
          const tineOsc = ctx.createOscillator();
          tineOsc.type = 'triangle';
          tineOsc.frequency.setValueAtTime(freq * 2, chordStart);
          const tineGain = ctx.createGain();
          tineGain.gain.setValueAtTime(0.025, chordStart);
          tineGain.gain.exponentialRampToValueAtTime(0.001, chordStart + chordDuration * 0.6);

          const padFilter = ctx.createBiquadFilter();
          padFilter.type = 'lowpass';
          padFilter.frequency.setValueAtTime(Math.min(2200, track.filterCutoff * 1.3), chordStart);

          const panner = ctx.createStereoPanner();
          const panSpread = ((noteIdx / Math.max(1, freqs.length - 1)) * 2 - 1) * (track.stereoWidth ?? 0.65);
          panner.pan.setValueAtTime(Math.max(-0.9, Math.min(0.9, panSpread)), chordStart);

          const padGain = ctx.createGain();
          padGain.gain.setValueAtTime(0.001, chordStart);
          padGain.gain.linearRampToValueAtTime(0.065, chordStart + 0.12);
          padGain.gain.setValueAtTime(0.05, chordStart + chordDuration * 0.7);
          padGain.gain.linearRampToValueAtTime(0.0008, chordStart + chordDuration);

          padOsc.connect(padFilter);
          tineOsc.connect(tineGain);
          tineGain.connect(padFilter);
          padFilter.connect(panner);
          panner.connect(padGain);
          padGain.connect(bgmDryBus);
          padGain.connect(bgmConvolver);

          padOsc.start(chordStart);
          padOsc.stop(chordStart + chordDuration + 0.05);
          tineOsc.start(chordStart);
          tineOsc.stop(chordStart + chordDuration + 0.05);
          this.scheduledVoices.push({
            stop: () => {
              try {
                padOsc.stop();
                tineOsc.stop();
              } catch {}
            }
          });
        });
      });

      // 3. Schedule Acoustic Upright / Sub Bass Notes
      track.bass.forEach((bn) => {
        const noteStart = startTime + bn.timeOffset * beatSeconds;
        const noteDuration = bn.duration * beatSeconds;

        const bOsc = ctx.createOscillator();
        bOsc.type = 'triangle';
        bOsc.frequency.setValueAtTime(bn.freq, noteStart);

        const bFilter = ctx.createBiquadFilter();
        bFilter.type = 'lowpass';
        bFilter.frequency.setValueAtTime(320, noteStart);

        const bGain = ctx.createGain();
        bGain.gain.setValueAtTime(0.001, noteStart);
        bGain.gain.linearRampToValueAtTime(0.32 * bn.velocity, noteStart + 0.03);
        bGain.gain.exponentialRampToValueAtTime(0.002, noteStart + noteDuration);

        bOsc.connect(bFilter);
        bFilter.connect(bGain);
        bGain.connect(bgmDryBus);

        bOsc.start(noteStart);
        bOsc.stop(noteStart + noteDuration + 0.05);
        this.scheduledVoices.push({ stop: () => { try { bOsc.stop(); } catch {} } });
      });

      // 4. Schedule Expressive Lead Melody Notes (Warm FM Bell / Rhodes Lead)
      track.melody.forEach((mn, idx) => {
        const noteStart = startTime + mn.timeOffset * beatSeconds;
        const noteDuration = mn.duration * beatSeconds;

        const mOsc = ctx.createOscillator();
        mOsc.type = 'triangle';
        mOsc.frequency.setValueAtTime(mn.freq, noteStart);

        // Harmonic overtone modulator for expressive bell/epiano attack
        const modOsc = ctx.createOscillator();
        modOsc.type = 'sine';
        modOsc.frequency.setValueAtTime(mn.freq * 2, noteStart);
        const modGain = ctx.createGain();
        modGain.gain.setValueAtTime(mn.freq * 0.45, noteStart);
        modGain.gain.exponentialRampToValueAtTime(1.0, noteStart + Math.min(0.35, noteDuration * 0.6));
        modOsc.connect(modGain);
        modGain.connect(mOsc.frequency);

        const mFilter = ctx.createBiquadFilter();
        mFilter.type = 'lowpass';
        mFilter.frequency.setValueAtTime(Math.min(2400, track.filterCutoff * 1.8), noteStart);

        const mPan = ctx.createStereoPanner();
        mPan.pan.setValueAtTime(idx % 2 === 0 ? -0.2 : 0.2, noteStart);

        const mGain = ctx.createGain();
        mGain.gain.setValueAtTime(0.001, noteStart);
        mGain.gain.linearRampToValueAtTime(0.22 * mn.velocity, noteStart + 0.02);
        mGain.gain.linearRampToValueAtTime(0.12 * mn.velocity, noteStart + noteDuration * 0.45);
        mGain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDuration);

        mOsc.connect(mFilter);
        mFilter.connect(mPan);
        mPan.connect(mGain);
        mGain.connect(bgmDryBus);
        mGain.connect(bgmConvolver);

        mOsc.start(noteStart);
        mOsc.stop(noteStart + noteDuration + 0.05);
        modOsc.start(noteStart);
        modOsc.stop(noteStart + noteDuration + 0.05);
        this.scheduledVoices.push({
          stop: () => {
            try {
              mOsc.stop();
              modOsc.stop();
            } catch {}
          }
        });
      });
    };

    // Initial loop cycle
    const now = ctx.currentTime + 0.05;
    scheduleLoopCycle(now);

    // Recurring interval to queue up subsequent cycles
    this.bgmIntervalId = window.setInterval(() => {
      if (this.isBgmPlaying && this.activeBgmTrack?.id === track.id && this.ctx) {
        scheduleLoopCycle(this.ctx.currentTime + 0.05);
      }
    }, loopLengthSeconds * 1000);
  }

  /**
   * Stops active background music.
   */
  public stopBgm(): void {
    this.isBgmPlaying = false;
    this.activeBgmTrack = null;
    if (this.bgmIntervalId !== null) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    this.scheduledVoices.forEach((v) => v.stop());
    this.scheduledVoices = [];
  }

  public getActiveBgm(): { isPlaying: boolean; track: MusicTrackSpec | null } {
    return {
      isPlaying: this.isBgmPlaying,
      track: this.activeBgmTrack
    };
  }

  /**
   * Starts the continuous background loop of 'hotel ambience'
   * (distant timber creaks, muffled footsteps, and faint whispering).
   * Generates dynamic acoustic variations with sub-bass room tone,
   * random creaking timber sweeps, filtered footsteps, and formant-filtered whispering.
   */
  public startHotelAmbienceLoop(options?: { intensity?: number; reason?: string }): void {
    try {
      const ctx = this.initContext();
      if (!this.ambienceGain) return;

      const intensity = Math.max(0.1, Math.min(1.0, options?.intensity ?? 0.65));
      const now = ctx.currentTime;

      // Smoothly fade in ambience bus
      const targetVol = Math.max(0.2, Math.min(0.85, 0.35 + intensity * 0.45));
      this.ambienceGain.gain.cancelScheduledValues(now);
      this.ambienceGain.gain.setValueAtTime(Math.max(0.0001, this.ambienceGain.gain.value), now);
      this.ambienceGain.gain.linearRampToValueAtTime(targetVol, now + 1.2);

      if (this.isAmbienceLoopActive && this.ambienceIntervalId !== null) {
        return; // Already running, volume updated
      }

      this.isAmbienceLoopActive = true;

      // 1. Continuous Sub-Bass Room Drone & Resonant Boiler Hum (48Hz)
      const droneOsc = ctx.createOscillator();
      droneOsc.type = 'sine';
      droneOsc.frequency.setValueAtTime(48.0, now);

      const subDrone = ctx.createOscillator();
      subDrone.type = 'triangle';
      subDrone.frequency.setValueAtTime(96.0, now);
      subDrone.detune.setValueAtTime(7, now);

      const droneFilter = ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(140, now);

      const droneGain = ctx.createGain();
      droneGain.gain.setValueAtTime(0.001, now);
      droneGain.gain.linearRampToValueAtTime(0.12 * intensity, now + 1.5);

      droneOsc.connect(droneFilter);
      subDrone.connect(droneFilter);
      droneFilter.connect(droneGain);
      droneGain.connect(this.ambienceGain);

      droneOsc.start(now);
      subDrone.start(now);
      this.ambienceVoices.push(
        { stop: () => { try { droneOsc.stop(); } catch {} } },
        { stop: () => { try { subDrone.stop(); } catch {} } }
      );

      // 2. Scheduler for procedural creaks, muffled footsteps, and faint whispering
      const triggerAtmosphericEvent = () => {
        if (!this.isAmbienceLoopActive || !this.ctx || !this.ambienceGain) return;
        const actx = this.ctx;
        const t = actx.currentTime;

        // Event A: Distant Timber Creak (wooden structure settling)
        if (Math.random() < 0.65) {
          const creakOsc = actx.createOscillator();
          creakOsc.type = 'sawtooth';
          const startPitch = 85 + Math.random() * 55;
          const endPitch = startPitch - (25 + Math.random() * 30);
          creakOsc.frequency.setValueAtTime(startPitch, t);
          creakOsc.frequency.exponentialRampToValueAtTime(Math.max(35, endPitch), t + 0.7);

          const creakFilter = actx.createBiquadFilter();
          creakFilter.type = 'bandpass';
          creakFilter.Q.setValueAtTime(4.2, t);
          creakFilter.frequency.setValueAtTime(320 + Math.random() * 260, t);

          const creakPanner = actx.createStereoPanner();
          creakPanner.pan.setValueAtTime((Math.random() * 2 - 1) * 0.75, t);

          const creakGain = actx.createGain();
          creakGain.gain.setValueAtTime(0.001, t);
          creakGain.gain.linearRampToValueAtTime(0.08 * intensity, t + 0.15);
          creakGain.gain.exponentialRampToValueAtTime(0.0008, t + 0.75);

          creakOsc.connect(creakFilter);
          creakFilter.connect(creakPanner);
          creakPanner.connect(creakGain);
          creakGain.connect(this.ambienceGain);

          creakOsc.start(t);
          creakOsc.stop(t + 0.8);
        }

        // Event B: Muffled Footstep pacing (low frequency thump from floor/ceiling)
        if (Math.random() < 0.7) {
          const stepDelay = Math.random() * 0.8;
          const stepTime = t + stepDelay;

          // Pair of footsteps (left then right heel)
          [0, 0.42 + Math.random() * 0.1].forEach((offset, idx) => {
            const sTime = stepTime + offset;
            const stepOsc = actx.createOscillator();
            stepOsc.type = 'sine';
            stepOsc.frequency.setValueAtTime(58 - idx * 4, sTime);
            stepOsc.frequency.exponentialRampToValueAtTime(36, sTime + 0.12);

            const stepFilter = actx.createBiquadFilter();
            stepFilter.type = 'lowpass';
            stepFilter.frequency.setValueAtTime(180, sTime);

            const stepPanner = actx.createStereoPanner();
            stepPanner.pan.setValueAtTime(idx === 0 ? -0.35 : 0.35, sTime);

            const stepGain = actx.createGain();
            stepGain.gain.setValueAtTime(0.001, sTime);
            stepGain.gain.linearRampToValueAtTime(0.14 * intensity, sTime + 0.02);
            stepGain.gain.exponentialRampToValueAtTime(0.001, sTime + 0.16);

            stepOsc.connect(stepFilter);
            stepFilter.connect(stepPanner);
            stepPanner.connect(stepGain);
            stepGain.connect(this.ambienceGain!);

            stepOsc.start(sTime);
            stepOsc.stop(sTime + 0.18);
          });
        }

        // Event C: Faint Whispering (formant-filtered breathing through walls)
        if (Math.random() < 0.8) {
          const whisperDur = 1.4 + Math.random() * 0.9;
          const noiseBuf = this.createShapedNoiseBuffer(actx, whisperDur, 'pink', 0.8);
          const noiseSrc = actx.createBufferSource();
          noiseSrc.buffer = noiseBuf;

          // Dual formant bandpasses mimicking human whisper sibilants ("shhh / esss")
          const f1 = actx.createBiquadFilter();
          f1.type = 'bandpass';
          f1.Q.setValueAtTime(5.0, t);
          f1.frequency.setValueAtTime(920 + (Math.random() * 2 - 1) * 80, t);

          const f2 = actx.createBiquadFilter();
          f2.type = 'bandpass';
          f2.Q.setValueAtTime(4.5, t);
          f2.frequency.setValueAtTime(2350 + (Math.random() * 2 - 1) * 150, t);

          // LFO tremolo modulation
          const whisperGain = actx.createGain();
          whisperGain.gain.setValueAtTime(0.001, t);
          whisperGain.gain.linearRampToValueAtTime(0.075 * intensity, t + whisperDur * 0.35);
          whisperGain.gain.exponentialRampToValueAtTime(0.001, t + whisperDur);

          const whisperPanner = actx.createStereoPanner();
          whisperPanner.pan.setValueAtTime((Math.random() * 2 - 1) * 0.55, t);

          noiseSrc.connect(f1);
          noiseSrc.connect(f2);
          f1.connect(whisperGain);
          f2.connect(whisperGain);
          whisperGain.connect(whisperPanner);
          whisperPanner.connect(this.ambienceGain);

          noiseSrc.start(t);
          noiseSrc.stop(t + whisperDur + 0.05);
        }
      };

      // Fire immediately and then repeat every 2.6s
      triggerAtmosphericEvent();
      this.ambienceIntervalId = window.setInterval(triggerAtmosphericEvent, 2600);
    } catch (err) {
      console.warn('AudioEngine startHotelAmbienceLoop error:', err);
    }
  }

  /**
   * Smoothly stops the hotel ambience loop with an exponential fade.
   */
  public stopHotelAmbienceLoop(fadeSec = 1.2): void {
    if (!this.isAmbienceLoopActive) return;
    this.isAmbienceLoopActive = false;

    if (this.ambienceIntervalId !== null) {
      clearInterval(this.ambienceIntervalId);
      this.ambienceIntervalId = null;
    }

    if (this.ambienceGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.ambienceGain.gain.cancelScheduledValues(now);
      this.ambienceGain.gain.setValueAtTime(Math.max(0.0001, this.ambienceGain.gain.value), now);
      this.ambienceGain.gain.linearRampToValueAtTime(0.0001, now + Math.max(0.2, fadeSec));
    }

    window.setTimeout(() => {
      if (!this.isAmbienceLoopActive) {
        this.ambienceVoices.forEach((v) => v.stop());
        this.ambienceVoices = [];
      }
    }, Math.max(200, fadeSec * 1000 + 50));
  }

  /**
   * Dynamically triggers or releases the hotel ambience loop when entering/leaving
   * a room with high-suspicion agents.
   */
  public triggerSuspicionAmbience(
    active: boolean,
    options?: { suspicionLevel?: number; roomLabel?: string; agentName?: string }
  ): void {
    this.suspicionTriggerState = {
      isActive: active,
      suspicionLevel: options?.suspicionLevel ?? 0,
      roomLabel: options?.roomLabel ?? '',
      agentName: options?.agentName ?? ''
    };

    if (active) {
      const intensity = (options?.suspicionLevel ?? 60) / 100;
      this.startHotelAmbienceLoop({
        intensity,
        reason: `suspicion_${options?.agentName || 'unknown'}`
      });
    } else {
      this.stopHotelAmbienceLoop(1.5);
    }
  }

  public getSuspicionAmbienceState(): {
    isActive: boolean;
    suspicionLevel: number;
    roomLabel: string;
    agentName: string;
  } {
    return { ...this.suspicionTriggerState };
  }

  public isHotelAmbiencePlaying(): boolean {
    return this.isAmbienceLoopActive;
  }


  /**
   * Offline renders a SoundEffectSpec to a 16-bit Stereo PCM WAV Blob with FM, shaped noise, state-variable filter, and stereo Schroeder reverb.
   */
  public exportSfxToWavBlob(spec: SoundEffectSpec): Blob {
    const sampleRate = 44100;
    const duration = Math.max(0.1, spec.durationSeconds);
    const tailSeconds = (spec.reverb ?? 0.25) > 0.05 ? 0.35 : 0.05;
    const totalSeconds = duration + tailSeconds;
    const numSamples = Math.floor(sampleRate * totalSeconds);
    const leftChannel = new Float32Array(numSamples);
    const rightChannel = new Float32Array(numSamples);

    const fmRatio = spec.fmRatio ?? 1.5;
    const fmDepth = spec.fmDepth ?? 0;
    const subMix = spec.subOscMix ?? 0.2;
    const noiseMix = spec.noiseMix ?? 0;
    const noiseColor: SfxNoiseColor = spec.noiseColor || 'pink';

    // Pink/Brown noise state
    let pinkB0 = 0, pinkB1 = 0, pinkB2 = 0;
    let brownLast = 0;
    // State-variable filter state
    let lpState = 0, bpState = 0;
    let phase = 0;
    let subPhase = 0;

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      if (t >= duration) break;
      const progress = t / duration;

      // Base frequency + pitchBend + FM operator
      let baseFreq = spec.baseFrequency + (spec.pitchBend || 0) * progress;
      baseFreq = Math.max(20, baseFreq);
      const fmMod = fmDepth > 0 ? Math.sin(2 * Math.PI * baseFreq * fmRatio * t) * fmDepth * (1 - progress * 0.7) : 0;
      const instFreq = Math.max(20, baseFreq + fmMod);

      phase += (2 * Math.PI * instFreq) / sampleRate;
      subPhase += (2 * Math.PI * (baseFreq * 0.5)) / sampleRate;

      let sample = 0;
      if (spec.oscillatorType === 'sine') {
        sample = Math.sin(phase);
      } else if (spec.oscillatorType === 'square') {
        sample = Math.sin(phase) >= 0 ? 0.8 : -0.8;
      } else if (spec.oscillatorType === 'sawtooth') {
        sample = 2 * ((phase / (2 * Math.PI)) % 1) - 1;
      } else {
        sample = (2 / Math.PI) * Math.asin(Math.sin(phase));
      }

      // Add Sub-oscillator body
      sample = sample * (1 - subMix * 0.5) + Math.sin(subPhase) * subMix;

      // Add Shaped Noise (White / Pink / Brown)
      if (noiseMix > 0.01) {
        const white = Math.random() * 2 - 1;
        let shapedNoise = white;
        if (noiseColor === 'pink') {
          pinkB0 = 0.997 * pinkB0 + white * 0.09;
          pinkB1 = 0.96 * pinkB1 + white * 0.22;
          pinkB2 = 0.65 * pinkB2 + white * 0.45;
          shapedNoise = (pinkB0 + pinkB1 + pinkB2) * 0.45;
        } else if (noiseColor === 'brown') {
          brownLast = (brownLast + 0.04 * white) / 1.04;
          shapedNoise = brownLast * 2.6;
        }
        sample = sample * (1 - noiseMix * 0.65) + shapedNoise * noiseMix;
      }

      // Chamberlin State-Variable Biquad Filter (Lowpass / Bandpass / Highpass)
      if (spec.filterCutoff) {
        const cutoff = Math.max(40, Math.min(12000, spec.filterCutoff * (1.2 - 0.4 * progress)));
        const f = Math.min(0.85, 2 * Math.sin((Math.PI * cutoff) / sampleRate));
        const q = Math.max(0.25, 1 / Math.max(0.5, spec.filterResonance || 1.5));
        lpState += f * bpState;
        const hpState = sample - lpState - q * bpState;
        bpState += f * hpState;
        if (spec.filterType === 'highpass') sample = hpState;
        else if (spec.filterType === 'bandpass') sample = bpState;
        else sample = lpState;
      }

      // Warm Tanh Saturation
      if (spec.distortion && spec.distortion > 0.02) {
        sample = Math.tanh(sample * (1 + spec.distortion * 3.5));
      }

      // ADSR Envelope
      let env = 0;
      if (t < spec.attack) {
        env = t / Math.max(0.001, spec.attack);
      } else if (t < spec.attack + spec.decay) {
        const decayProgress = (t - spec.attack) / Math.max(0.001, spec.decay);
        env = 1.0 - (1.0 - spec.sustain) * decayProgress;
      } else if (t < duration - spec.release) {
        env = spec.sustain;
      } else {
        const releaseProgress = (t - (duration - spec.release)) / Math.max(0.001, spec.release);
        env = Math.max(0, spec.sustain * (1.0 - releaseProgress));
      }

      const drySample = Math.max(-1, Math.min(1, sample * env));
      leftChannel[i] = drySample;
      rightChannel[i] = drySample;
    }

    // Apply Stereo Feedback Comb Reverb Tail
    const rev = Math.max(0, Math.min(0.9, spec.reverb ?? 0.25));
    if (rev > 0.03) {
      applyStereoReverbTail(leftChannel, rightChannel, sampleRate, rev);
    }

    return encodeStereoWav(leftChannel, rightChannel, sampleRate);
  }

  /**
   * Offline renders a MusicTrackSpec loop to a 16-bit Stereo PCM WAV Blob with full polyphonic chord voicings and stereo reverb.
   */
  public exportBgmToWavBlob(track: MusicTrackSpec): Blob {
    const sampleRate = 44100;
    const beatSeconds = 60 / Math.max(30, track.bpm);
    const loopDuration = beatSeconds * 8;
    const numSamples = Math.floor(sampleRate * loopDuration);
    const leftChannel = new Float32Array(numSamples);
    const rightChannel = new Float32Array(numSamples);

    const chords = track.chords && track.chords.length > 0 ? track.chords : ['Dm7', 'G7', 'Bbmaj7', 'A7'];
    const chordVoicings = chords.map((c) => resolveChordVoicingFrequencies(c));
    const chordDuration = loopDuration / chords.length;

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;

      // 1. Stereo Detuned Drone
      let sL = Math.sin(2 * Math.PI * (track.droneFreq * 0.998) * t) * 0.12;
      let sR = Math.sin(2 * Math.PI * (track.droneFreq * 1.002) * t) * 0.12;

      // 2. Polyphonic Chord Voicing Pad
      const chordIdx = Math.min(chordVoicings.length - 1, Math.floor(t / chordDuration));
      const localChordT = t - chordIdx * chordDuration;
      const chordEnv = Math.sin((localChordT / chordDuration) * Math.PI);
      const freqs = chordVoicings[chordIdx];
      for (let n = 0; n < freqs.length; n++) {
        const f = freqs[n];
        const voice = (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t)) * 0.055 * chordEnv;
        const pan = n / Math.max(1, freqs.length - 1); // 0 (left) to 1 (right)
        sL += voice * (1 - pan * 0.6);
        sR += voice * (0.4 + pan * 0.6);
      }

      // 3. Bass notes (centered)
      for (let b = 0; b < track.bass.length; b++) {
        const bn = track.bass[b];
        const nStart = bn.timeOffset * beatSeconds;
        const nDur = bn.duration * beatSeconds;
        if (t >= nStart && t < nStart + nDur) {
          const localT = t - nStart;
          const env = Math.sin((localT / nDur) * Math.PI);
          const bassSig = Math.sin(2 * Math.PI * bn.freq * localT) * 0.26 * bn.velocity * env;
          sL += bassSig;
          sR += bassSig;
        }
      }

      // 4. Expressive FM Melody notes
      for (let m = 0; m < track.melody.length; m++) {
        const mn = track.melody[m];
        const nStart = mn.timeOffset * beatSeconds;
        const nDur = mn.duration * beatSeconds;
        if (t >= nStart && t < nStart + nDur) {
          const localT = t - nStart;
          const env = Math.sin((localT / nDur) * Math.PI);
          const fmBell = Math.sin(2 * Math.PI * mn.freq * 2 * localT) * 0.35 * Math.exp(-localT * 4);
          const voice = Math.sin(2 * Math.PI * mn.freq * localT + fmBell) * 0.2 * mn.velocity * env;
          if (m % 2 === 0) {
            sL += voice * 1.15;
            sR += voice * 0.85;
          } else {
            sL += voice * 0.85;
            sR += voice * 1.15;
          }
        }
      }

      leftChannel[i] = Math.max(-1, Math.min(1, sL));
      rightChannel[i] = Math.max(-1, Math.min(1, sR));
    }

    applyStereoReverbTail(leftChannel, rightChannel, sampleRate, Math.max(0.1, Math.min(0.85, track.reverbAmount ?? 0.45)));
    return encodeStereoWav(leftChannel, rightChannel, sampleRate);
  }
}

/**
 * Applies a stereo Schroeder multi-tap feedback reverb network in-place.
 */
function applyStereoReverbTail(left: Float32Array, right: Float32Array, sampleRate: number, wetAmount: number): void {
  const delaySamplesL = Math.floor(sampleRate * 0.029);
  const delaySamplesR = Math.floor(sampleRate * 0.037);
  const feedback = Math.min(0.72, 0.35 + wetAmount * 0.38);
  const wet = wetAmount * 0.42;

  for (let i = delaySamplesR; i < left.length; i++) {
    const revL = left[i - delaySamplesL] + right[i - delaySamplesR] * 0.35;
    const revR = right[i - delaySamplesR] + left[i - delaySamplesL] * 0.35;
    left[i] = Math.max(-1, Math.min(1, left[i] + revL * wet));
    right[i] = Math.max(-1, Math.min(1, right[i] + revR * wet));
    left[i - delaySamplesL] *= feedback;
    right[i - delaySamplesR] *= feedback;
  }
}

/**
 * Encodes Float32 stereo samples into a RIFF 16-bit 2-channel PCM WAV container Blob.
 */
function encodeStereoWav(left: Float32Array, right: Float32Array, sampleRate: number): Blob {
  const numChannels = 2;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const numFrames = Math.min(left.length, right.length);
  const dataSize = numFrames * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // SubChunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleaved L/R 16-bit PCM sample data
  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    const sL = Math.max(-1, Math.min(1, left[i]));
    const sR = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(offset, sL < 0 ? sL * 0x8000 : sL * 0x7fff, true);
    view.setInt16(offset + 2, sR < 0 ? sR * 0x8000 : sR * 0x7fff, true);
    offset += 4;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export const audioEngine = new AudioEngineSingleton();
