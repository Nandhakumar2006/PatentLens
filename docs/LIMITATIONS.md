# Known limitations

- The bundled CSV is an explicitly labeled **synthetic fixture**. It is not authentic patent data. Do not treat publication numbers such as `SYN-IN-0001` as real filings.
- Semantic similarity is not novelty, patentability, infringement, or rejection probability.
- `IndexFlatIP` stores vectors in memory. A 100,000-record corpus with several chunks per record may require several hundred MB to a few GB of RAM.
- If `faiss-cpu` cannot be installed on the current Python/Windows combination, PatentLens falls back to a NumPy inner-product index with the same metric. Check `/api/health/index` for the active backend.
- PatentSBERTa (`AI-Growth-Lab/PatentSBERTa`) is larger and slower than `BAAI/bge-small-en-v1.5`. Switch models only by rebuilding embeddings and the index.
- Optional LLM summaries require `LLM_PROVIDER` and `LLM_API_KEY`. If they are unset, deterministic fallbacks are used.
- Tesseract OCR is used only when a PDF yields almost no text. Install Tesseract separately on Windows if scanned PDFs must be read.
- JWT logout is client-side token discard; tokens remain valid until expiry.
