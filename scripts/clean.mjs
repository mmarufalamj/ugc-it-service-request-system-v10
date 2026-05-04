import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distPath = path.join(rootDir, "dist");

fs.rmSync(distPath, { recursive: true, force: true });
console.log(`Removed ${distPath}`);
