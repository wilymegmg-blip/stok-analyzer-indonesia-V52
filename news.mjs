const YAHOO_SEARCH = 'https://query1.finance.yahoo.com/v1/finance/search?q=';
export default async (req, context) => {
  const ticker = (context.params?.ticker || '').toUpperCase();
  if (!ticker) return new Response('[]', { headers: { 'content-type': 'application/json' } });
  try {
    const r = await fetch(`${YAHOO_SEARCH}${encodeURIComponent(ticker)}&newsCount=10&quotesCount=0`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!r.ok) return json([]);
    const d = await r.json();
    const items = (d.news || []).map(n => ({ title: n.title || '', date: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : null, source: n.publisher || '', url: n.link || '', sentiment: 'UNKNOWN' }));
    return json(items);
  } catch { return json([]); }
};
export const config = { path: '/api/news/:ticker' };
function json(x) { return new Response(JSON.stringify(x), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300', 'access-control-allow-origin': '*' } }); }
