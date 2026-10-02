const YAHOO_QUOTE = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=';
const YAHOO_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart/';

export default async (req, context) => {
  const ticker = (context.params?.ticker || '').toUpperCase();
  if (!ticker) return json({ error: 'Ticker kosong' }, 400);
  const range = new URL(req.url).searchParams.get('range') || '1y';

  try {
    const [chartRes, quoteRes] = await Promise.all([
      fetch(`${YAHOO_CHART}${encodeURIComponent(ticker)}?range=${encodeURIComponent(range)}&interval=1d&includePrePost=false&events=div%2Csplits`, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
      fetch(`${YAHOO_QUOTE}${encodeURIComponent(ticker)}`, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    ]);
    if (!chartRes.ok) throw new Error(`Yahoo Chart HTTP ${chartRes.status}`);
    const raw = await chartRes.json();
    const z = raw?.chart?.result?.[0];
    if (!z) throw new Error('Data chart tidak tersedia');
    const q = z.indicators?.quote?.[0] || {};
    const ts = z.timestamp || [];
    const ohlc = ts.map((t, i) => ({
      date: new Date(t * 1000).toISOString().slice(0, 10),
      open: q.open?.[i], high: q.high?.[i], low: q.low?.[i], close: q.close?.[i], volume: q.volume?.[i]
    })).filter(x => Number.isFinite(Number(x.close)));

    let quote = {};
    if (quoteRes.ok) {
      const qr = await quoteRes.json();
      quote = qr?.quoteResponse?.result?.[0] || {};
    }

    const price = Number(quote.regularMarketPrice ?? z.meta?.regularMarketPrice ?? ohlc.at(-1)?.close);
    const fundamentals = {
      revenueGrowth: null,
      netProfitGrowth: null,
      roe: pct(quote.returnOnEquity),
      der: null,
      npm: pct(quote.profitMargins),
      eps: num(quote.epsTrailingTwelveMonths)
    };
    const valuation = {
      per: num(quote.trailingPE),
      pbv: num(quote.priceToBook),
      dividendYield: pct(quote.dividendYield),
      fairValue: null
    };

    return json({
      ticker,
      name: quote.longName || quote.shortName || z.meta?.longName || ticker,
      price: Number.isFinite(price) ? price : null,
      currency: quote.currency || z.meta?.currency || 'IDR',
      updated: quote.regularMarketTime ? new Date(quote.regularMarketTime * 1000).toLocaleString('id-ID') : new Date().toLocaleString('id-ID'),
      source: 'Yahoo Finance Chart/Quote API (unofficial fallback)',
      ohlc,
      fundamentals,
      fundamental: fundamentals,
      valuation,
      bigMoney: { foreignNet: null, brokerAccumulation: null, topBuyers: [], topSellers: [] },
      news: [],
      corporateActions: chartEvents(z.events)
    });
  } catch (e) {
    return json({ error: e.message }, 502);
  }
};

export const config = { path: '/api/stock/:ticker' };

function num(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }
function pct(v) { const n = Number(v); return Number.isFinite(n) ? n * 100 : null; }
function chartEvents(events = {}) {
  const out = [];
  for (const [ts, x] of Object.entries(events.dividends || {})) out.push({ type: 'DIVIDEND', date: new Date(Number(ts) * 1000).toISOString().slice(0, 10), title: 'Dividend', details: `Dividend ${x.amount ?? ''}` });
  for (const [ts, x] of Object.entries(events.splits || {})) out.push({ type: 'SPLIT', date: new Date(Number(ts) * 1000).toISOString().slice(0, 10), title: 'Stock Split', details: `Split ${x.numerator ?? ''}:${x.denominator ?? ''}` });
  return out.sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60', 'access-control-allow-origin': '*' } });
    }
