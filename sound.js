// Web Audio API による野球サウンドエフェクトエンジン
class SoundEffectManager {
  constructor() {
    this.ctx = null;
    this.muted = false;

    // 音声バッファ（外部mp3用）
    this.hitBuffer = null;
    this.homerunBuffer = null;

    // フォールバック用 Audio要素
    this.audioHit = null;
    this.audioHomerun = null;

    this.loadAudioFiles();
  }

  // assets/hit.mp3 と assets/homerun.mp3 をプリロード
  async loadAudioFiles() {
    try {
      this.audioHit = new Audio('assets/hit.mp3');
      this.audioHomerun = new Audio('assets/homerun.mp3');
    } catch (e) {
      console.warn("Audio element fallback init error:", e);
    }
  }

  async loadAudioBuffers() {
    if (!this.ctx) return;
    try {
      if (!this.hitBuffer) {
        const res = await fetch('assets/hit.mp3');
        const arrayBuf = await res.arrayBuffer();
        this.hitBuffer = await this.ctx.decodeAudioData(arrayBuf);
      }
    } catch (e) {
      console.warn("Could not load hit.mp3 buffer:", e);
    }

    try {
      if (!this.homerunBuffer) {
        const res = await fetch('assets/homerun.mp3');
        const arrayBuf = await res.arrayBuffer();
        this.homerunBuffer = await this.ctx.decodeAudioData(arrayBuf);
      }
    } catch (e) {
      console.warn("Could not load homerun.mp3 buffer:", e);
    }
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.loadAudioBuffers();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // ボタンタップ音（小気味よいミットのキャッチ音・クリック音）
  playClick() {
    if (this.muted) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.04);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.04);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(t + 0.04);
  }

  // 数字消去音
  playDeselect() {
    if (this.muted) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, t);
    osc.frequency.exponentialRampToValueAtTime(250, t + 0.06);
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.06);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(t + 0.06);
  }

  // クリーンヒット音（assets/hit.mp3 を再生）
  playHit() {
    if (this.muted) return;
    this.init();

    // 1. AudioBufferによる超低遅延・多重再生
    if (this.hitBuffer && this.ctx) {
      try {
        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        source.buffer = this.hitBuffer;
        gain.gain.setValueAtTime(0.85, this.ctx.currentTime);
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(0);
        return;
      } catch (e) {
        console.warn("Buffer play error:", e);
      }
    }

    // 2. HTML5 Audioによるフォールバック再生
    if (this.audioHit) {
      try {
        this.audioHit.currentTime = 0;
        this.audioHit.play();
        return;
      } catch (e) {}
    }

    // 3. Web Audio合成音フォールバック
    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1200, t);
    osc1.frequency.exponentialRampToValueAtTime(500, t + 0.08);
    gain1.gain.setValueAtTime(0.35, t);
    gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.12);
  }

  // 特大ホームラン音（assets/homerun.mp3 を再生）
  playHomerun() {
    if (this.muted) return;
    this.init();

    // 1. AudioBufferによる超低遅延・多重再生
    if (this.homerunBuffer && this.ctx) {
      try {
        const source = this.ctx.createBufferSource();
        const gain = this.ctx.createGain();
        source.buffer = this.homerunBuffer;
        gain.gain.setValueAtTime(0.9, this.ctx.currentTime);
        source.connect(gain);
        gain.connect(this.ctx.destination);
        source.start(0);
        return;
      } catch (e) {
        console.warn("Buffer play error:", e);
      }
    }

    // 2. HTML5 Audioによるフォールバック再生
    if (this.audioHomerun) {
      try {
        this.audioHomerun.currentTime = 0;
        this.audioHomerun.play();
        return;
      } catch (e) {}
    }

    // 3. Web Audio合成音フォールバック
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.15);
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  // 空振り・アウト音（スイング風切り音＋低音バズ）
  playStrike() {
    if (this.muted) return;
    this.init();
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(150, t + 0.18);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.18);

    const buzz = this.ctx.createOscillator();
    const buzzGain = this.ctx.createGain();
    buzz.type = 'sawtooth';
    buzz.frequency.setValueAtTime(140, t + 0.1);
    buzz.frequency.linearRampToValueAtTime(90, t + 0.35);
    buzzGain.gain.setValueAtTime(0.25, t + 0.1);
    buzzGain.gain.linearRampToValueAtTime(0.01, t + 0.35);
    buzz.connect(buzzGain);
    buzzGain.connect(this.ctx.destination);
    buzz.start(t + 0.1);
    buzz.stop(t + 0.35);
  }

  // チャンス（フィーバー）突入音
  playFever() {
    if (this.muted) return;
    this.init();
    const t = this.ctx.currentTime;
    const notes = [
      { f: 587.33, w: 0.00 },
      { f: 587.33, w: 0.08 },
      { f: 587.33, w: 0.16 },
      { f: 783.99, w: 0.26 },
      { f: 880.00, w: 0.38 },
      { f: 987.77, w: 0.50 },
      { f: 1174.66, w: 0.65 }
    ];

    notes.forEach(note => {
      const st = t + note.w;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note.f, st);
      gain.gain.setValueAtTime(0.24, st);
      gain.gain.linearRampToValueAtTime(0.01, st + 0.16);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(st);
      osc.stop(st + 0.16);
    });
  }

  // プレイボール笛
  playPlayBall() {
    if (this.muted) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1500, t);
    osc.frequency.linearRampToValueAtTime(1700, t + 0.08);
    osc.frequency.linearRampToValueAtTime(1400, t + 0.25);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.linearRampToValueAtTime(0.01, t + 0.3);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  // ゲームセット＆表彰式ファンファーレ
  playResult() {
    if (this.muted) return;
    this.init();
    const t = this.ctx.currentTime;
    const chord1 = [523.25, 659.25, 783.99];
    const chord2 = [587.33, 739.99, 880.00];
    const chord3 = [523.25, 659.25, 783.99, 1046.50];

    const playChord = (chord, st, dur) => {
      chord.forEach(f => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, st);
        gain.gain.setValueAtTime(0.18, st);
        gain.gain.linearRampToValueAtTime(0.01, st + dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(st);
        osc.stop(st + dur);
      });
    };

    playChord(chord1, t, 0.3);
    playChord(chord2, t + 0.32, 0.3);
    playChord(chord3, t + 0.65, 1.4);
  }

  // スイング風切り音
  playWhoosh() {
    if (this.muted) return;
    this.init();
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.14);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.linearRampToValueAtTime(0.01, t + 0.14);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.14);
    } catch(e) {}
  }

  // 投球リリース音
  playRelease() {
    if (this.muted) return;
    this.init();
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.09);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.linearRampToValueAtTime(0.01, t + 0.09);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
    } catch(e) {}
  }

  // キャッチャー捕球音
  playCatch() {
    if (this.muted) return;
    this.init();
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
      gain.gain.setValueAtTime(0.4, t);
      gain.gain.linearRampToValueAtTime(0.01, t + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    } catch(e) {}
  }

  // 花火爆発音
  playFirework() {
    if (this.muted) return;
    this.init();
    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.4);
      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    } catch(e) {}
  }

  // 大歓声
  playCheer() {
    if (this.muted) return;
    this.init();
    try {
      const bufferSize = this.ctx.sampleRate * 0.8;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 850;
      filter.Q.value = 1.2;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.8);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
    } catch(e) {}
  }
}

const sounds = new SoundEffectManager();
