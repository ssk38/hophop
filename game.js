const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayMessage = document.getElementById('overlayMessage');
const playBtn = document.getElementById('playBtn');

const config = {
  gravity: 1900,
  jumpForce: 620,
  baseSpeed: 430,
  groundY: canvas.height - 68,
};

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

const stageConfigs = [
  {
    name: 'Stage 1',
    bgTop: '#16152f',
    bgMid: '#0d1937',
    bgBottom: '#070d1d',
    ground: '#0b1328',
    ceiling: '#0f1d31',
    platform: '#71f7a2',
    floorSpike: '#ff4db8',
    ceilSpike: '#7df9ff',
    portal: '#ffd84d',
    platformChance: 0.5,
    floorSpikeMin: 4,
    floorSpikeMax: 8,
    ceilingMin: 3,
    ceilingMax: 6,
    speedMultiplier: 1,
    portalY: 340,
    portalLabel: 'A',
  },
  {
    name: 'Stage 2',
    bgTop: '#132c2e',
    bgMid: '#0d3d41',
    bgBottom: '#071d20',
    ground: '#0a1f22',
    ceiling: '#12363d',
    platform: '#7df9ff',
    floorSpike: '#ffbe5c',
    ceilSpike: '#8df5ff',
    portal: '#7df9ff',
    platformChance: 0.7,
    floorSpikeMin: 5,
    floorSpikeMax: 9,
    ceilingMin: 4,
    ceilingMax: 7,
    speedMultiplier: 1.15,
    portalY: 290,
    portalLabel: 'B',
  },
  {
    name: 'Stage 3',
    bgTop: '#2b1730',
    bgMid: '#3a1f44',
    bgBottom: '#120d21',
    ground: '#1d1028',
    ceiling: '#2c1e38',
    platform: '#ff90d8',
    floorSpike: '#ff5ca8',
    ceilSpike: '#d1b3ff',
    portal: '#ff90d8',
    platformChance: 0.8,
    floorSpikeMin: 6,
    floorSpikeMax: 10,
    ceilingMin: 5,
    ceilingMax: 8,
    speedMultiplier: 1.3,
    portalY: 250,
    portalLabel: 'C',
  },
  {
    name: 'Stage 4',
    bgTop: '#1d1a2e',
    bgMid: '#2a2a48',
    bgBottom: '#090d18',
    ground: '#171821',
    ceiling: '#22263b',
    platform: '#ffd84d',
    floorSpike: '#ff5f5f',
    ceilSpike: '#ffd84d',
    portal: '#ffd84d',
    platformChance: 0.9,
    floorSpikeMin: 7,
    floorSpikeMax: 12,
    ceilingMin: 6,
    ceilingMax: 9,
    speedMultiplier: 1.5,
    portalY: 220,
    portalLabel: 'D',
  },
];

const state = {
  status: 'ready',
  obstacles: [],
  items: [],
  spawnTimer: 0.8,
  score: 0,
  speedProgress: 0,
  best: Number(localStorage.getItem('geometryDashBest') || 0),
  lastTime: 0,
  introGrace: 1.5,
  stageIndex: 0,
  portal: null,
  portalCooldown: 15,
};

const audio = {
  ctx: null,
  master: null,
  musicGain: null,
  nextBeatAt: 0,
  step: 0,
  musicStarted: false,
};

const musicPattern = [220, 262, 330, 392, 440, 392, 330, 262, 220, 196, 247, 294];

function ensureAudio() {
  if (!audio.ctx) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      return;
    }

    audio.ctx = new AudioCtor();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.12;
    audio.master.connect(audio.ctx.destination);
    audio.musicGain = audio.ctx.createGain();
    audio.musicGain.gain.value = 2.5;
    audio.musicGain.connect(audio.master);
  }

  if (audio.ctx.state === 'suspended') {
    audio.ctx.resume();
  }
}

function playTone(frequency, duration, type = 'sine', volume = 0.08, slideTo = null, output = audio.master) {
  if (!audio.ctx || !audio.master) {
    return;
  }

  const now = audio.ctx.currentTime;
  const oscillator = audio.ctx.createOscillator();
  const gainNode = audio.ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);

  if (slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
  }

  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(gainNode);
  gainNode.connect(output);

  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function playKick() {
  playTone(42, 0.18, 'sine', 0.18, 24, audio.musicGain);
  playTone(68, 0.08, 'triangle', 0.04, 58, audio.musicGain);
}

function playBass() {
  ensureAudio();
  if (!audio.ctx || !audio.musicGain) {
    return;
  }

  const note = musicPattern[(audio.step + 2) % musicPattern.length] * 0.5;
  playTone(note, 0.22, 'sawtooth', 0.09, note * 0.7, audio.musicGain);
}

function playJumpSound() {
  ensureAudio();
  if (!audio.ctx || !audio.master) {
    return;
  }

  playTone(520, 0.12, 'square', 0.12, 200);
  playTone(680, 0.08, 'triangle', 0.05, 340);
}

function startMusic() {
  ensureAudio();
  if (!audio.ctx || !audio.master || audio.musicStarted) {
    return;
  }

  audio.musicStarted = true;
  audio.nextBeatAt = audio.ctx.currentTime + 0.08;
  audio.step = 0;
}

function updateMusic() {
  if (!audio.ctx || !audio.musicGain || !audio.musicStarted || state.status !== 'playing') {
    return;
  }

  const beatDuration = 0.23;

  while (audio.nextBeatAt < audio.ctx.currentTime + 0.2) {
    const note = musicPattern[audio.step % musicPattern.length];
    playTone(note, 0.12, 'triangle', 0.05, null, audio.musicGain);

    if (audio.step % 2 === 1) {
      playTone(note * 1.5, 0.08, 'square', 0.025, note * 1.2, audio.musicGain);
    }

    if (audio.step % 2 === 0) {
      playKick();
    }

    if (audio.step % 4 === 0 || audio.step % 4 === 2) {
      playBass();
    }

    if (audio.step % 4 === 0) {
      playTone(note * 0.5, 0.2, 'sine', 0.06, note * 0.25, audio.musicGain);
    }

    audio.nextBeatAt += beatDuration;
    audio.step += 1;
  }
}

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
  overlayTitle.textContent = mode === 'clear' ? 'ALL STAGES CLEAR!' : 'GEOMETRY DASH';
  overlayMessage.textContent = message;
  playBtn.textContent = buttonText;
}

function hideOverlay() {
  overlay.classList.remove('visible');
}

function getCurrentStage() {
  return stageConfigs[state.stageIndex] || stageConfigs[0];
}

function loadStage(index) {
  state.stageIndex = index;
  state.obstacles = [];
  state.items = [];
  state.speedProgress = 0;
  state.portal = null;
  state.portalCooldown = 15;
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
  if (state.stageIndex < stageConfigs.length - 1) {
    state.stageIndex += 1;
    loadStage(state.stageIndex);
    state.status = 'playing';
    return;
  }

  state.status = 'cleared';
  state.best = Math.max(state.best, Math.floor(state.score));
  localStorage.setItem('geometryDashBest', String(state.best));
  audio.musicStarted = false;
  updateHud();
  setOverlay(`You cleared all 4 stages! Score ${Math.floor(state.score)}`, 'Play Again', 'clear');
}

function gameOver() {
  state.status = 'gameover';
  state.best = Math.max(state.best, Math.floor(state.score));
  localStorage.setItem('geometryDashBest', String(state.best));
  audio.musicStarted = false;
  updateHud();
  setOverlay(`Game Over — Score ${Math.floor(state.score)}`, 'Restart');
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

  state.spawnTimer = randomBetween(0.25, 0.45) / stage.speedMultiplier;
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

    if ((obstacle.type === 'spike' || obstacle.type === 'ceilingSpike') && rectsIntersect(playerBox, obstacle)) {
      gameOver();
      return;
    }

    if (obstacle.x + obstacle.w < -60) {
      state.obstacles.splice(i, 1);
    }
  }
}

function update(dt) {
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
        x: canvas.width - 120,
        y: stage.portalY,
        w: 52,
        h: 90,
      };
    }
  }

  for (const obstacle of state.obstacles) {
    obstacle.x -= moveSpeed * dt;
  }

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
      if (item.type === 'speed') {
        player.boostTimer = 5;
      } else if (item.type === 'shrink') {
        player.shrinkTimer = 5;
      } else if (item.type === 'star') {
        player.starTimer = 6;
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

function drawBackground() {
  const stage = getCurrentStage();
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, stage.bgTop);
  sky.addColorStop(0.5, stage.bgMid);
  sky.addColorStop(1, stage.bgBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 70; i += 1) {
    const x = (i * 79 + (state.score * 3)) % (canvas.width + 20);
    const y = (i * 53) % (canvas.height * 0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.fillStyle = stage.ground;
  ctx.fillRect(0, config.groundY, canvas.width, canvas.height - config.groundY);

  ctx.fillStyle = stage.ceiling;
  ctx.fillRect(0, 0, canvas.width, 32);

  ctx.strokeStyle = stage.portal;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, config.groundY);
  ctx.lineTo(canvas.width, config.groundY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 32);
  ctx.lineTo(canvas.width, 32);
  ctx.stroke();
}

function drawPlayer() {
  const sizeW = player.starTimer > 0 ? player.w + 8 : player.w;
  const sizeH = player.starTimer > 0 ? player.h + 8 : player.h;
  const drawX = player.x + (player.w - sizeW) / 2;
  const drawY = player.y + (player.h - sizeH) / 2;

  const glow = ctx.createRadialGradient(
    drawX + sizeW * 0.5,
    drawY + sizeH * 0.45,
    4,
    drawX + sizeW * 0.5,
    drawY + sizeH * 0.5,
    30,
  );
  glow.addColorStop(0, player.starTimer > 0 ? '#dffbff' : '#fff4a9');
  glow.addColorStop(1, 'rgba(255, 216, 77, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(drawX - 12, drawY - 12, sizeW + 24, sizeH + 24);

  ctx.fillStyle = player.starTimer > 0 ? '#7df9ff' : '#ffd84d';
  ctx.fillRect(drawX, drawY, sizeW, sizeH);

  ctx.fillStyle = '#0b1020';
  ctx.fillRect(drawX + 7, drawY + 7, 5, 5);
  ctx.fillRect(drawX + 18, drawY + 7, 5, 5);
  ctx.fillStyle = '#ff4db8';
  ctx.fillRect(drawX + 8, drawY + 18, 14, 4);
}

function drawPlatform(obstacle) {
  ctx.fillStyle = getCurrentStage().platform;
  ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(obstacle.x + 8, obstacle.y + 6, obstacle.w - 16, 4);
}

function drawSpike(obstacle) {
  const spikeCount = obstacle.count || 3;
  const step = obstacle.w / spikeCount;
  ctx.fillStyle = getCurrentStage().floorSpike;

  for (let i = 0; i < spikeCount; i += 1) {
    const x = obstacle.x + i * step;
    ctx.beginPath();
    ctx.moveTo(x, obstacle.y + obstacle.h);
    ctx.lineTo(x + step / 2, obstacle.y);
    ctx.lineTo(x + step, obstacle.y + obstacle.h);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCeilingSpike(obstacle) {
  const spikeCount = obstacle.count || 3;
  const step = obstacle.w / spikeCount;
  ctx.fillStyle = getCurrentStage().ceilSpike;

  for (let i = 0; i < spikeCount; i += 1) {
    const x = obstacle.x + i * step;
    ctx.beginPath();
    ctx.moveTo(x, obstacle.y);
    ctx.lineTo(x + step / 2, obstacle.y + obstacle.h);
    ctx.lineTo(x + step, obstacle.y);
    ctx.closePath();
    ctx.fill();
  }
}

function drawObstacle(obstacle) {
  if (obstacle.type === 'platform') {
    drawPlatform(obstacle);
  } else if (obstacle.type === 'ceilingSpike') {
    drawCeilingSpike(obstacle);
  } else {
    drawSpike(obstacle);
  }
}

function drawItem(item) {
  ctx.save();
  ctx.translate(item.x + item.r, item.y + item.r + Math.sin(item.bob) * 4);

  if (item.type === 'speed') {
    ctx.fillStyle = '#ffd84d';
    ctx.fillRect(-30, -30, 60, 60);
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(-10, -24, 20, 48);
    ctx.fillRect(-24, -10, 48, 20);
  } else if (item.type === 'shrink') {
    ctx.fillStyle = '#ff4db8';
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(-10, -24, 20, 48);
  } else if (item.type === 'slow') {
    ctx.fillStyle = '#8dd5ff';
    ctx.fillRect(-30, -30, 60, 60);
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(-18, -18, 36, 36);
    ctx.fillStyle = '#8dd5ff';
    ctx.fillRect(-8, -22, 16, 44);
  } else {
    ctx.fillStyle = '#7df9ff';
    ctx.beginPath();
    for (let i = 0; i < 5; i += 1) {
      const angle = (Math.PI / 180) * (i * 72 - 90);
      const outerX = Math.cos(angle) * 36;
      const outerY = Math.sin(angle) * 36;
      const innerX = Math.cos(angle + Math.PI / 5) * 15;
      const innerY = Math.sin(angle + Math.PI / 5) * 15;
      if (i === 0) {
        ctx.moveTo(outerX, outerY);
      } else {
        ctx.lineTo(outerX, outerY);
      }
      ctx.lineTo(innerX, innerY);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawPortal() {
  if (!state.portal) {
    return;
  }

  const stage = getCurrentStage();
  const portalX = state.portal.x;
  const portalY = state.portal.y;

  ctx.save();
  ctx.translate(portalX + state.portal.w / 2, portalY + state.portal.h / 2);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(-30, -40, 60, 80);

  ctx.strokeStyle = stage.portal;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.ellipse(0, 0, 24, 40, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = stage.portal;
  ctx.fillRect(-8, -35, 16, 70);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(stage.portalLabel, 0, 8);
  ctx.restore();
}

function draw() {
  drawBackground();

  for (const obstacle of state.obstacles) {
    drawObstacle(obstacle);
  }

  for (const item of state.items) {
    drawItem(item);
  }

  drawPortal();
  drawPlayer();
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

resetPlayer();
updateHud();
setOverlay('Press Space or click to start', 'Start');
requestAnimationFrame(loop);
