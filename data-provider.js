/* Stock Analyzer Data Provider Contract
   Set STOCK_ANALYZER_API to your Worker/API base.
*/
const DataProvider = {
  async getStock(ticker, range="1y") {
    const base=(window.STOCK_ANALYZER_API||"").replace(/\/$/,"");
    if(!base) throw new Error("STOCK_ANALYZER_API belum dikonfigurasi");
    const r=await fetch(`${base}/api/stock/${encodeURIComponent(ticker)}?range=${encodeURIComponent(range)}`);
    if(!r.ok) throw new Error(`API HTTP ${r.status}`);
    return await r.json();
  },
  async getNews(ticker) {
    const base=(window.STOCK_ANALYZER_API||"").replace(/\/$/,"");
    if(!base) return [];
    const r=await fetch(`${base}/api/news/${encodeURIComponent(ticker)}`);
    if(!r.ok) return [];
    return await r.json();
  },
  async getCorporateActions(ticker) {
    const base=(window.STOCK_ANALYZER_API||"").replace(/\/$/,"");
    if(!base) return [];
    const r=await fetch(`${base}/api/corporate-actions/${encodeURIComponent(ticker)}`);
    if(!r.ok) return [];
    return await r.json();
  }
};
