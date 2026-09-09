// Web Audio API による野球サウンドエフェクトエンジン（外部ファイル不要・超軽量）
class SoundEffectManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
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

  // クリーンヒット音（カキィン！＋進塁音）
  playHit() {
    if (this.muted) return;
    this.init();
    const t = this.ctx.currentTime;

    // バットインパクト音（金属・木製混合の甲高い音）
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

    // 進塁チャイム（ソ - ド）
    [783.99, 1046.50].forEach((freq, idx) => {
      const st = t + 0.08 + idx * 0.08;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, st);
      gain.gain.setValueAtTime(0.2, st);
      gain.gain.linearRampToValueAtTime(0.01, st + 0.15);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(st);
      osc.stop(st + 0.15);
    });
  }

  // 特大ホームラン音（渾身の快音「カキィィン！」＋大歓声＋トランペットファンファーレ）
  playHomerun() {
    if (this.muted) return;
    this.init();
    const t = this.ctx.currentTime;

    // 1. 強烈なバット快音
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

    // 2. スタジアムの歓声（ホワイトノイズ＋バンドパスフィルタ）
    try {
      const bufferSize = this.ctx.sampleRate * 1.5;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, t);
      filter.Q.setValueAtTime(1.5, t);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.01, t);
      noiseGain.gain.linearRampToValueAtTime(0.2, t + 0.1);
      noiseGain.gain.linearRampToValueAtTime(0.01, t + 1.5);

      whiteNoise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      whiteNoise.start(t);
      whiteNoise.stop(t + 1.5);
    } catch (e) {
      // ノイズ生成失敗時はスキップ
    }

    // 3. 野球応援トランペット風ファンファーレ（ド-ミ-ソ-ド-ソ-ド！）
    const trumpetNotes = [
      { f: 523.25, d: 0.12, w: 0.0 }, // C5
      { f: 659.25, d: 0.12, w: 0.1 }, // E5
      { f: 783.99, d: 0.12, w: 0.2 }, // G5
      { f: 1046.50, d: 0.25, w: 0.32 }, // C6
      { f: 783.99, d: 0.12, w: 0.58 }, // G5
      { f: 1046.50, d: 0.5, w: 0.70 }  // C6 (長め)
    ];

    trumpetNotes.forEach(note => {
      const st = t + 0.15 + note.w;
      const tosc = this.ctx.createOscillator();
      const tgain = this.ctx.createGain();
      tosc.type = 'sawtooth';
      tosc.frequency.setValueAtTime(note.f, st);
      tgain.gain.setValueAtTime(0.22, st);
      tgain.gain.linearRampToValueAtTime(0.01, st + note.d);
      tosc.connect(tgain);
      tgain.connect(this.ctx.destination);
      tosc.start(st);
      tosc.stop(st + note.d);
    });
  }

  // 空振り・アウト音（スイング風切り音＋低音バズ）
  playStrike() {
    if (this.muted) return;
    this.init();
    const t = this.ctx.currentTime;

    // スイング風切り音
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

    // ブザー音
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

  // チャンス（フィーバー）突入音（勇壮なチャンスメドレーブラス）
  playFever() {
    if (this.muted) return;
    this.init();
    const t = this.ctx.currentTime;
    const notes = [
      { f: 587.33, w: 0.00 }, // D5
      { f: 587.33, w: 0.08 },
      { f: 587.33, w: 0.16 },
      { f: 783.99, w: 0.26 }, // G5
      { f: 880.00, w: 0.38 }, // A5
      { f: 987.77, w: 0.50 }, // B5
      { f: 1174.66, w: 0.65 } // D6
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
    const chord1 = [523.25, 659.25, 783.99]; // C
    const chord2 = [587.33, 739.99, 880.00]; // D
    const chord3 = [523.25, 659.25, 783.99, 1046.50]; // C High

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
}

const sounds = new SoundEffectManager();
