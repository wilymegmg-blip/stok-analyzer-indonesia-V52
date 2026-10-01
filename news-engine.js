/* News Engine
   Normalizes only supplied/authorized news records.
   Empty input => WAIT. No invented headlines.
*/
function normalizeNews(items = []) {
  if (!Array.isArray(items)) return {items:[], signal:"WAIT"};
  const clean = items.filter(x => x && (x.title || x.url)).map(x => ({
    title: String(x.title || ""),
    date: x.date || null,
    source: x.source || "",
    url: x.url || "",
    sentiment: ["POSITIVE","NEGATIVE","NEUTRAL"].includes(x.sentiment)
      ? x.sentiment : "UNKNOWN"
  }));
  const known = clean.filter(x => x.sentiment !== "UNKNOWN");
  if (!clean.length) return {items:[], signal:"WAIT"};
  if (!known.length) return {items:clean, signal:"AVAILABLE"};
  const s = known.reduce((a,x)=>a+(x.sentiment==="POSITIVE"?1:x.sentiment==="NEGATIVE"?-1:0),0);
  return {items:clean, signal:s>0?"POSITIVE":s<0?"NEGATIVE":"NEUTRAL"};
}
