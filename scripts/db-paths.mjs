import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const projectRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(projectRoot, ".env.local") });
dotenv.config({ path: path.join(projectRoot, ".env") });

const configuredDbPath = process.env.DATABASE_PATH?.trim();

export const sourceDbPath = configuredDbPath
  ? path.resolve(projectRoot, configuredDbPath)
  : path.join(projectRoot, "data", "database.sqlite");

export const backupDir = path.join(projectRoot, "backups");
