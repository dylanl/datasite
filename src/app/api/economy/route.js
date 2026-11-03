export const dynamic = "force-dynamic";

const YEARS = [2019, 2020, 2021, 2022, 2023, 2024];
const CPI_FALLBACK = {
  2019: 255.657,
  2020: 258.811,
  2021: 270.977,
  2022: 292.655,
  2023: 304.702,
  2024: 313.689,
};
const INCOME_FALLBACK = {
  2019: 68703,
  2020: 67521,
  2021: 70784,
  2022: 74580,
  2023: 80610,
  2024: 83730,
};

function buildComparison(cpiByYear, incomeByYear, status) {
  const points = YEARS.flatMap((year) => {
    const cpi = cpiByYear[year];
    const income = incomeByYear[year];
    return cpi && income ? [{ year, cpi, income }] : [];
  });
  const base = points[0];
  return Response.json({
    status,
    baseYear: base.year,
    asOf: new Date().toISOString(),
    cpiUnit: "Consumer Price Index (U.S. city average, all items)",
    incomeUnit: "Median household income (current dollars)",
    points: points.map((point) => ({
      year: point.year,
      cpi: Number(point.cpi.toFixed(3)),
      income: point.income,
      cpiIndex: Number(((point.cpi / base.cpi) * 100).toFixed(1)),
      incomeIndex: Number(((point.income / base.income) * 100).toFixed(1)),
    })),
  });
}

export async function GET() {
  try {
    const blsResponse = await fetch("https://api.bls.gov/publicAPI/v2/timeseries/data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seriesid: ["CUUR0000SA0"],
        startyear: "2019",
        endyear: "2024",
      }),
      cache: "no-store",
    });

    if (!blsResponse.ok) throw new Error(`BLS returned ${blsResponse.status}`);
    const blsJson = await blsResponse.json();
    const observations = blsJson.Results?.series?.[0]?.data ?? [];
    const cpiByYear = {};
    observations.forEach((observation) => {
      const year = Number(observation.year);
      if (!YEARS.includes(year) || !/^M\d{2}$/.test(observation.period)) return;
      if (!cpiByYear[year]) cpiByYear[year] = [];
      cpiByYear[year].push(Number(observation.value));
    });

    const annualCpi = Object.fromEntries(
      Object.entries(cpiByYear).map(([year, values]) => [
        year,
        values.reduce((sum, value) => sum + value, 0) / values.length,
      ]),
    );

    const censusRows = await Promise.all(
      YEARS.map(async (year) => {
        const response = await fetch(
          `https://api.census.gov/data/${year}/acs/acs1?get=NAME,B19013_001E&for=us:*`,
          { cache: "no-store" },
        );
        if (!response.ok) return null;
        const rows = await response.json();
        return Number(rows?.[1]?.[1]) > 0 ? { year, income: Number(rows[1][1]) } : null;
      }),
    );

    const incomeByYear = Object.fromEntries(
      censusRows.filter(Boolean).map(({ year, income }) => [year, income]),
    );
    const points = YEARS.flatMap((year) => {
      const cpi = annualCpi[year];
      const income = incomeByYear[year];
      return cpi && income ? [{ year, cpi, income }] : [];
    });

    if (points.length < 2) throw new Error("The source APIs returned incomplete data");
    return buildComparison(
      Object.fromEntries(points.map(({ year, cpi }) => [year, cpi])),
      Object.fromEntries(points.map(({ year, income }) => [year, income])),
      "api",
    );
  } catch (error) {
    return buildComparison(
      CPI_FALLBACK,
      INCOME_FALLBACK,
      "federal-source-fallback",
    );
  }
}
