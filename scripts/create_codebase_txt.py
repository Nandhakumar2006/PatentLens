import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
OUTPUT_FILE = ROOT_DIR / "patentlens_complete_codebase.txt"

EXCLUDED_DIRS = {
    ".venv",
    "node_modules",
    ".git",
    "__pycache__",
    ".pytest_cache",
    "dist",
    "storage",
    ".idea",
    ".vscode",
    "tmp",
}

EXCLUDED_EXTS = {
    ".pyc",
    ".faiss",
    ".npy",
    ".db",
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".svg",
    ".ico",
    ".gitkeep",
    ".lock",
}

EXCLUDED_FILES = {
    "package-lock.json",
    "test.db",
    "patentlens_complete_codebase.txt",
    ".env", # Don't export live private passwords, .env.example is included instead
    "create_codebase_txt.py",
}

CATEGORIES = [
    ("1. PROJECT ROOT & CONFIGURATION", lambda p: p.parent == ROOT_DIR or p.parts[len(ROOT_DIR.parts)] in {"docs"}),
    ("2. BACKEND - CORE & CONFIGURATION", lambda p: "backend" in p.parts and "core" in p.parts),
    ("3. BACKEND - DATABASE & MODELS", lambda p: "backend" in p.parts and ("db" in p.parts or "models" in p.parts or "migrations" in p.parts)),
    ("4. BACKEND - PYDANTIC SCHEMAS", lambda p: "backend" in p.parts and "schemas" in p.parts),
    ("5. BACKEND - SERVICES & BUSINESS LOGIC", lambda p: "backend" in p.parts and ("services" in p.parts or "utils" in p.parts)),
    ("6. BACKEND - API ROUTERS & MAIN APP", lambda p: "backend" in p.parts and ("routers" in p.parts or p.name in {"main.py", "requirements.txt", "pytest.ini"})),
    ("7. BACKEND - TESTS", lambda p: "backend" in p.parts and "tests" in p.parts),
    ("8. SCRIPTS - ETL & VECTOR INGESTION", lambda p: "scripts" in p.parts),
    ("9. DATA - METADATA & FIXTURES", lambda p: "data" in p.parts),
    ("10. FRONTEND - CONFIGURATION & ENTRY", lambda p: "frontend" in p.parts and (p.parent.name == "frontend" or p.name in {"main.jsx", "App.jsx", "App.css", "index.css"})),
    ("11. FRONTEND - HOOKS & CONTEXTS", lambda p: "frontend" in p.parts and "hooks" in p.parts),
    ("12. FRONTEND - LAYOUTS & COMPONENTS", lambda p: "frontend" in p.parts and ("layouts" in p.parts or "components" in p.parts)),
    ("13. FRONTEND - USER PAGES", lambda p: "frontend" in p.parts and "pages" in p.parts and "admin" not in p.parts),
    ("14. FRONTEND - ADMIN PAGES", lambda p: "frontend" in p.parts and "admin" in p.parts),
    ("15. FRONTEND - SERVICES & UTILS", lambda p: "frontend" in p.parts and ("services" in p.parts or "utils" in p.parts)),
]

def get_tree_representation(root_path: Path) -> str:
    lines = []
    lines.append(f"{root_path.name}/")
    
    def walk(current_dir: Path, prefix: str = ""):
        items = []
        for item in sorted(current_dir.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
            if item.name in EXCLUDED_DIRS or item.name in EXCLUDED_FILES:
                continue
            if item.suffix.lower() in EXCLUDED_EXTS:
                continue
            items.append(item)
            
        count = len(items)
        for i, item in enumerate(items):
            is_last = (i == count - 1)
            connector = "└── " if is_last else "├── "
            child_prefix = "    " if is_last else "│   "
            if item.is_dir():
                lines.append(f"{prefix}{connector}{item.name}/")
                walk(item, prefix + child_prefix)
            else:
                lines.append(f"{prefix}{connector}{item.name}")

    walk(root_path)
    return "\n".join(lines)


def collect_files():
    files = []
    for p in sorted(ROOT_DIR.rglob('*')):
        if not p.is_file():
            continue
        parts = set(p.parts)
        if parts & EXCLUDED_DIRS:
            continue
        if p.suffix.lower() in EXCLUDED_EXTS:
            continue
        if p.name in EXCLUDED_FILES:
            continue
        files.append(p)
    return files


def main():
    files = collect_files()
    print(f"Discovered {len(files)} files to compile into {OUTPUT_FILE.name}...")

    tree = get_tree_representation(ROOT_DIR)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as out:
        out.write("================================================================================\n")
        out.write("             PATENTLENS - COMPLETE CODEBASE & SYSTEM ARCHITECTURE               \n")
        out.write("================================================================================\n")
        out.write("PROJECT NAME: PatentLens\n")
        out.write("DOMAIN: AI-Assisted Semantic Prior-Art Search & Claim Analysis for MSME Innovators\n")
        out.write("TECHNOLOGY STACK: FastAPI, React 18 + Vite, FAISS, Sentence-Transformers, MySQL 8.0, PyMuPDF, ReportLab\n")
        out.write("FILE GENERATED AT: 2026-10-29\n")
        out.write("PURPOSE: Single-file complete codebase export containing the visual folder structure,\n")
        out.write("         navigation maps, and the full uncompressed source code of every file in the project.\n")
        out.write("================================================================================\n\n")

        out.write(">>> CHATGPT PROMPT / HOW TO USE THIS FILE <<<\n")
        out.write("Copy or upload this file into ChatGPT and prompt:\n")
        out.write("\"\"\"\n")
        out.write("I am providing the complete source code, directory tree, and architecture for my project 'PatentLens'.\n")
        out.write("Every single file, folder, and function is documented below.\n")
        out.write("Please act as my senior tech lead and tutor:\n")
        out.write("1. Explain the project architecture, tech stack, and end-to-end data flow.\n")
        out.write("2. When I ask about a file or feature, refer directly to the exact code below and explain how it works.\n")
        out.write("3. Explain the frontend pages, navigation flow, and how each page interacts with the backend.\n")
        out.write("4. Prepare me for viva/interview questions with clear, technical explanations.\n")
        out.write("\"\"\"\n\n")

        out.write("================================================================================\n")
        out.write("PART 1: VISUAL FOLDER & FILE STRUCTURE TREE\n")
        out.write("================================================================================\n\n")
        out.write(tree)
        out.write("\n\n")

        out.write("================================================================================\n")
        out.write("PART 2: APPLICATION NAVIGATION & ROUTING MAP\n")
        out.write("================================================================================\n\n")
        out.write("FRONTEND ROUTES (React Router in frontend/src/App.jsx):\n")
        out.write("├── Public Layout (PublicLayout.jsx)\n")
        out.write("│   ├── /                 -> LandingPage.jsx (Hero, value proposition, features overview)\n")
        out.write("│   ├── /login            -> LoginPage.jsx (User login form, stores JWT token in localStorage)\n")
        out.write("│   └── /register         -> RegisterPage.jsx (New account registration form)\n")
        out.write("├── Authenticated Layout (AppLayout.jsx - requires active auth token)\n")
        out.write("│   ├── /app              -> DashboardPage.jsx (Stats, recent searches, quick search)\n")
        out.write("│   ├── /app/dashboard    -> DashboardPage.jsx\n")
        out.write("│   ├── /app/search       -> SearchPage.jsx (Invention query input, PDF upload & extraction)\n")
        out.write("│   ├── /app/results/:id  -> ResultsPage.jsx (Ranked semantic matches, similarity scores, filters)\n")
        out.write("│   ├── /app/patents/:id  -> PatentDetailPage.jsx (Full patent metadata, claims, and chunks)\n")
        out.write("│   ├── /app/compare/:id  -> ComparePage.jsx (Side-by-side claim & feature comparison matrix)\n")
        out.write("│   ├── /app/saved        -> SavedPage.jsx (User bookmarked patents collection)\n")
        out.write("│   ├── /app/history      -> HistoryPage.jsx (Audit trail of previous search queries)\n")
        out.write("│   ├── /app/reports      -> ReportsPage.jsx (Generated ReportLab PDF reports list & download)\n")
        out.write("│   └── /app/settings     -> SettingsPage.jsx (Profile info, server and index health status)\n")
        out.write("└── Admin Layout (AdminLayout.jsx - requires role == 'admin')\n")
        out.write("    ├── /admin            -> AdminOverviewPage.jsx (Platform KPIs, total patents, users, index count)\n")
        out.write("    ├── /admin/users      -> AdminUsersPage.jsx (User management, role promotion)\n")
        out.write("    ├── /admin/patents    -> AdminPatentsPage.jsx (Corpus browsing, deletion, inspection)\n")
        out.write("    ├── /admin/ingest     -> AdminIngestionPage.jsx (CSV dataset upload, ETL execution)\n")
        out.write("    ├── /admin/analytics  -> AdminAnalyticsPage.jsx (Search volume, IPC category distribution)\n")
        out.write("    └── /admin/system     -> AdminSystemPage.jsx (FAISS RAM usage, vector health, rebuild triggers)\n\n")

        out.write("BACKEND REST API ROUTERS (FastAPI in backend/app/main.py):\n")
        out.write("├── /api/auth             -> routers/auth.py (register, login, me)\n")
        out.write("├── /api/search           -> routers/search.py (create semantic search, history, get by id)\n")
        out.write("├── /api/patents          -> routers/patents.py (get patent detail, bookmark/save, list saved)\n")
        out.write("├── /api/analysis         -> routers/analysis.py (feature comparison matrix, claim summary)\n")
        out.write("├── /api/documents        -> routers/documents.py (PDF upload, text extract with OCR fallback)\n")
        out.write("├── /api/reports          -> routers/reports.py (generate ReportLab PDF, list, download)\n")
        out.write("├── /api/admin            -> routers/admin.py (system stats, user mgmt, patent mgmt, ingest)\n")
        out.write("└── /api/health           -> routers/health.py (ping, database health check, FAISS index health check)\n\n")

        out.write("================================================================================\n")
        out.write("PART 3: MASTER TABLE OF CONTENTS OF FILES INCLUDED\n")
        out.write("================================================================================\n\n")
        
        file_idx = 1
        for cat_name, cat_matcher in CATEGORIES:
            matching = [f for f in files if cat_matcher(f)]
            if not matching:
                continue
            out.write(f"\n{cat_name} ({len(matching)} files):\n")
            for f in matching:
                rel = f.relative_to(ROOT_DIR)
                size_kb = f.stat().st_size / 1024
                out.write(f"  [{file_idx:03d}] {rel} ({size_kb:.1f} KB)\n")
                file_idx += 1

        out.write("\n\n")
        out.write("================================================================================\n")
        out.write("PART 4: FULL SOURCE CODE FOR EVERY FILE IN THE PROJECT\n")
        out.write("================================================================================\n\n")

        file_idx = 1
        for cat_name, cat_matcher in CATEGORIES:
            matching = [f for f in files if cat_matcher(f)]
            if not matching:
                continue

            out.write("\n" + "#" * 80 + "\n")
            out.write(f"### {cat_name}\n")
            out.write("#" * 80 + "\n\n")

            for f in matching:
                rel_path = f.relative_to(ROOT_DIR)
                size = f.stat().st_size
                print(f"Writing [{file_idx}/{len(files)}] {rel_path}...")

                out.write("=" * 80 + "\n")
                out.write(f"FILE #{file_idx:03d}: {rel_path}\n")
                out.write(f"RELATIVE PATH: {rel_path}\n")
                out.write(f"ABSOLUTE PATH: {f}\n")
                out.write(f"SIZE: {size} bytes ({size / 1024:.2f} KB)\n")
                out.write("=" * 80 + "\n")

                try:
                    with open(f, "r", encoding="utf-8", errors="replace") as source_in:
                        content = source_in.read()
                        out.write(content)
                        if not content.endswith("\n"):
                            out.write("\n")
                except Exception as e:
                    out.write(f"/* Error reading file: {e} */\n")

                out.write(f"\n/* END OF FILE: {rel_path} */\n\n\n")
                file_idx += 1

    print(f"Successfully created {OUTPUT_FILE} (Size: {OUTPUT_FILE.stat().st_size / 1024:.1f} KB)")

if __name__ == "__main__":
    main()
