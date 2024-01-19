"use server";
import { readFileSync } from "fs";
import * as d3 from "d3";

export async function getGraphData() {
  const csvData = readFileSync("src/assets/Table-25-2017-18.csv", "utf-8");

  const parsedData = d3.csvParse(csvData);
  return parsedData;
}