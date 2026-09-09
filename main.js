/* ==========================================================================
   プロベースボール・スピリッツ：約分スラッガー (main.js)
   教科書（小5分数 P.117）完全準拠・野球対決約分ゲームエンジン
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

// 教科書P.117例題・練習問題＋発展問題データプール
const PROBLEM_POOL = [
  // 教科書例題・まとめ・練習問題（117.jpg）
  { num: 15, den: 20 }, // 15/20 = 3/4 (÷5)
  { num: 18, den: 24 }, // 18/24 = 3/4 (÷6 or ÷2➔9/12➔÷3)
  { num: 2,  den: 6  }, // 2/6 = 1/3 (÷2)
  { num: 8,  den: 10 }, // 8/10 = 4/5 (÷2)
  { num: 16, den: 20 }, // 16/20 = 4/5 (÷4 or ÷2➔8/10)
  { num: 9,  den: 27 }, // 9/27 = 1/3 (÷9 or ÷3➔3/9)
  { num: 24, den: 36 }, // 24/36 = 2/3 (÷12 or 段階的)
  { num: 40, den: 60 }, // 40/60 = 2/3 (÷20 or 段階的)
  // 発展・公約数問題
  { num: 4,  den: 8  }, // 1/2
  { num: 6,  den: 8  }, // 3/4
  { num: 6,  den: 9  }, // 2/3
  { num: 10, den: 12 }, // 5/6
  { num: 12, den: 15 }, // 4/5
  { num: 10, den: 20 }, // 1/2
  { num: 14, den: 21 }, // 2/3
  { num: 15, den: 25 }, // 3/5
  { num: 12, den: 18 }, // 2/3
  { num: 20, den: 25 }, // 4/5
  { num: 21, den: 28 }, // 3/4
  { num: 18, den: 30 }, // 3/5
  { num: 25, den: 30 }, // 5/6
  { num: 30, den: 45 }, // 2/3
  { num: 28, den: 42 }, // 2/3
  { num: 32, den: 48 }, // 2/3
  { num: 36, den: 48 }, // 3/4
  { num: 45, den: 60 }, // 3/4
  { num: 25, den: 100 },// 1/4
  { num: 50, den: 100 } // 1/2
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
  currentNum: 0,
  currentDen: 0,
  problemIndex: 0,
  problemQueue: [],

  // 入力状態
  activeSlot: 'num', // 'num' | 'den'
  inputNum: '',
  inputDen: ''
};

// DOM要素キャッシュ
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
  originNum: document.getElementById('origin-num'),
  originDen: document.getElementById('origin-den'),
  slotNum: document.getElementById('slot-num'),
  slotDen: document.getElementById('slot-den'),
  valNum: document.getElementById('val-num'),
  valDen: document.getElementById('val-den'),
  stepHintBox: document.getElementById('step-hint-box'),
  stepHintText: document.getElementById('step-hint-text'),
  yakubunStatusBadge: document.getElementById('yakubun-status-badge'),
  btnClear: document.getElementById('btn-clear'),
  btnSubmit: document.getElementById('btn-submit'),

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

// 実況アナウンス表示
function announce(text) {
  dom.announcerText.textContent = text;
}

// 塁状況の更新
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

  // 状態初期化
  state.playing = true;
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

  // 問題キューのシャッフル生成
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
  announce(`プレイボール！第1打席、${state.playerName}選手、約分して打て！`);

  // 最初の問題セット
  nextProblem();

  // タイマースタート
  if (state.timerId) clearInterval(state.timerId);
  state.timerId = setInterval(onTick, 1000);
}

// 問題のシャッフル
function shuffleProblems() {
  const list = [...PROBLEM_POOL];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  state.problemQueue = list;
  state.problemIndex = 0;
}

// 次の打席（新規問題）
function nextProblem() {
  if (state.problemIndex >= state.problemQueue.length) {
    shuffleProblems();
  }
  const prob = state.problemQueue[state.problemIndex++];
  state.currentProblem = prob;
  state.currentNum = prob.num;
  state.currentDen = prob.den;

  // 球速ランダム演出（138〜155 km/h）
  const speed = Math.floor(Math.random() * 18) + 138;
  dom.pitchSpeed.textContent = `${speed} km/h`;

  renderProblem();
  resetInputs();
}

// 問題の描画
function renderProblem() {
  dom.originNum.textContent = state.currentNum;
  dom.originDen.textContent = state.currentDen;
  dom.stepHintBox.classList.add('hide');

  // これ以上約分できるかチェック
  const g = calcGcd(state.currentNum, state.currentDen);
  if (g > 1) {
    dom.yakubunStatusBadge.textContent = "約分せよ！";
    dom.yakubunStatusBadge.style.background = "var(--accent-red)";
  } else {
    dom.yakubunStatusBadge.textContent = "約分完了！";
    dom.yakubunStatusBadge.style.background = "var(--accent-green)";
  }
}

// 入力スロットのリセット
function resetInputs() {
  state.inputNum = '';
  state.inputDen = '';
  dom.valNum.textContent = '?';
  dom.valDen.textContent = '?';
  setActiveSlot('num');
}

// アクティブスロットの切り替え
function setActiveSlot(slot) {
  state.activeSlot = slot;
  if (slot === 'num') {
    dom.slotNum.classList.add('active');
    dom.slotDen.classList.remove('active');
  } else {
    dom.slotDen.classList.add('active');
    dom.slotNum.classList.remove('active');
  }
}

// ==========================================================================
// 入力操作（テンキー＆キーボード対応）
// ==========================================================================
function handleNumInput(numStr) {
  if (!state.playing || state.screen !== 'game') return;

  sounds.playClick();
  if (state.activeSlot === 'num') {
    if (state.inputNum.length < 3) {
      state.inputNum += numStr;
      dom.valNum.textContent = state.inputNum;
    }
  } else {
    if (state.inputDen.length < 3) {
      state.inputDen += numStr;
      dom.valDen.textContent = state.inputDen;
    }
  }
}

function handleClear() {
  if (!state.playing || state.screen !== 'game') return;

  sounds.playDeselect();
  if (state.activeSlot === 'num') {
    if (state.inputNum.length > 0) {
      state.inputNum = state.inputNum.slice(0, -1);
      dom.valNum.textContent = state.inputNum || '?';
    }
  } else {
    if (state.inputDen.length > 0) {
      state.inputDen = state.inputDen.slice(0, -1);
      dom.valDen.textContent = state.inputDen || '?';
    } else {
      // 分母が空なら分子スロットへフォーカス移動
      setActiveSlot('num');
    }
  }
}

// ==========================================================================
// 判定ロジック（ホームラン・ヒット・空振り）
// ==========================================================================
function handleSubmit() {
  // ⏱️ タイムアップ後は100%遮断
  if (!state.playing || state.screen !== 'game' || state.timeLeft <= 0) return;

  const inN = parseInt(state.inputNum, 10);
  const inD = parseInt(state.inputDen, 10);

  if (isNaN(inN) || isNaN(inD) || inN <= 0 || inD <= 0) {
    sounds.playDeselect();
    announce("⚠️ 分子と分母のりょうほうに数字をいれてスイングしてね！");
    if (isNaN(inN)) setActiveSlot('num');
    else setActiveSlot('den');
    return;
  }

  const curN = state.currentNum;
  const curD = state.currentDen;

  // 等しい分数かチェック: inN / inD === curN / curD ➔ inN * curD === inD * curN
  const isEqual = (inN * curD === inD * curN);

  if (isEqual) {
    // 約分されているか（数字が小さくなっているか）
    if (inN >= curN || inD >= curD) {
      // 数字が同じまたは大きい
      sounds.playDeselect();
      announce("⚠️ 元の分数より小さい数字にして約分しよう！（ファウル）");
      resetInputs();
      return;
    }

    // 正しい約分！
    // 最大公約数（既約分数）か判定
    const gcdFinal = calcGcd(inN, inD);
    const isIrreducible = (gcdFinal === 1);

    if (isIrreducible) {
      // 🌟 パターンA：特大ホームラン！（既約分数まで一気に約分・かず方式）
      handleHomerun(inN, inD);
    } else {
      // ⚾ パターンB：クリーンヒット！（段階的約分・りこ方式）
      handleHit(inN, inD);
    }
  } else {
    // ❌ 不正解：空振り三振
    handleStrike(inN, inD);
  }
}

// 特大ホームラン（一発約分）
function handleHomerun(ansN, ansD) {
  state.homeruns++;
  state.combo++;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;

  // 得点計算（フィーバー時は2倍）
  const mult = state.feverActive ? 2 : 1;
  const comboBonus = Math.min(state.combo * 20, 200);

  // 走者ボーナス（満塁なら大幅加算）
  const runnersOnBase = state.bases.filter(b => b).length;
  const runnerBonus = runnersOnBase * 100;

  const addedScore = (300 + comboBonus + runnerBonus) * mult;
  state.score += addedScore;

  // 走者全員生還
  state.bases = [false, false, false];
  updateBases();

  // フィーバーゲージ加算
  addFever(25);

  // UI更新
  dom.scoreDisplay.textContent = state.score;
  dom.comboDisplay.textContent = state.combo;

  // サウンド＆演出
  sounds.playHomerun();
  triggerConfetti();

  // ホームランカットインモーダル
  dom.cutinPts.textContent = addedScore;
  dom.homerunCutin.classList.remove('hide');
  announce(`🔥 カキィィン！！ジャストミート！特大ホームラン！！ (+${addedScore}点)`);

  setTimeout(() => {
    if (state.playing) {
      dom.homerunCutin.classList.add('hide');
      nextProblem();
    }
  }, 1100);
}

// クリーンヒット（段階的約分・りこ方式）
function handleHit(ansN, ansD) {
  state.hits++;
  state.combo++;
  if (state.combo > state.maxCombo) state.maxCombo = state.combo;

  const mult = state.feverActive ? 2 : 1;
  const addedScore = 150 * mult;
  state.score += addedScore;

  // 進塁処理（ランナーを1つ進める）
  if (state.bases[2]) {
    // 3塁ランナー生還ボーナス
    state.score += 80 * mult;
    state.bases[2] = false;
  }
  state.bases[2] = state.bases[1];
  state.bases[1] = state.bases[0];
  state.bases[0] = true; // 打者出塁
  updateBases();

  // フィーバーゲージ加算
  addFever(15);

  // UI更新
  dom.scoreDisplay.textContent = state.score;
  dom.comboDisplay.textContent = state.combo;

  sounds.playHit();

  // 問題を約分された分数に更新して継続！
  state.currentNum = ansN;
  state.currentDen = ansD;
  renderProblem();
  resetInputs();

  // ナビゲーション表示
  dom.stepHintBox.classList.remove('hide');
  dom.stepHintText.textContent = `⚾ ナイスヒット！【${ansN}/${ansD}】まだ約分できるぞ！二塁へ走れ！`;
  announce(`見事な約分ヒット！まだ約分できます！さらに小さくしてホームインを目指せ！`);
}

// 空振り三振（誤答）
function handleStrike(inN, inD) {
  state.combo = 0;
  dom.comboDisplay.textContent = '0';

  sounds.playStrike();
  announce(`⚡ 空振り三振！【${inN}/${inD}】は等しい分数ではありません！`);

  // 画面揺れ演出
  dom.screens.game.classList.add('shake');
  setTimeout(() => dom.screens.game.classList.remove('shake'), 400);

  // ⏱️ 誤答ペナルティ（-3秒）
  state.timeLeft -= 3;

  // 【スキル絶対ルール】誤答ペナルティにより timeLeft <= 0 になった瞬間、直ちに強制終了
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    dom.timeDisplay.textContent = '0';
    endGame();
    return;
  }

  dom.timeDisplay.textContent = state.timeLeft;
  resetInputs();
}

// フィーバー（得点圏チャンス）管理
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

  let feverRemain = 10; // 10秒間フィーバー
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
// タイマーティックと強制終了
// ==========================================================================
function onTick() {
  if (!state.playing) return;

  state.timeLeft--;

  // 【スキル絶対ルール】毎秒タイマーでも timeLeft <= 0 なら必ず即座に endGame()
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    dom.timeDisplay.textContent = '0';
    endGame();
    return;
  }

  dom.timeDisplay.textContent = state.timeLeft;

  // 残り10秒未満で警告アニメーション
  if (state.timeLeft <= 10) {
    dom.timerBox.classList.add('timer-warning');
  }
}

// ゲーム終了処理
function endGame() {
  state.playing = false;
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  if (state.feverTimer) {
    clearInterval(state.feverTimer);
    state.feverTimer = null;
  }

  // ポップアップ・警告クラスの確実な解除
  dom.homerunCutin.classList.add('hide');
  dom.stepHintBox.classList.add('hide');
  dom.feverOverlay.classList.remove('active');
  dom.timerBox.classList.remove('timer-warning');

  // リザルト画面へ遷移
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

  // 称号判定
  const award = getAward(state.score);
  dom.resAwardTitle.textContent = award.title;
  dom.resAwardDesc.textContent = award.desc;

  // スプレッドシートランキングへ送信
  sendScoreToGAS();
}

function getAward(score) {
  if (score >= 4500) {
    return {
      title: "👑 伝説の三冠王スラッガー（MVP）",
      desc: "約分の真髄を極めた球界の至宝！すべての球をスタンドへ運ぶ天才打者！"
    };
  } else if (score >= 3500) {
    return {
      title: "🌟 最強ホームランアーチスト",
      desc: "最大公約数を瞬時に見抜く驚異の選球眼！特大アーチを量産！"
    };
  } else if (score >= 2500) {
    return {
      title: "⚡ 頼れる主砲・クリーンナップ",
      desc: "チャンスで必ず約分を決める勝負強さ！チームを勝利に導く大黒柱！"
    };
  } else if (score >= 1500) {
    return {
      title: "⚾ 巧打のクラッチヒッター",
      desc: "段階的約分も一発約分も自在に使いこなす技ありの巧打者！"
    };
  } else if (score >= 500) {
    return {
      title: "🌱 期待のドラフト1位ルーキー",
      desc: "約分の基本をしっかりマスター！これからの大活躍が楽しみな逸材！"
    };
  } else {
    return {
      title: "🧢 熱血ファーム選手",
      desc: "もう一歩で一軍昇格！公約数を見つけて特大ホームランを狙おう！"
    };
  }
}

// スコア登録
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

// ==========================================================================
// ランキングモーダル表示
// ==========================================================================
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

// ==========================================================================
// 紙吹雪アニメーション
// ==========================================================================
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
      p.vy += 0.4; // 重力
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
// イベントリスナー登録
// ==========================================================================
function initEvents() {
  // タイトル画面
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

  // スロット切り替え
  dom.slotNum.addEventListener('click', () => {
    sounds.playClick();
    setActiveSlot('num');
  });

  dom.slotDen.addEventListener('click', () => {
    sounds.playClick();
    setActiveSlot('den');
  });

  // テンキー
  document.querySelectorAll('.num-key').forEach(btn => {
    btn.addEventListener('click', () => {
      const n = btn.getAttribute('data-num');
      handleNumInput(n);
    });
  });

  dom.btnClear.addEventListener('click', handleClear);
  dom.btnSubmit.addEventListener('click', handleSubmit);

  // リザルト画面
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

  // ランキング画面
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

  // PCキーボード入力対応
  window.addEventListener('keydown', e => {
    if (state.screen !== 'game' || !state.playing) return;

    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      handleNumInput(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      handleClear();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSlot('num');
    } else if (e.key === 'ArrowDown' || e.key === 'Tab') {
      e.preventDefault();
      setActiveSlot('den');
    }
  });

  // 保存された選手名の復元
  const savedName = localStorage.getItem('yakubun_player_name');
  if (savedName) {
    dom.playerNameInput.value = savedName;
  }
}

// 起動
window.addEventListener('DOMContentLoaded', () => {
  initEvents();
  showScreen('title');
});
