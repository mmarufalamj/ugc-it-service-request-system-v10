import express from "express";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import SQLiteDatabase from "better-sqlite3";
import pg from "pg";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env.local") });
dotenv.config({ path: path.join(__dirname, ".env") });

const SUPER_ADMIN_EMAIL = "mmarufalamj@gmail.com";
const SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD?.trim() || process.env.SEED_USER_PASSWORD?.trim() || crypto.randomUUID();
const SUPER_ADMIN_NAME = "Super Admin";
const MANAGED_PASSWORD_PLACEHOLDER = "__managed__";
const SUPER_ADMIN_NAME_BN = "সুপার অ্যাডমিন";

const DIVISION_SHORT_NAME_MAP: Record<string, string> = {
  "আইসিটি বিভাগ": "আইসিটি",
  "প্রশাসন বিভাগ": "প্রশাসন",
  "অর্থ ও হিসাব বিভাগ": "অর্থ-হিসাব",
  "পরিকল্পনা ও উন্নয়ন বিভাগ": "পরিকল্পনা",
  "পাবলিক বিশ্ববিদ্যালয় ম্যানেজমেন্ট বিভাগ": "পাবলিক বি.বি.",
  "বেসরকারি বিশ্ববিদ্যালয় ম্যানেজমেন্ট বিভাগ": "বেসরকারি বি.বি.",
  "আর্ন্তজাতিক সহযোগিতা বিভাগ": "আন্তর্জাতিক",
  "রিসার্চ গ্রান্টস এন্ড এওয়ার্ড বিভাগ": "রিসার্চ",
  "জনসংযোগ ও প্রকাশনা বিভাগ": "জনসংযোগ",
  "জেনারেল সার্ভিসেস এন্ড ইঞ্জিনিয়ারিং বিভাগ": "জিএসই",
  "অডিট বিভাগ": "অডিট",
  "অর্থ, হিসাব ও বাজেট বিভাগ": "বাজেট"
};

const toBanglaDigits = (value: string | number) =>
  value
    .toString()
    .replace(/\d/g, (digit) => "০১২৩৪৫৬৭৮৯"[parseInt(digit, 10)]);

const getDivisionShortName = (division: string) => {
  if (DIVISION_SHORT_NAME_MAP[division]) return DIVISION_SHORT_NAME_MAP[division];
  return division.replace(/\s*বিভাগ\s*$/u, "").trim() || "সাধারণ";
};

const getTrackingParts = (submissionDate: string) => {
  const [day = "01", month = "01", year = new Date().getFullYear().toString()] = submissionDate.split("/");
  return { day, month, year };
};

const buildTrackingNumber = (division: string, submissionDate: string, uniqueNumber: number) => {
  const { month, year } = getTrackingParts(submissionDate);
  return `আইটিএসএফ: ${toBanglaDigits(year)}/${getDivisionShortName(division)}/${toBanglaDigits(month.padStart(2, "0"))}/${toBanglaDigits(uniqueNumber.toString().padStart(4, "0"))}`;
};

const getNextTrackingSerial = async (division: string, submissionDate: string) => {
  const { month, year } = getTrackingParts(submissionDate);
  if (usingPostgres) {
    const counter = await db.prepare(`
      INSERT INTO application_tracking_counters (division, year, month, serial)
      VALUES (?, ?, ?, 1)
      ON CONFLICT (division, year, month)
      DO UPDATE SET serial = application_tracking_counters.serial + 1
      RETURNING serial
    `).get(division, year, month) as { serial: number } | undefined;
    return Number(counter?.serial) || 1;
  }

  const matchingApps = await db.prepare(
    "SELECT tracking_no FROM applications WHERE division = ? AND substr(submission_date, 4, 2) = ? AND substr(submission_date, 7, 4) = ?"
  ).all(division, month, year) as Array<{ tracking_no: string }>;

  let maxSerial = 0;
  for (const app of matchingApps) {
    const lastPart = app.tracking_no.split("/").pop()?.replace(/[^\d০-৯]/g, "") || "";
    const normalized = lastPart.replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)));
    const parsed = parseInt(normalized, 10);
    if (!Number.isNaN(parsed) && parsed > maxSerial) {
      maxSerial = parsed;
    }
  }

  return maxSerial + 1;
};

const legacyDbPath = path.join(__dirname, "database.sqlite");
const configuredDbPath = process.env.DATABASE_PATH?.trim();
const dbPath = configuredDbPath
  ? path.resolve(__dirname, configuredDbPath)
  : path.join(__dirname, "data", "database.sqlite");

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

if (dbPath !== legacyDbPath && !fs.existsSync(dbPath) && fs.existsSync(legacyDbPath)) {
  fs.copyFileSync(legacyDbPath, dbPath);
  console.log(`Copied existing database to ${dbPath}`);
}

const databaseUrl = process.env.DATABASE_URL?.trim();
const usingPostgres = !!databaseUrl;

const validateProductionEnvironment = () => {
  if (process.env.NODE_ENV !== "production") return;

  const errors: string[] = [];
  if (!databaseUrl) errors.push("DATABASE_URL is required in production.");
  if (!process.env.SUPER_ADMIN_PASSWORD?.trim()) errors.push("SUPER_ADMIN_PASSWORD is required in production.");
  if (!process.env.UPLOAD_DIR?.trim()) errors.push("UPLOAD_DIR must point to a durable production folder.");
  if (process.env.TRUST_PROXY !== "true") errors.push("TRUST_PROXY=true is required behind the HTTPS reverse proxy.");

  if (errors.length > 0) {
    throw new Error(`Production configuration error:\n- ${errors.join("\n- ")}`);
  }
};

validateProductionEnvironment();

const configuredDataShareOrigins = (process.env.DATA_SHARE_ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isAllowedDataShareOrigin = (origin: string) => {
  if (configuredDataShareOrigins.includes("*")) return true;
  if (configuredDataShareOrigins.includes(origin)) return true;
  if (process.env.NODE_ENV !== "production" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return true;
  }
  return false;
};

const normalizeSqlForPostgres = (sql: string) => {
  let index = 0;
  return sql
    .replace(/\s+COLLATE\s+NOCASE/gi, "")
    .replace(/\?/g, () => `$${++index}`);
};

const createDatabaseClient = () => {
  if (usingPostgres) {
    const pool = new pg.Pool({
      connectionString: databaseUrl,
      ssl: process.env.PGSSLMODE === "require" ? { rejectUnauthorized: false } : undefined,
    });

    return {
      prepare: (sql: string) => {
        const normalizedSql = normalizeSqlForPostgres(sql);
        return {
          all: async (...params: any[]) => (await pool.query(normalizedSql, params)).rows,
          get: async (...params: any[]) => (await pool.query(normalizedSql, params)).rows[0],
          run: async (...params: any[]) => {
            const result = await pool.query(normalizedSql, params);
            return {
              changes: result.rowCount || 0,
              lastInsertRowid: result.rows[0]?.id,
            };
          },
        };
      },
      exec: async (sql: string) => {
        await pool.query(sql);
      },
      close: async () => {
        await pool.end();
      },
      transaction: async <T>(callback: (tx: any) => Promise<T>) => {
        const client = await pool.connect();
        const tx = {
          prepare: (sql: string) => {
            const normalizedSql = normalizeSqlForPostgres(sql);
            return {
              all: async (...params: any[]) => (await client.query(normalizedSql, params)).rows,
              get: async (...params: any[]) => (await client.query(normalizedSql, params)).rows[0],
              run: async (...params: any[]) => {
                const result = await client.query(normalizedSql, params);
                return {
                  changes: result.rowCount || 0,
                  lastInsertRowid: result.rows[0]?.id,
                };
              },
            };
          },
          exec: async (sql: string) => {
            await client.query(sql);
          },
        };

        try {
          await client.query("BEGIN");
          const result = await callback(tx);
          await client.query("COMMIT");
          return result;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      },
    };
  }

  const sqlite = new SQLiteDatabase(dbPath);
  return {
    prepare: (sql: string) => sqlite.prepare(sql),
    exec: (sql: string) => sqlite.exec(sql),
    close: () => sqlite.close(),
    transaction: async <T>(callback: (tx: any) => Promise<T>) => {
      return await callback({
        prepare: (sql: string) => sqlite.prepare(sql),
        exec: (sql: string) => sqlite.exec(sql),
      });
    },
  };
};

const db = createDatabaseClient();
const SESSION_COOKIE_NAME = "ugc_session";
const SESSION_TTL_HOURS = Math.max(1, Number(process.env.SESSION_TTL_HOURS) || 12);
const QUICK_LINK_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Map([
  ["application/pdf", ".pdf"],
  ["application/msword", ".doc"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
  ["application/vnd.ms-excel", ".xls"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"],
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);
const configuredUploadDir = process.env.UPLOAD_DIR?.trim();
const uploadRootDir = configuredUploadDir
  ? path.resolve(__dirname, configuredUploadDir)
  : path.join(__dirname, "public");
const quickLinkUploadDir = path.join(uploadRootDir, "quick-links");

fs.mkdirSync(quickLinkUploadDir, { recursive: true });

type AuthenticatedUser = {
  id: number;
  name: string;
  name_bn: string;
  email: string;
  role: string;
  division?: string | null;
  designation?: string | null;
  mobile?: string | null;
  photo?: string | null;
  signature?: string | null;
  pending_signature?: string | null;
  signature_pending_at?: string | null;
  must_change_password?: number | boolean | null;
  status: string;
  permissions: string[];
  extra_permissions?: string[];
  denied_permissions?: string[];
};

type AuthenticatedRequest = express.Request & {
  user?: AuthenticatedUser;
};

type ManagedCategory = {
  id: string;
  key: string;
  label: string;
  items: string[];
  officerRole: string;
  active: boolean;
};

type QuickLinkItem = {
  id: string;
  title: string;
  description: string;
  url: string;
};

type DailyQuote = {
  quote: string;
  author: string;
};

type FormBranding = {
  logoUrl: string;
  headerTitleBn: string;
  headerTitleEn: string;
  headerAddress: string;
  headerWebsite: string;
  formTitle: string;
};

type AppSystemSettings = {
  emailNotifications: boolean;
  maintenanceMode: boolean;
  dailyQuotesEnabled: boolean;
  dailyQuotes: DailyQuote[];
  requestTypes: string[];
  categories: ManagedCategory[];
  quickLinks: QuickLinkItem[];
  formBranding: FormBranding;
};

type TelephoneDirectoryEntry = {
  id: number;
  name: string;
  designation: string | null;
  division: string | null;
  intercom: string | null;
  mobile: string | null;
  ip_number: string | null;
  email: string | null;
  room_no: string | null;
  notes: string | null;
  status: string;
};

const DATA_SHARE_SCOPES = [
  "applications",
  "assignments",
  "telephone_directory",
  "divisions",
  "reports",
] as const;
type DataShareScope = typeof DATA_SHARE_SCOPES[number];

const isDataShareScope = (value: unknown): value is DataShareScope =>
  typeof value === "string" && DATA_SHARE_SCOPES.includes(value as DataShareScope);

const DATA_SHARE_STATUS_CONFIG = {
  "Submitted": { label: "বিভাগীয় প্রধানের নিকট দাখিলকৃত" },
  "Forwarded for Approval": { label: "প্রয়োজনীয় ব্যবস্থা গ্রহণের জন্য প্রেরিত" },
  "In Progress": { label: "প্রক্রিয়াধীন" },
  "Done": { label: "সম্পন্ন" },
  "Rejected by Divisional Head": { label: "আবেদনটি প্রত্যাখান করা হয়েছে" },
  "Presented in File": { label: "নথিতে উপস্থাপন করা হয়েছে" },
};

const hashPassword = async (password: string) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
  return `scrypt$${salt}$${derivedKey.toString("hex")}`;
};

const verifyPassword = async (password: string, passwordHash?: string | null, legacyPassword?: string | null) => {
  if (passwordHash && passwordHash.startsWith("scrypt$")) {
    const [, salt, storedHash] = passwordHash.split("$");
    if (!salt || !storedHash) return false;
    const candidateHash = await new Promise<Buffer>((resolve, reject) => {
      crypto.scrypt(password, salt, 64, (error, key) => {
        if (error) reject(error);
        else resolve(key as Buffer);
      });
    });
    return crypto.timingSafeEqual(candidateHash, Buffer.from(storedHash, "hex"));
  }

  return !!legacyPassword && legacyPassword === password;
};

const buildStoredPasswordFields = async (password: string) => ({
  password: MANAGED_PASSWORD_PLACEHOLDER,
  password_hash: await hashPassword(password),
});

const isStrongPassword = (password: string) =>
  password.length >= 6 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /\d/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

const parsePermissions = (permissions: string | null | undefined) => {
  try {
    return permissions ? JSON.parse(permissions) : [];
  } catch (error) {
    return [];
  }
};

const DEFAULT_SYSTEM_SETTINGS: AppSystemSettings = {
  emailNotifications: true,
  maintenanceMode: false,
  dailyQuotesEnabled: true,
  dailyQuotes: [],
  requestTypes: ["নতুন সরবরাহ", "মেরামত/সেবা প্রদান"],
  categories: [
    {
      id: "হার্ডওয়্যার",
      key: "হার্ডওয়্যার",
      label: "হার্ডওয়্যার সংক্রান্ত সেবা",
      items: ["সিপিইউ", "প্রিন্টার/টোনার", "ল্যাপটপ", "ইউপিএস", "মনিটর", "স্ক্যানার", "ট্যাব", "অন্যান্য"],
      officerRole: "desk_officer_hardware",
      active: true,
    },
    {
      id: "নেটওয়ার্ক",
      key: "নেটওয়ার্ক",
      label: "নেটওয়ার্ক সংক্রান্ত সেবা",
      items: ["ল্যান", "অডিও ভিজ্যুয়াল সাপোর্ট", "সিসিটিভি সার্ভেইল্যান্স", "আইপি ফোন", "ওয়াইফাই", "হাইব্রিড সভা", "এক্সেস কন্ট্রোল", "অন্যান্য"],
      officerRole: "desk_officer_network",
      active: true,
    },
    {
      id: "সফটওয়্যার",
      key: "সফটওয়্যার",
      label: "সফটওয়্যার সংক্রান্ত সেবা",
      items: ["ডি-নথি", "ই-মেইল", "ই-জিপি", "ইনফো", "ওয়েবসাইট", "এন্টিভাইরাস", "জিআরপি", "অন্যান্য"],
      officerRole: "desk_officer_software",
      active: true,
    },
    {
      id: "সিস্টেম মেইনটেন্যান্স",
      key: "সিস্টেম মেইনটেন্যান্স",
      label: "সিস্টেম মেইনটেন্যান্স",
      items: ["ডিজিটাল ডিসপ্লে", "ওয়েবসাইটে তথ্য আপলোড", "সার্ভার মেইনটেন্যান্স", "অন্যান্য"],
      officerRole: "desk_officer_maintenance",
      active: true,
    },
  ],
  quickLinks: [
    {
      id: "telephone-index-2025",
      title: "Telephone Index 2025",
      description: "Open the internal telephone directory PDF and use browser search to find entries quickly.",
      url: "/telephone-index-2025.pdf",
    },
  ],
  formBranding: {
    logoUrl: "/UGC_Logo_1.png",
    headerTitleBn: "বাংলাদেশ বিশ্ববিদ্যালয় মঞ্জুরী কমিশন",
    headerTitleEn: "University Grants Commission of Bangladesh",
    headerAddress: "আগারগাঁও, শেরে বাংলা নগর, ঢাকা-১২০৭",
    headerWebsite: "website: www.ugc.gov.bd",
    formTitle: "আইটি সেবা ফরম",
  },
};

const normalizeSystemSettings = (parsed?: Partial<AppSystemSettings>): AppSystemSettings => ({
  emailNotifications: parsed?.emailNotifications ?? DEFAULT_SYSTEM_SETTINGS.emailNotifications,
  maintenanceMode: parsed?.maintenanceMode ?? DEFAULT_SYSTEM_SETTINGS.maintenanceMode,
  dailyQuotesEnabled: parsed?.dailyQuotesEnabled ?? DEFAULT_SYSTEM_SETTINGS.dailyQuotesEnabled,
  dailyQuotes: Array.isArray(parsed?.dailyQuotes) && parsed.dailyQuotes.length > 0
    ? parsed.dailyQuotes
      .map((quote, index) => ({
        quote: typeof quote?.quote === "string" ? quote.quote.trim() : "",
        author: typeof quote?.author === "string" && quote.author.trim() ? quote.author.trim() : `দৈনিক বাণী ${index + 1}`,
      }))
      .filter((quote) => quote.quote)
    : DEFAULT_SYSTEM_SETTINGS.dailyQuotes,
  requestTypes: Array.isArray(parsed?.requestTypes) && parsed.requestTypes.length > 0
    ? parsed.requestTypes
    : DEFAULT_SYSTEM_SETTINGS.requestTypes,
  categories: Array.isArray(parsed?.categories) && parsed.categories.length > 0
    ? parsed.categories.map((category, index) => ({
        id: category.id || `custom-${index}`,
        key: category.key || "",
        label: category.label || category.key || `Category ${index + 1}`,
        items: Array.isArray(category.items) ? category.items : [],
        officerRole: category.officerRole || "",
        active: category.active ?? true,
      }))
    : DEFAULT_SYSTEM_SETTINGS.categories,
  quickLinks: Array.isArray(parsed?.quickLinks)
    ? parsed.quickLinks.map((link, index) => ({
        id: link.id || `quick-link-${index}`,
        title: link.title || `Quick Link ${index + 1}`,
        description: link.description || "",
        url: link.url || "",
      })).filter((link) => link.title.trim() || link.url.trim())
    : DEFAULT_SYSTEM_SETTINGS.quickLinks,
  formBranding: {
    logoUrl: parsed?.formBranding?.logoUrl?.trim() || DEFAULT_SYSTEM_SETTINGS.formBranding.logoUrl,
    headerTitleBn: parsed?.formBranding?.headerTitleBn?.trim() || DEFAULT_SYSTEM_SETTINGS.formBranding.headerTitleBn,
    headerTitleEn: parsed?.formBranding?.headerTitleEn?.trim() || DEFAULT_SYSTEM_SETTINGS.formBranding.headerTitleEn,
    headerAddress: parsed?.formBranding?.headerAddress?.trim() || DEFAULT_SYSTEM_SETTINGS.formBranding.headerAddress,
    headerWebsite: parsed?.formBranding?.headerWebsite?.trim() || DEFAULT_SYSTEM_SETTINGS.formBranding.headerWebsite,
    formTitle: parsed?.formBranding?.formTitle?.trim() || DEFAULT_SYSTEM_SETTINGS.formBranding.formTitle,
  },
});

const getSystemSettings = async (): Promise<AppSystemSettings> => {
  try {
    const row = await db.prepare("SELECT value FROM system_settings WHERE key = ?").get("app_system_settings") as { value: string } | undefined;
    if (!row?.value) return DEFAULT_SYSTEM_SETTINGS;
    return normalizeSystemSettings(JSON.parse(row.value) as Partial<AppSystemSettings>);
  } catch (error) {
    console.error("Error reading system settings:", error);
    return DEFAULT_SYSTEM_SETTINGS;
  }
};

const saveSystemSettings = async (settings: AppSystemSettings) => {
  await db.prepare(`
    INSERT INTO system_settings (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run("app_system_settings", JSON.stringify(normalizeSystemSettings(settings)));
};

const getOfficerCategoryMap = (settings: AppSystemSettings) =>
  settings.categories.reduce<Record<string, string>>((acc, category) => {
    if (category.active && category.key && category.officerRole) {
      acc[category.officerRole] = category.key;
    }
    return acc;
  }, {});

const getServiceProviderRoleForOfficerRole = (role: string) =>
  role.replace("desk_officer_", "service_provider_");

const hasServiceProviderFeatureForRole = (permissions: string[] = [], officerRole: string) =>
  permissions.includes(getServiceProviderRoleForOfficerRole(officerRole));

const getProviderOfficerRolesFromPermissions = (
  permissions: string[] = [],
  settings: AppSystemSettings,
  scopedRoles?: string[],
) => {
  const officerCategoryMap = getOfficerCategoryMap(settings);
  const candidateRoles = scopedRoles && scopedRoles.length > 0 ? scopedRoles : Object.keys(officerCategoryMap);
  return candidateRoles.filter((role) => hasServiceProviderFeatureForRole(permissions, role));
};

const getServiceProviderRoleLabel = (role: string) => {
  const roleLabels: Record<string, string> = {
    service_provider_hardware: "সেবা প্রদানকারী (হার্ডওয়্যার)",
    service_provider_network: "সেবা প্রদানকারী (নেটওয়ার্ক)",
    service_provider_software: "সেবা প্রদানকারী (সফটওয়্যার)",
    service_provider_maintenance: "সেবা প্রদানকারী (সিস্টেম মেইনটেন্যান্স)",
  };

  return roleLabels[role] || "সেবা প্রদানকারী";
};

const getRelevantOfficerRolesForServiceType = (serviceType: string, settings: AppSystemSettings) => {
  const officerCategoryMap = getOfficerCategoryMap(settings);
  return Object.keys(officerCategoryMap).filter((role) => serviceType.includes(officerCategoryMap[role]));
};

const getServiceEntries = (serviceType: string) =>
  `${serviceType || ""}`
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const separatorIndex = entry.indexOf(" - ");
      if (separatorIndex === -1) {
        return { category: "", detail: entry };
      }
      return {
        category: entry.slice(0, separatorIndex).trim(),
        detail: entry.slice(separatorIndex + 3).trim(),
      };
    });

const getRoleSelectedItems = (serviceType: string, role: string, settings: AppSystemSettings) => {
  const officerCategoryMap = getOfficerCategoryMap(settings);
  const category = officerCategoryMap[role];
  if (!category) return [];

  return getServiceEntries(serviceType)
    .filter((entry) => entry.category === category && entry.detail && !settings.requestTypes.includes(entry.detail))
    .map((entry) => entry.detail);
};

const getRoleItemAssignments = (roleDetails: any) => {
  const normalizedAssignments = Array.isArray(roleDetails?.item_assignments)
    ? roleDetails.item_assignments
        .map((assignment: any) => ({
          ...assignment,
          assigned_items: Array.isArray(assignment?.assigned_items)
            ? assignment.assigned_items.map((item: any) => `${item || ""}`.trim()).filter(Boolean)
            : [],
        }))
        .filter((assignment: any) => assignment.assigned_items.length > 0)
    : [];

  if (normalizedAssignments.length > 0) {
    return normalizedAssignments;
  }

  const legacyItems = Array.isArray(roleDetails?.assigned_items)
    ? roleDetails.assigned_items.map((item: any) => `${item || ""}`.trim()).filter(Boolean)
    : [];

  if (!legacyItems.length) {
    return [];
  }

  return [{
    assigned_items: legacyItems,
    provider_email: roleDetails?.provider_email || null,
    provider_name: roleDetails?.provider_name || roleDetails?.officer_name || null,
    provider_designation: roleDetails?.provider_designation || roleDetails?.officer_designation || null,
    provider_role: roleDetails?.provider_role || null,
    officer_name: roleDetails?.officer_name || roleDetails?.provider_name || null,
    officer_designation: roleDetails?.officer_designation || roleDetails?.provider_designation || null,
    officer_service_info: roleDetails?.officer_service_info || null,
    status: roleDetails?.status || null,
    provider_signature: roleDetails?.provider_signature || null,
    provider_signed_at: roleDetails?.provider_signed_at || null,
    assigned_at: roleDetails?.updated_at || null,
    desk_officer_name: roleDetails?.desk_officer_name || null,
  }];
};

const buildRoleDetailsWithAssignments = (roleDetails: any, itemAssignments: any[]) => {
  const latestAssignment = itemAssignments[itemAssignments.length - 1] || null;
  return {
    ...roleDetails,
    item_assignments: itemAssignments,
    assigned_items: itemAssignments.flatMap((assignment) => assignment.assigned_items || []),
    provider_email: latestAssignment?.provider_email || roleDetails?.provider_email || null,
    provider_name: latestAssignment?.provider_name || roleDetails?.provider_name || null,
    provider_designation: latestAssignment?.provider_designation || roleDetails?.provider_designation || null,
    provider_role: latestAssignment?.provider_role || roleDetails?.provider_role || null,
    officer_name: latestAssignment?.officer_name || roleDetails?.officer_name || null,
    officer_designation: latestAssignment?.officer_designation || roleDetails?.officer_designation || null,
    officer_service_info: latestAssignment?.officer_service_info || roleDetails?.officer_service_info || null,
    status: latestAssignment?.status || roleDetails?.status || null,
    provider_signature: latestAssignment?.provider_signature || roleDetails?.provider_signature || null,
    provider_signed_at: latestAssignment?.provider_signed_at || roleDetails?.provider_signed_at || null,
  };
};

const groupAssignmentRows = (rows: any[]) => {
  const grouped = new Map<string, any>();
  for (const row of rows) {
    const key = `${row.officer_role}|${row.provider_email}`;
    const existing = grouped.get(key) || {
      assigned_items: [],
      provider_email: row.provider_email,
      provider_name: row.provider_name,
      provider_designation: row.provider_designation,
      provider_role: row.provider_role,
      officer_name: row.provider_name,
      officer_designation: row.provider_designation,
      officer_service_info: row.officer_service_info,
      status: row.status,
      provider_signature: row.provider_signature,
      provider_signed_at: row.provider_signed_at,
      assigned_at: row.assigned_at,
      desk_officer_name: row.desk_officer_name,
    };
    existing.assigned_items.push(row.item_name);
    existing.officer_service_info = row.officer_service_info || existing.officer_service_info;
    existing.status = row.status || existing.status;
    existing.provider_signature = row.provider_signature || existing.provider_signature;
    existing.provider_signed_at = row.provider_signed_at || existing.provider_signed_at;
    grouped.set(key, existing);
  }
  return Array.from(grouped.values());
};

const toDatabaseTimestamp = (value?: string | null) => {
  if (!value) return new Date().toISOString();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
};

const applyAssignmentsToApplication = (application: any, assignmentRows: any[]) => {
  if (!assignmentRows.length) return application;

  let details: Record<string, any> = {};
  try {
    details = application.officer_action_details ? JSON.parse(application.officer_action_details) : {};
  } catch {
    details = {};
  }

  const rowsByRole = assignmentRows.reduce<Record<string, any[]>>((acc, row) => {
    acc[row.officer_role] = acc[row.officer_role] || [];
    acc[row.officer_role].push(row);
    return acc;
  }, {});

  for (const [role, rows] of Object.entries(rowsByRole)) {
    const roleDetails = details[role] || {};
    details[role] = buildRoleDetailsWithAssignments({
      ...roleDetails,
      desk_officer_name: rows[0]?.desk_officer_name || roleDetails.desk_officer_name || null,
      desk_signature: rows[0]?.desk_signature || roleDetails.desk_signature || roleDetails.signature || null,
      desk_signed_at: rows[0]?.desk_signed_at || roleDetails.desk_signed_at || roleDetails.updated_at || null,
      signature: roleDetails.signature || rows[0]?.desk_signature || null,
      updated_at: roleDetails.updated_at || rows[0]?.desk_signed_at || rows[0]?.assigned_at || null,
    }, groupAssignmentRows(rows));
  }

  return {
    ...application,
    officer_action_details: JSON.stringify(details),
  };
};

const attachAssignmentsToApplications = async (applications: any[]) => {
  if (!applications.length) return applications;
  const ids = applications.map((application) => application.id).filter(Boolean);
  if (!ids.length) return applications;

  const placeholders = ids.map(() => "?").join(", ");
  const rows = await db.prepare(`
    SELECT *
    FROM application_item_assignments
    WHERE application_id IN (${placeholders})
    ORDER BY assigned_at ASC, id ASC
  `).all(...ids) as any[];
  const rowsByApplication = rows.reduce<Record<string, any[]>>((acc, row) => {
    acc[row.application_id] = acc[row.application_id] || [];
    acc[row.application_id].push(row);
    return acc;
  }, {});

  return applications.map((application) => applyAssignmentsToApplication(application, rowsByApplication[application.id] || []));
};

const getAssignmentRowsForApplication = async (database: any, applicationId: string | number, officerRole: string) => {
  return await database.prepare(`
    SELECT *
    FROM application_item_assignments
    WHERE application_id = ? AND officer_role = ?
    ORDER BY assigned_at ASC, id ASC
  `).all(applicationId, officerRole) as any[];
};

const backfillNormalizedAssignmentsFromOfficerActionDetails = async () => {
  const apps = await db.prepare("SELECT id, officer_action_details FROM applications WHERE officer_action_details IS NOT NULL AND officer_action_details != ''").all() as any[];

  for (const app of apps) {
    let details: Record<string, any> = {};
    try {
      details = JSON.parse(app.officer_action_details);
    } catch {
      continue;
    }

    for (const [officerRole, roleDetails] of Object.entries(details)) {
      for (const assignment of getRoleItemAssignments(roleDetails)) {
        const providerEmail = `${assignment.provider_email || ""}`.trim();
        if (!providerEmail) continue;
        for (const item of assignment.assigned_items || []) {
          await db.prepare(`
            INSERT INTO application_item_assignments (
              application_id, officer_role, item_name, provider_email, provider_name, provider_designation,
              provider_role, desk_officer_name, desk_signature, desk_signed_at, assigned_at, status,
              officer_service_info, provider_signature, provider_signed_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT (application_id, officer_role, item_name) DO NOTHING
          `).run(
            app.id,
            officerRole,
            item,
            providerEmail,
            assignment.provider_name || null,
            assignment.provider_designation || null,
            assignment.provider_role || null,
            assignment.desk_officer_name || (roleDetails as any)?.desk_officer_name || null,
            (roleDetails as any)?.desk_signature || (roleDetails as any)?.signature || null,
            (roleDetails as any)?.desk_signed_at || (roleDetails as any)?.updated_at || null,
            toDatabaseTimestamp(assignment.assigned_at || (roleDetails as any)?.updated_at),
            assignment.status || (roleDetails as any)?.status || "Forwarded for Approval",
            assignment.officer_service_info || null,
            assignment.provider_signature || null,
            assignment.provider_signed_at || null,
            new Date().toISOString(),
          );
        }
      }
    }
  }
};

const backfillTrackingCountersFromApplications = async () => {
  if (!usingPostgres) return;
  const apps = await db.prepare("SELECT division, submission_date, tracking_no FROM applications").all() as Array<{ division: string; submission_date: string; tracking_no: string }>;
  const counters = new Map<string, { division: string; year: string; month: string; serial: number }>();

  for (const app of apps) {
    const { year, month } = getTrackingParts(app.submission_date);
    const lastPart = app.tracking_no.split("/").pop()?.replace(/[^\dà§¦-à§¯]/g, "") || "";
    const normalized = lastPart.replace(/[à§¦-à§¯]/g, (digit) => String("à§¦à§§à§¨à§©à§ªà§«à§¬à§­à§®à§¯".indexOf(digit)));
    const key = `${app.division}|${year}|${month}`;
    const fallbackSerial = (counters.get(key)?.serial || 0) + 1;
    const parsedSerial = Number.parseInt(normalized, 10);
    const serial = Number.isNaN(parsedSerial) ? fallbackSerial : parsedSerial;
    const existing = counters.get(key);
    if (!existing || serial > existing.serial) {
      counters.set(key, { division: app.division, year, month, serial });
    }
  }

  for (const counter of counters.values()) {
    await db.prepare(`
      INSERT INTO application_tracking_counters (division, year, month, serial)
      VALUES (?, ?, ?, ?)
      ON CONFLICT (division, year, month)
      DO UPDATE SET serial = GREATEST(application_tracking_counters.serial, excluded.serial)
    `).run(counter.division, counter.year, counter.month, counter.serial);
  }
};

const backfillOfficerActionDetailsFromLegacyColumns = async () => {
  const apps = await db.prepare(`
    SELECT
      id,
      officer_action_details,
      hw_officer_sig, hw_officer_date, hw_officer_name,
      nw_officer_sig, nw_officer_date, nw_officer_name,
      sw_officer_sig, sw_officer_date, sw_officer_name,
      mnt_officer_sig, mnt_officer_date, mnt_officer_name
    FROM applications
  `).all() as any[];

  const updateDetails = db.prepare("UPDATE applications SET officer_action_details = ? WHERE id = ?");

  for (const app of apps) {
    let details: Record<string, any> = {};
    try {
      details = app.officer_action_details ? JSON.parse(app.officer_action_details) : {};
    } catch {
      details = {};
    }

    const legacyMappings = [
      { role: "desk_officer_hardware", sig: app.hw_officer_sig, date: app.hw_officer_date, name: app.hw_officer_name },
      { role: "desk_officer_network", sig: app.nw_officer_sig, date: app.nw_officer_date, name: app.nw_officer_name },
      { role: "desk_officer_software", sig: app.sw_officer_sig, date: app.sw_officer_date, name: app.sw_officer_name },
      { role: "desk_officer_maintenance", sig: app.mnt_officer_sig, date: app.mnt_officer_date, name: app.mnt_officer_name },
    ];

    let changed = false;
    for (const legacy of legacyMappings) {
      if (!legacy.sig) continue;
      if (!details[legacy.role]) {
        details[legacy.role] = {
          officer_name: legacy.name || null,
          desk_officer_name: legacy.name || null,
          updated_at: legacy.date || null,
          signature: legacy.sig,
          legacy_signature: legacy.sig,
        };
        changed = true;
      } else {
        if (!details[legacy.role].signature) {
          details[legacy.role].signature = legacy.sig;
          changed = true;
        }
        if (!details[legacy.role].legacy_signature) {
          details[legacy.role].legacy_signature = legacy.sig;
          changed = true;
        }
        if (!details[legacy.role].updated_at && legacy.date) {
          details[legacy.role].updated_at = legacy.date;
          changed = true;
        }
        if (!details[legacy.role].desk_officer_name && legacy.name) {
          details[legacy.role].desk_officer_name = legacy.name;
          changed = true;
        }
      }
    }

    if (changed) {
      await updateDetails.run(JSON.stringify(details), app.id);
    }
  }
};

const resolveUserPermissions = (user: any) => {
  const rolePermissions = parsePermissions(user.permissions);
  const extraPermissions = parsePermissions(user.extra_permissions);
  const deniedPermissions = parsePermissions(user.denied_permissions);
  const mergedPermissions = Array.from(new Set([...rolePermissions, ...extraPermissions]));
  const providerFeatures = new Set([
    "service_provider_hardware",
    "service_provider_network",
    "service_provider_software",
    "service_provider_maintenance",
  ]);

  if (mergedPermissions.some((permission) => providerFeatures.has(permission))) {
    mergedPermissions.push("assigned_applications");
  }

  return Array.from(
    new Set(mergedPermissions.filter((permission) => !deniedPermissions.includes(permission))),
  );
};

const serializeUser = (user: any): AuthenticatedUser => ({
  id: user.id,
  name: user.name,
  name_bn: user.name_bn,
  email: user.email,
  role: user.role,
  division: user.division,
  designation: user.designation,
  mobile: user.mobile,
  photo: user.photo,
  signature: user.signature,
  pending_signature: user.pending_signature,
  signature_pending_at: user.signature_pending_at,
  must_change_password: !!user.must_change_password,
  status: user.status,
  permissions: resolveUserPermissions(user),
  extra_permissions: parsePermissions(user.extra_permissions),
  denied_permissions: parsePermissions(user.denied_permissions),
});

const getUserWithPermissionsByEmail = async (email: string) => {
  return await db.prepare(`
    SELECT u.*, r.permissions
    FROM users u
    LEFT JOIN roles r ON u.role = r.slug
    WHERE u.email = ?
  `).get(email) as any;
};

const writeAuditLog = async (entry: {
  user?: Pick<AuthenticatedUser, "email" | "name_bn" | "name" | "role"> | null;
  action: string;
  method: string;
  path: string;
  statusCode?: number;
  details?: unknown;
}) => {
  try {
    const details = entry.details === undefined
      ? null
      : typeof entry.details === "string"
        ? entry.details
        : JSON.stringify(entry.details);
    await db.prepare(`
      INSERT INTO audit_logs (created_at, user_email, user_name, user_role, action, method, path, status_code, details)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      new Date().toISOString(),
      entry.user?.email || null,
      entry.user?.name_bn || entry.user?.name || null,
      entry.user?.role || null,
      entry.action,
      entry.method,
      entry.path,
      entry.statusCode || null,
      details
    );
  } catch (error) {
    console.error("Audit log error:", error);
  }
};

const writeDataShareAccessLog = async (entry: {
  client?: { id: number; name: string } | null;
  direction: "Pull" | "Push";
  scope: DataShareScope | "meta";
  endpoint: string;
  method: string;
  statusCode: number;
  rowCount?: number;
  ip?: string;
  userAgent?: string;
  details?: unknown;
}) => {
  try {
    const details = entry.details === undefined
      ? null
      : typeof entry.details === "string"
        ? entry.details
        : JSON.stringify(entry.details);
    await db.prepare(`
      INSERT INTO data_share_access_logs
        (client_id, client_name, direction, scope, endpoint, method, status_code, row_count, ip, user_agent, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.client?.id || null,
      entry.client?.name || null,
      entry.direction,
      entry.scope,
      entry.endpoint,
      entry.method,
      entry.statusCode,
      entry.rowCount || 0,
      entry.ip || null,
      entry.userAgent || null,
      details,
      new Date().toISOString()
    );
  } catch (error) {
    console.error("Data-share access log error:", error);
  }
};

const backfillDataShareAccessLogsFromClientUsage = async () => {
  try {
    await db.prepare(`
      INSERT INTO data_share_access_logs
        (client_id, client_name, direction, scope, endpoint, method, status_code, row_count, ip, user_agent, details, created_at)
      SELECT id, name, 'Pull', 'meta', 'unknown', 'GET', 200, 0, NULL, NULL, ?, last_used_at
      FROM data_share_clients c
      WHERE c.last_used_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM data_share_access_logs l
          WHERE l.client_id = c.id
        )
    `).run(JSON.stringify({ backfilled_from: "data_share_clients.last_used_at", note: "Historical endpoint and row count were not available before access logging was added." }));
  } catch (error) {
    console.error("Data-share access log backfill error:", error);
  }
};

const getVisibleApplicationsForUser = async (currentUser: AuthenticatedUser, requestedEmail?: string) => {
  const systemSettings = await getSystemSettings();
  const officerCategoryMap = getOfficerCategoryMap(systemSettings);
  const canViewAllApplications = currentUser.permissions.includes("all_applications");

  if (requestedEmail) {
    if (requestedEmail !== currentUser.email && !canViewAllApplications) {
      return { status: 403, message: "You do not have access to this user's applications." };
    }

    return {
      applications: await attachAssignmentsToApplications(await db.prepare("SELECT * FROM applications WHERE user_email = ? ORDER BY id DESC").all(requestedEmail) as any[]),
    };
  }

  if (canViewAllApplications) {
    return {
      applications: await attachAssignmentsToApplications(await db.prepare("SELECT * FROM applications ORDER BY id DESC").all() as any[]),
    };
  }

  if (currentUser.permissions.includes("assigned_applications") && currentUser.role && officerCategoryMap[currentUser.role]) {
    const keyword = officerCategoryMap[currentUser.role];
    return {
      applications: await attachAssignmentsToApplications(await db.prepare("SELECT * FROM applications WHERE service_type LIKE ? ORDER BY id DESC").all(`%${keyword}%`) as any[]),
    };
  }

  const providerOfficerRoles = getProviderOfficerRolesFromPermissions(currentUser.permissions, systemSettings);
  if (currentUser.permissions.includes("assigned_applications") && providerOfficerRoles.length > 0) {
    const applications = await db.prepare(`
      SELECT DISTINCT a.*
      FROM applications a
      INNER JOIN application_item_assignments aia ON aia.application_id = a.id
      WHERE aia.provider_email = ?
      ORDER BY a.id DESC
    `).all(currentUser.email) as any[];

    return { applications: await attachAssignmentsToApplications(applications) };
  }

  if (currentUser.permissions.includes("received_applications") && currentUser.role === "divisional_head" && currentUser.division) {
    return {
      applications: await attachAssignmentsToApplications(await db.prepare("SELECT * FROM applications WHERE division = ? ORDER BY id DESC").all(currentUser.division) as any[]),
    };
  }

  if (currentUser.permissions.includes("application_history")) {
    return {
      applications: await attachAssignmentsToApplications(await db.prepare("SELECT * FROM applications WHERE user_email = ? ORDER BY id DESC").all(currentUser.email) as any[]),
    };
  }

  return { status: 403, message: "You do not have access to applications." };
};

const parseCookies = (cookieHeader?: string) =>
  (cookieHeader || "").split(";").reduce<Record<string, string>>((cookies, part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) return cookies;
    cookies[rawKey] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});

const buildSessionCookie = (value: string, expiresAt?: Date) => {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(value)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
  ];

  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  if (expiresAt) {
    parts.push(`Expires=${expiresAt.toUTCString()}`);
  } else {
    parts.push(`Max-Age=${SESSION_TTL_HOURS * 60 * 60}`);
  }

  return parts.join("; ");
};

const hashSessionToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const hashApiToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getSessionExpiry = () =>
  new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);

const createUserSession = async (email: string) => {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = hashSessionToken(token);
  const now = new Date().toISOString();
  await db.prepare(`
    INSERT INTO user_sessions (token_hash, user_email, created_at, expires_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(tokenHash, email, now, getSessionExpiry().toISOString(), now);
  return token;
};

const getSessionEmail = async (token: string) => {
  const tokenHash = hashSessionToken(token);
  const now = new Date().toISOString();
  await db.prepare("DELETE FROM user_sessions WHERE expires_at <= ?").run(now);
  const session = await db.prepare("SELECT user_email, expires_at FROM user_sessions WHERE token_hash = ?").get(tokenHash) as { user_email: string; expires_at: string } | undefined;
  if (!session || new Date(session.expires_at).getTime() <= Date.now()) {
    return null;
  }
  await db.prepare("UPDATE user_sessions SET last_seen_at = ? WHERE token_hash = ?").run(now, tokenHash);
  return session.user_email;
};

const deleteUserSession = async (token: string) => {
  await db.prepare("DELETE FROM user_sessions WHERE token_hash = ?").run(hashSessionToken(token));
};

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

const consumeLoginAttempt = (identifier: string) => {
  const key = identifier.trim().toLowerCase() || "unknown";
  const now = Date.now();
  const existing = loginAttempts.get(key);
  if (!existing || existing.resetAt <= now) {
    loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  existing.count += 1;
  return existing.count <= 10;
};

const clearLoginAttempts = (identifier: string) => {
  loginAttempts.delete(identifier.trim().toLowerCase() || "unknown");
};

// Initialize local SQLite tables. PostgreSQL uses migrations in migrations/*.sql.
if (!usingPostgres) {
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    role TEXT NOT NULL,
    division TEXT,
    status TEXT DEFAULT 'Active',
    photo TEXT,
    signature TEXT,
    designation TEXT,
    mobile TEXT,
    extra_permissions TEXT,
    denied_permissions TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS user_sessions (
    token_hash TEXT PRIMARY KEY,
    user_email TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    last_seen_at TEXT,
    user_agent TEXT,
    ip_address TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_user_sessions_user_email ON user_sessions(user_email);
  CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS data_share_clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    scopes TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active',
    created_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TEXT,
    revoked_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_data_share_clients_token_hash ON data_share_clients(token_hash);
  CREATE INDEX IF NOT EXISTS idx_data_share_clients_status ON data_share_clients(status);

  CREATE TABLE IF NOT EXISTS data_share_access_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    client_name TEXT,
    direction TEXT NOT NULL DEFAULT 'Pull',
    scope TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    row_count INTEGER NOT NULL DEFAULT 0,
    ip TEXT,
    user_agent TEXT,
    details TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_data_share_access_logs_client_id ON data_share_access_logs(client_id);
  CREATE INDEX IF NOT EXISTS idx_data_share_access_logs_created_at ON data_share_access_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_data_share_access_logs_direction ON data_share_access_logs(direction);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS application_tracking_counters (
    division TEXT NOT NULL,
    year TEXT NOT NULL,
    month TEXT NOT NULL,
    serial INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (division, year, month)
  );

  CREATE TABLE IF NOT EXISTS application_item_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    officer_role TEXT NOT NULL,
    item_name TEXT NOT NULL,
    provider_email TEXT NOT NULL,
    provider_name TEXT,
    provider_designation TEXT,
    provider_role TEXT,
    desk_officer_name TEXT,
    desk_signature TEXT,
    desk_signed_at TEXT,
    assigned_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Forwarded for Approval',
    officer_service_info TEXT,
    provider_signature TEXT,
    provider_signed_at TEXT,
    updated_at TEXT NOT NULL,
    UNIQUE (application_id, officer_role, item_name)
  );
  CREATE INDEX IF NOT EXISTS idx_assignment_provider_email ON application_item_assignments(provider_email);
  CREATE INDEX IF NOT EXISTS idx_assignment_application_id ON application_item_assignments(application_id);
  CREATE INDEX IF NOT EXISTS idx_assignment_officer_role ON application_item_assignments(officer_role);
  CREATE INDEX IF NOT EXISTS idx_assignment_status ON application_item_assignments(status);
  CREATE INDEX IF NOT EXISTS idx_assignment_updated_at ON application_item_assignments(updated_at);
`);

// Migration: Add photo and signature columns if they don't exist
try {
  const columns = db.prepare("PRAGMA table_info(users)").all() as any[];
  const hasPhoto = columns.some(c => c.name === 'photo');
  const hasSignature = columns.some(c => c.name === 'signature');
  const hasPasswordHash = columns.some(c => c.name === 'password_hash');
  
  if (!hasPhoto) {
    db.exec("ALTER TABLE users ADD COLUMN photo TEXT");
  }
  if (!hasSignature) {
    db.exec("ALTER TABLE users ADD COLUMN signature TEXT");
  }
  if (!hasPasswordHash) {
    db.exec("ALTER TABLE users ADD COLUMN password_hash TEXT");
  }
  if (!columns.some(c => c.name === 'pending_signature')) {
    db.exec("ALTER TABLE users ADD COLUMN pending_signature TEXT");
  }
  if (!columns.some(c => c.name === 'signature_pending_at')) {
    db.exec("ALTER TABLE users ADD COLUMN signature_pending_at TEXT");
  }
  if (!columns.some(c => c.name === 'must_change_password')) {
    db.exec("ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0");
  }
} catch (e) {
  console.error("User migration error:", e);
}

try {
  const usersMissingHashes = db.prepare("SELECT id, password FROM users WHERE password_hash IS NULL OR password_hash = ''").all() as Array<{ id: number; password: string | null }>;
  const updatePasswordStatement = db.prepare("UPDATE users SET password = ?, password_hash = ? WHERE id = ?");

  for (const user of usersMissingHashes) {
    const sourcePassword = user.password || crypto.randomUUID();
    const stored = await buildStoredPasswordFields(sourcePassword);
    updatePasswordStatement.run(stored.password, stored.password_hash, user.id);
  }
} catch (e) {
  console.error("Password migration error:", e);
}

db.exec(`
  CREATE TABLE IF NOT EXISTS divisions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    head TEXT NOT NULL,
    employees INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Active'
  );

  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    name_bn TEXT NOT NULL,
    description TEXT,
    permissions TEXT,
    status TEXT DEFAULT 'Active'
  );

  CREATE TABLE IF NOT EXISTS applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tracking_no TEXT UNIQUE NOT NULL,
    user_email TEXT NOT NULL,
    user_name TEXT NOT NULL,
    division TEXT NOT NULL,
    service_type TEXT NOT NULL,
    problem_details TEXT,
    category_problem_details TEXT,
    status TEXT DEFAULT 'Submitted',
    submission_date TEXT NOT NULL,
    applicant_signature TEXT,
    applicant_signed_at TEXT,
    div_head_signature TEXT,
    div_head_signed_at TEXT,
    div_head_email TEXT
  );

  CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS telephone_directory_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    designation TEXT,
    division TEXT,
    intercom TEXT,
    mobile TEXT,
    ip_number TEXT,
    email TEXT,
    room_no TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Active'
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    user_email TEXT,
    user_name TEXT,
    user_role TEXT,
    action TEXT NOT NULL,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    status_code INTEGER,
    details TEXT
  );
`);

// Migration: Add slug and permissions columns to roles if they don't exist
try {
  const roleColumns = db.prepare("PRAGMA table_info(roles)").all() as any[];
  const hasSlug = roleColumns.some(c => c.name === 'slug');
  const hasPermissions = roleColumns.some(c => c.name === 'permissions');
  
  if (!hasSlug) {
    db.exec("ALTER TABLE roles ADD COLUMN slug TEXT");
    db.prepare("UPDATE roles SET slug = 'admin' WHERE name = 'Admin'").run();
    db.prepare("UPDATE roles SET slug = 'employee' WHERE name = 'Employee'").run();
    db.exec("UPDATE roles SET slug = LOWER(REPLACE(name, ' ', '_')) WHERE slug IS NULL");
  }
  
  if (!hasPermissions) {
    db.exec("ALTER TABLE roles ADD COLUMN permissions TEXT");
    // Set default permissions for existing roles
    const adminPerms = JSON.stringify(['dashboard', 'application_form', 'application_history', 'all_applications', 'assigned_applications', 'rejected_applications', 'user_management', 'role_management', 'division_management', 'profile', 'reports', 'settings', 'telephone_directory']);
    const employeePerms = JSON.stringify(['dashboard', 'application_form', 'application_history', 'profile', 'telephone_directory']);
    const officerPerms = JSON.stringify(['dashboard', 'assigned_applications', 'application_history', 'profile', 'telephone_directory']);
    const divHeadPerms = JSON.stringify(['dashboard', 'application_form', 'received_applications', 'forwarded_applications', 'rejected_applications', 'application_history', 'profile', 'telephone_directory']);
    
    db.prepare("UPDATE roles SET permissions = ? WHERE slug = 'admin'").run(adminPerms);
    db.prepare("UPDATE roles SET permissions = ? WHERE slug = 'employee'").run(employeePerms);
    db.prepare("UPDATE roles SET permissions = ? WHERE slug LIKE 'desk_officer_%'").run(officerPerms);
    db.prepare("UPDATE roles SET permissions = ? WHERE slug = 'divisional_head'").run(divHeadPerms);
  }

  const divisionalHeadRole = db.prepare("SELECT id, permissions FROM roles WHERE slug = 'divisional_head'").get() as { id: number; permissions: string | null } | undefined;
  if (divisionalHeadRole) {
    let parsedPermissions: string[] = [];
    try {
      parsedPermissions = divisionalHeadRole.permissions ? JSON.parse(divisionalHeadRole.permissions) : [];
    } catch (error) {
      parsedPermissions = [];
    }
    const requiredPermissions = ['application_form', 'received_applications', 'forwarded_applications', 'rejected_applications', 'telephone_directory'];
    const nextPermissions = Array.from(new Set([...parsedPermissions, ...requiredPermissions]));
    db.prepare("UPDATE roles SET permissions = ? WHERE id = ?").run(JSON.stringify(nextPermissions), divisionalHeadRole.id);
  }

  const adminRole = db.prepare("SELECT id, permissions FROM roles WHERE slug = 'admin'").get() as { id: number; permissions: string | null } | undefined;
  if (adminRole) {
    let parsedPermissions: string[] = [];
    try {
      parsedPermissions = adminRole.permissions ? JSON.parse(adminRole.permissions) : [];
    } catch (error) {
      parsedPermissions = [];
    }
    const requiredPermissions = ['all_applications', 'rejected_applications', 'telephone_directory', 'settings'];
    const nextPermissions = Array.from(new Set([...parsedPermissions, ...requiredPermissions]));
    db.prepare("UPDATE roles SET permissions = ? WHERE id = ?").run(JSON.stringify(nextPermissions), adminRole.id);
  }

  const employeeRole = db.prepare("SELECT id, permissions FROM roles WHERE slug = 'employee'").get() as { id: number; permissions: string | null } | undefined;
  if (employeeRole) {
    let parsedPermissions: string[] = [];
    try {
      parsedPermissions = employeeRole.permissions ? JSON.parse(employeeRole.permissions) : [];
    } catch (error) {
      parsedPermissions = [];
    }
    const nextPermissions = Array.from(new Set([...parsedPermissions, 'telephone_directory']));
    db.prepare("UPDATE roles SET permissions = ? WHERE id = ?").run(JSON.stringify(nextPermissions), employeeRole.id);
  }

  const officerRoles = db.prepare("SELECT id, permissions FROM roles WHERE slug LIKE 'desk_officer_%'").all() as Array<{ id: number; permissions: string | null }>;
  for (const officerRole of officerRoles) {
    let parsedPermissions: string[] = [];
    try {
      parsedPermissions = officerRole.permissions ? JSON.parse(officerRole.permissions) : [];
    } catch (error) {
      parsedPermissions = [];
    }
    const nextPermissions = Array.from(new Set([...parsedPermissions, 'telephone_directory']));
    db.prepare("UPDATE roles SET permissions = ? WHERE id = ?").run(JSON.stringify(nextPermissions), officerRole.id);
  }

  const baseServiceProviderPerms = ['dashboard', 'assigned_applications', 'application_history', 'profile', 'telephone_directory'];
  const serviceProviderRoles = [
    {
      name: "Service Provider (Hardware)",
      slug: "service_provider_hardware",
      name_bn: "সেবা প্রদানকারী (হার্ডওয়্যার)",
      description: "হার্ডওয়্যার সেবার দায়িত্বপ্রাপ্ত সেবা প্রদানকারী",
    },
    {
      name: "Service Provider (Network)",
      slug: "service_provider_network",
      name_bn: "সেবা প্রদানকারী (নেটওয়ার্ক)",
      description: "নেটওয়ার্ক সেবার দায়িত্বপ্রাপ্ত সেবা প্রদানকারী",
    },
    {
      name: "Service Provider (Software)",
      slug: "service_provider_software",
      name_bn: "সেবা প্রদানকারী (সফটওয়্যার)",
      description: "সফটওয়্যার সেবার দায়িত্বপ্রাপ্ত সেবা প্রদানকারী",
    },
    {
      name: "Service Provider (Maintenance)",
      slug: "service_provider_maintenance",
      name_bn: "সেবা প্রদানকারী (মেইনটেন্যান্স)",
      description: "মেইনটেন্যান্স সেবার দায়িত্বপ্রাপ্ত সেবা প্রদানকারী",
    },
  ];

  for (const role of serviceProviderRoles) {
    const rolePermissions = JSON.stringify(Array.from(new Set([...baseServiceProviderPerms, role.slug])));
    const existing = db.prepare("SELECT id, permissions FROM roles WHERE slug = ?").get(role.slug) as { id: number; permissions: string | null } | undefined;
    if (existing) {
      let parsedPermissions: string[] = [];
      try {
        parsedPermissions = existing.permissions ? JSON.parse(existing.permissions) : [];
      } catch (error) {
        parsedPermissions = [];
      }
      const nextPermissions = JSON.stringify(Array.from(new Set([...parsedPermissions, ...baseServiceProviderPerms, role.slug])));
      db.prepare("UPDATE roles SET name = ?, name_bn = ?, description = ?, permissions = ? WHERE id = ?")
        .run(role.name, role.name_bn, role.description, nextPermissions, existing.id);
    } else {
      db.prepare("INSERT INTO roles (name, slug, name_bn, description, permissions, status) VALUES (?, ?, ?, ?, ?, ?)")
        .run(role.name, role.slug, role.name_bn, role.description, rolePermissions, "Active");
    }
  }
} catch (e) {
  console.error("Role migration error:", e);
}

// Ensure division column exists for existing databases
try {
  db.exec("ALTER TABLE users ADD COLUMN division TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN designation TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN mobile TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN extra_permissions TEXT");
} catch (e) {}

try {
  db.exec("ALTER TABLE users ADD COLUMN denied_permissions TEXT");
} catch (e) {}

try {
  const telephoneDirectoryColumns = db.prepare("PRAGMA table_info(telephone_directory_entries)").all() as Array<{ name: string }>;
  if (!telephoneDirectoryColumns.some((column) => column.name === "ip_number")) {
    db.exec("ALTER TABLE telephone_directory_entries ADD COLUMN ip_number TEXT");
  }
} catch (e) {}

// Migration: Add signature columns to applications
try {
  const appColumns = db.prepare("PRAGMA table_info(applications)").all() as any[];
  if (!appColumns.some(c => c.name === 'applicant_signature')) {
    db.exec("ALTER TABLE applications ADD COLUMN applicant_signature TEXT");
    db.exec("ALTER TABLE applications ADD COLUMN applicant_signed_at TEXT");
    db.exec("ALTER TABLE applications ADD COLUMN div_head_signature TEXT");
    db.exec("ALTER TABLE applications ADD COLUMN div_head_signed_at TEXT");
    db.exec("ALTER TABLE applications ADD COLUMN div_head_email TEXT");
  }
  if (!appColumns.some(c => c.name === 'designation')) {
    db.exec("ALTER TABLE applications ADD COLUMN designation TEXT");
  }
  if (!appColumns.some(c => c.name === 'mobile')) {
    db.exec("ALTER TABLE applications ADD COLUMN mobile TEXT");
  }
  if (!appColumns.some(c => c.name === 'category_problem_details')) {
    db.exec("ALTER TABLE applications ADD COLUMN category_problem_details TEXT");
  }
  if (!appColumns.some(c => c.name === 'officer_signature')) {
    db.exec("ALTER TABLE applications ADD COLUMN officer_signature TEXT");
    db.exec("ALTER TABLE applications ADD COLUMN officer_signed_at TEXT");
    db.exec("ALTER TABLE applications ADD COLUMN officer_name TEXT");
  }
  if (!appColumns.some(c => c.name === 'hw_officer_sig')) {
    db.exec("ALTER TABLE applications ADD COLUMN hw_officer_sig TEXT");
    db.exec("ALTER TABLE applications ADD COLUMN hw_officer_date TEXT");
    db.exec("ALTER TABLE applications ADD COLUMN hw_officer_name TEXT");
    db.exec("ALTER TABLE applications ADD COLUMN nw_officer_sig TEXT");
    db.exec("ALTER TABLE applications ADD COLUMN nw_officer_date TEXT");
    db.exec("ALTER TABLE applications ADD COLUMN nw_officer_name TEXT");
    db.exec("ALTER TABLE applications ADD COLUMN sw_officer_sig TEXT");
    db.exec("ALTER TABLE applications ADD COLUMN sw_officer_date TEXT");
    db.exec("ALTER TABLE applications ADD COLUMN sw_officer_name TEXT");
    db.exec("ALTER TABLE applications ADD COLUMN mnt_officer_sig TEXT");
    db.exec("ALTER TABLE applications ADD COLUMN mnt_officer_date TEXT");
    db.exec("ALTER TABLE applications ADD COLUMN mnt_officer_name TEXT");
  }
  if (!appColumns.some(c => c.name === 'officer_designation')) {
    db.exec("ALTER TABLE applications ADD COLUMN officer_designation TEXT");
  }
  if (!appColumns.some(c => c.name === 'officer_service_info')) {
    db.exec("ALTER TABLE applications ADD COLUMN officer_service_info TEXT");
  }
  if (!appColumns.some(c => c.name === 'officer_action_details')) {
    db.exec("ALTER TABLE applications ADD COLUMN officer_action_details TEXT");
  }
} catch (e) {
  console.error("Application migration error:", e);
}

try {
  const apps = db.prepare("SELECT id, division, submission_date FROM applications ORDER BY id ASC").all() as Array<{
    id: number;
    division: string;
    submission_date: string;
  }>;
  const updateTrackingNo = db.prepare("UPDATE applications SET tracking_no = ? WHERE id = ?");
  const serialsByKey = new Map<string, number>();

  for (const app of apps) {
    const { month, year } = getTrackingParts(app.submission_date);
    const key = `${year}|${month}|${getDivisionShortName(app.division)}`;
    const nextSerial = (serialsByKey.get(key) || 0) + 1;
    serialsByKey.set(key, nextSerial);
    updateTrackingNo.run(buildTrackingNumber(app.division, app.submission_date, nextSerial), app.id);
  }
} catch (e) {
  console.error("Tracking number migration error:", e);
}

try {
  const existingSettings = db.prepare("SELECT value FROM system_settings WHERE key = ?").get("app_system_settings") as { value: string } | undefined;
  if (!existingSettings?.value) {
    await saveSystemSettings(DEFAULT_SYSTEM_SETTINGS);
  } else {
    try {
      await saveSystemSettings(normalizeSystemSettings(JSON.parse(existingSettings.value) as Partial<AppSystemSettings>));
    } catch (error) {
      console.error("System settings normalization error:", error);
      await saveSystemSettings(DEFAULT_SYSTEM_SETTINGS);
    }
  }
} catch (e) {
  console.error("System settings seed error:", e);
}

try {
  await backfillOfficerActionDetailsFromLegacyColumns();
} catch (e) {
  console.error("Officer action details migration error:", e);
}

try {
  await backfillNormalizedAssignmentsFromOfficerActionDetails();
} catch (e) {
  console.error("Assignment normalization migration error:", e);
}

// Seed initial data if empty
const userCount = db.prepare("SELECT count(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  const bootstrapPassword = process.env.SEED_USER_PASSWORD?.trim() || process.env.SUPER_ADMIN_PASSWORD?.trim() || crypto.randomUUID();
  const stored = await buildStoredPasswordFields(bootstrapPassword);
  const insertSeedUser = db.prepare("INSERT INTO users (name, email, password, password_hash, name_bn, role, division, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  const seedUsers = [
    ["Admin User", "admin@ugc.gov.bd", "Admin User", "admin", "à¦†à¦‡à¦¸à¦¿à¦Ÿà¦¿ à¦¬à¦¿à¦­à¦¾à¦—", "Active"],
    ["Hardware Desk Officer", "hardware@ugc.gov.bd", "Hardware Desk Officer", "desk_officer_hardware", "à¦†à¦‡à¦¸à¦¿à¦Ÿà¦¿ à¦¬à¦¿à¦­à¦¾à¦—", "Active"],
    ["Network Desk Officer", "network@ugc.gov.bd", "Network Desk Officer", "desk_officer_network", "à¦†à¦‡à¦¸à¦¿à¦Ÿà¦¿ à¦¬à¦¿à¦­à¦¾à¦—", "Active"],
    ["Software Desk Officer", "software@ugc.gov.bd", "Software Desk Officer", "desk_officer_software", "à¦†à¦‡à¦¸à¦¿à¦Ÿà¦¿ à¦¬à¦¿à¦­à¦¾à¦—", "Active"],
    ["Maintenance Desk Officer", "maintenance@ugc.gov.bd", "Maintenance Desk Officer", "desk_officer_maintenance", "à¦†à¦‡à¦¸à¦¿à¦Ÿà¦¿ à¦¬à¦¿à¦­à¦¾à¦—", "Active"],
    ["Test Employee", "employee@ugc.gov.bd", "Test Employee", "employee", "à¦ªà§à¦°à¦¶à¦¾à¦¸à¦¨ à¦¬à¦¿à¦­à¦¾à¦—", "Active"],
    ["Maruf Alam", "maruf@ugc.gov.bd", "Maruf Alam", "employee", "à¦…à¦°à§à¦¥ à¦“ à¦¹à¦¿à¦¸à¦¾à¦¬ à¦¬à¦¿à¦­à¦¾à¦—", "Inactive"],
    ["Maruf Alam (Admin)", "mmarufalamj@gmail.com", "Maruf Alam", "admin", "à¦†à¦‡à¦¸à¦¿à¦Ÿà¦¿ à¦¬à¦¿à¦­à¦¾à¦—", "Active"],
  ] as const;

  for (const [name, email, nameBn, role, division, status] of seedUsers) {
    insertSeedUser.run(name, email, stored.password, stored.password_hash, nameBn, role, division, status);
  }

  if (!process.env.SEED_USER_PASSWORD?.trim() && !process.env.SUPER_ADMIN_PASSWORD?.trim()) {
    console.warn(`Seed users created with generated bootstrap password: ${bootstrapPassword}`);
  }
}
if (false && userCount.count === 0) {
  const bootstrapPassword = process.env.SEED_USER_PASSWORD?.trim() || process.env.SUPER_ADMIN_PASSWORD?.trim() || crypto.randomUUID();
  const stored = await buildStoredPasswordFields(bootstrapPassword);
  const insertUser = db.prepare("INSERT INTO users (name, email, password, password_hash, name_bn, role, division, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  insertUser.run("Admin User", "admin@ugc.gov.bd", "password", "অ্যাডমিন ইউজার", "admin", "আইসিটি বিভাগ", "Active");
  insertUser.run("Hardware Desk Officer", "hardware@ugc.gov.bd", "password", "ডেস্ক অফিসার (হার্ডওয়্যার)", "desk_officer_hardware", "আইসিটি বিভাগ", "Active");
  insertUser.run("Network Desk Officer", "network@ugc.gov.bd", "password", "ডেস্ক অফিসার (নেটওয়ার্ক)", "desk_officer_network", "আইসিটি বিভাগ", "Active");
  insertUser.run("Software Desk Officer", "software@ugc.gov.bd", "password", "ডেস্ক অফিসার (সফটওয়্যার)", "desk_officer_software", "আইসিটি বিভাগ", "Active");
  insertUser.run("Maintenance Desk Officer", "maintenance@ugc.gov.bd", "password", "ডেস্ক অফিসার (মেইনটেন্যান্স)", "desk_officer_maintenance", "আইসিটি বিভাগ", "Active");
  insertUser.run("Test Employee", "employee@ugc.gov.bd", "password", "টেস্ট কর্মচারী", "employee", "প্রশাসন বিভাগ", "Active");
  insertUser.run("Maruf Alam", "maruf@ugc.gov.bd", "password", "মারুফ আলম", "employee", "অর্থ ও হিসাব বিভাগ", "Inactive");
  insertUser.run("Maruf Alam (Admin)", "mmarufalamj@gmail.com", "password", "মারুফ আলম", "admin", "আইসিটি বিভাগ", "Active");
}

const divisionCount = db.prepare("SELECT count(*) as count FROM divisions").get() as { count: number };
if (divisionCount.count === 0) {
  const insertDiv = db.prepare("INSERT INTO divisions (name, head, employees, status) VALUES (?, ?, ?, ?)");
  insertDiv.run("আইসিটি বিভাগ", "পরিচালক (আইসিটি)", 25, "Active");
  insertDiv.run("প্রশাসন বিভাগ", "সচিব", 45, "Active");
  insertDiv.run("অর্থ ও হিসাব বিভাগ", "পরিচালক (অর্থ)", 30, "Active");
  insertDiv.run("পরিকল্পনা ও উন্নয়ন বিভাগ", "পরিচালক (পরিকল্পনা)", 20, "Active");
}

const roleCount = db.prepare("SELECT count(*) as count FROM roles").get() as { count: number };
if (roleCount.count === 0) {
  const insertRole = db.prepare("INSERT INTO roles (name, slug, name_bn, description, permissions, status) VALUES (?, ?, ?, ?, ?, ?)");
  const adminPerms = JSON.stringify(['dashboard', 'application_form', 'application_history', 'all_applications', 'assigned_applications', 'rejected_applications', 'user_management', 'role_management', 'division_management', 'profile', 'reports', 'settings', 'telephone_directory']);
  const employeePerms = JSON.stringify(['dashboard', 'application_form', 'application_history', 'profile', 'telephone_directory']);
  const officerPerms = JSON.stringify(['dashboard', 'assigned_applications', 'application_history', 'profile', 'telephone_directory']);

  insertRole.run("Admin", "admin", "অ্যাডমিন", "সিস্টেমের পূর্ণ নিয়ন্ত্রণ", adminPerms, "Active");
  insertRole.run("Desk Officer (Hardware)", "desk_officer_hardware", "ডেস্ক অফিসার (হার্ডওয়্যার)", "হার্ডওয়্যার সংক্রান্ত সেবা সমাধান", officerPerms, "Active");
  insertRole.run("Desk Officer (Network)", "desk_officer_network", "ডেস্ক অফিসার (নেটওয়ার্ক)", "নেটওয়ার্ক সংক্রান্ত সেবা সমাধান", officerPerms, "Active");
  insertRole.run("Desk Officer (Software)", "desk_officer_software", "ডেস্ক অফিসার (সফটওয়্যার)", "সফটওয়্যার সংক্রান্ত সেবা সমাধান", officerPerms, "Active");
  insertRole.run("Desk Officer (Maintenance)", "desk_officer_maintenance", "ডেস্ক অফিসার (মেইনটেন্যান্স)", "সিস্টেম মেইনটেন্যান্স সেবা সমাধান", officerPerms, "Active");
  insertRole.run("Employee", "employee", "কর্মচারী", "সেবা অনুরোধ দাখিল", employeePerms, "Active");
  
  const divHeadPerms = JSON.stringify(['dashboard', 'application_form', 'received_applications', 'forwarded_applications', 'rejected_applications', 'application_history', 'profile', 'telephone_directory']);
  insertRole.run("Divisional Head", "divisional_head", "বিভাগীয় প্রধান", "বিভাগীয় আবেদন অনুমোদন", divHeadPerms, "Active");
}

const existingSuperAdmin = db.prepare("SELECT id FROM users WHERE email = ?").get(SUPER_ADMIN_EMAIL) as { id: number } | undefined;
if (existingSuperAdmin) {
  const configuredSuperAdminPassword = process.env.SUPER_ADMIN_PASSWORD?.trim() || process.env.SEED_USER_PASSWORD?.trim();
  if (configuredSuperAdminPassword) {
    const stored = await buildStoredPasswordFields(configuredSuperAdminPassword);
    db.prepare("UPDATE users SET name = ?, password = ?, password_hash = ?, name_bn = ?, role = ?, division = ?, status = ? WHERE id = ?")
      .run(SUPER_ADMIN_NAME, stored.password, stored.password_hash, SUPER_ADMIN_NAME_BN, "admin", "আইসিটি বিভাগ", "Active", existingSuperAdmin.id);
  } else {
    db.prepare("UPDATE users SET name = ?, name_bn = ?, role = ?, division = ?, status = ? WHERE id = ?")
      .run(SUPER_ADMIN_NAME, SUPER_ADMIN_NAME_BN, "admin", "আইসিটি বিভাগ", "Active", existingSuperAdmin.id);
  }
} else {
  const stored = await buildStoredPasswordFields(SUPER_ADMIN_PASSWORD);
  db.prepare("INSERT INTO users (name, email, password, password_hash, name_bn, role, division, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run(SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, stored.password, stored.password_hash, SUPER_ADMIN_NAME_BN, "admin", "আইসিটি বিভাগ", "Active");
}

try {
  const usersMissingHashes = db.prepare("SELECT id, password FROM users WHERE password_hash IS NULL OR password_hash = ''").all() as Array<{ id: number; password: string | null }>;
  const updatePasswordStatement = db.prepare("UPDATE users SET password = ?, password_hash = ? WHERE id = ?");

  for (const user of usersMissingHashes) {
    const sourcePassword = user.password || crypto.randomUUID();
    const stored = await buildStoredPasswordFields(sourcePassword);
    updatePasswordStatement.run(stored.password, stored.password_hash, user.id);
  }
} catch (e) {
  console.error("Post-seed password migration error:", e);
}

const appCount = db.prepare("SELECT count(*) as count FROM applications").get() as { count: number };
if (appCount.count === 0) {
  const insertApp = db.prepare("INSERT INTO applications (tracking_no, user_email, user_name, division, service_type, problem_details, status, submission_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  insertApp.run(buildTrackingNumber("প্রশাসন বিভাগ", "08/04/2026", 1), "employee@ugc.gov.bd", "Test Employee", "প্রশাসন বিভাগ", "হার্ডওয়্যার", "প্রিন্টার কাজ করছে না", "Done", "08/04/2026");
  insertApp.run(buildTrackingNumber("প্রশাসন বিভাগ", "08/04/2026", 2), "employee@ugc.gov.bd", "Test Employee", "প্রশাসন বিভাগ", "নেটওয়ার্ক", "ইন্টারনেট সংযোগ বিচ্ছিন্ন", "In Progress", "08/04/2026");
}
}

try {
  await backfillNormalizedAssignmentsFromOfficerActionDetails();
} catch (e) {
  console.error("Assignment normalization migration error:", e);
}

try {
  await backfillTrackingCountersFromApplications();
} catch (e) {
  console.error("Tracking counter backfill error:", e);
}

try {
  await backfillDataShareAccessLogsFromClientUsage();
} catch (e) {
  console.error("Data-share access log backfill error:", e);
}

// Migration validation helpers
const validatePostgresMigrations = async (): Promise<{ valid: boolean; missingMigrations: string[] }> => {
  try {
    // Check if schema_migrations table exists
    const result = await db.prepare(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'schema_migrations'
    `).all() as any[];
    
    if (!result || result.length === 0) {
      return {
        valid: false,
        missingMigrations: ["schema_migrations table not found - migrations have not been applied"]
      };
    }

    // Get list of expected migrations
    const migrationsDir = path.join(__dirname, "migrations");
    const expectedMigrations = fs
      .readdirSync(migrationsDir)
      .filter((file) => /^\d+_.+\.sql$/.test(file))
      .map(file => file.replace(/\.sql$/, ""))
      .sort();

    // Check which migrations have been applied
    const appliedResult = await db.prepare(`
      SELECT version FROM schema_migrations ORDER BY version
    `).all() as Array<{ version: string }>;
    
    const appliedMigrations = new Set(appliedResult.map(r => r.version));
    const missingMigrations = expectedMigrations.filter(m => !appliedMigrations.has(m));

    if (missingMigrations.length > 0) {
      return {
        valid: false,
        missingMigrations
      };
    }

    // Validate that critical tables exist
    const criticalTables = ["users", "applications", "roles", "user_sessions", "audit_logs"];
    for (const table of criticalTables) {
      const tableCheck = await db.prepare(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ?
      `).all(table) as any[];
      
      if (!tableCheck || tableCheck.length === 0) {
        return {
          valid: false,
          missingMigrations: [`Critical table '${table}' does not exist`]
        };
      }
    }

    return { valid: true, missingMigrations: [] };
  } catch (error) {
    return {
      valid: false,
      missingMigrations: [`Migration validation error: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
};

const validateSQLiteSchema = async (): Promise<{ valid: boolean; missingTables: string[] }> => {
  try {
    const criticalTables = ["users", "applications", "roles", "user_sessions", "audit_logs"];
    const missingTables: string[] = [];

    for (const table of criticalTables) {
      try {
        const result = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(table) as any;
        if (!result) {
          missingTables.push(table);
        }
      } catch (e) {
        missingTables.push(table);
      }
    }

    return {
      valid: missingTables.length === 0,
      missingTables
    };
  } catch (error) {
    return {
      valid: false,
      missingTables: [`Schema validation error: ${error instanceof Error ? error.message : String(error)}`]
    };
  }
};

let schemaValidationResult: { valid: boolean; missingMigrations?: string[]; missingTables?: string[] } = {
  valid: true
};

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Validate schema on startup
  if (usingPostgres) {
    console.log("Validating PostgreSQL migrations...");
    const validation = await validatePostgresMigrations();
    schemaValidationResult = validation;
    
    if (!validation.valid) {
      const errorMsg = `Database schema validation failed:\n- ${validation.missingMigrations.join("\n- ")}\n\nRun 'npm run db:migrate:pg' before starting the server.`;
      console.error(errorMsg);
      process.exit(1);
    }
    console.log("✓ All PostgreSQL migrations are applied");
  } else {
    console.log("Validating SQLite schema...");
    const validation = await validateSQLiteSchema();
    schemaValidationResult = validation;
    
    if (!validation.valid) {
      console.warn(`⚠ SQLite schema incomplete: ${validation.missingTables?.join(", ")}\nServer will attempt to create missing tables.`);
    } else {
      console.log("✓ SQLite schema is valid");
    }
  }

  app.disable("x-powered-by");
  if (process.env.TRUST_PROXY === "true") {
    app.set("trust proxy", 1);
  }

  app.use((req, res, next) => {
    const isSharedReportView = req.path.startsWith("/shared/reports");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (!isSharedReportView) {
      res.setHeader("X-Frame-Options", "DENY");
    }
    res.setHeader("Referrer-Policy", "same-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (process.env.NODE_ENV === "production") {
      const allowedFrameAncestors = isSharedReportView && configuredDataShareOrigins.length > 0
        ? configuredDataShareOrigins.filter((origin) => origin !== "*").join(" ")
        : "";
      const frameAncestors = isSharedReportView
        ? `'self'${allowedFrameAncestors ? ` ${allowedFrameAncestors}` : ""}`
        : "'none'";
      res.setHeader("Content-Security-Policy", `default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors ${frameAncestors}`);
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
    next();
  });

  app.use((req, res, next) => {
    if (!req.path.startsWith("/api/shared-data/")) {
      return next();
    }

    const origin = typeof req.headers.origin === "string" ? req.headers.origin : "";
    if (origin && isAllowedDataShareOrigin(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Authorization, X-API-Key, Content-Type, Accept");
      res.setHeader("Access-Control-Max-Age", "600");
    }

    if (req.method === "OPTIONS") {
      return res.status(origin && isAllowedDataShareOrigin(origin) ? 204 : 403).end();
    }

    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));
  app.use("/quick-links", express.static(quickLinkUploadDir));

  app.get("/healthz", async (_req, res) => {
    try {
      if (usingPostgres) {
        await db.prepare("SELECT 1 AS ok").get();
      }
      
      const schemaValid = schemaValidationResult.valid;
      const statusCode = schemaValid ? 200 : 503;
      
      return res.status(statusCode).json({
        ok: schemaValid,
        database: usingPostgres ? "postgresql" : "sqlite",
        schemaValid: schemaValidationResult.valid,
        schemaIssues: schemaValidationResult.missingMigrations || schemaValidationResult.missingTables || [],
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return res.status(503).json({
        ok: false,
        database: usingPostgres ? "postgresql" : "sqlite",
        schemaValid: false,
        schemaIssues: [error instanceof Error ? error.message : String(error)],
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.use(async (req, _res, next) => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies[SESSION_COOKIE_NAME];

    if (!sessionToken) {
      return next();
    }

    const email = await getSessionEmail(sessionToken);
    if (!email) {
      return next();
    }

    const user = await getUserWithPermissionsByEmail(email);
    if (!user || user.status === "Inactive") {
      await deleteUserSession(sessionToken);
      return next();
    }

    (req as AuthenticatedRequest).user = serializeUser(user);
    next();
  });

  app.use(async (req, res, next) => {
    const systemSettings = await getSystemSettings();
    if (!systemSettings.maintenanceMode) {
      return next();
    }

    const currentUser = (req as AuthenticatedRequest).user;
    const isAdmin = currentUser?.role === "admin";
    const isAllowedRoute =
      req.path === "/api/login" ||
      req.path === "/api/logout" ||
      req.path === "/api/session" ||
      req.path === "/api/system-settings";

    if (isAdmin || isAllowedRoute || !req.path.startsWith("/api/")) {
      return next();
    }

    return res.status(503).json({
      success: false,
      maintenanceMode: true,
      message: "System is currently under maintenance.",
    });
  });

  app.use((req, res, next) => {
    if (!req.path.startsWith("/api/") || req.path.startsWith("/api/audit-logs")) {
      return next();
    }

    const startedAt = Date.now();
    res.on("finish", () => {
      const currentUser = (req as AuthenticatedRequest).user;
      const isMutation = !["GET", "HEAD", "OPTIONS"].includes(req.method);
      const shouldLog = isMutation || req.path === "/api/login" || req.path === "/api/logout";
      if (!shouldLog) return;

      void writeAuditLog({
        user: currentUser,
        action: `${req.method} ${req.path}`,
        method: req.method,
        path: req.originalUrl || req.path,
        statusCode: res.statusCode,
        details: {
          duration_ms: Date.now() - startedAt,
          ip: req.ip,
        },
      });
    });

    next();
  });

  const requireAuth: express.RequestHandler = (req, res, next) => {
    const currentUser = (req as AuthenticatedRequest).user;
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    next();
  };

  const requirePermission = (...permissions: string[]): express.RequestHandler => {
    return (req, res, next) => {
      const currentUser = (req as AuthenticatedRequest).user;
      if (!currentUser) {
        return res.status(401).json({ success: false, message: "Authentication required." });
      }

      if (!permissions.some((permission) => currentUser.permissions.includes(permission))) {
        return res.status(403).json({ success: false, message: "You do not have access to this action." });
      }

      next();
    };
  };

  const requireAdmin: express.RequestHandler = (req, res, next) => {
    const currentUser = (req as AuthenticatedRequest).user;
    if (!currentUser) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    if (currentUser.role !== "admin") {
      return res.status(403).json({ success: false, message: "Admin access required." });
    }
    next();
  };

  const authenticateDataShareClient = async (req: express.Request) => {
    const authHeader = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
    const apiKeyHeader = req.headers["x-api-key"];
    const apiKey = typeof apiKeyHeader === "string" ? apiKeyHeader.trim() : "";
    const token = bearerToken || apiKey;

    if (!token) {
      return { error: { status: 401, message: "API key is required." } };
    }

    const tokenHash = hashApiToken(token);
    const client = await db.prepare(`
      SELECT id, name, scopes, status
      FROM data_share_clients
      WHERE token_hash = ?
    `).get(tokenHash) as { id: number; name: string; scopes: string; status: string } | undefined;

    if (!client || client.status !== "Active") {
      return { error: { status: 401, message: "Invalid or revoked API key." } };
    }

    let scopes: string[] = [];
    try {
      scopes = JSON.parse(client.scopes || "[]");
    } catch (error) {
      scopes = [];
    }

    const dataShareClient = {
      id: client.id,
      name: client.name,
      scopes: scopes.filter(isDataShareScope),
    };

    await db.prepare("UPDATE data_share_clients SET last_used_at = ? WHERE id = ?").run(new Date().toISOString(), client.id);
    return { client: dataShareClient };
  };

  const requireDataShareClient: express.RequestHandler = async (req, res, next) => {
    const result = await authenticateDataShareClient(req);
    if (result.error) {
      return res.status(result.error.status).json({ success: false, message: result.error.message });
    }

    (req as AuthenticatedRequest & { dataShareClient?: { id: number; name: string; scopes: DataShareScope[] } }).dataShareClient = result.client;
    next();
  };

  const requireDataShareScope = (scope: DataShareScope): express.RequestHandler => {
    return async (req, res, next) => {
      const result = await authenticateDataShareClient(req);
      if (result.error) {
        return res.status(result.error.status).json({ success: false, message: result.error.message });
      }

      if (!result.client?.scopes.includes(scope)) {
        return res.status(403).json({ success: false, message: "API key does not allow this data scope." });
      }

      (req as AuthenticatedRequest & { dataShareClient?: { id: number; name: string; scopes: DataShareScope[] } }).dataShareClient = result.client;
      next();
    };
  };

  // Auth API
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
    const loginKey = `${req.ip}:${typeof email === "string" ? email : ""}`;
    if (!consumeLoginAttempt(loginKey)) {
      return res.status(429).json({ success: false, message: "Too many login attempts. Please try again later." });
    }

    const user = await db.prepare(`
      SELECT u.*, r.permissions 
      FROM users u 
      LEFT JOIN roles r ON u.role = r.slug 
      WHERE u.email = ?
    `).get(email) as any;
    
    if (user && await verifyPassword(password, user.password_hash, user.password)) {
      if (user.status === 'Inactive') {
        return res.status(403).json({ success: false, message: "আপনার অ্যাকাউন্টটি নিষ্ক্রিয়। আইসিটি বিভাগের সাথে যোগাযোগ করুন।" });
      }
      
      if (!user.password_hash) {
        const stored = await buildStoredPasswordFields(password);
        await db.prepare("UPDATE users SET password = ?, password_hash = ? WHERE id = ?").run(stored.password, stored.password_hash, user.id);
        user.password = stored.password;
        user.password_hash = stored.password_hash;
      }

      const sessionToken = await createUserSession(user.email);
      clearLoginAttempts(loginKey);
      res.setHeader("Set-Cookie", buildSessionCookie(sessionToken));

      res.json({ 
        success: true, 
        user: serializeUser(user)
      });
    } else {
      res.status(401).json({ success: false, message: "ভুল ইমেইল অথবা পাসওয়ার্ড।" });
    }
  });

  app.get("/api/session", requireAuth, (req, res) => {
    res.json({ success: true, user: (req as AuthenticatedRequest).user });
  });

  app.put("/api/change-password", requireAuth, async (req, res) => {
    const currentUser = (req as AuthenticatedRequest).user!;
    const { password } = req.body;
    const nextPassword = typeof password === "string" ? password.trim() : "";
    if (!isStrongPassword(nextPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters and include uppercase, lowercase, number, and special character.",
      });
    }

    const stored = await buildStoredPasswordFields(nextPassword);
    await db.prepare("UPDATE users SET password = ?, password_hash = ?, must_change_password = false WHERE email = ?")
      .run(stored.password, stored.password_hash, currentUser.email);
    const user = await getUserWithPermissionsByEmail(currentUser.email);
    res.json({ success: true, user: serializeUser(user) });
  });

  app.post("/api/logout", requireAuth, async (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const sessionToken = cookies[SESSION_COOKIE_NAME];
    if (sessionToken) {
      await deleteUserSession(sessionToken);
    }
    res.setHeader("Set-Cookie", buildSessionCookie("", new Date(0)));
    res.json({ success: true });
  });

  // Divisions API
  app.get("/api/divisions", requireAuth, async (req, res) => {
    const divisions = await db.prepare("SELECT * FROM divisions").all();
    res.json(divisions);
  });

  app.post("/api/divisions", requirePermission("division_management"), async (req, res) => {
    const { name, head, employees, status } = req.body;
    const info = await db.prepare(`INSERT INTO divisions (name, head, employees, status) VALUES (?, ?, ?, ?)${usingPostgres ? " RETURNING id" : ""}`)
      .run(name, head, employees, status);
    res.json({ id: info.lastInsertRowid, name, head, employees, status });
  });

  app.put("/api/divisions/:id", requirePermission("division_management"), async (req, res) => {
    const { id } = req.params;
    const { name, head, employees, status } = req.body;
    await db.prepare("UPDATE divisions SET name = ?, head = ?, employees = ?, status = ? WHERE id = ?")
      .run(name, head, employees, status, id);
    res.json({ id, name, head, employees, status });
  });

  app.delete("/api/divisions/:id", requirePermission("division_management"), async (req, res) => {
    const { id } = req.params;
    await db.prepare("DELETE FROM divisions WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Users API
  app.get("/api/users", requirePermission("user_management"), async (req, res) => {
    const users = await db.prepare("SELECT id, name, email, name_bn, role, division, status, designation, mobile, extra_permissions, denied_permissions FROM users WHERE email != ?").all(SUPER_ADMIN_EMAIL) as any[];
    const normalizedUsers = users.map((user) => ({
      ...user,
      extra_permissions: parsePermissions(user.extra_permissions),
      denied_permissions: parsePermissions(user.denied_permissions),
    }));
    res.json(normalizedUsers);
  });

  app.get("/api/officer-directory", requireAuth, async (_req, res) => {
    const systemSettings = await getSystemSettings();
    const officers = await db.prepare(`
      SELECT u.id, u.name, u.email, u.name_bn, u.role, u.division, u.designation, u.mobile, u.status, u.extra_permissions, u.denied_permissions, r.permissions
      FROM users u
      LEFT JOIN roles r ON u.role = r.slug
      WHERE u.status = 'Active'
      ORDER BY u.name_bn ASC, u.name ASC
    `).all() as any[];
    const normalizedOfficers = officers
      .map((officer) => {
        const permissions = resolveUserPermissions(officer);
        const providerRoles = getProviderOfficerRolesFromPermissions(permissions, systemSettings);
        const isDeskOfficer = `${officer.role || ""}`.startsWith("desk_officer_");
        if (!isDeskOfficer && providerRoles.length === 0) return null;
        return {
          id: officer.id,
          name: officer.name,
          email: officer.email,
          name_bn: officer.name_bn,
          role: officer.role,
          division: officer.division,
          designation: officer.designation,
          mobile: officer.mobile,
          status: officer.status,
          permissions,
          extra_permissions: parsePermissions(officer.extra_permissions),
          denied_permissions: parsePermissions(officer.denied_permissions),
        };
      })
      .filter(Boolean);
    res.json(normalizedOfficers);
  });

  app.post("/api/users", requirePermission("user_management"), async (req, res) => {
    const { name, email, name_bn, role, division, status, password, extra_permissions, denied_permissions } = req.body;
    try {
      const nextPassword = typeof password === "string" && password.trim() ? password : process.env.SEED_USER_PASSWORD?.trim() || crypto.randomUUID();
      const stored = await buildStoredPasswordFields(nextPassword);
      const info = await db.prepare(`INSERT INTO users (name, email, password, password_hash, name_bn, role, division, status, extra_permissions, denied_permissions, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)${usingPostgres ? " RETURNING id" : ""}`)
        .run(
          name,
          email,
          stored.password,
          stored.password_hash,
          name_bn || name,
          role,
          division,
          status,
          JSON.stringify(extra_permissions || []),
          JSON.stringify(denied_permissions || []),
          true,
        );
      res.json({ id: info.lastInsertRowid, name, email, name_bn: name_bn || name, role, division, status, extra_permissions: extra_permissions || [], denied_permissions: denied_permissions || [] });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.put("/api/users/:id", requirePermission("user_management"), async (req, res) => {
    const { id } = req.params;
    const { name, email, name_bn, role, division, status, password, extra_permissions, denied_permissions } = req.body;
    const existingUser = await db.prepare("SELECT email FROM users WHERE id = ?").get(id) as { email: string } | undefined;
    if (existingUser?.email === SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ error: "Super admin account cannot be modified from user management." });
    }
    if (password) {
      const stored = await buildStoredPasswordFields(password);
      await db.prepare("UPDATE users SET name = ?, email = ?, password = ?, password_hash = ?, must_change_password = true, name_bn = ?, role = ?, division = ?, status = ?, extra_permissions = ?, denied_permissions = ? WHERE id = ?")
        .run(name, email, stored.password, stored.password_hash, name_bn || name, role, division, status, JSON.stringify(extra_permissions || []), JSON.stringify(denied_permissions || []), id);
    } else {
      await db.prepare("UPDATE users SET name = ?, email = ?, name_bn = ?, role = ?, division = ?, status = ?, extra_permissions = ?, denied_permissions = ? WHERE id = ?")
        .run(name, email, name_bn || name, role, division, status, JSON.stringify(extra_permissions || []), JSON.stringify(denied_permissions || []), id);
    }
    res.json({ id, name, email, name_bn: name_bn || name, role, division, status, extra_permissions: extra_permissions || [], denied_permissions: denied_permissions || [] });
  });

  app.delete("/api/users/:id", requirePermission("user_management"), async (req, res) => {
    const { id } = req.params;
    const existingUser = await db.prepare("SELECT email FROM users WHERE id = ?").get(id) as { email: string } | undefined;
    if (existingUser?.email === SUPER_ADMIN_EMAIL) {
      return res.status(403).json({ error: "Super admin account cannot be deleted." });
    }
    await db.prepare("DELETE FROM users WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Roles API
  app.get("/api/roles", requirePermission("role_management"), async (req, res) => {
    const roles = await db.prepare("SELECT * FROM roles").all();
    res.json(roles);
  });

  app.post("/api/roles", requirePermission("role_management"), async (req, res) => {
    const { name, slug, name_bn, description, permissions, status } = req.body;
    const info = await db.prepare(`INSERT INTO roles (name, slug, name_bn, description, permissions, status) VALUES (?, ?, ?, ?, ?, ?)${usingPostgres ? " RETURNING id" : ""}`)
      .run(name, slug, name_bn, description, permissions, status);
    res.json({ id: info.lastInsertRowid, name, slug, name_bn, description, permissions, status });
  });

  app.put("/api/roles/:id", requirePermission("role_management"), async (req, res) => {
    const { id } = req.params;
    const { name, slug, name_bn, description, permissions, status } = req.body;
    await db.prepare("UPDATE roles SET name = ?, slug = ?, name_bn = ?, description = ?, permissions = ?, status = ? WHERE id = ?")
      .run(name, slug, name_bn, description, permissions, status, id);
    res.json({ id, name, slug, name_bn, description, permissions, status });
  });

  app.delete("/api/roles/:id", requirePermission("role_management"), async (req, res) => {
    const { id } = req.params;
    await db.prepare("DELETE FROM roles WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/system-settings", async (_req, res) => {
    res.json(await getSystemSettings());
  });

  app.get("/api/data-share/clients", requirePermission("settings"), async (_req, res) => {
    const clients = await db.prepare(`
      SELECT id, name, scopes, status, created_by, created_at, last_used_at, revoked_at
      FROM data_share_clients
      ORDER BY created_at DESC, id DESC
    `).all() as any[];

    res.json(clients.map((client) => ({
      ...client,
      scopes: (() => {
        try {
          return JSON.parse(client.scopes || "[]");
        } catch (error) {
          return [];
        }
      })(),
    })));
  });

  app.post("/api/data-share/clients", requirePermission("settings"), async (req, res) => {
    const currentUser = (req as AuthenticatedRequest).user!;
    const name = typeof req.body.name === "string" ? req.body.name.trim() : "";
    const scopes = Array.isArray(req.body.scopes)
      ? Array.from(new Set(req.body.scopes.filter(isDataShareScope)))
      : [];

    if (!name) {
      return res.status(400).json({ success: false, message: "Client name is required." });
    }
    if (scopes.length === 0) {
      return res.status(400).json({ success: false, message: "Select at least one data scope." });
    }

    const token = `ugc_${crypto.randomBytes(32).toString("base64url")}`;
    const tokenHash = hashApiToken(token);
    const createdAt = new Date().toISOString();
    const info = await db.prepare(`
      INSERT INTO data_share_clients (name, token_hash, scopes, status, created_by, created_at)
      VALUES (?, ?, ?, 'Active', ?, ?)
      ${usingPostgres ? "RETURNING id" : ""}
    `).run(name, tokenHash, JSON.stringify(scopes), currentUser.email, createdAt);

    const id = (info as any).lastInsertRowid || (info as any).rows?.[0]?.id;
    await writeDataShareAccessLog({
      client: { id: Number(id), name },
      direction: "Push",
      scope: "meta",
      endpoint: req.path,
      method: req.method,
      statusCode: 200,
      rowCount: 1,
      ip: req.ip,
      userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
      details: { action: "client_created", scopes },
    });
    res.json({
      success: true,
      client: {
        id,
        name,
        scopes,
        status: "Active",
        created_by: currentUser.email,
        created_at: createdAt,
        last_used_at: null,
        revoked_at: null,
      },
      token,
      token_notice: "Store this token now. It will not be shown again.",
    });
  });

  app.put("/api/data-share/clients/:id/revoke", requirePermission("settings"), async (req, res) => {
    const { id } = req.params;
    const existingClient = await db.prepare("SELECT id, name FROM data_share_clients WHERE id = ?").get(id) as { id: number; name: string } | undefined;
    await db.prepare(`
      UPDATE data_share_clients
      SET status = 'Revoked', revoked_at = ?
      WHERE id = ?
    `).run(new Date().toISOString(), id);
    await writeDataShareAccessLog({
      client: existingClient || { id: Number(id), name: "Unknown" },
      direction: "Push",
      scope: "meta",
      endpoint: req.path,
      method: req.method,
      statusCode: 200,
      rowCount: 1,
      ip: req.ip,
      userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
      details: { action: "client_revoked" },
    });
    res.json({ success: true });
  });

  app.get("/api/data-share/logs", requirePermission("settings"), async (req, res) => {
    const direction = typeof req.query.direction === "string" ? req.query.direction.trim() : "";
    const clauses: string[] = [];
    const values: string[] = [];

    if (direction === "Pull" || direction === "Push") {
      clauses.push("direction = ?");
      values.push(direction);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const logs = await db.prepare(`
      SELECT id, client_id, client_name, direction, scope, endpoint, method,
             status_code, row_count, ip, user_agent, details, created_at
      FROM data_share_access_logs
      ${where}
      ORDER BY id DESC
      LIMIT 500
    `).all(...values) as any[];

    res.json(logs.map((log) => ({
      ...log,
      details: (() => {
        try {
          return log.details ? JSON.parse(log.details) : null;
        } catch {
          return log.details;
        }
      })(),
    })));
  });

  app.get("/api/shared-data/meta", requireDataShareClient, async (req, res) => {
    const client = (req as AuthenticatedRequest & { dataShareClient?: { id: number; name: string; scopes: DataShareScope[] } }).dataShareClient;
    const endpoints = (client?.scopes || []).flatMap((scope) => {
      if (scope === "applications") {
        return ["/api/shared-data/applications", "/api/shared-data/dashboard-summary", "/api/shared-data/apps"];
      }
      if (scope === "telephone_directory") {
        return ["/api/shared-data/telephone_directory", "/api/shared-data/telephone-directory"];
      }
      return [`/api/shared-data/${scope}`];
    });

    const payload = {
      success: true,
      client: client?.name || "API client",
      scopes: client?.scopes || [],
      endpoints,
    };
    await writeDataShareAccessLog({
      client,
      direction: "Pull",
      scope: "meta",
      endpoint: req.path,
      method: req.method,
      statusCode: 200,
      rowCount: endpoints.length,
      ip: req.ip,
      userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
    });
    res.json(payload);
  });

  app.get("/api/shared-data/dashboard-summary", requireDataShareScope("applications"), async (_req, res) => {
    const req = _req;
    const client = (req as AuthenticatedRequest & { dataShareClient?: { id: number; name: string } }).dataShareClient;
    const summary = await db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'Rejected by Divisional Head' THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN status NOT IN ('Done', 'Rejected by Divisional Head') THEN 1 ELSE 0 END) AS pending
      FROM applications
    `).get() as { total: number; completed: number | null; rejected: number | null; pending: number | null };

    const byStatusRows = await db.prepare(`
      SELECT status, COUNT(*) AS count
      FROM applications
      GROUP BY status
      ORDER BY status ASC
    `).all() as Array<{ status: string; count: number }>;

    const byStatus = byStatusRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status || "Unknown"] = Number(row.count || 0);
      return acc;
    }, {});

    await writeDataShareAccessLog({
      client,
      direction: "Pull",
      scope: "applications",
      endpoint: req.path,
      method: req.method,
      statusCode: 200,
      rowCount: Number(summary.total || 0),
      ip: req.ip,
      userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
      details: { response: "dashboard-summary", by_status_count: Object.keys(byStatus).length },
    });

    res.json({
      success: true,
      apps: {
        total: Number(summary.total || 0),
        pending: Number(summary.pending || 0),
        completed: Number(summary.completed || 0),
        rejected: Number(summary.rejected || 0),
      },
      by_status: byStatus,
    });
  });

  app.get("/api/shared-data/reports", requireDataShareScope("reports"), async (req, res) => {
    const client = (req as AuthenticatedRequest & { dataShareClient?: { id: number; name: string } }).dataShareClient;
    const applications = await db.prepare(`
      SELECT id, tracking_no, user_email, user_name, division, service_type, status, submission_date
      FROM applications
      ORDER BY id DESC
      LIMIT 5000
    `).all() as any[];
    const users = await db.prepare(`
      SELECT id, name, email, division, status
      FROM users
      ORDER BY name ASC
      LIMIT 5000
    `).all() as any[];
    const divisions = await db.prepare(`
      SELECT id, name, status
      FROM divisions
      ORDER BY name ASC
    `).all() as any[];
    const settings = await getSystemSettings();

    await writeDataShareAccessLog({
      client,
      direction: "Pull",
      scope: "reports",
      endpoint: req.path,
      method: req.method,
      statusCode: 200,
      rowCount: applications.length,
      ip: req.ip,
      userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
      details: { response: "reports-page", users: users.length, divisions: divisions.length },
    });

    res.json({
      success: true,
      api_version: "1.0",
      source: {
        system: "UGC IT Service Request System",
        generated_at: new Date().toISOString(),
      },
      data: {
        applications,
        users,
        divisions,
        settings: {
          categories: settings.categories,
          requestTypes: settings.requestTypes,
        },
        status_config: DATA_SHARE_STATUS_CONFIG,
      },
      errors: [],
    });
  });

  app.get("/api/shared-data/apps", requireDataShareScope("applications"), async (_req, res) => {
    const req = _req;
    const client = (req as AuthenticatedRequest & { dataShareClient?: { id: number; name: string } }).dataShareClient;
    const summary = await db.prepare(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'Done' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'Rejected by Divisional Head' THEN 1 ELSE 0 END) AS rejected,
        SUM(CASE WHEN status NOT IN ('Done', 'Rejected by Divisional Head') THEN 1 ELSE 0 END) AS pending
      FROM applications
    `).get() as { total: number; completed: number | null; rejected: number | null; pending: number | null };

    await writeDataShareAccessLog({
      client,
      direction: "Pull",
      scope: "applications",
      endpoint: req.path,
      method: req.method,
      statusCode: 200,
      rowCount: 1,
      ip: req.ip,
      userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
      details: { response: "apps-summary" },
    });

    res.json({
      success: true,
      api_version: "1.0",
      source: {
        system: "UGC IT Service Request System",
        generated_at: new Date().toISOString(),
      },
      data: {
        apps: {
          total: Number(summary.total || 0),
          pending: Number(summary.pending || 0),
          completed: Number(summary.completed || 0),
          rejected: Number(summary.rejected || 0),
        },
      },
      errors: [],
    });
  });

  app.get("/api/shared-data/applications", requireDataShareScope("applications"), async (req, res) => {
    const client = (req as AuthenticatedRequest & { dataShareClient?: { id: number; name: string } }).dataShareClient;
    const status = typeof req.query.status === "string" ? req.query.status.trim() : "";
    const since = typeof req.query.since === "string" ? req.query.since.trim() : "";
    const clauses: string[] = [];
    const values: string[] = [];

    if (status) {
      clauses.push("status = ?");
      values.push(status);
    }
    if (since) {
      clauses.push("submission_date >= ?");
      values.push(since);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = await db.prepare(`
      SELECT id, tracking_no, user_email, user_name, division, service_type, problem_details,
             category_problem_details, status, submission_date, designation, mobile, div_head_email
      FROM applications
      ${where}
      ORDER BY id DESC
      LIMIT 1000
    `).all(...values) as any[];
    await writeDataShareAccessLog({
      client,
      direction: "Pull",
      scope: "applications",
      endpoint: req.path,
      method: req.method,
      statusCode: 200,
      rowCount: rows.length,
      ip: req.ip,
      userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
      details: { filters: { status, since } },
    });
    res.json({ success: true, count: rows.length, data: rows });
  });

  app.get("/api/shared-data/assignments", requireDataShareScope("assignments"), async (req, res) => {
    const client = (req as AuthenticatedRequest & { dataShareClient?: { id: number; name: string } }).dataShareClient;
    const rows = await db.prepare(`
      SELECT aia.id, aia.application_id, a.tracking_no, aia.officer_role, aia.item_name,
             aia.provider_email, aia.provider_name, aia.provider_designation, aia.provider_role,
             aia.desk_officer_name, aia.assigned_at, aia.status, aia.officer_service_info,
             aia.provider_signed_at, aia.updated_at
      FROM application_item_assignments aia
      INNER JOIN applications a ON a.id = aia.application_id
      ORDER BY aia.updated_at DESC, aia.id DESC
      LIMIT 1000
    `).all() as any[];
    await writeDataShareAccessLog({
      client,
      direction: "Pull",
      scope: "assignments",
      endpoint: req.path,
      method: req.method,
      statusCode: 200,
      rowCount: rows.length,
      ip: req.ip,
      userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
    });
    res.json({ success: true, count: rows.length, data: rows });
  });

  app.get("/api/shared-data/telephone_directory", requireDataShareScope("telephone_directory"), async (req, res) => {
    const client = (req as AuthenticatedRequest & { dataShareClient?: { id: number; name: string } }).dataShareClient;
    const rows = await db.prepare(`
      SELECT id, name, designation, division, intercom, mobile, ip_number, email, room_no, notes, status
      FROM telephone_directory_entries
      WHERE status = 'Active'
      ORDER BY name COLLATE NOCASE ASC
    `).all() as any[];
    await writeDataShareAccessLog({
      client,
      direction: "Pull",
      scope: "telephone_directory",
      endpoint: req.path,
      method: req.method,
      statusCode: 200,
      rowCount: rows.length,
      ip: req.ip,
      userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
    });
    res.json({ success: true, count: rows.length, data: rows });
  });

  app.get("/api/shared-data/telephone-directory", requireDataShareScope("telephone_directory"), async (req, res) => {
    const client = (req as AuthenticatedRequest & { dataShareClient?: { id: number; name: string } }).dataShareClient;
    const rows = await db.prepare(`
      SELECT id, name, designation, division, intercom, mobile, ip_number, email, room_no, notes, status
      FROM telephone_directory_entries
      WHERE status = 'Active'
      ORDER BY name COLLATE NOCASE ASC
    `).all() as any[];
    await writeDataShareAccessLog({
      client,
      direction: "Pull",
      scope: "telephone_directory",
      endpoint: req.path,
      method: req.method,
      statusCode: 200,
      rowCount: rows.length,
      ip: req.ip,
      userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
    });
    res.json({ success: true, count: rows.length, data: rows });
  });

  app.get("/api/shared-data/divisions", requireDataShareScope("divisions"), async (req, res) => {
    const client = (req as AuthenticatedRequest & { dataShareClient?: { id: number; name: string } }).dataShareClient;
    const rows = await db.prepare(`
      SELECT id, name, head, employees, status
      FROM divisions
      ORDER BY name COLLATE NOCASE ASC
    `).all() as any[];
    await writeDataShareAccessLog({
      client,
      direction: "Pull",
      scope: "divisions",
      endpoint: req.path,
      method: req.method,
      statusCode: 200,
      rowCount: rows.length,
      ip: req.ip,
      userAgent: typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : undefined,
    });
    res.json({ success: true, count: rows.length, data: rows });
  });

  app.post("/api/system-settings/upload-quick-link", requirePermission("settings"), (req, res) => {
    try {
      const { fileName, mimeType, dataUrl } = req.body as {
        fileName?: string;
        mimeType?: string;
        dataUrl?: string;
      };

      if (!fileName || !dataUrl || typeof fileName !== "string" || typeof dataUrl !== "string") {
        return res.status(400).json({ success: false, message: "File payload is incomplete." });
      }

      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ success: false, message: "Invalid file payload." });
      }

      const [, detectedMimeType, base64Payload] = match;
      const effectiveMimeType = mimeType || detectedMimeType;
      const allowedExt = ALLOWED_UPLOAD_TYPES.get(effectiveMimeType);
      if (!allowedExt || detectedMimeType !== effectiveMimeType) {
        return res.status(400).json({ success: false, message: "Unsupported or mismatched file type." });
      }

      const buffer = Buffer.from(base64Payload, "base64");
      if (buffer.length > QUICK_LINK_UPLOAD_MAX_BYTES) {
        return res.status(400).json({ success: false, message: "File size must be 5 MB or less." });
      }

      const safeBaseName = path.basename(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
      const originalExt = path.extname(safeBaseName);
      if (originalExt && originalExt.toLowerCase() !== allowedExt) {
        return res.status(400).json({ success: false, message: "File extension does not match the uploaded content type." });
      }
      const finalExt = originalExt || allowedExt;
      const baseNameWithoutExt = safeBaseName.slice(0, safeBaseName.length - originalExt.length).replace(/[^a-zA-Z0-9_-]/g, "_") || "quick-link-file";
      const savedFileName = `${Date.now()}-${baseNameWithoutExt}${finalExt}`;
      const absolutePath = path.join(quickLinkUploadDir, savedFileName);

      fs.writeFileSync(absolutePath, buffer);

      return res.json({
        success: true,
        url: `/quick-links/${savedFileName}`,
        fileName: savedFileName,
      });
    } catch (error) {
      console.error("Quick link upload failed:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Quick link upload failed.",
      });
    }
  });

  app.put("/api/system-settings", requirePermission("settings"), async (req, res) => {
    const nextSettings = normalizeSystemSettings(req.body as Partial<AppSystemSettings>);
    await saveSystemSettings(nextSettings);
    res.json(nextSettings);
  });

  app.get("/api/telephone-directory", requirePermission("telephone_directory"), async (_req, res) => {
    const entries = await db.prepare(`
      SELECT id, name, designation, division, intercom, mobile, ip_number, email, room_no, notes, status
      FROM telephone_directory_entries
      ORDER BY name COLLATE NOCASE ASC
    `).all() as TelephoneDirectoryEntry[];
    res.json(entries);
  });

  app.post("/api/telephone-directory", requirePermission("settings"), async (req, res) => {
    const { name, designation, division, intercom, mobile, ip_number, email, room_no, notes, status } = req.body as Partial<TelephoneDirectoryEntry>;
    if (!name || !`${name}`.trim()) {
      return res.status(400).json({ success: false, message: "Name is required." });
    }

    const info = await db.prepare(`
      INSERT INTO telephone_directory_entries (name, designation, division, intercom, mobile, ip_number, email, room_no, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ${usingPostgres ? "RETURNING id" : ""}
    `).run(
      `${name}`.trim(),
      designation || null,
      division || null,
      intercom || null,
      mobile || null,
      ip_number || null,
      email || null,
      room_no || null,
      notes || null,
      status || "Active",
    );

    res.json({
      id: Number(info.lastInsertRowid),
      name: `${name}`.trim(),
      designation: designation || null,
      division: division || null,
      intercom: intercom || null,
      mobile: mobile || null,
      ip_number: ip_number || null,
      email: email || null,
      room_no: room_no || null,
      notes: notes || null,
      status: status || "Active",
    });
  });

  app.put("/api/telephone-directory/:id", requirePermission("settings"), async (req, res) => {
    const { id } = req.params;
    const { name, designation, division, intercom, mobile, ip_number, email, room_no, notes, status } = req.body as Partial<TelephoneDirectoryEntry>;
    if (!name || !`${name}`.trim()) {
      return res.status(400).json({ success: false, message: "Name is required." });
    }

    await db.prepare(`
      UPDATE telephone_directory_entries
      SET name = ?, designation = ?, division = ?, intercom = ?, mobile = ?, ip_number = ?, email = ?, room_no = ?, notes = ?, status = ?
      WHERE id = ?
    `).run(
      `${name}`.trim(),
      designation || null,
      division || null,
      intercom || null,
      mobile || null,
      ip_number || null,
      email || null,
      room_no || null,
      notes || null,
      status || "Active",
      id,
    );

    res.json({
      id: Number(id),
      name: `${name}`.trim(),
      designation: designation || null,
      division: division || null,
      intercom: intercom || null,
      mobile: mobile || null,
      ip_number: ip_number || null,
      email: email || null,
      room_no: room_no || null,
      notes: notes || null,
      status: status || "Active",
    });
  });

  app.post("/api/telephone-directory/import", requirePermission("settings"), async (req, res) => {
    const payloadEntries = Array.isArray(req.body?.entries) ? req.body.entries : [];
    if (payloadEntries.length === 0) {
      return res.status(400).json({ success: false, message: "No entries provided for import." });
    }

    const insertEntry = db.prepare(`
      INSERT INTO telephone_directory_entries (name, designation, division, intercom, mobile, ip_number, email, room_no, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const row of payloadEntries) {
      if (!row.name || !`${row.name}`.trim()) {
        continue;
      }
      await insertEntry.run(
        `${row.name}`.trim(),
        row.designation || null,
        row.division || null,
        row.intercom || null,
        row.mobile || null,
        row.ip_number || null,
        row.email || null,
        row.room_no || null,
        row.notes || null,
        row.status === "Inactive" ? "Inactive" : "Active",
      );
    }
    res.json({ success: true, count: payloadEntries.filter((row) => row?.name && `${row.name}`.trim()).length });
  });

  app.delete("/api/telephone-directory", requirePermission("settings"), async (_req, res) => {
    await db.prepare("DELETE FROM telephone_directory_entries").run();
    res.json({ success: true });
  });

  app.delete("/api/telephone-directory/:id", requirePermission("settings"), async (req, res) => {
    const { id } = req.params;
    await db.prepare("DELETE FROM telephone_directory_entries WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Applications API
  app.get("/api/applications", requireAuth, async (req, res) => {
    const currentUser = (req as AuthenticatedRequest).user!;
    const requestedEmail = typeof req.query.email === "string" ? req.query.email : undefined;
    const result = await getVisibleApplicationsForUser(currentUser, requestedEmail);

    if ("status" in result) {
      return res.status(result.status).json({ success: false, message: result.message });
    }

    res.json(result.applications);
  });

  app.post("/api/applications", requirePermission("application_form"), async (req, res) => {
    const currentUser = (req as AuthenticatedRequest).user!;
    const {
      division,
      service_type,
      problem_details,
      category_problem_details,
      applicant_signature,
      applicant_signed_at,
      designation,
      mobile
    } = req.body;
    const submission_date = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
    const nextSerial = await getNextTrackingSerial(division, submission_date);
    const tracking_no = buildTrackingNumber(division, submission_date, nextSerial);
    
    const info = await db.prepare(`
      INSERT INTO applications (
        tracking_no, user_email, user_name, division, service_type, problem_details,
        category_problem_details, status, submission_date, applicant_signature,
        applicant_signed_at, designation, mobile
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ${usingPostgres ? "RETURNING id" : ""}
    `).run(
      tracking_no,
      currentUser.email,
      currentUser.name,
      currentUser.division || division,
      service_type,
      problem_details,
      JSON.stringify(category_problem_details || {}),
      'Submitted',
      submission_date,
      applicant_signature,
      applicant_signed_at,
      designation,
      mobile
    );
    
    res.json({ id: info.lastInsertRowid, tracking_no, status: 'Submitted', submission_date });
  });

  app.put("/api/applications/approve", requirePermission("received_applications"), async (req, res) => {
    const currentUser = (req as AuthenticatedRequest).user!;
    const { id, div_head_signature, div_head_signed_at, status } = req.body;
    const application = await db.prepare("SELECT id, division, status FROM applications WHERE id = ?").get(id) as { id: number; division: string; status: string } | undefined;

    if (!application) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }

    const canApproveAnyDivision = currentUser.role === "admin" || currentUser.permissions.includes("all_applications");
    if (!canApproveAnyDivision && (!currentUser.division || application.division !== currentUser.division)) {
      return res.status(403).json({ success: false, message: "You do not have access to this application's division." });
    }

    if (application.status !== "Submitted" && !canApproveAnyDivision) {
      return res.status(409).json({ success: false, message: "Only submitted applications can be approved from this queue." });
    }

    await db.prepare(`
      UPDATE applications 
      SET status = ?, 
          div_head_email = ?, 
          div_head_signature = ?, 
          div_head_signed_at = ? 
      WHERE id = ?
    `).run(status || 'Forwarded for Approval', currentUser.email, div_head_signature, div_head_signed_at, id);
    res.json({ success: true });
  });

  app.put("/api/applications/:id/status", requirePermission("assigned_applications"), async (req, res) => {
    const currentUser = (req as AuthenticatedRequest).user!;
    const { id } = req.params;
    const { status, as_service_provider, as_self_assignment, officer_signature, officer_signed_at, officer_name, desk_officer_name, officer_designation, officer_service_info, officer_role, assigned_items, provider_email, provider_name, provider_designation, provider_role } = req.body;
    const normalizedOfficerName = `${officer_name || ''}`.trim() || null;
    const normalizedDeskOfficerName = `${desk_officer_name || currentUser.name_bn || currentUser.name || ''}`.trim() || null;
    const normalizedAssignedItems = Array.isArray(assigned_items)
      ? assigned_items.map((item) => `${item || ""}`.trim()).filter(Boolean)
      : [];
    const actingRole = typeof officer_role === "string" && officer_role ? officer_role : currentUser.role;
    const systemSettings = await getSystemSettings();
    const existingApplication = await db.prepare(`
      SELECT
        service_type,
        officer_signature,
        officer_signed_at,
        officer_action_details,
        status
      FROM applications
      WHERE id = ?
    `).get(id) as any;

    if (!existingApplication) {
      return res.status(404).json({ success: false, message: "Application not found." });
    }

    const relevantOfficerRoles = getRelevantOfficerRolesForServiceType(existingApplication.service_type || "", systemSettings);
    const providerOfficerRoles = getProviderOfficerRolesFromPermissions(currentUser.permissions, systemSettings, relevantOfficerRoles);
    const roleFromLegacyProvider = actingRole?.startsWith("service_provider_") ? actingRole.replace("service_provider_", "desk_officer_") : "";
    const serviceRole = (roleFromLegacyProvider || actingRole || "").trim();
    if (!serviceRole || !relevantOfficerRoles.includes(serviceRole)) {
      return res.status(403).json({ success: false, message: "You are not assigned to handle this application." });
    }

    let officerActionDetails: Record<string, any> = {};
    try {
      officerActionDetails = existingApplication?.officer_action_details
        ? JSON.parse(existingApplication.officer_action_details)
        : {};
    } catch (error) {
      officerActionDetails = {};
    }

    const roleSelectedItems = getRoleSelectedItems(existingApplication.service_type || "", serviceRole, systemSettings);
    const nowIso = new Date().toISOString();
    let roleDetailsForResponse: any = {};
    let handledAsProviderSubmitter = false;
    const requestedProviderMode = as_service_provider === true || `${currentUser.role || ""}`.startsWith("service_provider_");
    const isDeskOfficerForCurrentRole = currentUser.role === serviceRole;

    try {
      roleDetailsForResponse = await db.transaction(async (tx: any) => {
        const existingRoleDetails = serviceRole ? (officerActionDetails[serviceRole] || {}) : {};
        const frozenSignature = existingRoleDetails.signature || existingRoleDetails.legacy_signature || existingApplication?.officer_signature || null;
        const frozenSignedAt = existingRoleDetails.updated_at || existingApplication?.officer_signed_at || null;
        let nextApplicationStatus = status || existingApplication.status;
        const selfAssignedRows = isDeskOfficerForCurrentRole
          ? await tx.prepare(`
            SELECT *
            FROM application_item_assignments
            WHERE application_id = ? AND officer_role = ? AND provider_email = ?
            ORDER BY assigned_at ASC, id ASC
          `).all(id, serviceRole, currentUser.email) as any[]
          : [];
        const selfAssignedStatusUpdate =
          !requestedProviderMode
          && isDeskOfficerForCurrentRole
          && selfAssignedRows.length > 0
          && normalizedAssignedItems.length === 0
          && !`${provider_email || ""}`.trim();
        // Desk officers can update status for items self-assigned to their own role,
        // even if they do not hold the provider feature permission.
        const isProviderSubmitter = (requestedProviderMode || selfAssignedStatusUpdate)
          && (providerOfficerRoles.includes(serviceRole) || isDeskOfficerForCurrentRole);
        handledAsProviderSubmitter = isProviderSubmitter;

        if (isProviderSubmitter) {
          const rows = selfAssignedRows.length > 0 ? selfAssignedRows : await tx.prepare(`
            SELECT *
            FROM application_item_assignments
            WHERE application_id = ? AND officer_role = ? AND provider_email = ?
            ORDER BY assigned_at ASC, id ASC
          `).all(id, serviceRole, currentUser.email) as any[];
          if (rows.length === 0) {
            throw { status: 403, message: "This application is not assigned to you." };
          }

          await tx.prepare(`
            UPDATE application_item_assignments
            SET officer_service_info = ?, status = ?, provider_signature = ?, provider_signed_at = ?, updated_at = ?
            WHERE application_id = ? AND officer_role = ? AND provider_email = ?
          `).run(
            officer_service_info || null,
            status || existingApplication.status || "Forwarded for Approval",
            officer_signature || null,
            officer_signed_at || null,
            nowIso,
            id,
            serviceRole,
            currentUser.email,
          );
          nextApplicationStatus = status || existingApplication.status || "Forwarded for Approval";
        } else {
          const isSelfAssignment = as_self_assignment === true;
          const selectedProviderEmail = isSelfAssignment
            ? currentUser.email
            : (typeof provider_email === "string" && provider_email.trim() ? provider_email.trim() : "");
          const selectedProviderRole = isSelfAssignment
            ? getServiceProviderRoleForOfficerRole(serviceRole)
            : (typeof provider_role === "string" && provider_role.trim() ? provider_role.trim() : getServiceProviderRoleForOfficerRole(serviceRole));
          const selectedProviderName = isSelfAssignment
            ? (currentUser.name_bn || currentUser.name || null)
            : (typeof provider_name === "string" && provider_name.trim() ? provider_name.trim() : null);
          const selectedProviderDesignation = isSelfAssignment
            ? (currentUser.designation || getServiceProviderRoleLabel(selectedProviderRole))
            : (typeof provider_designation === "string" && provider_designation.trim()
              ? provider_designation.trim()
              : getServiceProviderRoleLabel(selectedProviderRole));
          const selectedAssignmentStatus = isSelfAssignment ? "In Progress" : (status || "Forwarded for Approval");
          nextApplicationStatus = isSelfAssignment ? "In Progress" : (status || existingApplication.status);

          if (!selectedProviderEmail) {
            throw { status: 400, message: "Please select a service provider." };
          }
          if (normalizedAssignedItems.length === 0) {
            throw { status: 400, message: "Select at least one assigned item before sending to a service provider." };
          }

          const invalidItems = normalizedAssignedItems.filter((item) => !roleSelectedItems.includes(item));
          if (invalidItems.length > 0) {
            throw { status: 400, message: "One or more selected items do not belong to this service category." };
          }

          const itemPlaceholders = normalizedAssignedItems.map(() => "?").join(", ");
          const overlappingItems = await tx.prepare(`
            SELECT item_name
            FROM application_item_assignments
            WHERE application_id = ? AND officer_role = ? AND item_name IN (${itemPlaceholders})
          `).all(id, serviceRole, ...normalizedAssignedItems) as Array<{ item_name: string }>;
          if (overlappingItems.length > 0) {
            throw { status: 409, message: `These item(s) are already assigned: ${overlappingItems.map((item) => item.item_name).join(", ")}` };
          }

          for (const item of normalizedAssignedItems) {
            await tx.prepare(`
              INSERT INTO application_item_assignments (
                application_id, officer_role, item_name, provider_email, provider_name, provider_designation,
                provider_role, desk_officer_name, desk_signature, desk_signed_at, assigned_at, status, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              id,
              serviceRole,
              item,
              selectedProviderEmail,
              selectedProviderName,
              selectedProviderDesignation,
              selectedProviderRole,
              normalizedDeskOfficerName,
              officer_signature || frozenSignature || null,
              officer_signed_at || frozenSignedAt || null,
              toDatabaseTimestamp(officer_signed_at || nowIso),
              selectedAssignmentStatus,
              nowIso,
            );
          }
        }

        const assignmentRows = await getAssignmentRowsForApplication(tx, id, serviceRole);
        const roleDetails = buildRoleDetailsWithAssignments({
          ...(officerActionDetails[serviceRole] || {}),
          officer_name: normalizedOfficerName,
          officer_designation: officer_designation || null,
          officer_service_info: officer_service_info || null,
          status: nextApplicationStatus || officerActionDetails[serviceRole]?.status || null,
          updated_at: officerActionDetails[serviceRole]?.updated_at || officer_signed_at || frozenSignedAt || null,
          desk_officer_name: normalizedDeskOfficerName,
          signature: officerActionDetails[serviceRole]?.signature || officer_signature || frozenSignature || null,
          desk_signature: officer_signature || officerActionDetails[serviceRole]?.desk_signature || officerActionDetails[serviceRole]?.signature || frozenSignature || null,
          desk_signed_at: officer_signed_at || officerActionDetails[serviceRole]?.desk_signed_at || officerActionDetails[serviceRole]?.updated_at || frozenSignedAt || null,
          legacy_signature: officerActionDetails[serviceRole]?.legacy_signature || null,
        }, groupAssignmentRows(assignmentRows));
        officerActionDetails[serviceRole] = roleDetails;

        await tx.prepare(`
          UPDATE applications
          SET status = ?,
              officer_signature = COALESCE(officer_signature, ?),
              officer_signed_at = COALESCE(officer_signed_at, ?),
              officer_name = ?,
              officer_designation = ?,
              officer_service_info = ?,
              officer_action_details = ?
          WHERE id = ?
        `).run(
          nextApplicationStatus,
          officer_signature || null,
          officer_signed_at || null,
          normalizedOfficerName,
          officer_designation || null,
          officer_service_info || null,
          JSON.stringify(officerActionDetails),
          id,
        );

        return roleDetails;
      });
    } catch (error: any) {
      if (error?.status) {
        return res.status(error.status).json({ success: false, message: error.message });
      }
      throw error;
    }

    const successMessage = handledAsProviderSubmitter
      ? "Status updated successfully."
      : (as_self_assignment === true
        ? `Self-assigned and moved to In Progress for ${normalizedAssignedItems.join(", ")}.`
        : `Sent to ${provider_name || provider_email || "the selected service provider"} for ${normalizedAssignedItems.join(", ")}.`);

    res.json({ success: true, message: successMessage, officer_action_details: roleDetailsForResponse });
  });

  // Profile Update API
  app.put("/api/profile", requirePermission("profile"), async (req, res) => {
    const currentUser = (req as AuthenticatedRequest).user!;
    const { photo, signature, designation, mobile } = req.body;
    try {
      const fields: string[] = [];
      const values: any[] = [];

      if (photo !== undefined) {
        fields.push("photo = ?");
        values.push(photo);
      }
      if (signature !== undefined && signature !== currentUser.signature) {
        if (currentUser.signature) {
          fields.push("pending_signature = ?");
          values.push(signature || null);
          fields.push("signature_pending_at = ?");
          values.push(new Date().toISOString());
        } else {
          fields.push("signature = ?");
          values.push(signature || null);
          fields.push("pending_signature = NULL");
          fields.push("signature_pending_at = NULL");
        }
      }
      if (designation !== undefined) {
        fields.push("designation = ?");
        values.push(designation);
      }
      if (mobile !== undefined) {
        fields.push("mobile = ?");
        values.push(mobile);
      }

      if (fields.length > 0) {
        values.push(currentUser.email);
        await db.prepare(`UPDATE users SET ${fields.join(", ")} WHERE email = ?`).run(...values);
      }
      
      const user = await getUserWithPermissionsByEmail(currentUser.email);

      res.json({ 
        success: true, 
        user: serializeUser(user),
        signaturePending: signature !== undefined && signature !== currentUser.signature && !!currentUser.signature,
      });
    } catch (error) {
      console.error("Profile update error:", error);
      res.status(500).json({ success: false, message: "প্রোফাইল আপডেট করতে সমস্যা হয়েছে" });
    }
  });

  app.get("/api/signature-approvals", requireAdmin, async (_req, res) => {
    const requests = await db.prepare(`
      SELECT id, name, name_bn, email, role, division, designation, signature, pending_signature, signature_pending_at
      FROM users
      WHERE pending_signature IS NOT NULL AND pending_signature != ''
      ORDER BY signature_pending_at DESC
    `).all();
    res.json(requests);
  });

  app.put("/api/signature-approvals/:id", requireAdmin, async (req, res) => {
    const currentUser = (req as AuthenticatedRequest).user!;
    const { id } = req.params;
    const { decision } = req.body;
    const targetUser = await db.prepare("SELECT id, email, name, name_bn, pending_signature FROM users WHERE id = ?").get(id) as any;
    if (!targetUser?.pending_signature) {
      return res.status(404).json({ success: false, message: "No pending signature found." });
    }

    if (decision === "approved") {
      await db.prepare("UPDATE users SET signature = pending_signature, pending_signature = NULL, signature_pending_at = NULL WHERE id = ?").run(id);
    } else if (decision === "rejected") {
      await db.prepare("UPDATE users SET pending_signature = NULL, signature_pending_at = NULL WHERE id = ?").run(id);
    } else {
      return res.status(400).json({ success: false, message: "Invalid decision." });
    }

    void writeAuditLog({
      user: currentUser,
      action: `signature_${decision}`,
      method: req.method,
      path: req.originalUrl,
      statusCode: 200,
      details: { target_email: targetUser.email },
    });
    res.json({ success: true });
  });

  app.get("/api/audit-logs", requireAdmin, async (req, res) => {
    const from = typeof req.query.from === "string" ? req.query.from : "";
    const to = typeof req.query.to === "string" ? req.query.to : "";
    const clauses: string[] = [];
    const values: string[] = [];

    if (from) {
      clauses.push("created_at >= ?");
      values.push(new Date(from).toISOString());
    }
    if (to) {
      clauses.push("created_at <= ?");
      values.push(new Date(to).toISOString());
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const logs = await db.prepare(`
      SELECT *
      FROM audit_logs
      ${where}
      ORDER BY id DESC
      LIMIT 1000
    `).all(...values);
    res.json(logs);
  });

  // Stats API
  app.get("/api/stats", requirePermission("dashboard"), async (req, res) => {
    const currentUser = (req as AuthenticatedRequest).user!;
    const visibleApplicationsResult = await getVisibleApplicationsForUser(currentUser);
    const visibleApplications = "applications" in visibleApplicationsResult ? visibleApplicationsResult.applications as Array<{ status: string }> : [];
    const canSeeOrgMetadata =
      currentUser.role === "admin" ||
      currentUser.permissions.includes("user_management") ||
      currentUser.permissions.includes("role_management") ||
      currentUser.permissions.includes("division_management");

    const toCount = (row: { count: number | string }) => Number(row.count) || 0;
    const userCount = canSeeOrgMetadata ? await db.prepare("SELECT count(*) as count FROM users").get() as { count: number | string } : { count: 0 };
    const divisionCount = canSeeOrgMetadata ? await db.prepare("SELECT count(*) as count FROM divisions").get() as { count: number | string } : { count: 0 };
    const roleCount = canSeeOrgMetadata ? await db.prepare("SELECT count(*) as count FROM roles").get() as { count: number | string } : { count: 0 };
    
    const totalApps = visibleApplications.length;
    const inProgressApps = visibleApplications.filter((app) => ['In Progress', 'Presented in File'].includes(app.status)).length;
    const resolvedApps = visibleApplications.filter((app) => app.status === 'Done').length;

    res.json({
      totalUsers: toCount(userCount),
      totalDivisions: toCount(divisionCount),
      totalRoles: toCount(roleCount),
      totalApplications: totalApps,
      inProgressApplications: inProgressApps,
      resolvedApplications: resolvedApps
    });
  });

  app.get("/shared/*", (req, res, next) => {
    const distIndex = path.join(process.cwd(), "dist", "index.html");
    if (fs.existsSync(distIndex)) {
      return res.sendFile(distIndex);
    }
    next();
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
