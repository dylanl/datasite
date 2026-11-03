"use client";

import { useEffect, useMemo, useState } from "react";
import { topics } from "@/data/topics";

export function DataAtlas() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All topics");
  const [selectedId, setSelectedId] = useState(topics[0].id);
  const [economyData, setEconomyData] = useState(null);
  const [economyStatus, setEconomyStatus] = useState("loading");
  const [predictionData, setPredictionData] = useState(null);
  const [predictionStatus, setPredictionStatus] = useState("loading");
  const [hoveredSourceIndex, setHoveredSourceIndex] = useState(null);

  useEffect(() => {
    setHoveredSourceIndex(null);
  }, [selectedId]);

  useEffect(() => {
    let active = true;
    fetch("/api/economy")
      .then((response) => {
        if (!response.ok) throw new Error("Source data unavailable");
        return response.json();
      })
      .then((data) => {
        if (active) {
          setEconomyData(data);
          setEconomyStatus("live");
        }
      })
      .catch(() => {
        if (active) setEconomyStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/predictions")
      .then((response) => {
        if (!response.ok) throw new Error("Prediction markets unavailable");
        return response.json();
      })
      .then((data) => {
        if (active) {
          setPredictionData(data);
          setPredictionStatus("live");
        }
      })
      .catch(() => {
        if (active) setPredictionStatus("error");
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = ["All topics", ...new Set(topics.map((topic) => topic.category))];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return topics.filter((topic) => {
      const matchesCategory = category === "All topics" || topic.category === category;
      const matchesSearch =
        !needle ||
        `${topic.category} ${topic.question} ${topic.summary} ${topic.source}`
          .toLowerCase()
          .includes(needle);
      return matchesCategory && matchesSearch;
    });
  }, [query, category]);

  const selected =
    topics.find((topic) => topic.id === selectedId) ?? topics[0];
  const isEconomy = selected.id === "economy";
  const isPredictions = selected.id === "predictions";
  const comparisonPoints = economyData?.points ?? [];
  const references = selected.references ?? [
    { name: selected.source, url: selected.sourceUrl },
  ];
  const width = 720;
  const height = 260;
  const left = 42;
  const right = 18;
  const top = 18;
  const bottom = 36;
  const min = Math.min(...selected.series.map((point) => point.value));
  const max = Math.max(...selected.series.map((point) => point.value));
  const x = (index) =>
    left + (index / Math.max(selected.series.length - 1, 1)) * (width - left - right);
  const y = (value) =>
    top + ((max - value) / Math.max(max - min, 1)) * (height - top - bottom);
  const linePath = selected.series
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(point.value)}`)
    .join(" ");
  const comparisonValues = comparisonPoints.flatMap((point) => [
    point.cpiIndex,
    point.incomeIndex,
  ]);
  const comparisonMin = comparisonValues.length ? Math.floor(Math.min(...comparisonValues) / 5) * 5 : 0;
  const comparisonMax = comparisonValues.length ? Math.ceil(Math.max(...comparisonValues) / 5) * 5 : 100;
  const comparisonX = (index) =>
    left + (index / Math.max(comparisonPoints.length - 1, 1)) * (width - left - right);
  const comparisonY = (value) =>
    top + ((comparisonMax - value) / Math.max(comparisonMax - comparisonMin, 1)) * (height - top - bottom);

  return (
    <main className="atlas">
      <section className="hero">
        <div>
          <p className="eyebrow">PUBLIC DATA, IN CONTEXT</p>
          <h1>Questions worth answering.<br />Data worth comparing.</h1>
          <p className="hero-copy">
            Explore public indicators across the economy, climate, health,
            technology, energy, and education.
          </p>
        </div>
      </section>

      <section className="explorer" aria-label="Data question explorer">
        <div className="explorer-controls">
          <label className="search">
            <span className="sr-only">Search data topics</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a question, topic, or source"
            />
          </label>
          <div className="category-tabs" aria-label="Filter by category">
            {categories.map((item) => (
              <button
                className={category === item ? "active" : ""}
                key={item}
                onClick={() => setCategory(item)}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="atlas-grid">
          <div className="topic-list">
            <p className="result-count">{filtered.length} questions</p>
            {filtered.map((topic) => (
              <button
                type="button"
                className={`topic-card ${selected.id === topic.id ? "selected" : ""}`}
                key={topic.id}
                onClick={() => setSelectedId(topic.id)}
                style={{ "--accent": topic.accent }}
              >
                <span className="topic-category">{topic.category}</span>
                <strong>{topic.question}</strong>
                <span className="topic-source">{topic.source}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="empty-state">No topics match that search.</p>
            )}
          </div>

          <div className="chart-column">
          <article className="chart-panel" style={{ "--accent": selected.accent }}>
            <div className="chart-heading">
              <div>
                <p className="topic-category">{selected.category}</p>
                <h2>{selected.question}</h2>
              </div>
              <span className="update-badge">{selected.updated} update</span>
            </div>
            <p className="chart-summary">{selected.summary}</p>
            <div className="chart">
              {isPredictions && predictionStatus === "loading" && (
                <div className="chart-loading">Aggregating prediction-market questions...</div>
              )}
              {isPredictions && predictionStatus === "error" && (
                <div className="chart-loading">Prediction-market sources are temporarily unavailable.</div>
              )}
              {isPredictions && predictionStatus === "live" && predictionData && (
                <>
                  <div className="prediction-legend" aria-label="Prediction source status">
                    {predictionData.sourceStatus.map((source, index) => (
                      <span
                        key={source.source}
                        className={hoveredSourceIndex === index ? "legend-highlighted" : ""}
                        onMouseEnter={() => setHoveredSourceIndex(index)}
                        onMouseLeave={() => setHoveredSourceIndex(null)}
                      >
                        <i className={`source-dot source-${index}`} />
                        {source.source} · {source.count}
                      </span>
                    ))}
                  </div>
                  <div className="prediction-groups" role="list">
                    {predictionData.groups.slice(0, 8).map((group) => (
                      <article className="prediction-group" key={group.id} role="listitem">
                        <div className="prediction-group-heading">
                          <strong>{group.name}</strong>
                          <span>{group.count} markets · {Math.round((group.medianProbability ?? 0) * 100)}% median</span>
                        </div>
                        <div className="prediction-bars">
                          {group.bySource.map((source) => {
                            const sourceIndex = ["Polymarket", "PredictIt", "Kalshi"].indexOf(source.source);
                            return (
                              <button
                                type="button"
                                className="prediction-bar-row"
                                key={source.source}
                                disabled={source.medianProbability === null}
                                onMouseEnter={() => setHoveredSourceIndex(sourceIndex)}
                                onMouseLeave={() => setHoveredSourceIndex(null)}
                                onFocus={() => setHoveredSourceIndex(sourceIndex)}
                                onBlur={() => setHoveredSourceIndex(null)}
                              >
                                <span>{source.source}</span>
                                <span className="prediction-bar-track">
                                  <i
                                    className={`prediction-bar source-${sourceIndex}`}
                                    style={{ width: `${Math.round((source.medianProbability ?? 0) * 100)}%` }}
                                  />
                                </span>
                                <b>{source.medianProbability === null ? "—" : `${Math.round(source.medianProbability * 100)}%`}</b>
                              </button>
                            );
                          })}
                        </div>
                      </article>
                    ))}
                    {predictionData.groups.length === 0 && (
                      <div className="chart-loading">No comparable open markets were returned.</div>
                    )}
                  </div>
                </>
              )}
              {isEconomy && economyStatus === "loading" && (
                <div className="chart-loading">Loading CPI and household income...</div>
              )}
              {isEconomy && economyStatus === "error" && (
                <div className="chart-loading">Unable to load both source datasets. Try again shortly.</div>
              )}
              {isEconomy && economyStatus === "live" && economyData ? (
                <>
                  <div className="comparison-legend" aria-label="Chart legend">
                    <span
                      className={hoveredSourceIndex === 0 ? "legend-highlighted" : ""}
                      onMouseEnter={() => setHoveredSourceIndex(0)}
                      onMouseLeave={() => setHoveredSourceIndex(null)}
                    >
                      <i className="legend-line cpi" />Consumer Price Index
                    </span>
                    <span
                      className={hoveredSourceIndex === 2 ? "legend-highlighted" : ""}
                      onMouseEnter={() => setHoveredSourceIndex(2)}
                      onMouseLeave={() => setHoveredSourceIndex(null)}
                    >
                      <i className="legend-line income" />Median household income
                    </span>
                  </div>
                  <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Consumer Price Index compared with median household income from 2019">
                    {[0, 1, 2, 3, 4].map((tick) => {
                      const value = comparisonMin + ((comparisonMax - comparisonMin) * tick) / 4;
                      const lineY = comparisonY(value);
                      return (
                        <g key={tick}>
                          <line x1={left} x2={width - right} y1={lineY} y2={lineY} className="grid-line" />
                          <text x={left - 10} y={lineY + 4} textAnchor="end" className="axis-label">
                            {Math.round(value)}
                          </text>
                        </g>
                      );
                    })}
                    <path
                      d={comparisonPoints.map((point, index) =>
                        `${index === 0 ? "M" : "L"} ${comparisonX(index)} ${comparisonY(point.cpiIndex)}`
                      ).join(" ")}
                      fill="none"
                      className={`trend-line comparison-cpi ${hoveredSourceIndex === 0 ? "series-highlighted" : ""}`}
                      onMouseEnter={() => setHoveredSourceIndex(0)}
                      onMouseLeave={() => setHoveredSourceIndex(null)}
                    />
                    <path
                      d={comparisonPoints.map((point, index) =>
                        `${index === 0 ? "M" : "L"} ${comparisonX(index)} ${comparisonY(point.cpiIndex)}`
                      ).join(" ")}
                      fill="none"
                      className="comparison-hit-target"
                      onMouseEnter={() => setHoveredSourceIndex(0)}
                      onMouseLeave={() => setHoveredSourceIndex(null)}
                    />
                    <path
                      d={comparisonPoints.map((point, index) =>
                        `${index === 0 ? "M" : "L"} ${comparisonX(index)} ${comparisonY(point.incomeIndex)}`
                      ).join(" ")}
                      fill="none"
                      className={`comparison-income ${hoveredSourceIndex === 2 ? "series-highlighted" : ""}`}
                      onMouseEnter={() => setHoveredSourceIndex(2)}
                      onMouseLeave={() => setHoveredSourceIndex(null)}
                    />
                    <path
                      d={comparisonPoints.map((point, index) =>
                        `${index === 0 ? "M" : "L"} ${comparisonX(index)} ${comparisonY(point.incomeIndex)}`
                      ).join(" ")}
                      fill="none"
                      className="comparison-hit-target"
                      onMouseEnter={() => setHoveredSourceIndex(2)}
                      onMouseLeave={() => setHoveredSourceIndex(null)}
                    />
                    {comparisonPoints.map((point, index) => (
                      <g key={point.year}>
                        <circle cx={comparisonX(index)} cy={comparisonY(point.cpiIndex)} r="5" className="trend-point comparison-cpi-point" aria-label={`${point.year} CPI index ${point.cpiIndex}`} />
                        <circle cx={comparisonX(index)} cy={comparisonY(point.incomeIndex)} r="5" className="income-point" aria-label={`${point.year} income index ${point.incomeIndex}`} />
                        <text x={comparisonX(index)} y={height - 8} textAnchor="middle" className="axis-label">{point.year}</text>
                      </g>
                    ))}
                  </svg>
                </>
              ) : !isEconomy ? (
              <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Illustrative trend for ${selected.question}`}>
                {[0, 1, 2, 3].map((tick) => {
                  const value = min + ((max - min) * tick) / 3;
                  const lineY = y(value);
                  return (
                    <g key={tick}>
                      <line x1={left} x2={width - right} y1={lineY} y2={lineY} className="grid-line" />
                      <text x={left - 10} y={lineY + 4} textAnchor="end" className="axis-label">
                        {Math.round(value)}
                      </text>
                    </g>
                  );
                })}
                <path d={linePath} fill="none" className="trend-line" />
                {selected.series.map((point, index) => (
                  <g key={point.year}>
                    <circle
                      cx={x(index)}
                      cy={y(point.value)}
                      r="5"
                      className="trend-point"
                      aria-label={`${point.year}: ${point.value}`}
                    />
                    <text x={x(index)} y={height - 8} textAnchor="middle" className="axis-label">
                      {point.year}
                    </text>
                  </g>
                ))}
              </svg>
              ) : null}
            </div>
            <footer className="source-row">
              <span>Reference source: <a href={selected.sourceUrl} target="_blank" rel="noreferrer">{selected.source}</a></span>
              <span className={(isEconomy && economyStatus === "live") || (isPredictions && predictionStatus === "live") ? "live-note" : "demo-note"}>
                {isPredictions && predictionStatus === "live"
                  ? "Live market data"
                  : isEconomy && economyStatus === "live"
                    ? economyData?.status === "api" ? "Live federal-source data" : "Federal source data"
                    : "Illustrative preview data"}
              </span>
            </footer>
          </article>
          <aside className="reference-panel" aria-labelledby="reference-heading">
            <div className="reference-heading-row">
              <div>
                <p className="topic-category">Data aggregation</p>
                <h2 id="reference-heading">Reference sources</h2>
              </div>
              <span>{references.length} sources</span>
            </div>
            <div className="reference-list">
              {references.map((reference, index) => (
                <a
                  className={`reference-item ${
                    (index === 0 && hoveredSourceIndex === 0) ||
                    (isPredictions && index === hoveredSourceIndex) ||
                    (index === 2 && hoveredSourceIndex === 2)
                      ? "source-highlighted"
                      : ""
                  }`}
                  href={reference.url}
                  target="_blank"
                  rel="noreferrer"
                  key={`${reference.name}-${reference.url}`}
                >
                  <span className="reference-number">{String(index + 1).padStart(2, "0")}</span>
                  <span>
                    <strong>{reference.name}</strong>
                    <small>{new URL(reference.url).hostname.replace(/^www\./, "")}</small>
                  </span>
                  <span aria-hidden="true" className="reference-arrow">↗</span>
                </a>
              ))}
            </div>
          </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
