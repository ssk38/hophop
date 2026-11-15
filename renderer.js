export function createRenderer({ canvas, ctx, state, player, getCurrentStage, groundY }) {
  function drawBackground() {
    const stage = getCurrentStage();
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, stage.bgTop);
    sky.addColorStop(0.5, stage.bgMid);
    sky.addColorStop(1, stage.bgBottom);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawBackgroundPattern(stage.backgroundPattern || 'stars');

    ctx.fillStyle = stage.ground;
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
    ctx.fillStyle = stage.ceiling;
    ctx.fillRect(0, 0, canvas.width, 32);
    ctx.strokeStyle = stage.portal;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.moveTo(0, 32);
    ctx.lineTo(canvas.width, 32);
    ctx.stroke();
  }

  function drawBackgroundPattern(pattern) {
    ctx.save();
    ctx.strokeStyle = 'rgba(180, 230, 255, 0.12)';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1;

    if (pattern === 'stars') {
      for (let i = 0; i < 70; i += 1) {
        const x = (i * 79 + state.score * 3) % (canvas.width + 20);
        const y = (i * 53) % (canvas.height * 0.6);
        ctx.fillRect(x, y, 2, 2);
      }
    } else if (pattern === 'grid') {
      const offset = (state.score * 3) % 48;
      for (let x = -48 + offset; x < canvas.width; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x, 32);
        ctx.lineTo(x, groundY);
        ctx.stroke();
      }
      for (let y = 80; y < groundY; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    } else if (pattern === 'waves') {
      for (let row = 0; row < 7; row += 1) {
        const baseY = 90 + row * 54;
        ctx.beginPath();
        for (let x = 0; x <= canvas.width; x += 8) {
          const y = baseY + Math.sin(x * 0.018 + state.score * 0.035 + row) * 13;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    } else {
      const size = 28;
      const offset = (state.score * 0.6) % (size * 1.5);
      for (let row = -1; row < Math.ceil(groundY / (size * 1.5)); row += 1) {
        for (let col = -1; col < Math.ceil(canvas.width / (size * 2)); col += 1) {
          const centerX = col * size * 2 + (row % 2) * size - offset;
          const centerY = row * size * 1.5 + 32;
          ctx.beginPath();
          for (let side = 0; side < 6; side += 1) {
            const angle = (Math.PI / 3) * side;
            const x = centerX + Math.cos(angle) * size;
            const y = centerY + Math.sin(angle) * size;
            if (side === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  }

  function drawPlayer() {
    ctx.save();
    const blinkVisible = player.starTimer <= 0 || Math.floor(player.starTimer * 12) % 2 === 0;
    ctx.globalAlpha = blinkVisible ? 1 : 0.25;
    const sizeW = player.starTimer > 0 ? player.w + 8 : player.w;
    const sizeH = player.starTimer > 0 ? player.h + 8 : player.h;
    const drawX = player.x + (player.w - sizeW) / 2;
    const drawY = player.y + (player.h - sizeH) / 2;
    const glow = ctx.createRadialGradient(
      drawX + sizeW * 0.5, drawY + sizeH * 0.45, 4,
      drawX + sizeW * 0.5, drawY + sizeH * 0.5, 30,
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
    ctx.restore();
  }

  function drawPlatform(obstacle) {
    ctx.fillStyle = getCurrentStage().platform;
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(obstacle.x + 8, obstacle.y + 6, obstacle.w - 16, 4);
  }

  function drawFloorSpikes(obstacle) {
    const count = obstacle.count || 3;
    const step = obstacle.w / count;
    ctx.fillStyle = getCurrentStage().floorSpike;
    for (let i = 0; i < count; i += 1) {
      const x = obstacle.x + i * step;
      ctx.beginPath();
      ctx.moveTo(x, obstacle.y + obstacle.h);
      ctx.lineTo(x + step / 2, obstacle.y);
      ctx.lineTo(x + step, obstacle.y + obstacle.h);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawCeilingSpikes(obstacle) {
    const count = obstacle.count || 3;
    const step = obstacle.w / count;
    ctx.fillStyle = getCurrentStage().ceilSpike;
    for (let i = 0; i < count; i += 1) {
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
    if (obstacle.type === 'platform') drawPlatform(obstacle);
    else if (obstacle.type === 'ceilingSpike') drawCeilingSpikes(obstacle);
    else drawFloorSpikes(obstacle);
  }

  function drawEnemy(enemy) {
    ctx.save();
    ctx.translate(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
    ctx.rotate(Math.sin(enemy.phase) * 0.12);
    ctx.shadowColor = '#ff4d79';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ff4d79';
    ctx.beginPath();
    ctx.moveTo(-enemy.w * 0.55, 0);
    ctx.lineTo(-enemy.w * 0.25, -enemy.h * 0.5);
    ctx.lineTo(0, -enemy.h * 0.34);
    ctx.lineTo(enemy.w * 0.3, -enemy.h * 0.52);
    ctx.lineTo(enemy.w * 0.55, 0);
    ctx.lineTo(enemy.w * 0.3, enemy.h * 0.48);
    ctx.lineTo(0, enemy.h * 0.32);
    ctx.lineTo(-enemy.w * 0.3, enemy.h * 0.48);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff4a9';
    ctx.fillRect(-10, -5, 6, 8);
    ctx.fillRect(4, -5, 6, 8);
    ctx.fillStyle = '#32152a';
    ctx.fillRect(-5, 9, 10, 4);
    ctx.restore();
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
    } else if (item.type === '1up') {
      ctx.shadowColor = '#71f7a2';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#71f7a2';
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0b1020';
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('1UP', 0, 1);
    } else {
      ctx.fillStyle = '#7df9ff';
      ctx.beginPath();
      for (let i = 0; i < 5; i += 1) {
        const angle = (Math.PI / 180) * (i * 72 - 90);
        const outerX = Math.cos(angle) * 36;
        const outerY = Math.sin(angle) * 36;
        const innerX = Math.cos(angle + Math.PI / 5) * 15;
        const innerY = Math.sin(angle + Math.PI / 5) * 15;
        if (i === 0) ctx.moveTo(outerX, outerY);
        else ctx.lineTo(outerX, outerY);
        ctx.lineTo(innerX, innerY);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPortal() {
    if (!state.portal) return;
    const stage = getCurrentStage();
    ctx.save();
    ctx.translate(state.portal.x + state.portal.w / 2, state.portal.y + state.portal.h / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(-40, -56, 80, 112);
    ctx.strokeStyle = stage.portal;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 52, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = stage.portal;
    ctx.fillRect(-10, -47, 20, 94);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(stage.portalLabel, 0, 8);
    ctx.restore();
  }

  function drawScorePopups() {
    for (const popup of state.scorePopups) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, popup.timeLeft / 0.3);
      ctx.textAlign = 'center';
      ctx.font = 'bold 24px Arial';
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(7, 13, 29, 0.9)';
      ctx.strokeText(popup.label || `+${popup.points}`, popup.x, popup.y);
      ctx.fillStyle = popup.points < 0 ? '#ff5f5f' : popup.points === 500 ? '#ffd84d' : '#71f7a2';
      ctx.fillText(popup.label || `+${popup.points}`, popup.x, popup.y);
      ctx.restore();
    }
  }

  function drawDeathBurst() {
    for (const particle of [...state.deathParticles, ...state.enemyParticles]) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.fillStyle = particle.color;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = 12;
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      ctx.restore();
    }
  }

  function drawStageTransition() {
    if (state.status !== 'transition') return;
    const countdown = Math.max(1, Math.ceil(state.transitionTimer));
    ctx.save();
    ctx.fillStyle = 'rgba(4, 9, 20, 0.48)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.shadowColor = getCurrentStage().portal;
    ctx.shadowBlur = 22;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.fillText(`STAGE ${state.stageIndex + 1}`, canvas.width / 2, canvas.height / 2 - 24);
    ctx.fillStyle = getCurrentStage().portal;
    ctx.font = 'bold 82px Arial';
    ctx.fillText(String(countdown), canvas.width / 2, canvas.height / 2 + 68);
    ctx.restore();
  }

  function draw() {
    drawBackground();
    for (const obstacle of state.obstacles) drawObstacle(obstacle);
    for (const enemy of state.enemies) drawEnemy(enemy);
    for (const item of state.items) drawItem(item);
    drawPortal();
    if (state.status !== 'dying') drawPlayer();
    drawDeathBurst();
    drawScorePopups();
    drawStageTransition();
  }

  return { draw };
}
