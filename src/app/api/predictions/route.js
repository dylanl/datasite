export const dynamic = "force-dynamic";

const CATEGORY_RULES = [
  { id: "elections", name: "Elections & politics", terms: ["president", "presidential", "election", "senate", "house", "congress", "governor", "democrat", "republican", "trump", "biden", "nominee"] },
  { id: "economy", name: "Economy & policy", terms: ["fed", "federal reserve", "inflation", "interest rate", "recession", "gdp", "economy", "tariff"] },
  { id: "world", name: "World affairs", terms: ["war", "ukraine", "russia", "china", "xi", "israel", "iran", "nato", "country", "leader"] },
  { id: "sports", name: "Sports", terms: ["nba", "nfl", "mlb", "nhl", "champion", "win", "playoff", "game", "soccer", "ufc"] },
  { id: "climate", name: "Climate & science", terms: ["temperature", "climate", "hurricane", "weather", "space", "earthquake"] },
  { id: "technology", name: "Technology", terms: ["ai", "artificial intelligence", "openai", "google", "apple", "microsoft", "crypto", "bitcoin"] },
];

function categorize(title) {
  const normalized = title.toLowerCase();
  return CATEGORY_RULES.find((category) =>
    category.terms.some((term) => normalized.includes(term)),
  ) ?? { id: "other", name: "Other markets" };
}

function median(values) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

async function fetchPolymarket() {
  const response = await fetch(
    "https://gamma-api.polymarket.com/markets?closed=false&active=true&limit=100",
    { cache: "no-store" },
  );
  if (!response.ok) throw new Error(`Polymarket returned ${response.status}`);
  const rows = await response.json();
  return rows.flatMap((market) => {
    if (!market.question || !market.active || market.closed) return [];
    let outcomes = [];
    let prices = [];
    try {
      outcomes = JSON.parse(market.outcomes ?? "[]");
      prices = JSON.parse(market.outcomePrices ?? "[]");
    } catch {
      return [];
    }
    const yesIndex = outcomes.findIndex((outcome) => outcome.toLowerCase() === "yes");
    const probability = Number(prices[yesIndex >= 0 ? yesIndex : 0]);
    if (!Number.isFinite(probability)) return [];
    return [{
      source: "Polymarket",
      title: market.question,
      url: market.slug ? `https://polymarket.com/event/${market.slug}` : "https://polymarket.com/",
      probability,
      volume: Number(market.volumeNum ?? market.volume ?? 0),
    }];
  }).sort((a, b) => b.volume - a.volume).slice(0, 30);
}

async function fetchPredictIt() {
  const response = await fetch("https://www.predictit.org/api/marketdata/all", {
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`PredictIt returned ${response.status}`);
  const data = await response.json();
  return (data.markets ?? []).flatMap((market) => {
    const contracts = (market.contracts ?? []).filter(
      (contract) => contract.status === "Open" && Number.isFinite(Number(contract.lastTradePrice)),
    );
    if (!contracts.length) return [];
    if (contracts.length === 1) {
      return [{
        source: "PredictIt",
        title: market.name,
        url: market.url,
        probability: Number(contracts[0].lastTradePrice),
        volume: 0,
      }];
    }
    const leader = contracts.reduce((best, contract) =>
      Number(contract.lastTradePrice) > Number(best.lastTradePrice) ? contract : best,
    contracts[0]);
    return [{
      source: "PredictIt",
      title: `${market.name}: ${leader.name}`,
      url: market.url,
      probability: Number(leader.lastTradePrice),
      volume: 0,
    }];
  }).slice(0, 30);
}

async function fetchKalshi() {
  const response = await fetch(
    "https://api.elections.kalshi.com/trade-api/v2/markets?status=open&mve_filter=exclude&limit=100",
    { cache: "no-store", headers: { Accept: "application/json" } },
  );
  if (!response.ok) throw new Error(`Kalshi returned ${response.status}`);
  const data = await response.json();
  return (data.markets ?? []).flatMap((market) => {
    const lastPrice = Number(market.last_price_dollars ?? market.last_price);
    const yesBid = Number(market.yes_bid_dollars ?? market.yes_bid);
    const yesAsk = Number(market.yes_ask_dollars ?? market.yes_ask);
    const probability = Number.isFinite(lastPrice) && lastPrice > 0
      ? lastPrice
      : Number.isFinite(yesBid) && Number.isFinite(yesAsk) && (yesBid > 0 || yesAsk > 0)
        ? (yesBid + yesAsk) / 2
        : 0;
    if (!market.title || market.market_type !== "binary" || !Number.isFinite(probability)) return [];
    const normalized = probability > 1 ? probability / 100 : probability;
    return [{
      source: "Kalshi",
      title: market.title,
      url: `https://kalshi.com/markets/${market.event_ticker}/${market.market_ticker}`,
      probability: normalized,
      volume: Number(market.volume_24h_fp ?? market.volume_24h ?? 0),
    }];
  }).sort((a, b) => b.volume - a.volume).slice(0, 30);
}

export async function GET() {
  const results = await Promise.allSettled([
    fetchPolymarket(),
    fetchPredictIt(),
    fetchKalshi(),
  ]);

  const markets = results.flatMap((result, index) => {
    if (result.status !== "fulfilled") return [];
    return result.value;
  });

  const groups = new Map();
  markets.forEach((market) => {
    const category = categorize(market.title);
    if (!groups.has(category.id)) groups.set(category.id, { ...category, markets: [] });
    groups.get(category.id).markets.push(market);
  });

  const aggregate = [...groups.values()]
    .map((group) => {
      const bySource = ["Polymarket", "PredictIt", "Kalshi"].map((source) => {
        const sourceMarkets = group.markets.filter((market) => market.source === source);
        return {
          source,
          count: sourceMarkets.length,
          medianProbability: median(sourceMarkets.map((market) => market.probability)),
        };
      });
      const available = bySource.filter((source) => source.medianProbability !== null);
      return {
        ...group,
        count: group.markets.length,
        medianProbability: median(available.map((source) => source.medianProbability)),
        bySource,
      };
    })
    .filter((group) => group.count >= 2)
    .sort((a, b) => b.count - a.count);

  return Response.json({
    asOf: new Date().toISOString(),
    sourceStatus: [
      { source: "Polymarket", status: results[0].status, count: results[0].status === "fulfilled" ? results[0].value.length : 0 },
      { source: "PredictIt", status: results[1].status, count: results[1].status === "fulfilled" ? results[1].value.length : 0 },
      { source: "Kalshi", status: results[2].status, count: results[2].status === "fulfilled" ? results[2].value.length : 0 },
    ],
    groups: aggregate,
  });
}
