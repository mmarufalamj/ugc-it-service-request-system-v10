import argparse
import json
import re
import sqlite3
from pathlib import Path

from pypdf import PdfReader


HEADER_NOISE = {
    "evsjv‡`k",
    "wek¦we`¨vjq gÄyix Kwgkb",
    "University Grants Commission of Bangladesh",
    "website: www.ugc.gov.bd",
    "Home",
    "Chair",
    "Admin",
    "Fin",
    "P&D",
    "RGAD",
    "PUMD",
}

TABLE_HEADER_PATTERNS = [
    "নাম ও পদিী",
    "ক্রবমক",
    "ইন্টারকম",
    "চটবিহফান নম্বর",
    "চমািাইি নম্বর",
    "আইবপ নম্বর",
    "দাপ্তবরক",
    "আিাবসক",
]

SECTION_HINTS = [
    "দপ্তর",
    "বিভাগ",
    "ivM",
    "শাখা",
    "অডিট",
    "Medical",
    "Legal",
]

DESIGNATION_HINTS = [
    "চেয়ারম্যান",
    "সদস্য",
    "সচিব",
    "একান্ত",
    "ব্যক্তিগত",
    "সহকারী",
    "সিনিয়র",
    "উপ",
    "পরিচালক",
    "কমথকতথা",
    "অফিসার",
    "কর্মকর্তা",
    "নার্স",
    "ক্যাশিয়ার",
]

SERIAL_RE = re.compile(r"^[০-৯0-9]{1,2}[.]")
DIGIT_HEAVY_RE = re.compile(r"[০-৯0-9]{2,}")
MOBILE_RE = re.compile(r"(০১[০-৯\-]{8,}|01[0-9\-]{8,})")
INTERCOM_RE = re.compile(r"^(?:[০-৯0-9]{2,4}|-)$")
BANGLA_RE = re.compile(r"[\u0980-\u09FF]")


def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def raw_lines(page_text: str) -> list[str]:
    lines: list[str] = []
    for raw in page_text.splitlines():
        line = normalize_spaces(raw)
        if not line:
            continue
        lines.append(line)
    return lines


def clean_lines(page_text: str) -> list[str]:
    lines: list[str] = []
    for line in raw_lines(page_text):
        if line in HEADER_NOISE:
            continue
        if line.isdigit():
            continue
        if any(pattern in line for pattern in TABLE_HEADER_PATTERNS):
            continue
        lines.append(line)
    return lines


def looks_like_section(line: str) -> bool:
    if SERIAL_RE.match(line):
        return False
    if DIGIT_HEAVY_RE.search(line):
        return False
    return any(hint in line for hint in SECTION_HINTS)


def extract_page_section(lines: list[str]) -> str:
    for line in lines:
        if line in HEADER_NOISE:
            continue
        if line.isdigit():
            continue
        if SERIAL_RE.match(line):
            break
        if any(pattern in line for pattern in TABLE_HEADER_PATTERNS):
            break
        if DIGIT_HEAVY_RE.search(line):
            continue
        if not BANGLA_RE.search(line):
            continue
        return line
    return ""


def split_entry_lines(lines: list[str]) -> tuple[str, str, list[str]]:
    text_lines = [line for line in lines if not INTERCOM_RE.match(line) and not MOBILE_RE.search(line)]
    value_lines = [line for line in lines if line not in text_lines]

    if not text_lines:
        return "", "", value_lines

    name_parts: list[str] = []
    designation_parts: list[str] = []
    designation_started = False

    for index, line in enumerate(text_lines):
        if index == 0:
            name_parts.append(line)
            continue

        is_designation = designation_started or any(hint in line for hint in DESIGNATION_HINTS)
        if is_designation:
            designation_started = True
            designation_parts.append(line)
        else:
            name_parts.append(line)

    return normalize_spaces(" ".join(name_parts)), normalize_spaces(" ".join(designation_parts)), value_lines


def extract_numeric_fields(lines: list[str]) -> tuple[str, str, str]:
    intercom = ""
    mobile = ""
    leftovers: list[str] = []

    for line in lines:
        working_line = line

        if not intercom:
            for token in working_line.split():
                if INTERCOM_RE.match(token):
                    intercom = token
                    working_line = normalize_spaces(working_line.replace(token, "", 1))
                    break

        mobile_match = MOBILE_RE.search(working_line)
        if mobile_match and not mobile:
            mobile = mobile_match.group(1)
            leftovers.append(normalize_spaces(working_line.replace(mobile, "")))
            continue

        leftovers.append(working_line)

    notes = normalize_spaces(" | ".join(part for part in leftovers if normalize_spaces(part)))
    return intercom, mobile, notes


def parse_pdf(pdf_path: Path) -> list[dict]:
    reader = PdfReader(str(pdf_path))
    entries: list[dict] = []
    current_section = ""

    for page in reader.pages:
        text = page.extract_text() or ""
        page_raw_lines = raw_lines(text)
        if not any("নাম ও পদিী" in line for line in page_raw_lines):
            continue

        page_section = extract_page_section(page_raw_lines)
        if page_section:
            current_section = page_section

        page_lines = []
        table_started = False
        for line in page_raw_lines:
            if any(pattern in line for pattern in TABLE_HEADER_PATTERNS):
                table_started = True
                continue
            if not table_started:
                continue
            normalized = normalize_spaces(line)
            if not normalized or normalized in HEADER_NOISE or normalized == "Home" or normalized.isdigit():
                continue
            page_lines.append(normalized)

        grouped: list[list[str]] = []
        current_entry: list[str] = []

        for line in page_lines:
            if looks_like_section(line):
                if current_entry:
                    grouped.append(current_entry)
                    current_entry = []
                continue

            if SERIAL_RE.match(line):
                if current_entry:
                    grouped.append(current_entry)
                current_entry = [normalize_spaces(SERIAL_RE.sub("", line, count=1))]
                continue

            if current_entry:
                current_entry.append(line)

        if current_entry:
            grouped.append(current_entry)

        for item in grouped:
            name, designation, value_lines = split_entry_lines(item)
            intercom, mobile, notes = extract_numeric_fields(value_lines)
            if not name:
                continue
            entries.append(
                {
                    "name": name,
                    "designation": designation or None,
                    "division": current_section or None,
                    "intercom": intercom or None,
                    "mobile": mobile or None,
                    "email": None,
                    "room_no": None,
                    "notes": notes or None,
                    "status": "Active",
                }
            )

    return entries


def save_json(entries: list[dict], output_path: Path) -> None:
    output_path.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")


def import_entries(entries: list[dict], db_path: Path, replace: bool) -> int:
    conn = sqlite3.connect(db_path)
    try:
      if replace:
          conn.execute("DELETE FROM telephone_directory_entries")
      conn.executemany(
          """
          INSERT INTO telephone_directory_entries
          (name, designation, division, intercom, mobile, email, room_no, notes, status)
          VALUES (:name, :designation, :division, :intercom, :mobile, :email, :room_no, :notes, :status)
          """,
          entries,
      )
      conn.commit()
      return len(entries)
    finally:
      conn.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pdf", required=True)
    parser.add_argument("--json-out")
    parser.add_argument("--db")
    parser.add_argument("--replace", action="store_true")
    parser.add_argument("--limit", type=int)
    args = parser.parse_args()

    entries = parse_pdf(Path(args.pdf))
    if args.limit:
        entries = entries[: args.limit]

    if args.json_out:
        save_json(entries, Path(args.json_out))

    if args.db:
        imported = import_entries(entries, Path(args.db), args.replace)
        print(f"Imported {imported} entries")
    else:
        print(json.dumps(entries[:10], ensure_ascii=False, indent=2))
        print(f"Total parsed entries: {len(entries)}")


if __name__ == "__main__":
    main()
