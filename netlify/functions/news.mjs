
const YAHOO_SEARCH =
  'https://query1.finance.yahoo.com/v1/finance/search?q=';

export default async (req, context) => {
  try {
    const url = new URL(req.url);

    // Ambil ticker dari query ?ticker=BBCA
    // atau dari parameter Netlify jika tersedia
    const rawTicker =
      context.params?.ticker ||
      url.searchParams.get('ticker') ||
      '';

    if (!rawTicker) {
      return json([]);
    }

    // Normalisasi saham Indonesia:
    // BBCA -> BBCA.JK
    // BBCA.JK -> tetap BBCA.JK
    let ticker = rawTicker.trim().toUpperCase();

    if (!ticker.includes('.') && !ticker.startsWith('^')) {
      ticker += '.JK';
    }

    // Cari berita berdasarkan ticker saham Indonesia
    const query = encodeURIComponent(ticker);

    const response = await fetch(
      `${YAHOO_SEARCH}${query}&newsCount=10&quotesCount=0`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }
    );

    if (!response.ok) {
      return json([]);
    }

    const data = await response.json();

    const news = Array.isArray(data?.news)
      ? data.news
      : [];

    const items = news
      .map(item => ({
        title: item.title || '',
        date: item.providerPublishTime
          ? new Date(
              Number(item.providerPublishTime) * 1000
            ).toISOString()
          : null,
        source: item.publisher || '',
        url: item.link || '',
        sentiment: 'UNKNOWN'
      }))
      .filter(item => item.title);

    return json(items.slice(0, 10));

  } catch (error) {
    return json([]);
  }
};

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=300',
        'access-control-allow-origin': '*'
      }
    }
  );
}
