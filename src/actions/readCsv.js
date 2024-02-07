"use server";
import fs from "node:fs/promises";
export default async function getCsvData() {
  const data = await fs.readFile("src/assets/Alphabets.csv", {
    encoding: "utf8",
  });
  return data;
}
