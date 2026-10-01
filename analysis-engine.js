/* Stock Analyzer Indonesia — Analysis Engine
   Rules are deliberately transparent and only evaluate available data.
*/
function scoreTechnical(price, ma20, ma50, ma200, rsi, macd){
  let s=0, n=0;
  if(Number.isFinite(price)&&Number.isFinite(ma20)){s += price>ma20?1:-1;n++}
  if(Number.isFinite(price)&&Number.isFinite(ma50)){s += price>ma50?1:-1;n++}
  if(Number.isFinite(price)&&Number.isFinite(ma200)){s += price>ma200?1:-1;n++}
  if(Number.isFinite(rsi)){if(rsi>=50&&rsi<=70)s+=1;else if(rsi<30)s+=1;else if(rsi>70)s-=1;n++}
  if(Number.isFinite(macd)){s += macd>0?1:-1;n++}
  if(!n)return {signal:"WAIT",score:null,reason:"Data technical belum cukup"};
  return {signal:s>=Math.ceil(n*.6)?"POSITIVE":s<=-Math.ceil(n*.6)?"NEGATIVE":"NEUTRAL",score:s+"/"+n};
}
function scoreFundamental(f){
  const checks=[];
  if(f.revenueGrowth!=null)checks.push(parsePct(f.revenueGrowth)>0);
  if(f.netProfitGrowth!=null)checks.push(parsePct(f.netProfitGrowth)>0);
  if(f.roe!=null)checks.push(parsePct(f.roe)>0);
  if(f.npm!=null)checks.push(parsePct(f.npm)>0);
  if(!checks.length)return {signal:"WAIT",reason:"Fundamental belum tersedia"};
  const p=checks.filter(Boolean).length/checks.length;
  return {signal:p>=.6?"POSITIVE":p<=.4?"NEGATIVE":"NEUTRAL",available:checks.length};
}
function scoreValuation(v){
  if(v.per==null && v.pbv==null)return {signal:"WAIT",reason:"Valuation belum tersedia"};
  const checks=[];
  if(v.per!=null)checks.push(Number(v.per)>0);
  if(v.pbv!=null)checks.push(Number(v.pbv)>0);
  return {signal:"AVAILABLE",available:checks.length};
}
function parsePct(v){
  const n=parseFloat(String(v).replace("%",""));
  return Number.isFinite(n)?n:NaN;
}
function overall(data){
  const parts=[data.fundamental.signal,data.technical.signal,data.valuation.signal,data.bigMoney.signal];
  if(parts.every(x=>x==="WAIT"))return "WAIT";
  const active=parts.filter(x=>x==="POSITIVE"||x==="NEGATIVE");
  if(!active.length)return "WAIT";
  const p=active.filter(x=>x==="POSITIVE").length;
  const n=active.filter(x=>x==="NEGATIVE").length;
  return p>n?"POSITIVE":n>p?"NEGATIVE":"NEUTRAL";
}
