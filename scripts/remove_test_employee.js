const fs = require("fs");
const Database = require("better-sqlite3");

const paths = ["data/database.sqlite", "database.sqlite"];
let totalChanges = 0;

for (const p of paths) {
  if (!fs.existsSync(p)) continue;
  const db = new Database(p);
  try {
    const info = db
      .prepare("DELETE FROM users WHERE email = ? OR name = ?")
      .run("employee@ugc.gov.bd", "Test Employee");
    totalChanges += info.changes || 0;
    console.log(`${p}: ${info.changes}`);
  } finally {
    db.close();
  }
}

console.log(`total deleted: ${totalChanges}`);
