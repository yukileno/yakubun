/* ==========================================================================
   プロベースボール・スピリッツ：約分スラッガー (main.js)
   2〜20わる数ボタン式・教科書準拠リアルタイム約分エンジン
   ========================================================================== */

// 最大公約数（GCD）計算
function calcGcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}

// 教科書P.117（117.jpg）例題・練習問題＋発展問題データプール
// ※すべての問題において、どの約分ステップでも公約数が必ず 2〜20 の範囲内に存在することを保証
const PROBLEM_POOL = [
  // 教科書例題・まとめ・練習問題（117.jpg）
  { num: 15, den: 20 }, // 15/20 = 3/4 (÷5)
  { num: 18, den: 24 }, // 18/24 = 3/4 (÷6, または ÷2➔9/12➔÷3)
  { num: 2,  den: 6  }, // 2/6 = 1/3 (÷2)
  { num: 8,  den: 10 }, // 8/10 = 4/5 (÷2)
  { num: 16, den: 20 }, // 16/20 = 4/5 (÷4, または ÷2➔8/10➔÷2)
  { num: 9,  den: 27 }, // 9/27 = 1/3 (÷9, または ÷3➔3/9➔÷3)
  { num: 24, den: 36 }, // 24/36 = 2/3 (÷12, または ÷6, ÷4, ÷3, ÷2)
  { num: 40, den: 60 }, // 40/60 = 2/3 (÷20, または ÷10, ÷5, ÷4, ÷2)
  // 発展・公約数問題（小5算数・必ず2〜20で約分可能）
  { num: 4,  den: 8  }, // 1/2 (÷4 or ÷2)
  { num: 6,  den: 8  }, // 3/4 (÷2)
  { num: 6,  den: 9  }, // 2/3 (÷3)
  { num: 10, den: 12 }, // 5/6 (÷2)
  { num: 12, den: 15 }, // 4/5 (÷3)
  { num: 10, den: 20 }, // 1/2 (÷10 or ÷2, ÷5)
  { num: 14, den: 21 }, // 2/3 (÷7)
  { num: 15, den: 25 }, // 3/5 (÷5)
  { num: 12, den: 18 }, // 2/3 (÷6 or ÷2, ÷3)
  { num: 20, den: 25 }, // 4/5 (÷5)
  { num: 21, den: 28 }, // 3/4 (÷7)
  { num: 18, den: 30 }, // 3/5 (÷6 or ÷2, ÷3)
  { num: 25, den: 30 }, // 5/6 (÷5)
  { num: 30, den: 45 }, // 2/3 (÷15 or ÷3, ÷5)
  { num: 28, den: 42 }, // 2/3 (÷14 or ÷2, ÷7)
  { num: 32, den: 48 }, // 2/3 (÷16 or ÷8, ÷4, ÷2)
  { num: 36, den: 48 }, // 3/4 (÷12 or ÷6, ÷4, ÷3, ÷2)
  { num: 45, den: 60 }, // 3/4 (÷15 or ÷5, ÷3)
  { num: 25, den: 100 },// 1/4 (÷5➔5/20➔÷5)
  { num: 50, den: 100 } // 1/2 (÷10➔5/10➔÷5 or ÷2➔25/50➔÷5➔÷5)
];

// ゲームステート
const state = {
  screen: 'title', // 'title' | 'game' | 'result' | 'ranking' | 'howto'
  playerName: '',
  sessionToken: '',
  playing: false,
  timerId: null,
  timeLeft: 60,
  score: 0,
  combo: 0,
  maxCombo: 0,
  homeruns: 0,
  hits: 0,
  feverGauge: 0, // 0 ~ 100
  feverActive: false,
  feverTimer: null,
  bases: [false, false, false], // 1塁, 2塁, 3塁

  // 現在の問題
  currentProblem: null,
  origNum: 0,
  origDen: 0,
  currentNum: 0,
  currentDen: 0,
  stepCount: 0, // この問題で何回割ったか
  problemIndex: 0,
  problemQueue: [],

  // アニメーション中ロック
  isAnimating: false
};

// DOMキャッシュ
const dom = {
  screens: {
    title: document.getElementById('screen-title'),
    howto: document.getElementById('screen-howto'),
    game: document.getElementById('screen-game'),
    result: document.getElementById('screen-result'),
    ranking: document.getElementById('screen-ranking')
  },
  feverOverlay: document.getElementById('fever-overlay'),
  homerunCutin: document.getElementById('homerun-cutin'),
  cutinTitle: document.getElementById('cutin-title'),
  cutinPts: document.getElementById('cutin-pts'),
  confettiCanvas: document.getElementById('confetti-canvas'),

  // タイトル
  playerNameInput: document.getElementById('player-name'),
  btnStart: document.getElementById('btn-start'),
  btnTitleRanking: document.getElementById('btn-title-ranking'),
  btnHowto: document.getElementById('btn-how-to'),
  btnMute: document.getElementById('btn-mute'),

  // あそびかた
  btnHowtoClose: document.getElementById('btn-howto-close'),

  // ゲーム画面
  timeDisplay: document.getElementById('time-display'),
  timerBox: document.getElementById('timer-box'),
  scoreDisplay: document.getElementById('score-display'),
  comboDisplay: document.getElementById('combo-display'),
  feverProgress: document.getElementById('fever-progress'),
  inningText: document.getElementById('inning-text'),
  bases: [
    document.getElementById('base-1'),
    document.getElementById('base-2'),
    document.getElementById('base-3')
  ],
  announcerText: document.getElementById('announcer-text'),
  pitchSpeed: document.getElementById('pitch-speed'),
  yakubunBadge: document.getElementById('yakubun-badge'),
  fractionNotebook: document.getElementById('fraction-notebook'),
  displayNum: document.getElementById('display-num'),
  displayDen: document.getElementById('display-den'),
  stepHistory: document.getElementById('step-history'),
  stepHintBox: document.getElementById('step-hint-box'),
  stepHintText: document.getElementById('step-hint-text'),
  btnHint: document.getElementById('btn-hint'),

  // リザルト画面
  resPlayerName: document.getElementById('res-player-name'),
  resScore: document.getElementById('res-score'),
  resHomeruns: document.getElementById('res-homeruns'),
  resHits: document.getElementById('res-hits'),
  resMaxCombo: document.getElementById('res-max-combo'),
  resAwardTitle: document.getElementById('res-award-title'),
  resAwardDesc: document.getElementById('res-award-desc'),
  registerStatus: document.getElementById('register-status'),
  registerMsg: document.getElementById('register-msg'),
  btnRetry: document.getElementById('btn-retry'),
  btnResultRanking: document.getElementById('btn-result-ranking'),
  btnBackTitle: document.getElementById('btn-back-title'),

  // ランキングモーダル
  btnRankingClose: document.getElementById('btn-ranking-close'),
  rankingTbody: document.getElementById('ranking-tbody'),
  rankingLoading: document.getElementById('ranking-loading'),
  rankingOfflineAlert: document.getElementById('ranking-offline-alert'),
  myRankCard: document.getElementById('my-rank-card'),
  myRankBadge: document.getElementById('my-rank-badge'),
  myRankName: document.getElementById('my-rank-name'),
  myRankScore: document.getElementById('my-rank-score')
};

// ==========================================================================
// 画面切り替え
// ==========================================================================
function showScreen(screenName) {
  state.screen = screenName;
  Object.keys(dom.screens).forEach(key => {
    if (key === screenName) {
      dom.screens[key].classList.remove('hide');
      dom.screens[key].classList.add('active');
    } else {
      dom.screens[key].classList.remove('active');
      dom.screens[key].classList.add('hide');
    }
  });
}

function announce(text) {
  dom.announcerText.textContent = text;
}

function updateBases() {
  dom.bases.forEach((baseEl, idx) => {
    if (state.bases[idx]) {
      baseEl.classList.add('occupied');
    } else {
      baseEl.classList.remove('occupied');
    }
  });
}

// ==========================================================================
// ゲーム初期化・開始
// ==========================================================================
function startGame() {
  const inputName = dom.playerNameInput.value.trim();
  state.playerName = inputName || 'スラッガー';
  localStorage.setItem('yakubun_player_name', state.playerName);

  // セッショントークン取得
  api.getSessionToken().then(token => {
    state.sessionToken = token;
  });

  // 状態リセット
  state.playing = true;
  state.isAnimating = false;
  state.timeLeft = 60;
  state.score = 0;
  state.combo = 0;
  state.maxCombo = 0;
  state.homeruns = 0;
  state.hits = 0;
  state.feverGauge = 0;
  state.feverActive = false;
  state.bases = [false, false, false];
  updateBases();

  // 問題シャッフル
  shuffleProblems();

  // UI初期化
  dom.timeDisplay.textContent = state.timeLeft;
  dom.timerBox.classList.remove('timer-warning');
  dom.scoreDisplay.textContent = state.score;
  dom.comboDisplay.textContent = state.combo;
  dom.feverProgress.style.width = '0%';
  dom.feverOverlay.classList.remove('active');
  dom.stepHintBox.classList.add('hide');
  dom.homerunCutin.classList.add('hide');

  showScreen('game');
  sounds.playPlayBall();
  announce(`プレイボール！第1打席、${state.playerName}選手、2〜20で約分して打て！`);

  // 最初の問題を出題
  nextProblem();

  // タイマースタート
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = setInterval(onTick, 1000);
}

function shuffleProblems() {
  const list = [...PROBLEM_POOL];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  state.problemQueue = list;
  state.problemIndex = 0;
}

// 次の問題
function nextProblem() {
  if (state.problemIndex >= state.problemQueue.length) {
    shuffleProblems();
  }
  const prob = state.problemQueue[state.problemIndex++];
  state.currentProblem = prob;
  state.origNum = prob.num;
  state.origDen = prob.den;
  state.currentNum = prob.num;
  state.currentDen = prob.den;
  state.stepCount = 0;
  state.isAnimating = false;

  // 球速演出
  const speed = Math.floor(Math.random() * 18) + 138;
  dom.pitchSpeed.textContent = `${speed} km/h`;
  dom.yakubunBadge.textContent = "約分せよ！";
  dom.yakubunBadge.style.background = "var(--accent-red)";

  // ノート初期化
  dom.displayNum.textContent = prob.num;
  dom.displayDen.textContent = prob.den;
  dom.displayNum.classList.remove('slashed');
  dom.displayDen.classList.remove('slashed');
  dom.stepHistory.innerHTML = '';
  dom.stepHintBox.classList.add('hide');

  // ハイライト消去
  clearHighlights();
}

function clearHighlights() {
  document.querySelectorAll('.div-btn').forEach(btn => btn.classList.remove('btn-highlight'));
}

// ==========================================================================
// わる数ボタン（2〜20）タップ時の判定処理
// ==========================================================================
function handleDivisorClick(divisor) {
  // ⏱️ タイムアップ中・アニメーション中は100%遮断
  if (!state.playing || state.screen !== 'game' || state.timeLeft <= 0 || state.isAnimating) return;

  clearHighlights();

  const curN = state.currentNum;
  const curD = state.currentDen;

  // 割り切れるか判定
  const nDiv = (curN % divisor === 0);
  const dDiv = (curD % divisor === 0);

  if (nDiv && dDiv) {
    // 🌟 正解！約分成功
    handleCorrectDivisor(divisor, curN, curD);
  } else {
    // ❌ 不正解！空振り三振
    handleWrongDivisor(divisor, curN, curD, nDiv, dDiv);
  }
}

// 約分成功処理
function handleCorrectDivisor(divisor, curN, curD) {
  state.stepCount++;
  state.isAnimating = true;

  const newN = curN / divisor;
  const newD = curD / divisor;

  // 直前の数字に斜線アニメーションを適用
  const currentCard = dom.stepHistory.lastElementChild || document.getElementById('step-0');
  const numSpan = currentCard.querySelector('.fraction-num');
  const denSpan = currentCard.querySelector('.fraction-den');
  if (numSpan) numSpan.classList.add('slashed');
  if (denSpan) denSpan.classList.add('slashed');

  // 新しいステップ要素（矢印＋÷Kバッジ＋新しい分数）を構築
  const stepElem = document.createElement('div');
  stepElem.className = 'step-history-item';
  stepElem.style.display = 'flex';
  stepElem.style.alignItems = 'center';
  stepElem.style.gap = '8px';
  stepElem.innerHTML = `
    <div class="step-arrow-wrap">
      <span class="step-div-badge">÷ ${divisor}</span>
      <span class="step-arrow">➔</span>
    </div>
    <div class="step-card active-step">
      <div class="step-tag">${state.stepCount}回目</div>
      <div class="fraction-display">
        <div class="num-wrapper"><span class="fraction-num">${newN}</span></div>
        <div class="fraction-line"></div>
        <div class="den-wrapper"><span class="fraction-den">${newD}</span></div>
      </div>
    </div>
  `;
  dom.stepHistory.appendChild(stepElem);

  // 状態更新
  state.currentNum = newN;
  state.currentDen = newD;

  // これ以上約分できるか（既約分数判定）
  const gcdNext = calcGcd(newN, newD);
  const isComplete = (gcdNext === 1);

  if (isComplete) {
    // 🎉 約分完了！
    if (state.stepCount === 1) {
      // 🌟 パターンA：最初の一撃で既約分数（最大公約数・かず方式）➔ 特大ホームラン！
      triggerHomerun(divisor);
    } else {
      // ⚾ パターンB：段階的約分でホームイン（りこ方式）➔ タイムリーホームイン！
      triggerTimelyHomein(divisor);
    }
  } else {
    // ⚾ パターンC：まだ約分できる ➔ クリーンヒット＆進塁！
    triggerHit(divisor, newN, newD);
  }
}

// 特大ホームラン（一撃約分・最大公約数）
function triggerHomerun(divisor) {
  state.homeruns++;
  state.combo++;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;

  const mult = state.feverActive ? 2 : 1;
  const comboBonus = Math.min(state.combo * 20, 200);
  const runnerBonus = state.bases.filter(b => b).length * 100;
  const addedScore = (300 + comboBonus + runnerBonus) * mult;
  state.score += addedScore;

  // 走者一掃
  state.bases = [false, false, false];
  updateBases();

  // フィーバーゲージ加算
  addFever(25);

  dom.scoreDisplay.textContent = state.score;
  dom.comboDisplay.textContent = state.combo;
  dom.yakubunBadge.textContent = "約分完了！";
  dom.yakubunBadge.style.background = "var(--accent-green)";

  sounds.playHomerun();
  triggerConfetti();

  // カットイン
  dom.cutinTitle.textContent = "特大ホームラン！！";
  dom.cutinPts.textContent = addedScore;
  dom.homerunCutin.classList.remove('hide');
  announce(`🔥 カキィィン！！【÷${divisor}】一発ジャストミート！特大ホームラン！！ (+${addedScore}点)`);

  setTimeout(() => {
    if (state.playing) {
      dom.homerunCutin.classList.add('hide');
      nextProblem();
    }
  }, 1200);
}

// タイムリーホームイン（段階的約分完了）
function triggerTimelyHomein(divisor) {
  state.hits++;
  state.combo++;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;

  const mult = state.feverActive ? 2 : 1;
  const comboBonus = Math.min(state.combo * 15, 150);
  const runnerBonus = state.bases.filter(b => b).length * 80;
  const addedScore = (200 + comboBonus + runnerBonus) * mult;
  state.score += addedScore;

  // 走者ホームイン
  state.bases = [false, false, false];
  updateBases();

  addFever(20);

  dom.scoreDisplay.textContent = state.score;
  dom.comboDisplay.textContent = state.combo;
  dom.yakubunBadge.textContent = "約分完了！";
  dom.yakubunBadge.style.background = "var(--accent-green)";

  sounds.playHomerun();
  triggerConfetti();

  dom.cutinTitle.textContent = "タイムリー！ホームイン！";
  dom.cutinPts.textContent = addedScore;
  dom.homerunCutin.classList.remove('hide');
  announce(`🎊 見事な連打で約分完了！ホームイン！！ (+${addedScore}点)`);

  setTimeout(() => {
    if (state.playing) {
      dom.homerunCutin.classList.add('hide');
      nextProblem();
    }
  }, 1200);
}

// クリーンヒット（途中約分・まだ割れる）
function triggerHit(divisor, newN, newD) {
  state.hits++;
  state.combo++;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;

  const mult = state.feverActive ? 2 : 1;
  const addedScore = 100 * mult;
  state.score += addedScore;

  // 進塁
  if (state.bases[2]) {
    state.score += 60 * mult;
    state.bases[2] = false;
  }
  state.bases[2] = state.bases[1];
  state.bases[1] = state.bases[0];
  state.bases[0] = true;
  updateBases();

  addFever(15);

  dom.scoreDisplay.textContent = state.score;
  dom.comboDisplay.textContent = state.combo;

  sounds.playHit();

  dom.stepHintBox.classList.remove('hide');
  dom.stepHintText.textContent = `⚾ ナイスヒット！【${newN}/${newD}】まだ約分できるぞ！次は何で割る？`;
  announce(`ナイスヒット！【÷${divisor}】で約分成功！まだ割れます、次は何で割る？`);

  state.isAnimating = false;
}

// 不正解（空振り三振）
function handleWrongDivisor(divisor, curN, curD, nDiv, dDiv) {
  state.combo = 0;
  dom.comboDisplay.textContent = '0';

  sounds.playStrike();

  // 画面揺れ演出
  dom.screens.game.classList.add('shake');
  setTimeout(() => dom.screens.game.classList.remove('shake'), 400);

  // 親切なフィードバックアナウンス
  if (!nDiv && !dDiv) {
    announce(`⚡ 空振り三振！【${divisor}】では上（${curN}）も下（${curD}）も割り切れないぞ！`);
  } else if (!nDiv) {
    announce(`⚡ 空振り三振！【${divisor}】では上（分子 ${curN}）が割り切れないぞ！`);
  } else {
    announce(`⚡ 空振り三振！【${divisor}】では下（分母 ${curD}）が割り切れないぞ！`);
  }

  // ⏱️ 誤答ペナルティ（-3秒）
  state.timeLeft -= 3;

  // 【スキル絶対ルール】ペナルティにより timeLeft <= 0 になった瞬間、直ちに強制終了
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    dom.timeDisplay.textContent = '0';
    endGame();
    return;
  }

  dom.timeDisplay.textContent = state.timeLeft;
}

// ヒント機能
function handleHint() {
  if (!state.playing || state.screen !== 'game' || state.isAnimating) return;

  sounds.playClick();
  clearHighlights();

  const curN = state.currentNum;
  const curD = state.currentDen;

  // 2〜20の中で両方割り切れる公約数を探索
  const validDivisors = [];
  for (let k = 2; k <= 20; k++) {
    if (curN % k === 0 && curD % k === 0) {
      validDivisors.push(k);
    }
  }

  if (validDivisors.length > 0) {
    // 1つまたは複数を光らせる（最大公約数または最小公約数）
    const target = validDivisors[validDivisors.length - 1]; // 最大公約数を推薦
    const targetBtn = document.querySelector(`.div-btn[data-val="${target}"]`);
    if (targetBtn) {
      targetBtn.classList.add('btn-highlight');
      announce(`💡 ヒント！【÷${target}】を押すと大きく約分できるぞ！`);
      setTimeout(clearHighlights, 2200);
    }
  }
}

// フィーバー管理
function addFever(amount) {
  if (state.feverActive) return;

  state.feverGauge = Math.min(100, state.feverGauge + amount);
  dom.feverProgress.style.width = `${state.feverGauge}%`;

  if (state.feverGauge >= 100) {
    activateFever();
  }
}

function activateFever() {
  state.feverActive = true;
  sounds.playFever();
  dom.feverOverlay.classList.add('active');
  announce("⚡ 得点圏チャンス（フィーバー）突入！！ 全打席得点2倍！！");

  let feverRemain = 10;
  if (state.feverTimer) clearInterval(state.feverTimer);

  state.feverTimer = setInterval(() => {
    feverRemain--;
    state.feverGauge = (feverRemain / 10) * 100;
    dom.feverProgress.style.width = `${state.feverGauge}%`;

    if (feverRemain <= 0 || !state.playing) {
      clearInterval(state.feverTimer);
      state.feverActive = false;
      state.feverGauge = 0;
      dom.feverProgress.style.width = '0%';
      dom.feverOverlay.classList.remove('active');
    }
  }, 1000);
}

// ==========================================================================
// タイマー＆終了処理
// ==========================================================================
function onTick() {
  if (!state.playing) return;

  state.timeLeft--;

  // 【スキル絶対ルール】毎秒タイマーでも timeLeft <= 0 なら即座に endGame()
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    dom.timeDisplay.textContent = '0';
    endGame();
    return;
  }

  dom.timeDisplay.textContent = state.timeLeft;

  if (state.timeLeft <= 10) {
    dom.timerBox.classList.add('timer-warning');
  }
}

function endGame() {
  state.playing = false;
  state.isAnimating = false;

  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  if (state.feverTimer) {
    clearInterval(state.feverTimer);
    state.feverTimer = null;
  }

  // ポップアップ強制解除
  dom.homerunCutin.classList.add('hide');
  dom.stepHintBox.classList.add('hide');
  dom.feverOverlay.classList.remove('active');
  dom.timerBox.classList.remove('timer-warning');
  clearHighlights();

  showResult();
}

// ==========================================================================
// リザルト画面＆称号
// ==========================================================================
function showResult() {
  showScreen('result');
  sounds.playResult();

  dom.resPlayerName.textContent = `せんしゅめい：${state.playerName} 選手`;
  dom.resScore.textContent = state.score;
  dom.resHomeruns.textContent = state.homeruns;
  dom.resHits.textContent = state.hits;
  dom.resMaxCombo.textContent = state.maxCombo;

  const award = getAward(state.score);
  dom.resAwardTitle.textContent = award.title;
  dom.resAwardDesc.textContent = award.desc;

  sendScoreToGAS();
}

function getAward(score) {
  if (score >= 4500) {
    return {
      title: "👑 伝説の三冠王スラッガー（MVP）",
      desc: "公約数を瞬時に見抜く天才打者！あらゆる分数をスタンドへ叩き込む！"
    };
  } else if (score >= 3500) {
    return {
      title: "🌟 最強ホームランアーチスト",
      desc: "最大公約数で一撃粉砕！豪快な放物線を描く不動の主砲！"
    };
  } else if (score >= 2500) {
    return {
      title: "⚡ 頼れる主砲・クリーンナップ",
      desc: "チャンスで必ず約分を決める勝負強さ！打線を引っ張る大黒柱！"
    };
  } else if (score >= 1500) {
    return {
      title: "⚾ 巧打のクラッチヒッター",
      desc: "段階的約分も一発約分も自在に使いこなす技ありの職人打者！"
    };
  } else if (score >= 500) {
    return {
      title: "🌱 期待のドラフト1位ルーキー",
      desc: "2や3で着実に約分！これからの成長が楽しみな大型新人！"
    };
  } else {
    return {
      title: "🧢 熱血ファーム選手",
      desc: "偶数なら2で割るなど、基本を掴めば必ず一軍昇格できるぞ！"
    };
  }
}

// スコア送信
async function sendScoreToGAS() {
  dom.registerStatus.className = 'register-status-box';

  if (!api.isOnline()) {
    dom.registerStatus.classList.add('error');
    dom.registerMsg.textContent = '⚠️ オフラインのため登録できません（通信接続を確認してください）';
    return;
  }

  dom.registerMsg.textContent = '📡 統合スプレッドシートにスコアを記録中...';

  try {
    const res = await api.registerScore(state.playerName, state.score, state.sessionToken);
    dom.registerStatus.classList.add('success');
    dom.registerMsg.textContent = `✅ スプレッドシートに記録完了！ 全国第 ${res.rank || '-'} 位！`;
  } catch (err) {
    dom.registerStatus.classList.add('error');
    if (err.message === 'OFFLINE') {
      dom.registerMsg.textContent = '⚠️ オフラインのため登録できません';
    } else {
      dom.registerMsg.textContent = `⚠️ 登録できませんでした (${err.message})`;
    }
  }
}

// ランキング表示
async function openRankingModal() {
  showScreen('ranking');
  dom.rankingOfflineAlert.classList.add('hide');
  dom.rankingTbody.innerHTML = '';
  dom.rankingLoading.classList.remove('hide');
  dom.myRankCard.classList.add('hide');

  if (!api.isOnline()) {
    dom.rankingLoading.classList.add('hide');
    dom.rankingOfflineAlert.classList.remove('hide');
    return;
  }

  try {
    const list = await api.getRanking(state.playerName);
    dom.rankingLoading.classList.add('hide');

    if (!list || list.length === 0) {
      dom.rankingTbody.innerHTML = '<tr><td colspan="3">まだ記録がありません。一番乗りで記録しよう！</td></tr>';
      return;
    }

    let rowsHtml = '';
    list.slice(0, 10).forEach((item, index) => {
      const rank = index + 1;
      let topClass = '';
      if (rank === 1) topClass = 'top-1';
      else if (rank === 2) topClass = 'top-2';
      else if (rank === 3) topClass = 'top-3';

      const rankBadge = rank === 1 ? '🥇 1' : rank === 2 ? '🥈 2' : rank === 3 ? '🥉 3' : `${rank}`;
      rowsHtml += `
        <tr class="${topClass}">
          <td>${rankBadge}</td>
          <td>${escapeHtml(item.name)}</td>
          <td><strong>${item.score}</strong> PTS</td>
        </tr>
      `;
    });
    dom.rankingTbody.innerHTML = rowsHtml;

    if (list.myRank) {
      dom.myRankCard.classList.remove('hide');
      dom.myRankBadge.textContent = `あなた: 第 ${list.myRank.rank} 位`;
      dom.myRankName.textContent = escapeHtml(list.myRank.name);
      dom.myRankScore.textContent = `${list.myRank.score} PTS`;
    }
  } catch (err) {
    dom.rankingLoading.classList.add('hide');
    dom.rankingTbody.innerHTML = `<tr><td colspan="3">ランキングの取得に失敗しました (${err.message})</td></tr>`;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m];
  });
}

// 紙吹雪
function triggerConfetti() {
  const canvas = dom.confettiCanvas;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = [];
  const colors = ['#ffd23f', '#ff334b', '#00d2ff', '#2ecc71', '#ffffff'];

  for (let i = 0; i < 45; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.8) * 16,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      alpha: 1
    });
  }

  let frames = 0;
  function updateConfetti() {
    frames++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.4;
      p.rotation += p.rotSpeed;
      p.alpha -= 0.015;

      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      }
    });

    if (alive && frames < 70) {
      requestAnimationFrame(updateConfetti);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  requestAnimationFrame(updateConfetti);
}

// ==========================================================================
// イベントリスナー
// ==========================================================================
function initEvents() {
  dom.btnStart.addEventListener('click', () => {
    sounds.init();
    startGame();
  });

  dom.btnTitleRanking.addEventListener('click', () => {
    sounds.init();
    sounds.playClick();
    openRankingModal();
  });

  dom.btnHowto.addEventListener('click', () => {
    sounds.init();
    sounds.playClick();
    showScreen('howto');
  });

  dom.btnHowtoClose.addEventListener('click', () => {
    sounds.playClick();
    showScreen('title');
  });

  dom.btnMute.addEventListener('click', () => {
    const isMuted = sounds.toggleMute();
    dom.btnMute.textContent = isMuted ? '🔇' : '🔊';
  });

  // わる数ボタン（2〜20）
  document.querySelectorAll('.div-btn[data-val]').forEach(btn => {
    btn.addEventListener('click', () => {
      const val = parseInt(btn.getAttribute('data-val'), 10);
      handleDivisorClick(val);
    });
  });

  // ヒントボタン
  dom.btnHint.addEventListener('click', handleHint);

  // リザルトボタン
  dom.btnRetry.addEventListener('click', () => {
    sounds.playClick();
    startGame();
  });

  dom.btnResultRanking.addEventListener('click', () => {
    sounds.playClick();
    openRankingModal();
  });

  dom.btnBackTitle.addEventListener('click', () => {
    sounds.playClick();
    showScreen('title');
  });

  // ランキング閉じる
  dom.btnRankingClose.addEventListener('click', () => {
    sounds.playClick();
    if (state.timeLeft > 0 && state.playing) {
      showScreen('game');
    } else if (state.score > 0) {
      showScreen('result');
    } else {
      showScreen('title');
    }
  });

  // 保存された名前復元
  const savedName = localStorage.getItem('yakubun_player_name');
  if (savedName) {
    dom.playerNameInput.value = savedName;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initEvents();
  showScreen('title');
});
