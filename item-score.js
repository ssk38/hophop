const ITEM_POINTS = Object.freeze({
  speed: 500,
  shrink: 100,
  star: 100,
  slow: 100,
});

export function getItemPoints(itemType) {
  return ITEM_POINTS[itemType] ?? 100;
}
