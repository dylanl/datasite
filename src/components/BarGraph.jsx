"use client";
import * as d3 from "d3";
import { useRef, useState, useEffect } from "react";

export async function getGraphData() {
  const csvData = await d3.csv("/Alphabets.csv", (row) => ({
    letter: row.letter,
    frequency: parseInt(row.frequency),
  }));
  return csvData ?? [];
}
export function BarGraph() {
  let [data, setData] = useState([]);
  const svgRef = useRef();

  //makes sure that only one call is made to refresh the graph
  useEffect(() => {
    getGraphData().then((graphData) => {
      setData(graphData);
    });
  }, []);

  //we need to make this responsive.
  useEffect(() => {
    const width = 928;
    const height = 500;
    const marginTop = 50;
    const marginRight = 0;
    const marginBottom = 50;
    const marginLeft = 40;

    // Declare the x (horizontal position) scale.
    const xScale = d3
      .scaleBand()
      .domain(
        d3.groupSort(
          data,
          ([d]) => -d.frequency,
          (d) => d.letter
        )
      ) // descending frequency
      .range([marginLeft, width - marginRight])
      .padding(0.05);

    // Declare the y (vertical position) scale.
    const yScale = d3
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
      .attr("x", (d) => xScale(d.letter))
      .attr("y", (d) => yScale(d.frequency))
      .attr("height", (d) => yScale(0) - yScale(d.frequency))
      .attr("width", xScale.bandwidth())
      .on("mouseover", (e) => {
        d3.select(e.target)
          .attr("fill", "#819cd1")
          .attr("stroke", "#819cd1")
          .attr("stroke-width", "2");
      })
      .on("mouseout", (e) => {
        d3.select(e.target)
          .attr("fill", "steelblue")
          .attr("stroke", "none");
      });  

    // Add the x-axis and label.
    svg
      .append("g")
      .attr("transform", `translate(0,${height - marginBottom})`)
      .call(d3.axisBottom(xScale).tickSizeOuter(0));

    // Add the y-axis and label, and remove the domain line.
    svg
      .append("g")
      .attr("transform", `translate(${marginLeft},0)`)
      .call(d3.axisLeft(yScale).tickFormat((y) => y.toFixed()))
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
