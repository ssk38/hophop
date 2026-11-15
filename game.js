import { GAME_CONFIG, STAGES } from './stage-config.js';
import { createAudio } from './audio.js';
import { loadHighScores, recordHighScore, renderHighScores } from './leaderboard.js';
import { createRenderer } from './renderer.js';
import { getItemPoints } from './item-score.js';
import { createEnemy, hasEnemyCollision, updateEnemies } from './enemies.js';
import { createDeathBurst, updateDeathBurst } from './death-effects.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const playBtn = document.getElementById('playBtn');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const leaderboardPanel = document.getElementById('leaderboardPanel');
const leaderboardList = document.getElementById('leaderboardList');
const leaderboardBackBtn = document.getElementById('leaderboardBackBtn');

const config = { ...GAME_CONFIG, groundY: canvas.height - GAME_CONFIG.groundOffset };

const player = {
  x: 120,
  y: 0,
  w: 30,
  h: 30,
  vy: 0,
  jumpCooldown: 0,
  boostTimer: 0,
  shrinkTimer: 0,
  starTimer: 0,
  slowTimer: 0,
};

const state = {
  status: 'ready',
  obstacles: [],
  enemies: [],
  items: [],
  scorePopups: [],
  spawnTimer: 0.8,
  score: 0,
  speedProgress: 0,
  best: Number(localStorage.getItem('geometryDashBest') || 0),
  lastTime: 0,
  introGrace: 1.5,
  stageIndex: 0,
  portal: null,
  portalCooldown: 10,
  transitionTimer: 0,
  deathTimer: 0,
  deathParticles: [],
  highScores: loadHighScores(),
};
const { audio, playJumpSound, playStageTransition, playCountdownTick, startMusic, updateMusic } = createAudio(state);
const { draw } = createRenderer({ canvas, ctx, state, player, getCurrentStage, groundY: config.groundY });

function resetPlayer() {
  player.x = 120;
  player.y = config.groundY - player.h;
  player.vy = 0;
  player.jumpCooldown = 0;
  player.boostTimer = 0;
  player.shrinkTimer = 0;
  player.starTimer = 0;
  player.slowTimer = 0;
}

function updateHud() {
  scoreEl.textContent = `SCORE ${Math.floor(state.score)}`;
  bestEl.textContent = `BEST ${Math.floor(state.best)}`;
}

function setOverlay(message, buttonText, mode = 'default') {
  overlay.classList.add('visible');
  overlay.classList.toggle('clear-screen', mode === 'clear');
  overlay.classList.toggle('record-screen', mode === 'record');
  overlay.classList.remove('leaderboard-mode');
  leaderboardPanel.hidden = true;
  overlayTitle.textContent = mode === 'clear'
    ? 'ALL STAGES CLEAR!'
    : mode === 'record' ? 'TOP 3 RECORD!' : 'GEOMETRY DASH';
  overlayMessage.textContent = message;
  playBtn.textContent = buttonText;
  leaderboardBtn.hidden = false;
}

function hideOverlay() {
  overlay.classList.remove('visible');
}

function getCurrentStage() {
  return STAGES[state.stageIndex] || STAGES[0];
}

function showLeaderboard() {
  renderHighScores(leaderboardList, state.highScores);
  overlay.classList.add('visible', 'leaderboard-mode');
  leaderboardPanel.hidden = false;
}

function saveRunScore() {
  const result = recordHighScore(state.score);
  state.highScores = result.scores;
  state.best = Math.max(state.best, state.highScores[0]?.score || 0);
  localStorage.setItem('geometryDashBest', String(state.best));
  updateHud();
  return result.rank;
}

function loadStage(index) {
  state.stageIndex = index;
  state.obstacles = [];
  state.enemies = [];
  state.items = [];
  state.scorePopups = [];
  state.speedProgress = 0;
  state.portal = null;
  state.portalCooldown = 10;
  state.spawnTimer = 0.7;
  state.introGrace = 1.5;
  resetPlayer();
  updateHud();
}

function startGame() {
  state.status = 'playing';
  state.stageIndex = 0;
  state.score = 0;
  state.best = Number(localStorage.getItem('geometryDashBest') || 0);
  loadStage(0);
  hideOverlay();
  startMusic();
}

function nextStage() {
  if (state.stageIndex < STAGES.length - 1) {
    state.stageIndex += 1;
    loadStage(state.stageIndex);
    state.introGrace = 0;
    state.transitionTimer = 3;
    state.transitionCountdown = 3;
    state.status = 'transition';
    playStageTransition(state.stageIndex + 1);
    return;
  }

  state.status = 'cleared';
  saveRunScore();
  audio.musicStarted = false;
  updateHud();
  setOverlay(`You cleared all 4 stages! Score ${Math.floor(state.score)}`, 'Play Again', 'clear');
}

function gameOver() {
  if (state.status !== 'playing') return;
  state.status = 'dying';
  state.deathTimer = 0.85;
  state.deathParticles = createDeathBurst(player);
  player.starTimer = 0;
}

function finishGameOver() {
  state.status = 'gameover';
  const rank = saveRunScore();
  audio.musicStarted = false;
  updateHud();
  const message = rank && rank <= 3
    ? `${rank}位入賞！  Score ${Math.floor(state.score)}`
    : `Game Over — Score ${Math.floor(state.score)}`;
  setOverlay(message, 'Restart', rank && rank <= 3 ? 'record' : 'default');
}

function jump() {
  if (state.status === 'ready') {
    startGame();
  }

  if (state.status !== 'playing') {
    return;
  }

  if (player.jumpCooldown > 0) {
    return;
  }

  let jumpPower = config.jumpForce;
  if (player.shrinkTimer > 0) {
    jumpPower *= 0.78;
  }
  if (player.starTimer > 0) {
    jumpPower *= 1.12;
  }

  player.vy = -jumpPower;
  player.jumpCooldown = 0.12;
  playJumpSound();
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function spawnObstacle() {
  const stage = getCurrentStage();
  const patternRoll = Math.random();

  if (patternRoll < stage.platformChance) {
    const platformCount = Math.floor(randomBetween(1, 4));
    for (let i = 0; i < platformCount; i += 1) {
      const platform = {
        type: 'platform',
        x: canvas.width + 30 + i * 70,
        y: randomBetween(160, 410),
        w: randomBetween(60, 110),
        h: 18,
      };
      state.obstacles.push(platform);
    }
  }

  const floorSpikeCount = Math.floor(randomBetween(stage.floorSpikeMin, stage.floorSpikeMax));
  const floorSpikeLength = Math.floor(randomBetween(20, 52));
  const floorSpike = {
    type: 'spike',
    x: canvas.width + 20,
    y: config.groundY - floorSpikeLength,
    w: floorSpikeCount * 22 + (floorSpikeCount - 1) * 8,
    h: floorSpikeLength,
    count: floorSpikeCount,
  };
  state.obstacles.push(floorSpike);

  const ceilingSpikeCount = Math.floor(randomBetween(stage.ceilingMin, stage.ceilingMax));
  const ceilingSpikeLength = Math.floor(randomBetween(18, 46));
  const ceilingSpike = {
    type: 'ceilingSpike',
    x: canvas.width + 30,
    y: 0,
    w: ceilingSpikeCount * 22 + (ceilingSpikeCount - 1) * 8,
    h: ceilingSpikeLength,
    count: ceilingSpikeCount,
  };
  state.obstacles.push(ceilingSpike);

  if (stage.enemyChance > 0 && Math.random() < stage.enemyChance) {
    state.enemies.push(createEnemy({ canvasWidth: canvas.width, groundY: config.groundY, randomBetween }));
  }

  if (Math.random() < 0.6) {
    const itemTypes = ['speed', 'shrink', 'star', 'slow'];
    const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    state.items.push({
      type: itemType,
      x: canvas.width + 80,
      y: randomBetween(120, config.groundY - 80),
      r: 40,
      bob: Math.random() * Math.PI * 2,
    });
  }

  state.spawnTimer = randomBetween(stage.spawnMin, stage.spawnMax) / stage.speedMultiplier;
}

function rectsIntersect(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function checkCollisions() {
  if (state.introGrace > 0) {
    return;
  }

  const playerBox = { x: player.x, y: player.y, w: player.w, h: player.h };

  if (state.portal && rectsIntersect(playerBox, state.portal)) {
    nextStage();
    return;
  }

  for (let i = state.obstacles.length - 1; i >= 0; i -= 1) {
    const obstacle = state.obstacles[i];

    if (
      player.starTimer <= 0 &&
      (obstacle.type === 'spike' || obstacle.type === 'ceilingSpike') &&
      rectsIntersect(playerBox, obstacle)
    ) {
      gameOver();
      return;
    }

    if (obstacle.x + obstacle.w < -60) {
      state.obstacles.splice(i, 1);
    }
  }

  if (player.starTimer <= 0 && hasEnemyCollision(state.enemies, playerBox, rectsIntersect)) {
    gameOver();
    return;
  }
}

function update(dt) {
  if (state.status === 'transition') {
    const previousCountdown = Math.ceil(state.transitionTimer);
    state.transitionTimer = Math.max(0, state.transitionTimer - dt);
    const nextCountdown = Math.ceil(state.transitionTimer);
    if (nextCountdown < previousCountdown) playCountdownTick(nextCountdown);
    updateMusic();
    if (state.transitionTimer === 0) state.status = 'playing';
    return;
  }

  if (state.status === 'dying') {
    updateDeathBurst(state.deathParticles, dt);
    state.deathTimer = Math.max(0, state.deathTimer - dt);
    if (state.deathTimer === 0) finishGameOver();
    return;
  }

  if (state.status !== 'playing') {
    return;
  }

  state.score += dt * 14;
  state.speedProgress += dt * 14;
  state.best = Math.max(state.best, Math.floor(state.score));
  state.introGrace = Math.max(0, state.introGrace - dt);
  player.jumpCooldown = Math.max(0, player.jumpCooldown - dt);
  player.boostTimer = Math.max(0, player.boostTimer - dt);
  player.shrinkTimer = Math.max(0, player.shrinkTimer - dt);
  player.starTimer = Math.max(0, player.starTimer - dt);
  player.slowTimer = Math.max(0, player.slowTimer - dt);
  for (let i = state.scorePopups.length - 1; i >= 0; i -= 1) {
    const popup = state.scorePopups[i];
    popup.y -= 42 * dt;
    popup.timeLeft -= dt;
    if (popup.timeLeft <= 0) state.scorePopups.splice(i, 1);
  }

  player.vy += config.gravity * dt;
  player.y += player.vy * dt;

  let landedOnPlatform = false;
  for (const obstacle of state.obstacles) {
    if (obstacle.type !== 'platform') {
      continue;
    }

    const playerBottom = player.y + player.h;
    const onTop =
      player.vy >= 0 &&
      playerBottom >= obstacle.y - 4 &&
      playerBottom <= obstacle.y + 24 &&
      player.x + player.w > obstacle.x &&
      player.x < obstacle.x + obstacle.w;

    if (onTop) {
      player.y = obstacle.y - player.h;
      player.vy = 0;
      landedOnPlatform = true;
    }
  }

  if (!landedOnPlatform && player.y + player.h > canvas.height + 20) {
    gameOver();
    return;
  }

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnObstacle();
  }

  const stage = getCurrentStage();
  const speedMultiplier = 1 + Math.min(state.speedProgress / 220, 1.6);
  const moveSpeed = config.baseSpeed * speedMultiplier * (player.boostTimer > 0 ? 1.4 : 1) * (player.slowTimer > 0 ? 0.5 : 1);

  if (!state.portal) {
    state.portalCooldown -= dt;
    if (state.portalCooldown <= 0) {
      state.portal = {
        x: canvas.width + randomBetween(40, 260),
        y: randomBetween(70, config.groundY - 132),
        w: 72,
        h: 112,
      };
    }
  }

  for (const obstacle of state.obstacles) {
    obstacle.x -= moveSpeed * dt;
  }

  updateEnemies(state.enemies, moveSpeed, dt);

  if (state.portal) {
    state.portal.x -= moveSpeed * dt;
    if (state.portal.x + state.portal.w < 0) {
      state.portal = null;
      state.portalCooldown = 3;
    }
  }

  for (let i = state.items.length - 1; i >= 0; i -= 1) {
    const item = state.items[i];
    item.x -= moveSpeed * dt;
    item.bob += dt * 6;

    const distance = Math.hypot(player.x + player.w / 2 - (item.x + item.r), player.y + player.h / 2 - (item.y + item.r));
    if (distance < 50) {
      const points = getItemPoints(item.type);
      state.score += points;
      state.scorePopups.push({
        x: player.x + player.w / 2,
        y: player.y - 12,
        points,
        timeLeft: 1.15,
        duration: 1.15,
      });
      if (item.type === 'speed') {
        player.boostTimer = 5;
      } else if (item.type === 'shrink') {
        player.shrinkTimer = 5;
      } else if (item.type === 'star') {
        player.starTimer = 3;
      } else if (item.type === 'slow') {
        player.slowTimer = 4;
      }
      state.items.splice(i, 1);
    } else if (item.x + item.r < -20) {
      state.items.splice(i, 1);
    }
  }

  updateMusic();
  checkCollisions();
  updateHud();
}

function loop(timestamp) {
  if (!state.lastTime) {
    state.lastTime = timestamp;
  }

  const dt = Math.min((timestamp - state.lastTime) / 1000, 0.032);
  state.lastTime = timestamp;

  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function handleAction() {
  if (overlay.classList.contains('leaderboard-mode')) {
    return;
  }

  if (state.status === 'ready' || state.status === 'gameover' || state.status === 'cleared') {
    startGame();
  }

  jump();
}

document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
    event.preventDefault();
    handleAction();
  }
});

canvas.addEventListener('pointerdown', () => {
  handleAction();
});

playBtn.addEventListener('click', () => {
  handleAction();
});

leaderboardBtn.addEventListener('click', showLeaderboard);
leaderboardBackBtn.addEventListener('click', () => {
  leaderboardPanel.hidden = true;
  overlay.classList.remove('leaderboard-mode');
});

resetPlayer();
updateHud();
setOverlay('Press Space or click to start', 'Start');
requestAnimationFrame(loop);
