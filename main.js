/* ==========================================================================
   プロベースボール・スピリッツ：約分スラッガー育成ロード (main.js)
   全10打席・3ストライク制・ホームラン選手育成＆連打防止エンジン
   ========================================================================== */

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

// 教科書P.117例題・練習問題＋発展問題データプール（必ず2〜20で約分可能）
const PROBLEM_POOL = [
  { num: 15, den: 20 }, // 15/20 = 3/4 (÷5)
  { num: 18, den: 24 }, // 18/24 = 3/4 (÷6, または ÷2➔9/12➔÷3)
  { num: 2,  den: 6  }, // 2/6 = 1/3 (÷2)
  { num: 8,  den: 10 }, // 8/10 = 4/5 (÷2)
  { num: 16, den: 20 }, // 16/20 = 4/5 (÷4, または ÷2➔8/10➔÷2)
  { num: 9,  den: 27 }, // 9/27 = 1/3 (÷9, または ÷3➔3/9➔÷3)
  { num: 24, den: 36 }, // 24/36 = 2/3 (÷12, または ÷6, ÷4, ÷3, ÷2)
  { num: 40, den: 60 }, // 40/60 = 2/3 (÷20, または ÷10, ÷5, ÷4, ÷2)
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
  screen: 'title',
  playerName: '',
  sessionToken: '',
  playing: false,
  isLocked: false, // 連打防止・アニメーション中ロック

  // 打席制（全10打席）
  currentBat: 1,
  totalBats: 10,
  strikes: 0, // 0〜3（3で三振アウト）
  bases: [false, false, false], // 1塁, 2塁, 3塁

  // 選手育成パラメータ
  meet: 40,        // ミート (0〜99)
  power: 40,       // パワー (0〜99)
  trajectory: 1,   // 弾道 (1〜4)
  homeruns: 0,     // 本塁打数
  hits: 0,         // 安打数
  strikeouts: 0,   // 三振数
  consecutiveHits: 0,
  abilities: new Set(), // 特殊能力セット

  // 現在の問題
  currentProblem: null,
  currentNum: 0,
  currentDen: 0,
  stepCount: 0,
  problemIndex: 0,
  problemQueue: []
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
  cutinStatUp: document.getElementById('cutin-stat-up'),
  confettiCanvas: document.getElementById('confetti-canvas'),

  // タイトル
  playerNameInput: document.getElementById('player-name'),
  btnStart: document.getElementById('btn-start'),
  btnTitleRanking: document.getElementById('btn-title-ranking'),
  btnHowto: document.getElementById('btn-how-to'),
  btnMute: document.getElementById('btn-mute'),
  btnHowtoClose: document.getElementById('btn-howto-close'),

  // ゲーム画面HUD
  currentBat: document.getElementById('current-bat'),
  strikeDots: [
    document.getElementById('strike-1'),
    document.getElementById('strike-2')
  ],
  bases: [
    document.getElementById('base-1'),
    document.getElementById('base-2'),
    document.getElementById('base-3')
  ],
  hudPlayerRank: document.getElementById('hud-player-rank'),
  hudTrajectory: document.getElementById('hud-trajectory'),
  hudMeet: document.getElementById('hud-meet'),
  hudPower: document.getElementById('hud-power'),
  hudHr: document.getElementById('hud-hr'),
  announcerText: document.getElementById('announcer-text'),

  // 打席ノート
  pitchSpeed: document.getElementById('pitch-speed'),
  yakubunBadge: document.getElementById('yakubun-badge'),
  fractionNotebook: document.getElementById('fraction-notebook'),
  displayNum: document.getElementById('display-num'),
  displayDen: document.getElementById('display-den'),
  stepHistory: document.getElementById('step-history'),
  stepHintBox: document.getElementById('step-hint-box'),
  stepHintText: document.getElementById('step-hint-text'),
  divisorGrid: document.getElementById('divisor-grid'),

  // リザルト画面
  resPlayerName: document.getElementById('res-player-name'),
  resFinalRank: document.getElementById('res-final-rank'),
  resTrajectory: document.getElementById('res-trajectory'),
  resTrajectoryName: document.getElementById('res-trajectory-name'),
  resMeetGrade: document.getElementById('res-meet-grade'),
  resMeetNum: document.getElementById('res-meet-num'),
  resPowerGrade: document.getElementById('res-power-grade'),
  resPowerNum: document.getElementById('res-power-num'),
  resAvg: document.getElementById('res-avg'),
  resHrCount: document.getElementById('res-hr-count'),
  resHitCount: document.getElementById('res-hit-count'),
  resSoCount: document.getElementById('res-so-count'),
  resSpecialSkills: document.getElementById('res-special-skills'),
  resEvalScore: document.getElementById('res-eval-score'),
  registerStatus: document.getElementById('register-status'),
  registerMsg: document.getElementById('register-msg'),
  btnRetry: document.getElementById('btn-retry'),
  btnResultRanking: document.getElementById('btn-result-ranking'),
  btnBackTitle: document.getElementById('btn-back-title'),

  // ランキング画面
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

// 走者表示
function updateBases() {
  dom.bases.forEach((baseEl, idx) => {
    if (state.bases[idx]) {
      baseEl.classList.add('occupied');
    } else {
      baseEl.classList.remove('occupied');
    }
  });
}

// ストライクランプ更新
function updateStrikeLamps() {
  dom.strikeDots[0].classList.toggle('active', state.strikes >= 1);
  dom.strikeDots[1].classList.toggle('active', state.strikes >= 2);
}

// パラメータグレード変換 (S/A/B/C/D/E/F/G)
function getGrade(val) {
  if (val >= 90) return 'S';
  if (val >= 80) return 'A';
  if (val >= 70) return 'B';
  if (val >= 60) return 'C';
  if (val >= 50) return 'D';
  if (val >= 40) return 'E';
  if (val >= 30) return 'F';
  return 'G';
}

// 弾道名
function getTrajectoryName(val) {
  if (val >= 4) return 'アーチスト';
  if (val === 3) return '高弾道';
  if (val === 2) return '中弾道';
  return 'グラウンダー';
}

// 総合ランク計算 (S/A/B/C/D)
function calcOverallRank() {
  const avg = (state.meet + state.power) / 2;
  if (avg >= 85 && state.homeruns >= 4) return 'S';
  if (avg >= 75) return 'A';
  if (avg >= 65) return 'B';
  if (avg >= 50) return 'C';
  return 'D';
}

// HUD表示更新
function updateHud() {
  dom.currentBat.textContent = state.currentBat;
  updateStrikeLamps();
  updateBases();

  const rank = calcOverallRank();
  dom.hudPlayerRank.textContent = rank;
  dom.hudPlayerRank.className = `player-rank-badge rank-${rank.toLowerCase()}`;

  dom.hudTrajectory.textContent = state.trajectory;
  dom.hudMeet.textContent = `${getGrade(state.meet)} ${Math.min(state.meet, 99)}`;
  dom.hudPower.textContent = `${getGrade(state.power)} ${Math.min(state.power, 99)}`;
  dom.hudHr.textContent = `${state.homeruns}本`;
}

// ==========================================================================
// ゲーム初期化・開始
// ==========================================================================
function startGame() {
  const inputName = dom.playerNameInput.value.trim();
  state.playerName = inputName || 'スラッガー';
  localStorage.setItem('yakubun_player_name', state.playerName);

  api.getSessionToken().then(token => {
    state.sessionToken = token;
  });

  // 育成状態初期化
  state.playing = true;
  state.isLocked = false;
  state.currentBat = 1;
  state.strikes = 0;
  state.bases = [false, false, false];

  state.meet = 40;
  state.power = 40;
  state.trajectory = 1;
  state.homeruns = 0;
  state.hits = 0;
  state.strikeouts = 0;
  state.consecutiveHits = 0;
  state.abilities = new Set(['期待の新人']);

  shuffleProblems();

  dom.homerunCutin.classList.add('hide');
  dom.stepHintBox.classList.add('hide');
  dom.divisorGrid.classList.remove('locked');

  showScreen('game');
  sounds.playPlayBall();
  updateHud();
  announce(`プレイボール！第1打席、${state.playerName}選手の育成開始！`);

  setupProblem();
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

// 打席の問題セット
function setupProblem() {
  if (state.problemIndex >= state.problemQueue.length) {
    shuffleProblems();
  }
  const prob = state.problemQueue[state.problemIndex++];
  state.currentProblem = prob;
  state.currentNum = prob.num;
  state.currentDen = prob.den;
  state.stepCount = 0;
  state.strikes = 0;
  state.isLocked = false;

  const speed = Math.floor(Math.random() * 18) + 138;
  dom.pitchSpeed.textContent = `${speed} km/h`;
  dom.yakubunBadge.textContent = "約分せよ！";
  dom.yakubunBadge.style.background = "var(--accent-red)";

  dom.displayNum.textContent = prob.num;
  dom.displayDen.textContent = prob.den;
  dom.displayNum.classList.remove('slashed');
  dom.displayDen.classList.remove('slashed');
  dom.stepHistory.innerHTML = '';
  dom.stepHintBox.classList.add('hide');
  dom.divisorGrid.classList.remove('locked');

  updateHud();
}

// ==========================================================================
// わる数ボタン（2〜20）タップ時の判定処理（連打完全防止付き）
// ==========================================================================
function handleDivisorClick(divisor) {
  // ⏱️ ロック中（空振りクールタイムまたはアニメーション中）は100%無効化！
  if (!state.playing || state.screen !== 'game' || state.isLocked) return;

  const curN = state.currentNum;
  const curD = state.currentDen;

  const nDiv = (curN % divisor === 0);
  const dDiv = (curD % divisor === 0);

  if (nDiv && dDiv) {
    // 🌟 正解！約分成功
    handleCorrectDivisor(divisor, curN, curD);
  } else {
    // ❌ 不正解！空振り（ストライク）
    handleWrongDivisor(divisor, curN, curD, nDiv, dDiv);
  }
}

// 約分成功
function handleCorrectDivisor(divisor, curN, curD) {
  state.stepCount++;
  state.isLocked = true; // 多重タップ防止ロック

  const newN = curN / divisor;
  const newD = curD / divisor;

  // 直前の数字に斜線アニメーション
  const currentCard = dom.stepHistory.lastElementChild || document.getElementById('step-0');
  const numSpan = currentCard.querySelector('.fraction-num');
  const denSpan = currentCard.querySelector('.fraction-den');
  if (numSpan) numSpan.classList.add('slashed');
  if (denSpan) denSpan.classList.add('slashed');

  // 新しいステップ要素追加
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

  state.currentNum = newN;
  state.currentDen = newD;

  const gcdNext = calcGcd(newN, newD);
  const isComplete = (gcdNext === 1);

  if (isComplete) {
    if (state.stepCount === 1) {
      // 🌟 一発特大ホームラン！（かず方式）
      triggerHomerun(divisor);
    } else {
      // ⚾ タイムリー連打でホームイン！（りこ方式）
      triggerTimelyHomein(divisor);
    }
  } else {
    // ⚾ まだ割れる ➔ クリーンヒット＆進塁！
    triggerHit(divisor, newN, newD);
  }
}

// 特大ホームラン（一撃約分・最大公約数）
function triggerHomerun(divisor) {
  state.homeruns++;
  state.consecutiveHits++;
  state.power = Math.min(99, state.power + 15);
  state.meet = Math.min(99, state.meet + 5);

  // 弾道進化
  if (state.power >= 90) {
    state.trajectory = 4; // アーチスト
    state.abilities.add('超アーチスト');
  } else if (state.power >= 75) {
    state.trajectory = 3; // 高弾道
    state.abilities.add('パワーヒッター');
  } else if (state.power >= 60) {
    state.trajectory = 2; // 中弾道
  }

  // 満塁ホームラン判定
  const runners = state.bases.filter(b => b).length;
  if (runners === 3) {
    state.abilities.add('満塁男');
  }
  if (state.homeruns >= 4) {
    state.abilities.add('怪物スラッガー');
  }

  state.bases = [false, false, false];
  updateHud();

  sounds.playHomerun();
  triggerConfetti();

  dom.cutinTitle.textContent = "特大ホームラン！！";
  dom.cutinStatUp.textContent = `パワー +15UP! (${getGrade(state.power)} ${state.power}) 弾道${state.trajectory}!`;
  dom.homerunCutin.classList.remove('hide');
  announce(`🔥 カキィィン！！【÷${divisor}】一撃特大ホームラン！パワー大幅上昇！`);

  setTimeout(() => {
    dom.homerunCutin.classList.add('hide');
    advanceBat();
  }, 1300);
}

// タイムリーホームイン（段階的約分完了）
function triggerTimelyHomein(divisor) {
  state.hits++;
  state.consecutiveHits++;
  state.meet = Math.min(99, state.meet + 10);
  state.power = Math.min(99, state.power + 6);

  if (state.consecutiveHits >= 4) {
    state.abilities.add('アベレージヒッター');
  }

  state.bases = [false, false, false];
  updateHud();

  sounds.playHomerun();
  triggerConfetti();

  dom.cutinTitle.textContent = "タイムリー！ホームイン！";
  dom.cutinStatUp.textContent = `ミート +10UP! パワー +6UP!`;
  dom.homerunCutin.classList.remove('hide');
  announce(`🎊 見事な連打で約分完了！ホームイン！選手能力UP！`);

  setTimeout(() => {
    dom.homerunCutin.classList.add('hide');
    advanceBat();
  }, 1300);
}

// クリーンヒット（途中約分）
function triggerHit(divisor, newN, newD) {
  state.hits++;
  state.consecutiveHits++;
  state.meet = Math.min(99, state.meet + 6);

  if (state.bases[2]) {
    state.meet = Math.min(99, state.meet + 2);
    state.bases[2] = false;
  }
  state.bases[2] = state.bases[1];
  state.bases[1] = state.bases[0];
  state.bases[0] = true;

  updateHud();
  sounds.playHit();

  dom.stepHintBox.classList.remove('hide');
  dom.stepHintText.textContent = `⚾ ナイスヒット！【${newN}/${newD}】まだ割れるぞ！次は何で割る？`;
  announce(`ナイスヒット！【÷${divisor}】で約分成功！次は何で割る？`);

  state.isLocked = false; // 次のボタン操作を許可
}

// 空振り（ストライク＆連打防止クールダウン）
function handleWrongDivisor(divisor, curN, curD, nDiv, dDiv) {
  state.strikes++;
  state.consecutiveHits = 0;
  updateStrikeLamps();

  sounds.playStrike();
  dom.screens.game.classList.add('shake');
  setTimeout(() => dom.screens.game.classList.remove('shake'), 400);

  // ⏱️ 連打防止：ボタンを 0.8秒間完全ロック！
  state.isLocked = true;
  dom.divisorGrid.classList.add('locked');

  if (!nDiv && !dDiv) {
    announce(`⚡ 空振り！【${divisor}】では分子も分母も割り切れないぞ！`);
  } else if (!nDiv) {
    announce(`⚡ 空振り！【${divisor}】では上（分子 ${curN}）が割り切れないぞ！`);
  } else {
    announce(`⚡ 空振り！【${divisor}】では下（分母 ${curD}）が割り切れないぞ！`);
  }

  // 3ストライクで三振チェンジ
  if (state.strikes >= 3) {
    state.strikeouts++;
    announce("⚡ 3ストライク！空振り三振チェンジ！次の打席へ！");
    setTimeout(() => {
      advanceBat();
    }, 1100);
    return;
  }

  // 0.8秒後にロック解除（バットを構え直し）
  setTimeout(() => {
    if (state.playing && state.strikes < 3) {
      state.isLocked = false;
      dom.divisorGrid.classList.remove('locked');
    }
  }, 800);
}

// 次の打席へ進む
function advanceBat() {
  state.currentBat++;

  if (state.currentBat > state.totalBats) {
    // 試合終了・育成完了！
    endGame();
    return;
  }

  setupProblem();
  announce(`さあ第 ${state.currentBat} 打席！落ち着いて公約数を選ぼう！`);
}

// ==========================================================================
// ゲーム終了＆プロスピ風選手能力査定
// ==========================================================================
function endGame() {
  state.playing = false;
  state.isLocked = true;

  dom.homerunCutin.classList.add('hide');
  dom.stepHintBox.classList.add('hide');
  dom.divisorGrid.classList.remove('locked');

  showResult();
}

function showResult() {
  showScreen('result');
  sounds.playResult();

  dom.resPlayerName.textContent = `${state.playerName} 選手`;

  const finalRank = calcOverallRank();
  dom.resFinalRank.textContent = finalRank;
  dom.resFinalRank.className = `final-rank-circle rank-${finalRank.toLowerCase()}`;

  dom.resTrajectory.textContent = state.trajectory;
  dom.resTrajectoryName.textContent = getTrajectoryName(state.trajectory);

  dom.resMeetGrade.textContent = getGrade(state.meet);
  dom.resMeetNum.textContent = Math.min(state.meet, 99);

  dom.resPowerGrade.textContent = getGrade(state.power);
  dom.resPowerNum.textContent = Math.min(state.power, 99);

  // 打率
  const officialAtBats = state.homeruns + state.hits + state.strikeouts;
  const safeHits = state.homeruns + state.hits;
  const avg = officialAtBats > 0 ? (safeHits / officialAtBats).toFixed(3) : '.000';
  dom.resAvg.textContent = avg.startsWith('0') ? avg.slice(1) : avg;

  dom.resHrCount.textContent = state.homeruns;
  dom.resHitCount.textContent = state.hits;
  dom.resSoCount.textContent = state.strikeouts;

  // 特殊能力タグ
  dom.resSpecialSkills.innerHTML = '';
  state.abilities.forEach(ability => {
    const tag = document.createElement('span');
    tag.className = 'skill-tag';
    tag.textContent = ability;
    dom.resSpecialSkills.appendChild(tag);
  });

  // 育成査定スコア計算
  const evalScore = Math.floor(
    (state.power * 25) +
    (state.meet * 20) +
    (state.homeruns * 300) +
    (state.hits * 120) -
    (state.strikeouts * 80)
  );
  const finalEvalScore = Math.max(0, evalScore);
  dom.resEvalScore.textContent = `${finalEvalScore.toLocaleString()} PTS`;

  // スプレッドシート記録
  sendScoreToGAS(finalEvalScore);
}

// スコア送信
async function sendScoreToGAS(score) {
  dom.registerStatus.className = 'register-status-box';

  if (!api.isOnline()) {
    dom.registerStatus.classList.add('error');
    dom.registerMsg.textContent = '⚠️ オフラインのため登録できません';
    return;
  }

  dom.registerMsg.textContent = '📡 統合スプレッドシートに選手査定を記録中...';

  try {
    const res = await api.registerScore(state.playerName, score, state.sessionToken);
    dom.registerStatus.classList.add('success');
    dom.registerMsg.textContent = `✅ スプレッドシートに記録完了！ 全国第 ${res.rank || '-'} 位！`;
  } catch (err) {
    dom.registerStatus.classList.add('error');
    dom.registerMsg.textContent = `⚠️ 登録できませんでした (${err.message})`;
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
      dom.rankingTbody.innerHTML = '<tr><td colspan="3">まだ記録がありません。一番乗りで育成しよう！</td></tr>';
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
    if (state.playing) {
      showScreen('game');
    } else if (state.currentBat > state.totalBats) {
      showScreen('result');
    } else {
      showScreen('title');
    }
  });

  const savedName = localStorage.getItem('yakubun_player_name');
  if (savedName) {
    dom.playerNameInput.value = savedName;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  initEvents();
  showScreen('title');
});
