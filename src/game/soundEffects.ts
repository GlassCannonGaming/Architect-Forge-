import {
  computeSynchronizedHingeFoleySpec,
  HingeSwingMode,
  SynchronizedHingeFoleySpec
} from './rules';

class SoundController {
  private ctx: AudioContext | null = null;
  public muted = true;
  public lastHingeFoleySpec: SynchronizedHingeFoleySpec | null = null;

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playFootstep() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const pitchVar = 0.92 + Math.random() * 0.16;
    osc.frequency.setValueAtTime(95 * pitchVar, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.06);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playPlaceAsset() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.09);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  /**
   * Proposal 1: Synchronized 500ms Creak / Stone-Scrape / Pocket-Rail Foley Envelope on Hinge Swing.
   * Sweeps resonant filter cutoff and pitch from 0ms to 460ms along the cubic ease-in-out swing curve,
   * and fires a crisp mechanical brass latch-click / stone-stop transient right at t = 480ms.
   */
  public playSecretPassageOpen(options?: {
    swingMode?: HingeSwingMode;
    isOpening?: boolean;
    isSecretPassage?: boolean;
    durationMs?: number;
  }): SynchronizedHingeFoleySpec {
    const spec = computeSynchronizedHingeFoleySpec(options);
    this.lastHingeFoleySpec = spec;
    const ctx = this.getContext();
    if (!ctx) return spec;
    const now = ctx.currentTime;

    // Stage 1 (0ms -> 460ms): Continuous hinge creak / stone-scrape / pocket-rail sweep
    const swingOsc = ctx.createOscillator();
    const swingFilter = ctx.createBiquadFilter();
    const swingGain = ctx.createGain();

    swingOsc.type = spec.oscillatorType;
    swingOsc.frequency.setValueAtTime(spec.sweepStartHz, now);
    swingOsc.frequency.linearRampToValueAtTime(
      (spec.sweepStartHz + spec.sweepEndHz) * 0.55,
      now + spec.swingPhaseEndSec * 0.5
    );
    swingOsc.frequency.linearRampToValueAtTime(spec.sweepEndHz, now + spec.swingPhaseEndSec);

    swingFilter.type = spec.filterType;
    swingFilter.Q.setValueAtTime(3.2, now);
    swingFilter.frequency.setValueAtTime(spec.filterStartCutoffHz, now);
    swingFilter.frequency.exponentialRampToValueAtTime(
      spec.filterPeakCutoffHz,
      now + spec.swingPhaseEndSec * 0.52
    );
    swingFilter.frequency.exponentialRampToValueAtTime(
      Math.max(120, spec.filterStartCutoffHz * 0.9),
      now + spec.swingPhaseEndSec
    );

    swingGain.gain.setValueAtTime(0.01, now);
    swingGain.gain.linearRampToValueAtTime(0.14, now + spec.swingPhaseEndSec * 0.45);
    swingGain.gain.exponentialRampToValueAtTime(0.002, now + spec.swingPhaseEndSec);

    swingOsc.connect(swingFilter);
    swingFilter.connect(swingGain);
    swingGain.connect(ctx.destination);
    swingOsc.start(now);
    swingOsc.stop(now + spec.swingPhaseEndSec + 0.01);

    // Stage 2 (t = 480ms): Crisp mechanical brass latch-click / stone-stop transient
    const clickStart = now + spec.latchClickTimeSec;
    const clickOsc = ctx.createOscillator();
    const clickGain = ctx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(spec.latchClickFreqHz, clickStart);
    clickOsc.frequency.exponentialRampToValueAtTime(
      Math.max(180, spec.latchClickFreqHz * 0.34),
      clickStart + spec.latchClickDurationSec
    );
    clickGain.gain.setValueAtTime(0.16, clickStart);
    clickGain.gain.exponentialRampToValueAtTime(0.001, clickStart + spec.latchClickDurationSec);

    clickOsc.connect(clickGain);
    clickGain.connect(ctx.destination);
    clickOsc.start(clickStart);
    clickOsc.stop(clickStart + spec.latchClickDurationSec + 0.005);

    return spec;
  }

  public playClueFound() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [440, 554.37, 659.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0.1, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.26);
    });
  }

  public playSanityDrop() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.35);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playVictory() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [392, 493.88, 587.33, 783.99].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0.12, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.36);
    });
  }

  public playDefeat() {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [220, 196, 164.81, 130.81].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.12, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.36);
    });
  }
}

export const soundFX = new SoundController();
