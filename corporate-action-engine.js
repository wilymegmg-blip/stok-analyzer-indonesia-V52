/* Corporate Action Engine
   Uses supplied records only.
*/
function normalizeCorporateActions(items = []) {
  if (!Array.isArray(items)) return {items:[], signal:"WAIT"};
  const clean = items.filter(Boolean).map(x => ({
    type: x.type || "UNKNOWN",
    title: x.title || "",
    date: x.date || null,
    status: x.status || "UNKNOWN",
    source: x.source || "",
    url: x.url || ""
  }));
  return {
    items: clean,
    signal: clean.length ? "AVAILABLE" : "WAIT"
  };
}
