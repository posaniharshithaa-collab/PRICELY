export function buildEstimatedContext({ currentPrice, mrp, launchDate }) {
  const current = Number(currentPrice);
  const anchor = Number(mrp) || current * 1.18;
  let ageMonths = 6;
  if (launchDate) {
    const d = new Date(launchDate);
    if (!Number.isNaN(d.getTime())) ageMonths = Math.max(1, (Date.now() - d.getTime()) / 2629800000);
  }
  const decay = Math.min(.24, Math.max(.05, ageMonths * .018));
  const typical = Math.round(Math.max(current * 1.02, anchor * (1 - decay) * .96));
  const lowest = Math.round(Math.max(current * .88, Math.min(current * .98, typical * .90)));
  const highest = Math.round(Math.max(anchor, typical * 1.08));
  const history = makeHistory(current, typical, lowest, highest, 90);
  return {
    type: "estimated",
    typical,
    lowest,
    highest,
    confidence: mrp || launchDate ? "medium" : "low",
    basis: [mrp ? "MRP anchor" : "category-neutral anchor", launchDate ? "launch date" : "product age assumption", "current market price", "conservative trend model"],
    history
  };
}

export function makeHistory(current, typical, lowest, highest, days = 90) {
  const n = days === 30 ? 8 : days === 90 ? 14 : 18;
  const pts = [];
  const safeLow = Math.min(lowest, current, typical, highest);
  const safeHigh = Math.max(lowest, current, typical, highest);
  const span = Math.max(1, safeHigh - safeLow);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const base = typical + (current - typical) * t;
    const wave = Math.sin(i * 1.37) * span * 0.10;
    pts.push(Math.round(Math.max(safeLow, Math.min(safeHigh, base + wave))));
  }
  if (n >= 8) {
    pts[Math.floor(n * 0.30)] = safeHigh;
    pts[Math.floor(n * 0.62)] = safeLow;
  }
  pts[0] = Math.max(safeLow, Math.min(safeHigh, Math.round((typical + safeHigh) / 2)));
  pts[n - 1] = Math.round(current);
  const dates = pts.map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - Math.round((n - 1 - i) * days / (n - 1)));
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  });
  return pts.map((price, i) => ({ date: dates[i], price }));
}
