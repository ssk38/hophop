export function createDeathBurst(player, random = Math.random) {
  return createBurst(player, ['#ffd84d', '#ff4db8', '#7df9ff', '#ffffff'], random);
}

export function createEnemyBurst(enemy, random = Math.random) {
  return createBurst(enemy, ['#ff4d79', '#ffbe5c', '#ffffff', '#ff90d8'], random);
}

function createBurst(entity, colors, random) {
  const centerX = entity.x + entity.w / 2;
  const centerY = entity.y + entity.h / 2;
  return Array.from({ length: 28 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 28 + (random() - 0.5) * 0.35;
    const speed = 120 + random() * 320;
    const size = 3 + random() * 7;
    return {
      x: centerX,
      y: centerY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      color: colors[Math.floor(random() * colors.length)],
      rotation: random() * Math.PI * 2,
      spin: (random() - 0.5) * 12,
      life: 0.55 + random() * 0.3,
      maxLife: 0.85,
    };
  });
}

export function updateDeathBurst(particles, deltaTime) {
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    particle.life -= deltaTime;
    particle.x += particle.vx * deltaTime;
    particle.y += particle.vy * deltaTime;
    particle.vx *= 0.985;
    particle.vy = particle.vy * 0.985 + 180 * deltaTime;
    particle.rotation += particle.spin * deltaTime;
    if (particle.life <= 0) particles.splice(index, 1);
  }
}
