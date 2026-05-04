import fs from "fs";
import path from "path";
import { backupDir, sourceDbPath } from "./db-paths.mjs";

if (!fs.existsSync(sourceDbPath)) {
  console.error(`Database file not found: ${sourceDbPath}`);
  process.exit(1);
}

fs.mkdirSync(backupDir, { recursive: true });

const now = new Date();
const pad = (value) => String(value).padStart(2, "0");
const timestamp = [
  now.getFullYear(),
  pad(now.getMonth() + 1),
  pad(now.getDate()),
].join("") + "-" + [
  pad(now.getHours()),
  pad(now.getMinutes()),
  pad(now.getSeconds()),
].join("");

const backupPath = path.join(backupDir, `database-${timestamp}.sqlite`);
fs.copyFileSync(sourceDbPath, backupPath);

console.log(`Backup created: ${backupPath}`);
