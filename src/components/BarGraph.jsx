"use client";
import * as d3 from "d3";
import { getGraphData } from "@/app/utils";
import { useRef, useEffect } from "react";

function findLastNumber(inputString) {
  const pattern = /\$\d\d,\d\d\d/g;

  let lastMatch = null;
  let match;

  while ((match = pattern.exec(inputString)) !== null) {
    lastMatch = match?.replace(/,/g, "");
  }

  return lastMatch !== null ? parseInt(lastMatch) : null;
}

export async function BarGraph() {
  let data;
  const svgRef = useRef();

  useEffect(() => {
    data = getGraphData();
  }, []);

  useEffect(() => {
    if (data === "undefined") return;

    alert(data[0]["Salary band"]);

    // Declare the chart dimensions and margins.
    const width = 928;
    const height = 500;
    const marginTop = 30;
    const marginRight = 0;
    const marginBottom = 30;
    const marginLeft = 40;

    // Declare the x (horizontal position) scale.
    const x = d3
      .scaleBand()
      .domain(
        d3.groupSort(
          data,
          ([d]) => -d["Salary band"],
          (d) => d["Subject area of degree"]
        )
      ) // descending frequency
      .range([marginLeft, width - marginRight])
      .padding(0.1);

    // Declare the y (vertical position) scale.
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.frequency)])
      .range([height - marginBottom, marginTop]);

    // Create the SVG container.
    const svg = d3
      .select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height])
      .attr("style", "max-width: 100%; height: auto;");

    // Add a rect for each bar.
    svg
      .append("g")
      .attr("fill", "steelblue")
      .selectAll()
      .data(data)
      .join("rect")
      .attr("x", (d) => x(d.letter))
      .attr("y", (d) => y(d.frequency))
      .attr("height", (d) => y(0) - y(d.frequency))
      .attr("width", x.bandwidth());

    // Add the x-axis and label.
    svg
      .append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(x).tickSizeOuter(0));

    // Add the y-axis and label, and remove the domain line.
    svg
      .append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(y).tickFormat((y) => (y * 100).toFixed()))
      .call((g) => g.select(".domain").remove())
      .call((g) =>
        g
          .append("text")
          .attr("x", -marginLeft)
          .attr("y", 10)
          .attr("fill", "currentColor")
          .attr("text-anchor", "start")
          .text("↑ Frequency (%)")
      );
  }, [data]);

  return <svg ref={svgRef}></svg>;
}
