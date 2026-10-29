# PatentLens

AI-assisted **semantic** prior-art search for MSME innovators. Users describe an invention, retrieve nearest patent chunks from a FAISS (or compatible) index, inspect claims, compare technical features, save results, and download PDF reports.

This application does **not** implement keyword search, BM25, or hybrid retrieval.

## Folder structure

```
PatentLens/
  frontend/          React + Vite UI
  backend/           FastAPI application
  scripts/           Ingestion, embeddings, FAISS build
  data/raw/          Input CSV (synthetic fixture included)
  data/processed/    Cleaned CSV output
  data/indexes/      FAISS index, mapping, embeddings
  storage/uploads/   User PDFs
  storage/reports/   Generated PDFs
  docs/              Extra documentation
```

## Prerequisites (verified on this machine when built)

- Node.js v22 and npm
- Python 3.13
- MySQL Server 8.0 service `MySQL80`

If MySQL Workbench is installed, open `backend/migrations/schema.sql` to inspect or apply the schema.

## 1. Python environment

```powershell
cd D:\Miniproject
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r backend\requirements.txt
```

`faiss-cpu` installed successfully on Python 3.13 Windows in this environment (`IndexFlatIP`). `torch` and `sentence-transformers` are still required for true PatentSBERTa / BGE embeddings; until they are installed, set `EMBEDDING_BACKEND=hash` only for fixture tests (not a substitute for a patent language model).

## 2. MySQL database

1. Start MySQL (`MySQL80` should be Running).
2. Copy `.env.example` to `.env`.
3. Set a real `DATABASE_URL`, for example:

```
DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@127.0.0.1:3306/patentlens
SECRET_KEY=replace-with-a-long-random-string
```

4. Create the database:

```powershell
.\.venv\Scripts\python.exe scripts\init_mysql.py
```

Alternatively in MySQL Workbench:

```sql
CREATE DATABASE patentlens CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

SQLAlchemy creates tables on API startup. You may also run `backend/migrations/schema.sql`.

## 3. Frontend packages

```powershell
cd D:\Miniproject\frontend
npm install
```

## 4. Dataset import

No authentic 100,000-record corpus was present in the project folder. A **synthetic fixture** is generated as follows:

```powershell
cd D:\Miniproject
.\.venv\Scripts\python.exe scripts\create_synthetic_fixture.py
.\.venv\Scripts\python.exe scripts\clean_data.py --input data\raw\synthetic_patents_fixture.csv --output data\processed\patents_clean.csv
.\.venv\Scripts\python.exe scripts\import_patents.py --input data\processed\patents_clean.csv
```

To import a later authentic CSV, point `--input` (or `PATENT_DATA_PATH`) at that file. Expected columns: `patent_id`, `publication_number`, `title`, `abstract`, `claims`, `description`, `publication_date`, `ipc_cpc_codes`, `inventor`, `applicant`, `country`, `source_url`.

## 5. Embeddings and FAISS index

Default evaluation model is `BAAI/bge-small-en-v1.5`. To evaluate PatentSBERTa, set `EMBEDDING_MODEL_NAME=AI-Growth-Lab/PatentSBERTa` in `.env` and rebuild.

```powershell
cd D:\Miniproject
.\.venv\Scripts\python.exe scripts\generate_embeddings.py --batch-size 32
.\.venv\Scripts\python.exe scripts\build_index.py
.\.venv\Scripts\python.exe scripts\check_index.py
```

Do not rerun embedding generation on every API start. Rebuild only when the corpus or model changes.

Offline tests use `EMBEDDING_BACKEND=hash` (not a semantic model). For a real demo, keep `EMBEDDING_BACKEND=sentence-transformers`.

## 6. Run the API and UI

Terminal 1:

```powershell
cd D:\Miniproject\backend
D:\Miniproject\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Terminal 2:

```powershell
cd D:\Miniproject\frontend
npm run dev
```

Open http://localhost:5173

Health checks:

- http://127.0.0.1:8000/api/health
- http://127.0.0.1:8000/api/health/database
- http://127.0.0.1:8000/api/health/index

## 7. Tests

```powershell
cd D:\Miniproject\backend
..\ .venv\Scripts\python.exe -m pytest
```

Tests use SQLite and hash embeddings so they do not require MySQL credentials or model downloads.

Latest local run: **13 passed** (`pytest` in `backend/`).

Live API check after indexing the synthetic fixture: `GET /api/health` 200, database connected, FAISS `IndexFlatIP` with 82 vectors, search for a solar drip-irrigation invention returned SYN-0003, SYN-0002, SYN-0001 first.

## 8. Optional LLM

Set `LLM_PROVIDER` (for example `openai`), `LLM_API_KEY`, and optionally `LLM_BASE_URL` / `LLM_MODEL`. Search continues to work if these are empty.

## Troubleshooting

- Database health fails: verify `DATABASE_URL`, that `patentlens` exists, and that the MySQL service is running.
- Index health fails: import data, generate embeddings, then build the index.
- 503 on search: the FAISS/mapping files are missing or incompatible.
- PDF extract empty: install Tesseract and ensure the file is a real PDF.
- CORS errors: `FRONTEND_ORIGIN` must match the Vite origin (default `http://localhost:5173`).
