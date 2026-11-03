"use client";
import * as d3 from "d3";
import { useRef, useState, useEffect } from "react";
import getCsvData from "@/actions/readCsv";

export function BarGraph() {
  let [data, setData] = useState([]);

  let tooltipStateRef = useRef({
    locked: false,
    data: "",
  });

  const tooltipRef = useRef();
  const svgRef = useRef();

  //makes sure that only one call is made to refresh the graph
  useEffect(() => {
    //get data by reading csv
    getCsvData().then((data) => {
      setData(
        d3.csvParse(data, (row) => ({
          letter: row.letter,
          frequency: parseInt(row.frequency),
        })),
      );
    });
  }, []);

  //Beginning of SVG graph
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
          (d) => d.letter,
        ),
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

    //Popup tooltip data
    const tooltip = d3
      .select(tooltipRef.current)
      .style("position", "absolute")
      .style("z-index", "10")
      .style("background", "lightblue")
      .style("opacity", 0)
      .style("padding-left", "1ch")
      .style("padding-right", "1ch")
      .style("border-radius", "0.5em 0.5em 0.5em 0")
      .style("color", "black");

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
      .on("click", function (_e, d) {
        if (!tooltipStateRef.current.locked) {
          tooltipStateRef.current = { locked: true, data: d.letter };
        } else if (d.letter === tooltipStateRef.current.data) {
          tooltipStateRef.current = { locked: false, data: "" };
        }
      })
      .on("mouseover", function (e, d) {
        d3.select(e.target)
          .attr("fill", "#819cd1")
          .attr("stroke", "#819cd1")
          .attr("stroke-width", "2");
        if (!tooltipStateRef.current.locked) {
          tooltip
            .text(d.letter) //enter tooltip data here
            .transition()
            .duration(50)
            .style("opacity", 0.9)
            .style(
              "left",
              xScale(d.letter) +
                xScale.bandwidth() +
                svg.node().getBoundingClientRect().left +
                "px",
            )
            .style("top", yScale(d.frequency) + "px")
            .style("width", `${xScale.bandwidth()}px`)
            .style("text-align", "left");
        }
      })
      .on("mouseout", (e) => {
        d3.select(e.target).attr("fill", "steelblue").attr("stroke", "none");
        if (!tooltipStateRef.current.locked) {
          tooltip.style("opacity", 0);
        }
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
          .text("↑ Frequency (%)"),
      );
  }, [data]);

  return (
    <>
      <div className="tooltip" ref={tooltipRef}></div>
      <svg className="bargraph" ref={svgRef}></svg>
    </>
  );
}
