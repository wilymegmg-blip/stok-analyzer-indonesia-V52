// Corporate actions are returned by the stock function from Yahoo chart events.
// This endpoint is intentionally conservative: it does not invent IDX announcements.
export default async () => new Response('[]', { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=300', 'access-control-allow-origin': '*' } });
export const config = { path: '/api/corporate-actions/:ticker' };
