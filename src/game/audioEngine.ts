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
  | 'custom';

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
  distortion?: number;
  reverb?: number;
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
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  // BGM state
  private activeBgmTrack: MusicTrackSpec | null = null;
  private isBgmPlaying = false;
  private bgmIntervalId: number | null = null;
  private scheduledVoices: Array<{ stop: () => void }> = [];

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

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.masterVol, this.ctx.currentTime);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this.sfxVol, this.ctx.currentTime);

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this.bgmVol, this.ctx.currentTime);

      this.sfxGain.connect(this.masterGain);
      this.bgmGain.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
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
   * Synthesizes and plays a SoundEffectSpec immediately via Web Audio API.
   */
  public playSoundEffect(spec: SoundEffectSpec): void {
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const duration = Math.max(0.05, spec.durationSeconds);

      // Main Oscillator
      const osc = ctx.createOscillator();
      osc.type = spec.oscillatorType;
      osc.frequency.setValueAtTime(spec.baseFrequency, now);
      if (spec.pitchBend) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(20, spec.baseFrequency + spec.pitchBend),
          now + duration
        );
      }

      // Gain Envelope (ADSR)
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.0001, now);
      const attackEnd = now + Math.max(0.002, spec.attack);
      gainNode.gain.linearRampToValueAtTime(1.0, attackEnd);
      const decayEnd = attackEnd + Math.max(0.01, spec.decay);
      gainNode.gain.linearRampToValueAtTime(Math.max(0.05, spec.sustain), decayEnd);
      const releaseStart = now + duration - Math.max(0.01, spec.release);
      if (releaseStart > decayEnd) {
        gainNode.gain.setValueAtTime(spec.sustain, releaseStart);
      }
      gainNode.gain.linearRampToValueAtTime(0.0001, now + duration);

      // Filter
      let lastNode: AudioNode = osc;
      if (spec.filterType && spec.filterCutoff) {
        const filter = ctx.createBiquadFilter();
        filter.type = spec.filterType;
        filter.frequency.setValueAtTime(spec.filterCutoff, now);
        if (spec.filterResonance) {
          filter.Q.setValueAtTime(spec.filterResonance, now);
        }
        lastNode.connect(filter);
        lastNode = filter;
      }

      lastNode.connect(gainNode);

      // Noise source if noiseMix > 0
      if (spec.noiseMix && spec.noiseMix > 0.02) {
        const bufferSize = ctx.sampleRate * duration;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = (Math.random() * 2 - 1) * spec.noiseMix;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(spec.noiseMix, now);
        noiseGain.gain.linearRampToValueAtTime(0.001, now + duration);

        whiteNoise.connect(noiseGain);
        if (this.sfxGain) {
          noiseGain.connect(this.sfxGain);
        }
        whiteNoise.start(now);
        whiteNoise.stop(now + duration);
      }

      if (this.sfxGain) {
        gainNode.connect(this.sfxGain);
      }

      osc.start(now);
      osc.stop(now + duration + 0.05);
    } catch (err) {
      console.warn('AudioEngine playSoundEffect error:', err);
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
   * Starts playing a looping background music track.
   */
  public playBgm(track: MusicTrackSpec): void {
    this.stopBgm();
    this.activeBgmTrack = track;
    this.isBgmPlaying = true;

    const ctx = this.initContext();
    const beatSeconds = 60 / Math.max(30, track.bpm);
    const loopLengthSeconds = beatSeconds * 8; // 8 beats per measure cycle

    const scheduleLoopCycle = (startTime: number) => {
      if (!this.isBgmPlaying || this.activeBgmTrack?.id !== track.id) return;

      // 1. Ambient Drone Pad
      const droneOsc = ctx.createOscillator();
      droneOsc.type = 'triangle';
      droneOsc.frequency.setValueAtTime(track.droneFreq, startTime);

      const droneGain = ctx.createGain();
      droneGain.gain.setValueAtTime(0.001, startTime);
      droneGain.gain.linearRampToValueAtTime(0.2, startTime + 1.0);
      droneGain.gain.setValueAtTime(0.2, startTime + loopLengthSeconds - 1.0);
      droneGain.gain.linearRampToValueAtTime(0.001, startTime + loopLengthSeconds);

      const droneFilter = ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.setValueAtTime(track.filterCutoff, startTime);

      droneOsc.connect(droneFilter);
      droneFilter.connect(droneGain);
      if (this.bgmGain) droneGain.connect(this.bgmGain);

      droneOsc.start(startTime);
      droneOsc.stop(startTime + loopLengthSeconds);
      this.scheduledVoices.push({ stop: () => { try { droneOsc.stop(); } catch {} } });

      // 2. Schedule Bass Notes
      track.bass.forEach((bn) => {
        const noteStart = startTime + bn.timeOffset * beatSeconds;
        const noteDuration = bn.duration * beatSeconds;

        const bOsc = ctx.createOscillator();
        bOsc.type = 'sine';
        bOsc.frequency.setValueAtTime(bn.freq, noteStart);

        const bGain = ctx.createGain();
        bGain.gain.setValueAtTime(0.001, noteStart);
        bGain.gain.linearRampToValueAtTime(0.35 * bn.velocity, noteStart + 0.04);
        bGain.gain.linearRampToValueAtTime(0.001, noteStart + noteDuration);

        bOsc.connect(bGain);
        if (this.bgmGain) bGain.connect(this.bgmGain);

        bOsc.start(noteStart);
        bOsc.stop(noteStart + noteDuration + 0.05);
        this.scheduledVoices.push({ stop: () => { try { bOsc.stop(); } catch {} } });
      });

      // 3. Schedule Melody Notes
      track.melody.forEach((mn) => {
        const noteStart = startTime + mn.timeOffset * beatSeconds;
        const noteDuration = mn.duration * beatSeconds;

        const mOsc = ctx.createOscillator();
        mOsc.type = 'sawtooth';
        mOsc.frequency.setValueAtTime(mn.freq, noteStart);

        const mFilter = ctx.createBiquadFilter();
        mFilter.type = 'lowpass';
        mFilter.frequency.setValueAtTime(Math.min(1800, track.filterCutoff * 1.5), noteStart);

        const mGain = ctx.createGain();
        mGain.gain.setValueAtTime(0.001, noteStart);
        mGain.gain.linearRampToValueAtTime(0.25 * mn.velocity, noteStart + 0.02);
        mGain.gain.linearRampToValueAtTime(0.15 * mn.velocity, noteStart + noteDuration * 0.5);
        mGain.gain.linearRampToValueAtTime(0.001, noteStart + noteDuration);

        mOsc.connect(mFilter);
        mFilter.connect(mGain);
        if (this.bgmGain) mGain.connect(this.bgmGain);

        mOsc.start(noteStart);
        mOsc.stop(noteStart + noteDuration + 0.05);
        this.scheduledVoices.push({ stop: () => { try { mOsc.stop(); } catch {} } });
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
   * Offline renders a SoundEffectSpec to a 16-bit PCM WAV Blob for download / export.
   */
  public exportSfxToWavBlob(spec: SoundEffectSpec): Blob {
    const sampleRate = 44100;
    const duration = Math.max(0.1, spec.durationSeconds);
    const numSamples = Math.floor(sampleRate * duration);
    const buffer = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const progress = t / duration;

      // Frequency calculation
      let freq = spec.baseFrequency;
      if (spec.pitchBend) {
        freq = spec.baseFrequency + spec.pitchBend * progress;
      }

      // Waveform
      let sample = 0;
      const phase = 2 * Math.PI * freq * t;
      if (spec.oscillatorType === 'sine') {
        sample = Math.sin(phase);
      } else if (spec.oscillatorType === 'square') {
        sample = Math.sin(phase) >= 0 ? 0.8 : -0.8;
      } else if (spec.oscillatorType === 'sawtooth') {
        sample = 2 * ((freq * t) % 1) - 1;
      } else if (spec.oscillatorType === 'triangle') {
        sample = 2 * Math.abs(2 * ((freq * t) % 1) - 1) - 1;
      }

      // Noise mix
      if (spec.noiseMix && spec.noiseMix > 0.02) {
        sample = sample * (1 - spec.noiseMix) + (Math.random() * 2 - 1) * spec.noiseMix;
      }

      // Distortion
      if (spec.distortion && spec.distortion > 0.05) {
        sample = Math.tanh(sample * (1 + spec.distortion * 3));
      }

      // Envelope
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
        env = spec.sustain * (1.0 - releaseProgress);
      }

      buffer[i] = Math.max(-1, Math.min(1, sample * env));
    }

    return encodeWav(buffer, sampleRate);
  }

  /**
   * Offline renders a MusicTrackSpec loop to a 16-bit PCM WAV Blob.
   */
  public exportBgmToWavBlob(track: MusicTrackSpec): Blob {
    const sampleRate = 44100;
    const beatSeconds = 60 / Math.max(30, track.bpm);
    const loopDuration = beatSeconds * 8;
    const numSamples = Math.floor(sampleRate * loopDuration);
    const buffer = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;

      // Drone
      let s = Math.sin(2 * Math.PI * track.droneFreq * t) * 0.18;

      // Bass notes
      track.bass.forEach((bn) => {
        const nStart = bn.timeOffset * beatSeconds;
        const nDur = bn.duration * beatSeconds;
        if (t >= nStart && t < nStart + nDur) {
          const localT = t - nStart;
          const env = Math.sin((localT / nDur) * Math.PI);
          s += Math.sin(2 * Math.PI * bn.freq * localT) * 0.3 * bn.velocity * env;
        }
      });

      // Melody notes
      track.melody.forEach((mn) => {
        const nStart = mn.timeOffset * beatSeconds;
        const nDur = mn.duration * beatSeconds;
        if (t >= nStart && t < nStart + nDur) {
          const localT = t - nStart;
          const env = Math.sin((localT / nDur) * Math.PI);
          // Soft triangle/sine blend
          const voice = Math.sin(2 * Math.PI * mn.freq * localT) * 0.22 * mn.velocity * env;
          s += voice;
        }
      });

      buffer[i] = Math.max(-1, Math.min(1, s));
    }

    return encodeWav(buffer, sampleRate);
  }
}

/**
 * Encodes Float32 mono samples into a RIFF 16-bit PCM WAV container Blob.
 */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
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

  // PCM sample data
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, int16, true);
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

export const audioEngine = new AudioEngineSingleton();
