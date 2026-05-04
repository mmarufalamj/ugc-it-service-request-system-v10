import fs from "fs";
import path from "path";
import { backupDir, sourceDbPath } from "./db-paths.mjs";

if (!fs.existsSync(backupDir)) {
  console.error(`Backup folder not found: ${backupDir}`);
  process.exit(1);
}

const backupFiles = fs
  .readdirSync(backupDir)
  .filter((file) => file.endsWith(".sqlite"))
  .map((file) => ({
    file,
    fullPath: path.join(backupDir, file),
    mtimeMs: fs.statSync(path.join(backupDir, file)).mtimeMs,
  }))
  .sort((a, b) => b.mtimeMs - a.mtimeMs);

if (backupFiles.length === 0) {
  console.error("No backup files found.");
  process.exit(1);
}

fs.mkdirSync(path.dirname(sourceDbPath), { recursive: true });

if (fs.existsSync(sourceDbPath)) {
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

  const safetyBackupPath = path.join(backupDir, `pre-restore-${timestamp}.sqlite`);
  fs.copyFileSync(sourceDbPath, safetyBackupPath);
  console.log(`Safety backup created: ${safetyBackupPath}`);
}

const latestBackup = backupFiles[0];
fs.copyFileSync(latestBackup.fullPath, sourceDbPath);

console.log(`Restored database from: ${latestBackup.fullPath}`);
console.log(`Active database: ${sourceDbPath}`);
