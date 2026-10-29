from __future__ import annotations

import json
from difflib import SequenceMatcher

import numpy as np
from sqlalchemy.orm import Session

from app.models.claim import Claim
from app.models.patent import Patent
from app.models.search import Search
from app.services.embeddings import get_embedding_service, l2_normalize
from app.services.llm import generate_llm_text, llm_configured
from app.services.search_engine import DISCLAIMER


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    a = l2_normalize(a)[0]
    b = l2_normalize(b)[0]
    return float(np.dot(a, b))


def compare_features(
    db: Session,
    user_id: int,
    search_id: int | None,
    patent_ids: list[int],
    features: list[str],
    invention_description: str | None,
) -> dict:
    patents: list[Patent] = []
    if search_id:
        search = db.get(Search, search_id)
        if search is None or search.user_id != user_id:
            raise PermissionError("Search not found")
        patents = [r.patent for r in sorted(search.results, key=lambda x: x.rank)]
        if not features:
            features = json.loads(search.technical_features or "[]")
        if not invention_description:
            invention_description = search.description
    if patent_ids:
        extra = [db.get(Patent, pid) for pid in patent_ids]
        patents.extend([p for p in extra if p is not None])

    unique: dict[int, Patent] = {}
    for patent in patents:
        unique[patent.id] = patent
    patents = list(unique.values())
    if not patents:
        raise ValueError("No patents available for comparison")

    embedder = get_embedding_service()
    use_vectors = embedder.backend not in {"hash", "test"} or True
    comparisons = []
    for feature in [f.strip() for f in features if f.strip()]:
        evidence = []
        for patent in patents:
            claims = list(patent.claims) or []
            texts = [(f"claim {c.claim_number}", c.claim_text) for c in claims]
            if patent.abstract:
                texts.append(("abstract", patent.abstract))
            if not texts and patent.description:
                texts.append(("description", patent.description[:1200]))
            best = None
            for source_type, source_text in texts:
                if use_vectors:
                    try:
                        fv = embedder.encode([feature])[0]
                        sv = embedder.encode([source_text[:2000]])[0]
                        score = _cosine(fv, sv)
                        method = "semantic_cosine"
                    except Exception:
                        score = SequenceMatcher(None, feature.lower(), source_text.lower()).ratio()
                        method = "lexical_overlap_fallback"
                else:
                    score = SequenceMatcher(None, feature.lower(), source_text.lower()).ratio()
                    method = "lexical_overlap_fallback"
                candidate = {
                    "patent_id": patent.id,
                    "publication_number": patent.publication_number,
                    "title": patent.title,
                    "source_type": source_type,
                    "source_text": source_text[:900],
                    "similarity": round(float(score), 4),
                    "method": method,
                }
                if best is None or candidate["similarity"] > best["similarity"]:
                    best = candidate
            if best:
                evidence.append(best)
        evidence.sort(key=lambda e: e["similarity"], reverse=True)
        threshold = 0.15 if embedder.backend in {"hash", "test"} else 0.35
        strong = [e for e in evidence if e["similarity"] >= threshold]
        no_evidence = len(strong) == 0
        shown = strong[:5] if strong else evidence[:3]
        interpretation = None
        interp_source = "deterministic_fallback"
        if llm_configured() and strong:
            prompt = (
                f"Invention context: {invention_description or ''}\n"
                f"Feature: {feature}\n"
                f"Evidence excerpts: {json.dumps(strong[:3])}\n"
                "Explain only what the excerpts show. If evidence is weak, say so. Do not invent claims."
            )
            interpretation = generate_llm_text(prompt)
            if interpretation:
                interp_source = "llm"
        if interpretation is None:
            if no_evidence:
                interpretation = "No sufficiently similar claim or excerpt was found for this feature in the selected patents."
            else:
                top = strong[0]
                interpretation = (
                    f"Closest supporting text is {top['source_type']} from "
                    f"{top['publication_number'] or top['title']} "
                    f"(similarity {top['similarity']:.2f}, method {top['method']})."
                )
        comparisons.append(
            {
                "feature": feature,
                "evidence": shown,
                "no_evidence_found": no_evidence,
                "interpretation": interpretation,
                "interpretation_source": interp_source,
            }
        )
    return {
        "comparisons": comparisons,
        "disclaimer": DISCLAIMER,
        "llm_used": llm_configured() and any(c["interpretation_source"] == "llm" for c in comparisons),
    }


def summarize_search(db: Session, user_id: int, search_id: int, patent_id: int | None) -> dict:
    search = db.get(Search, search_id)
    if search is None or search.user_id != user_id:
        raise PermissionError("Search not found")
    results = sorted(search.results, key=lambda r: r.rank)
    if patent_id:
        results = [r for r in results if r.patent_id == patent_id]
    grounded = []
    for item in results[:5]:
        excerpts = json.loads(item.excerpts_json or "[]")
        snippet = excerpts[0]["text"] if excerpts else (item.patent.abstract or "")
        grounded.append(
            f"{item.patent.publication_number or item.patent.patent_id}: {snippet[:400]}"
        )
    llm_text = None
    if llm_configured():
        prompt = (
            f"Invention: {search.title or ''}\n{search.description}\n"
            f"Retrieved excerpts only:\n{json.dumps(grounded)}\n"
            "Write a cautious prior-art overview using only these excerpts."
        )
        llm_text = generate_llm_text(prompt)
    if llm_text:
        return {
            "summary": llm_text,
            "source": "llm",
            "grounded_in": grounded,
            "llm_used": True,
            "disclaimer": DISCLAIMER,
        }
    if not grounded:
        summary = "No retrieved excerpts are available to summarize."
    else:
        lines = [
            "Deterministic overview (LLM not configured or unavailable):",
            f"The search compared the invention description against {len(search.results)} semantically retrieved records.",
        ]
        for item in results[:5]:
            lines.append(
                f"- {item.patent.publication_number or item.patent.patent_id} "
                f"({item.patent.title}) similarity {item.similarity_score:.3f}."
            )
        lines.append(DISCLAIMER)
        summary = "\n".join(lines)
    return {
        "summary": summary,
        "source": "deterministic_fallback",
        "grounded_in": grounded,
        "llm_used": False,
        "disclaimer": DISCLAIMER,
    }
