const YAHOO_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search?q=';

export default async (req, context) => {
  try {
    const url = new URL(req.url);

    const rawTicker =
      context.params?.ticker ||
      url.searchParams.get('ticker') ||
      '';

    if (!rawTicker) {
      return json([]);
    }

    // Normalisasi saham Indonesia:
    // BBCA -> BBCA.JK
    // BBCA.JK -> BBCA.JK
    // AAPL -> AAPL.JK
    const ticker = rawTicker
      .trim()
      .toUpperCase();

    const yahooTicker =
      ticker.includes('.') || ticker.startsWith('^')
        ? ticker
        : `${ticker}.JK`;

    // Query utama menggunakan ticker Indonesia
    let items = await searchYahoo(yahooTicker);

    // Jika hasil terlalu sedikit, coba nama/ticker Indonesia
    if (items.length === 0) {
      items = await searchYahoo(`${ticker} Indonesia`);
    }

    return json(items);

  } catch (err) {
    return json([]);
  }
};

async function searchYahoo(query) {
  try {
    const endpoint =
      `${YAHOO_SEARCH}${encodeURIComponent(query)}` +
      `&newsCount=10&quotesCount=5`;

    const r = await fetch(endpoint, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (!r.ok) return [];

    const d = await r.json();

    const news = Array.isArray(d.news) ? d.news : [];

    return news.map(n => ({
      title: n.title || '',
      date: n.providerPublishTime
        ? new Date(n.providerPublishTime * 1000).toISOString()
        : null,
      source: n.publisher || '',
      url: n.link || '',
      sentiment: 'UNKNOWN'
    })).filter(x => x.title);

  } catch {
    return [];
  }
}

export const config = {
  path: '/api/news/:ticker'
};

function json(x) {
  return new Response(
    JSON.stringify(x),
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=300',
        'access-control-allow-origin': '*'
      }
    }
  );
    }
