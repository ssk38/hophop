const ITEM_POINTS = Object.freeze({
  speed: 500,
  shrink: 100,
  star: 100,
  slow: 100,
  '1up': 100,
});

export const PORTAL_POINTS = 1000;

export function getItemPoints(itemType) {
  return ITEM_POINTS[itemType] ?? 100;
}
