/* Stock Analyzer Indonesia — Data Contract
   Backend response contract. Keep unknown/unavailable fields null/empty.
*/
const STOCK_DATA_CONTRACT = {
  ticker: "BBCA",
  name: "",
  price: null,
  currency: "IDR",
  updated: "",
  source: "",
  ohlc: [],
  fundamental: {
    revenueGrowth: null,
    netProfitGrowth: null,
    roe: null,
    der: null,
    npm: null,
    eps: null
  },
  valuation: {
    per: null,
    pbv: null,
    dividendYield: null,
    fairValue: null
  },
  bigMoney: {
    foreignNet: null,
    brokerAccumulation: null,
    topBuyers: null,
    topSellers: null
  },
  news: [],
  corporateActions: []
};
