import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const tsxCli = path.join(rootDir, "node_modules", "tsx", "dist", "cli.mjs");

const child = spawn(process.execPath, [tsxCli, "server.ts"], {
  cwd: rootDir,
  env: {
    ...process.env,
    NODE_ENV: "production",
  },
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
