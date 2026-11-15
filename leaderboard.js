const STORAGE_KEY = 'geometryDashTop10';
const LEGACY_BEST_KEY = 'geometryDashBest';

export function loadHighScores() {
  let savedScores = [];
  try {
    savedScores = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    savedScores = [];
  }

  if (!Array.isArray(savedScores) || savedScores.length === 0) {
    const previousBest = Number(localStorage.getItem(LEGACY_BEST_KEY) || 0);
    return previousBest > 0 ? [{ score: Math.floor(previousBest), date: 'BEST' }] : [];
  }

  return savedScores
    .map((entry) => ({
      score: Math.floor(Number(typeof entry === 'number' ? entry : entry?.score)),
      date: typeof entry?.date === 'string' ? entry.date : '',
    }))
    .filter((entry) => Number.isFinite(entry.score) && entry.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export function recordHighScore(score) {
  const entry = {
    score: Math.max(0, Math.floor(score)),
    date: new Intl.DateTimeFormat('ja-JP', { month: '2-digit', day: '2-digit' }).format(new Date()),
  };
  const scores = [...loadHighScores(), entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  const rank = scores.indexOf(entry) + 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  localStorage.setItem(LEGACY_BEST_KEY, String(Math.max(scores[0]?.score || 0, Number(localStorage.getItem(LEGACY_BEST_KEY) || 0))));
  return { scores, rank: rank > 0 ? rank : null };
}

export function renderHighScores(listElement, scores) {
  listElement.replaceChildren();
  if (scores.length === 0) {
    const emptyRow = document.createElement('li');
    emptyRow.className = 'leaderboard-empty';
    emptyRow.textContent = 'まだ記録がありません';
    listElement.append(emptyRow);
    return;
  }

  scores.forEach((entry, index) => {
    const row = document.createElement('li');
    row.className = 'leaderboard-row';
    const rank = document.createElement('span');
    rank.className = 'leaderboard-rank';
    rank.textContent = String(index + 1).padStart(2, '0');
    const value = document.createElement('span');
    value.className = 'leaderboard-score';
    value.textContent = String(entry.score);
    const date = document.createElement('span');
    date.className = 'leaderboard-date';
    date.textContent = entry.date;
    row.append(rank, value, date);
    listElement.append(row);
  });
}
