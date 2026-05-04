import json
import re
import sqlite3
import sys
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path


NS = {
    "a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
}


def load_env_value(project_root: Path, key: str) -> str | None:
    for env_name in [".env.local", ".env"]:
        env_path = project_root / env_name
        if not env_path.exists():
            continue

        for raw_line in env_path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            env_key, env_value = line.split("=", 1)
            if env_key.strip() != key:
                continue
            return env_value.strip().strip('"').strip("'")

    return None


def get_database_path(project_root: Path) -> Path:
    configured = load_env_value(project_root, "DATABASE_PATH")
    if configured:
        return (project_root / configured).resolve()
    return (project_root / "data" / "database.sqlite").resolve()


def read_xlsx_rows(xlsx_path: Path) -> list[dict[str, str]]:
    with zipfile.ZipFile(xlsx_path) as workbook_zip:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in workbook_zip.namelist():
            shared_root = ET.fromstring(workbook_zip.read("xl/sharedStrings.xml"))
            for si in shared_root.findall("a:si", NS):
                parts = [t.text or "" for t in si.iterfind(".//a:t", NS)]
                shared_strings.append("".join(parts))

        workbook_root = ET.fromstring(workbook_zip.read("xl/workbook.xml"))
        rels_root = ET.fromstring(workbook_zip.read("xl/_rels/workbook.xml.rels"))
        rel_map = {rel.attrib["Id"]: rel.attrib["Target"] for rel in rels_root}

        first_sheet = workbook_root.find("a:sheets", NS).findall("a:sheet", NS)[0]
        relation_id = first_sheet.attrib[
            "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"
        ]
        sheet_target = rel_map[relation_id]
        if not sheet_target.startswith("xl/"):
            sheet_target = f"xl/{sheet_target}"

        sheet_root = ET.fromstring(workbook_zip.read(sheet_target))

        rows: list[dict[str, str]] = []
        for row in sheet_root.findall(".//a:sheetData/a:row", NS):
            row_values: dict[str, str] = {}
            for cell in row.findall("a:c", NS):
                ref = cell.attrib.get("r", "")
                match = re.match(r"[A-Z]+", ref)
                if not match:
                    continue

                col = match.group(0)
                cell_type = cell.attrib.get("t")
                value_node = cell.find("a:v", NS)
                inline_node = cell.find("a:is", NS)

                value = ""
                if cell_type == "s" and value_node is not None:
                    value = shared_strings[int(value_node.text)]
                elif cell_type == "inlineStr" and inline_node is not None:
                    value = "".join([node.text or "" for node in inline_node.iterfind(".//a:t", NS)])
                elif value_node is not None and value_node.text is not None:
                    value = value_node.text

                row_values[col] = value.strip()

            if row_values:
                rows.append(row_values)

    if not rows:
        return []

    headers = {
        "A": rows[0].get("A", "").strip().lower(),
        "B": rows[0].get("B", "").strip().lower(),
        "C": rows[0].get("C", "").strip().lower(),
        "D": rows[0].get("D", "").strip().lower(),
        "E": rows[0].get("E", "").strip().lower(),
        "F": rows[0].get("F", "").strip().lower(),
    }

    expected = {
        "A": "name",
        "B": "email",
        "C": "password",
        "D": "role",
        "E": "division",
        "F": "status",
    }
    if headers != expected:
        raise ValueError(f"Unexpected worksheet headers: {headers}")

    records: list[dict[str, str]] = []
    for row in rows[1:]:
        record = {
            "name": row.get("A", "").strip(),
            "email": row.get("B", "").strip().lower(),
            "password": row.get("C", "").strip(),
            "role": row.get("D", "").strip(),
            "division": row.get("E", "").strip(),
            "status": row.get("F", "").strip() or "Active",
        }
        if any(record.values()):
            records.append(record)

    return records


def import_records(db_path: Path, records: list[dict[str, str]]) -> dict[str, int]:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row

    inserted_divisions = 0
    updated_divisions = 0
    inserted_users = 0
    updated_users = 0

    try:
        with conn:
            existing_divisions = {
                row["name"]: dict(row)
                for row in conn.execute("SELECT id, name, head, employees, status FROM divisions")
            }

            division_summaries: dict[str, dict[str, object]] = {}
            for record in records:
                division = record["division"]
                if not division:
                    continue

                summary = division_summaries.setdefault(
                    division,
                    {"users": 0, "head": None, "status": "Inactive"},
                )
                summary["users"] = int(summary["users"]) + 1
                if record["role"] == "divisional_head":
                    summary["head"] = record["name"]
                if record["status"].lower() == "active":
                    summary["status"] = "Active"

            for division_name, summary in division_summaries.items():
                existing = existing_divisions.get(division_name)
                resolved_head = (
                    summary["head"]
                    or (existing["head"] if existing and existing.get("head") else None)
                    or "Not Assigned"
                )
                resolved_status = str(summary["status"] or (existing["status"] if existing else "Active"))
                employee_total = int(summary["users"])

                if existing:
                    conn.execute(
                        "UPDATE divisions SET head = ?, employees = ?, status = ? WHERE id = ?",
                        (resolved_head, employee_total, resolved_status, existing["id"]),
                    )
                    updated_divisions += 1
                else:
                    conn.execute(
                        "INSERT INTO divisions (name, head, employees, status) VALUES (?, ?, ?, ?)",
                        (division_name, resolved_head, employee_total, resolved_status),
                    )
                    inserted_divisions += 1

            existing_users = {
                row["email"]: dict(row)
                for row in conn.execute("SELECT id, email FROM users")
            }

            for record in records:
                if not record["email"]:
                    continue

                params = (
                    record["name"],
                    record["email"],
                    record["password"] or "password",
                    record["name"],
                    record["role"] or "employee",
                    record["division"],
                    record["status"] or "Active",
                )

                existing = existing_users.get(record["email"])
                if existing:
                    conn.execute(
                        """
                        UPDATE users
                        SET name = ?, email = ?, password = ?, name_bn = ?, role = ?, division = ?, status = ?
                        WHERE id = ?
                        """,
                        (*params, existing["id"]),
                    )
                    updated_users += 1
                else:
                    conn.execute(
                        """
                        INSERT INTO users (name, email, password, name_bn, role, division, status)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        """,
                        params,
                    )
                    inserted_users += 1

            conn.execute(
                """
                UPDATE divisions
                SET employees = (
                  SELECT COUNT(*) FROM users WHERE users.division = divisions.name
                )
                """
            )
    finally:
        conn.close()

    return {
        "inserted_divisions": inserted_divisions,
        "updated_divisions": updated_divisions,
        "inserted_users": inserted_users,
        "updated_users": updated_users,
        "source_rows": len(records),
    }


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python scripts/import_officers_from_xlsx.py <xlsx-path>", file=sys.stderr)
        return 1

    xlsx_path = Path(sys.argv[1]).resolve()
    if not xlsx_path.exists():
        print(f"Excel file not found: {xlsx_path}", file=sys.stderr)
        return 1

    project_root = Path(__file__).resolve().parent.parent
    db_path = get_database_path(project_root)
    records = read_xlsx_rows(xlsx_path)
    summary = import_records(db_path, records)
    print(json.dumps({"database": str(db_path), "xlsx": str(xlsx_path), **summary}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
