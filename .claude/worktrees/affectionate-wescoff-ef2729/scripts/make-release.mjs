import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const releaseRoot = path.join(rootDir, "releases");
const stageDir = path.join(releaseRoot, "ugc-it-service-release");

const now = new Date();
const timestamp = [
  now.getFullYear(),
  String(now.getMonth() + 1).padStart(2, "0"),
  String(now.getDate()).padStart(2, "0"),
  "-",
  String(now.getHours()).padStart(2, "0"),
  String(now.getMinutes()).padStart(2, "0"),
  String(now.getSeconds()).padStart(2, "0"),
].join("");
const zipPath = path.join(releaseRoot, `ugc-it-service-release-${timestamp}.zip`);

const requiredPaths = [
  "dist",
  "migrations",
  "scripts",
  "deploy",
  "src",
  "server.ts",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "vite.config.ts",
  "index.html",
  ".env.production.example",
  ".env.example",
  "README.md",
];

for (const relativePath of requiredPaths) {
  if (!fs.existsSync(path.join(rootDir, relativePath))) {
    console.error(`Missing required release path: ${relativePath}`);
    process.exit(1);
  }
}

fs.mkdirSync(releaseRoot, { recursive: true });
fs.rmSync(stageDir, { recursive: true, force: true });
fs.mkdirSync(stageDir, { recursive: true });

for (const relativePath of requiredPaths) {
  fs.cpSync(path.join(rootDir, relativePath), path.join(stageDir, relativePath), {
    recursive: true,
    filter: (source) => {
      const normalized = source.replaceAll("\\", "/");
      return !normalized.includes("/scripts/__pycache__");
    },
  });
}

const publicStageDir = path.join(stageDir, "public");
fs.mkdirSync(publicStageDir, { recursive: true });
for (const asset of ["UGC_Logo_1.png", "telephone-index-2025.pdf"]) {
  const source = path.join(rootDir, "public", asset);
  if (fs.existsSync(source)) {
    fs.copyFileSync(source, path.join(publicStageDir, asset));
  }
}

fs.rmSync(zipPath, { force: true });
const psEscape = (value) => value.replaceAll("'", "''");
const command = `Compress-Archive -LiteralPath '${psEscape(stageDir)}' -DestinationPath '${psEscape(zipPath)}' -Force`;
const result = spawnSync("powershell.exe", ["-NoProfile", "-Command", command], {
  stdio: "inherit",
  shell: false,
});

if (result.status !== 0) {
  console.error("Release archive creation failed.");
  process.exit(result.status ?? 1);
}

console.log(`Release archive created: ${zipPath}`);
