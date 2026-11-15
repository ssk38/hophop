export const GAME_CONFIG = Object.freeze({
  gravity: 1900,
  jumpForce: 620,
  baseSpeed: 430,
  groundOffset: 68,
});

// Keep every stage's look, hazard density, and portal placement together here.
export const STAGES = [
  {
    name: 'Stage 1',
    bgTop: '#16152f', bgMid: '#0d1937', bgBottom: '#070d1d',
    ground: '#0b1328', ceiling: '#0f1d31', platform: '#71f7a2',
    floorSpike: '#ff4db8', ceilSpike: '#7df9ff', portal: '#ffd84d',
    platformChance: 0.5,
    floorSpikeMin: 1, floorSpikeMax: 3, ceilingMin: 1, ceilingMax: 2,
    spawnMin: 0.5, spawnMax: 0.9,
    speedMultiplier: 1, portalY: 340, portalLabel: 'A',
  },
  {
    name: 'Stage 2',
    bgTop: '#132c2e', bgMid: '#0d3d41', bgBottom: '#071d20',
    ground: '#0a1f22', ceiling: '#12363d', platform: '#7df9ff',
    floorSpike: '#ffbe5c', ceilSpike: '#8df5ff', portal: '#7df9ff',
    platformChance: 0.7,
    floorSpikeMin: 4, floorSpikeMax: 8, ceilingMin: 3, ceilingMax: 6,
    spawnMin: 0.4, spawnMax: 0.7,
    speedMultiplier: 1.15, portalY: 290, portalLabel: 'B',
  },
  {
    name: 'Stage 3',
    bgTop: '#2b1730', bgMid: '#3a1f44', bgBottom: '#120d21',
    ground: '#1d1028', ceiling: '#2c1e38', platform: '#ff90d8',
    floorSpike: '#ff5ca8', ceilSpike: '#d1b3ff', portal: '#ff90d8',
    platformChance: 0.8,
    floorSpikeMin: 7, floorSpikeMax: 11, ceilingMin: 5, ceilingMax: 8,
    spawnMin: 0.32, spawnMax: 0.55,
    speedMultiplier: 1.3, portalY: 250, portalLabel: 'C',
  },
  {
    name: 'Stage 4',
    bgTop: '#1d1a2e', bgMid: '#2a2a48', bgBottom: '#090d18',
    ground: '#171821', ceiling: '#22263b', platform: '#ffd84d',
    floorSpike: '#ff5f5f', ceilSpike: '#ffd84d', portal: '#ffd84d',
    platformChance: 0.9,
    floorSpikeMin: 10, floorSpikeMax: 15, ceilingMin: 7, ceilingMax: 11,
    spawnMin: 0.25, spawnMax: 0.45,
    speedMultiplier: 1.5, portalY: 220, portalLabel: 'D',
  },
];
