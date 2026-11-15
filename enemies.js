export function createEnemy({ canvasWidth, groundY, randomBetween, random = Math.random }) {
  const baseY = randomBetween(140, groundY - 120);
  return {
    x: canvasWidth + randomBetween(90, 180),
    y: baseY,
    baseY,
    w: 42,
    h: 34,
    phase: random() * Math.PI * 2,
    amplitude: randomBetween(28, 68),
    bobSpeed: randomBetween(2.2, 3.8),
  };
}

export function updateEnemies(enemies, moveSpeed, deltaTime) {
  for (let index = enemies.length - 1; index >= 0; index -= 1) {
    const enemy = enemies[index];
    enemy.x -= moveSpeed * 1.08 * deltaTime;
    enemy.phase += enemy.bobSpeed * deltaTime;
    enemy.y = enemy.baseY + Math.sin(enemy.phase) * enemy.amplitude;
    if (enemy.x + enemy.w < -30) enemies.splice(index, 1);
  }
}

export function hasEnemyCollision(enemies, playerBox, intersects) {
  return enemies.some((enemy) => intersects(playerBox, enemy));
}
