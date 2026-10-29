import re
from datetime import date, datetime


CLAIM_SPLIT_RE = re.compile(r"(?:(?<=^)|(?<=\s))(\d+)\.\s+")


def normalize_whitespace(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value).strip()


def parse_date(value: str | None) -> date | None:
    if not value:
        return None
    text = str(value).strip()
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%Y%m%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(text[:10] if len(text) >= 8 else text, fmt).date()
        except ValueError:
            continue
    if re.fullmatch(r"\d{4}", text):
        return date(int(text), 1, 1)
    return None


def split_claims(claims_text: str | None) -> list[tuple[int, str]]:
    text = (claims_text or "").strip()
    if not text:
        return []
    parts = CLAIM_SPLIT_RE.split(text)
    claims: list[tuple[int, str]] = []
    if len(parts) <= 1:
        return [(1, normalize_whitespace(text))]
    # split yields [preamble, num, body, num, body, ...]
    # parts[0] is preamble text before the first claim number (e.g. 'What is claimed is:').
    # Do not treat preamble as claim 1. Numbering begins at parts[1].
    i = 1
    seen_numbers: set[int] = set()
    while i + 1 < len(parts):
        try:
            number = int(parts[i])
        except ValueError:
            i += 1
            continue
        body = normalize_whitespace(parts[i + 1])
        if body:
            target_num = number
            while target_num in seen_numbers:
                target_num += 1
            seen_numbers.add(target_num)
            claims.append((target_num, body))
        i += 2
    return claims or [(1, normalize_whitespace(text))]


def chunk_text(text: str, chunk_size: int, overlap: int, chunk_type: str) -> list[tuple[str, str]]:
    cleaned = normalize_whitespace(text)
    if not cleaned:
        return []
    if len(cleaned) <= chunk_size:
        return [(chunk_type, cleaned)]
    chunks = []
    start = 0
    while start < len(cleaned):
        end = min(len(cleaned), start + chunk_size)
        piece = cleaned[start:end]
        chunks.append((chunk_type, piece))
        if end == len(cleaned):
            break
        start = max(end - overlap, start + 1)
    return chunks


def safe_filename(name: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]", "_", name)
    return cleaned[:180] or "upload"
