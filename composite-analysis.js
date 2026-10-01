/* Stock Analyzer Indonesia — Composite Analysis
   Transparent aggregation. It NEVER invents missing signals.
   Score: POSITIVE=+1, NEGATIVE=-1, NEUTRAL/WAIT=0.
*/
function compositeAnalysis(parts = {}) {
  const names = ["technical","fundamental","valuation","bigMoney","news","corporateAction"];
  const available = [];
  let score = 0;

  for (const name of names) {
    const signal = parts[name]?.signal;
    if (signal === "POSITIVE" || signal === "NEGATIVE" || signal === "NEUTRAL") {
      available.push(name);
      score += signal === "POSITIVE" ? 1 : signal === "NEGATIVE" ? -1 : 0;
    }
  }

  if (!available.length) {
    return {signal:"WAIT", score:0, available:0, total:names.length, coverage:0};
  }

  const ratio = score / available.length;
  const signal = ratio >= 0.34 ? "POSITIVE" : ratio <= -0.34 ? "NEGATIVE" : "NEUTRAL";

  return {
    signal,
    score,
    available: available.length,
    total: names.length,
    coverage: Math.round(available.length / names.length * 100)
  };
}
