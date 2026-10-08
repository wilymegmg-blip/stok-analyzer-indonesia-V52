const YAHOO_QUOTE =
  'https://query1.finance.yahoo.com/v7/finance/quote?symbols=';

const YAHOO_CHART =
  'https://query1.finance.yahoo.com/v8/finance/chart/';

const YAHOO_TIMESERIES =
  'https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';

export default async (req, context) => {
  const rawTicker =
    context.params?.ticker ||
    new URL(req.url).searchParams.get('ticker') ||
    '';

  if (!rawTicker) {
    return json({ error: 'Ticker kosong' }, 400);
  }

  const ticker =
    rawTicker.toUpperCase().includes('.') ||
    rawTicker.startsWith('^')
      ? rawTicker.toUpperCase()
      : rawTicker.toUpperCase() + '.JK';

  const range =
    new URL(req.url).searchParams.get('range') || '1y';

  try {
    // ======================================================
    // Yahoo Chart + Quote
    // ======================================================

    const [chartRes, quoteRes] =
      await Promise.all([
        fetch(
          `${YAHOO_CHART}${encodeURIComponent(ticker)}?range=${encodeURIComponent(range)}&interval=1d&includePrePost=false&events=div%2Csplits`,
          {
            headers: {
              'User-Agent': UA
            }
          }
        ),

        fetch(
          `${YAHOO_QUOTE}${encodeURIComponent(ticker)}`,
          {
            headers: {
              'User-Agent': UA
            }
          }
        )
      ]);

    if (!chartRes.ok) {
      throw new Error(
        `Yahoo Chart HTTP ${chartRes.status}`
      );
    }

    const raw = await chartRes.json();

    const z =
      raw?.chart?.result?.[0];

    if (!z) {
      throw new Error(
        'Data chart tidak tersedia'
      );
    }

    const q =
      z.indicators?.quote?.[0] || {};

    const ts =
      z.timestamp || [];

    const ohlc =
      ts
        .map((t, i) => ({
          date:
            new Date(t * 1000)
              .toISOString()
              .slice(0, 10),

          open:
            q.open?.[i],

          high:
            q.high?.[i],

          low:
            q.low?.[i],

          close:
            q.close?.[i],

          volume:
            q.volume?.[i]
        }))
        .filter(x =>
          Number.isFinite(
            Number(x.close)
          )
        );

    // ======================================================
    // Quote
    // ======================================================

    let quote = {};

    if (quoteRes.ok) {
      const qr =
        await quoteRes.json();

      quote =
        qr?.quoteResponse?.result?.[0] ||
        {};
    }

    // ======================================================
    // Yahoo quoteSummary
    // ======================================================

    const summary =
      await yahooSummary(ticker);

    const sd =
      summary.summaryDetail || {};

    const ks
