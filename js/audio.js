// js/audio.js - Motor de Audio Sintetizado (Web Audio API)
// 100% nativo, sin dependencias de archivos de sonido externos.

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.isInitialized = false;

    // Nodos del motor
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this.skidGain = null;
    this.skidSource = null;
  }

  init() {
    if (this.isInitialized) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    this.ctx = new AudioContext();

    // Crear sintetizador de motor
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'triangle';
    this.engineOsc.frequency.setValueAtTime(35, this.ctx.currentTime);

    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(220, this.ctx.currentTime);

    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    this.engineOsc.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.engineOsc.start();

    // Crear buffer de derrape (ruido blanco filtrado)
    this.setupSkidSound();

    this.isInitialized = true;
  }

  setupSkidSound() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.skidSource = this.ctx.createBufferSource();
    this.skidSource.buffer = buffer;
    this.skidSource.loop = true;

    const skidFilter = this.ctx.createBiquadFilter();
    skidFilter.type = 'bandpass';
    skidFilter.frequency.setValueAtTime(800, this.ctx.currentTime);
    skidFilter.Q.setValueAtTime(3, this.ctx.currentTime);

    this.skidGain = this.ctx.createGain();
    this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.skidSource.connect(skidFilter);
    skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.ctx.destination);

    this.skidSource.start();
  }

  updateEngine(speed, isAccelerating, isDrifting) {
    if (!this.isInitialized || this.muted || !this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const absSpeed = Math.abs(speed);
    
    // Frecuencia del motor en función de la velocidad y aceleración
    const baseFreq = 40;
    const targetFreq = baseFreq + (absSpeed * 6.5) + (isAccelerating ? 25 : 0);
    this.engineOsc.frequency.setTargetAtTime(Math.min(targetFreq, 320), this.ctx.currentTime, 0.08);

    // Volumen del motor
    const targetGain = isAccelerating ? 0.12 : (absSpeed > 0.5 ? 0.05 : 0.02);
    this.engineGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);

    // Sonido de derrape (chillido de neumáticos)
    if (this.skidGain) {
      const skidVol = isDrifting && absSpeed > 3 ? Math.min((absSpeed / 15) * 0.15, 0.15) : 0;
      this.skidGain.gain.setTargetAtTime(skidVol, this.ctx.currentTime, 0.05);
    }
  }

  // Claxon estilo "Beep-Beep!"
  playHorn() {
    if (!this.isInitialized || this.muted || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(440, t); // La4
    osc2.frequency.setValueAtTime(554.37, t); // C#5

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.3);
    osc2.stop(t + 0.3);
  }

  // Sonido de campana/checkpoint ("Ding!")
  playCheckpoint() {
    if (!this.isInitialized || this.muted || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // Do, Mi, Sol, Do (arpegio mayor brillante)

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const noteTime = t + idx * 0.07;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.15, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteTime + 0.4);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.45);
    });
  }

  // Sonido de choque o impacto con objetos/bolos
  playImpact(intensity = 1.0) {
    if (!this.isInitialized || this.muted || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);

    const vol = Math.min(Math.max(intensity * 0.18, 0.03), 0.25);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.2);
  }

  // Sonido de Turbo / Boost pad
  playTurbo() {
    if (!this.isInitialized || this.muted || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(800, t + 0.35);

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.45);
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.engineGain && this.ctx) {
      if (this.muted) {
        this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
        if (this.skidGain) this.skidGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    }
    return this.muted;
  }
}

export const sound = new SoundEngine();
