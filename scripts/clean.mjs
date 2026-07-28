import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const DIST_URL = new URL("../dist", import.meta.url);

export async function cleanDist() {
  await rm(DIST_URL, {
    recursive: true,
    force: true,
  });
}

const entryPoint = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : undefined;

if (entryPoint === import.meta.url) {
  await cleanDist();
}
