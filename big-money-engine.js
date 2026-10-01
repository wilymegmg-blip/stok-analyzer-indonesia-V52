/* Stock Analyzer Indonesia — Big Money Engine
   Input must come from a real/authorized upstream source.
*/
function normalizeBigMoney(raw = {}) {
  const foreignNet = finite(raw.foreignNet);
  const brokerAccumulation = finite(raw.brokerAccumulation);
  const topBuyers = Array.isArray(raw.topBuyers) ? raw.topBuyers : [];
  const topSellers = Array.isArray(raw.topSellers) ? raw.topSellers : [];

  return {
    foreignNet,
    brokerAccumulation,
    topBuyers,
    topSellers,
    available: foreignNet !== null || brokerAccumulation !== null ||
               topBuyers.length > 0 || topSellers.length > 0,
    signal: bigMoneySignal({foreignNet, brokerAccumulation, topBuyers, topSellers})
  };
}

function bigMoneySignal(x) {
  const votes = [];
  if (x.foreignNet !== null) votes.push(x.foreignNet > 0 ? 1 : -1);
  if (x.brokerAccumulation !== null) votes.push(x.brokerAccumulation > 0 ? 1 : -1);
  if (!votes.length) return "WAIT";
  const s = votes.reduce((a,b)=>a+b,0);
  return s > 0 ? "POSITIVE" : s < 0 ? "NEGATIVE" : "NEUTRAL";
}
function finite(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
