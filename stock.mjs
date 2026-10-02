const YAHOO_QUOTE = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=';
const YAHOO_CHART = 'https://query1.finance.yahoo.com/v8/finance/chart/';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36';

export default async (req, context) => {
  const rawTicker =
    context.params?.ticker ||
    new URL(req.url).searchParams.get('ticker') ||
    '';

  if (!rawTicker) return json({ error: 'Ticker kosong' }, 400);

  const ticker = rawTicker.toUpperCase().includes('.') || rawTicker.startsWith('^')
    ? rawTicker.toUpperCase()
    : rawTicker.toUpperCase() + '.JK';

  const range = new URL(req.url).searchParams.get('range') || '1y';

  try {
    const [chartRes, quoteRes] = await Promise.all([
      fetch(
        `${YAHOO_CHART}${encodeURIComponent(ticker)}?range=${encodeURIComponent(range)}&interval=1d&includePrePost=false&events=div%2Csplits`,
        { headers: { 'User-Agent': UA } }
      ),
      fetch(
        `${YAHOO_QUOTE}${encodeURIComponent(ticker)}`,
        { headers: { 'User-Agent': UA } }
      )
    ]);

    if (!chartRes.ok) {
      throw new Error(`Yahoo Chart HTTP ${chartRes.status}`);
    }

    const raw = await chartRes.json();
    const z = raw?.chart?.result?.[0];

    if (!z) {
      throw new Error('Data chart tidak tersedia');
    }

    const q = z.indicators?.quote?.[0] || {};
    const ts = z.timestamp || [];

    const ohlc = ts
      .map((t, i) => ({
        date: new Date(t * 1000).toISOString().slice(0, 10),
        open: q.open?.[i],
        high: q.high?.[i],
        low: q.low?.[i],
        close: q.close?.[i],
        volume: q.volume?.[i]
      }))
      .filter(x => Number.isFinite(Number(x.close)));

    let quote = {};

    if (quoteRes.ok) {
      const qr = await quoteRes.json();
      quote = qr?.quoteResponse?.result?.[0] || {};
    }

    // Ambil fundamental/valuation tambahan dari Yahoo quoteSummary.
    const summary = await yahooSummary(ticker);

    const sd = summary.summaryDetail || {};
    const ks = summary.defaultKeyStatistics || {};
    const fd = summary.financialData || {};

    const rawValue = v => {
      if (v && typeof v === 'object' && 'raw' in v) {
        return v.raw;
      }
      return v;
    };

    const price = Number(
      rawValue(quote.regularMarketPrice) ??
      z.meta?.regularMarketPrice ??
      ohlc.at(-1)?.close
    );

    const fundamentals = {
      revenueGrowth: pct(
        rawValue(fd.revenueGrowth)
      ),

      netProfitGrowth: pct(
        rawValue(fd.earningsGrowth)
      ),

      roe: pct(
        rawValue(fd.returnOnEquity) ??
        rawValue(quote.returnOnEquity)
      ),

      der: num(
        rawValue(fd.debtToEquity)
      ),

      npm: pct(
        rawValue(fd.profitMargins) ??
        rawValue(quote.profitMargins)
      ),

      eps: num(
        rawValue(sd.trailingEps) ??
        rawValue(ks.trailingEps) ??
        rawValue(quote.epsTrailingTwelveMonths)
      )
    };

    const valuation = {
      per: num(
        rawValue(sd.trailingPE) ??
        rawValue(ks.trailingPE) ??
        rawValue(quote.trailingPE)
      ),

      pbv: num(
        rawValue(ks.priceToBook) ??
        rawValue(quote.priceToBook)
      ),

      dividendYield: pct(
        rawValue(sd.dividendYield) ??
        rawValue(quote.dividendYield)
      ),

      fairValue: null
    };

    return json({
      ticker,

      name:
        quote.longName ||
        quote.shortName ||
        z.meta?.longName ||
        ticker,

      price: Number.isFinite(price) ? price : null,

      currency:
        quote.currency ||
        z.meta?.currency ||
        'IDR',

      updated:
        quote.regularMarketTime
          ? new Date(
              Number(quote.regularMarketTime) * 1000
            ).toISOString()
          : (
              ts.length
                ? new Date(
                    Number(ts.at(-1)) * 1000
                  ).toISOString()
                : new Date().toISOString()
            ),

      source:
        'Yahoo Finance Chart/Quote API + quoteSummary',

      ohlc,

      fundamentals,

      fundamental: fundamentals,

      valuation,

      bigMoney: {
        foreignNet: null,
        brokerAccumulation: null,
        topBuyers: [],
        topSellers: []
      },

      news: [],

      corporateActions:
        chartEvents(z.events)
    });

  } catch (e) {
    return json(
      { error: e.message },
      502
    );
  }
};

export const config = {
  path: '/api/stock/:ticker'
};


// ======================================================
// Yahoo quoteSummary
// ======================================================

async function yahooSummary(ticker) {
  try {
    const cookieRes = await fetch(
      'https://fc.yahoo.com/consent',
      {
        headers: {
          'User-Agent': UA
        }
      }
    );

    let cookie = '';

    if (typeof cookieRes.headers.getSetCookie === 'function') {
      cookie = cookieRes.headers
        .getSetCookie()
        .map(x => x.split(';')[0])
        .join('; ');
    } else {
      const setCookie =
        cookieRes.headers.get('set-cookie') || '';

      cookie = setCookie
        .split(/,(?=[^;]+=)/)
        .map(x => x.split(';')[0])
        .join('; ');
    }

    if (!cookie) {
      return {};
    }

    const crumbRes = await fetch(
      'https://query1.finance.yahoo.com/v1/test/getcrumb',
      {
        headers: {
          'User-Agent': UA,
          'Cookie': cookie
        }
      }
    );

    if (!crumbRes.ok) {
      return {};
    }

    const crumb = (await crumbRes.text()).trim();

    if (!crumb || crumb.includes('<')) {
      return {};
    }

    const modules =
      'summaryDetail,defaultKeyStatistics,financialData';

    const url =
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/` +
      `${encodeURIComponent(ticker)}` +
      `?modules=${modules}` +
      `&crumb=${encodeURIComponent(crumb)}`;

    const res = await fetch(
      url,
      {
        headers: {
          'User-Agent': UA,
          'Cookie': cookie
        }
      }
    );

    if (!res.ok) {
      return {};
    }

    const data = await res.json();

    return (
      data?.quoteSummary?.result?.[0] ||
      {}
    );

  } catch {
    // Fundamental gagal → harga/chart tetap jalan.
    return {};
  }
}


// ======================================================
// Helpers
// ======================================================

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pct(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n * 100 : null;
}

function chartEvents(events = {}) {
  const out = [];

  for (
    const [ts, x]
    of Object.entries(events.dividends || {})
  ) {
    out.push({
      type: 'DIVIDEND',
      date:
        new Date(
          Number(ts) * 1000
        ).toISOString().slice(0, 10),
      title: 'Dividend',
      details:
        `Dividend ${x.amount ?? ''}`
    });
  }

  for (
    const [ts, x]
    of Object.entries(events.splits || {})
  ) {
    out.push({
      type: 'SPLIT',
      date:
        new Date(
          Number(ts) * 1000
        ).toISOString().slice(0, 10),
      title: 'Stock Split',
      details:
        `Split ${x.numerator ?? ''}:${x.denominator ?? ''}`
    });
  }

  return out.sort(
    (a, b) =>
      String(b.date).localeCompare(
        String(a.date)
      )
  );
}

function json(obj, status = 200) {
  return new Response(
    JSON.stringify(obj),
    {
      status,
      headers: {
        'content-type':
          'application/json; charset=utf-8',
        'cache-control':
          'public, max-age=60',
        'access-control-allow-origin':
          '*'
      }
    }
  );
}
