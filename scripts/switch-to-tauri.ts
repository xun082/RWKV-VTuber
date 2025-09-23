import * as fs from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const path = resolve(__dirname, "../src/lib/utils.ts");
const content = await fs.readFile(path, "utf-8");
await fs.writeFile(
  path,
  content.replace(/\.\/api\/web\/api\./g, "./api/tauri/api.")
);
