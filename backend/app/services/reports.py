from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.report import Report
from app.models.search import Search
from app.models.user import User
from app.services.search_engine import DISCLAIMER, serialize_search
from app.utils.text import safe_filename


def generate_report(db: Session, user: User, search: Search) -> Report:
    settings = get_settings()
    report_dir = Path(settings.REPORT_DIR)
    report_dir.mkdir(parents=True, exist_ok=True)
    filename = safe_filename(f"patentlens_search_{search.id}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}.pdf")
    filepath = report_dir / filename

    payload = serialize_search(search)
    styles = getSampleStyleSheet()
    story = []
    story.append(Paragraph("PatentLens Prior-Art Search Report", styles["Title"]))
    story.append(Spacer(1, 0.2 * inch))
    story.append(Paragraph(f"Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}", styles["Normal"]))
    story.append(Paragraph(f"User: {user.email}", styles["Normal"]))
    story.append(Paragraph(f"Embedding model: {search.model_name}", styles["Normal"]))
    story.append(Spacer(1, 0.15 * inch))
    story.append(Paragraph("Invention", styles["Heading2"]))
    if search.title:
        story.append(Paragraph(f"<b>Title:</b> {search.title}", styles["Normal"]))
    story.append(Paragraph(_escape(search.description), styles["Normal"]))
    features = json.loads(search.technical_features or "[]")
    if features:
        story.append(Paragraph("Technical features", styles["Heading2"]))
        for feature in features:
            story.append(Paragraph(f"• {_escape(feature)}", styles["Normal"]))
    story.append(Paragraph("Retrieved records", styles["Heading2"]))
    for item in payload["results"]:
        label = item["publication_number"] or item["patent_id"]
        story.append(Paragraph(f"<b>{_escape(label)}</b> — similarity {item['similarity_score']:.4f}", styles["Heading3"]))
        if item["title"]:
            story.append(Paragraph(_escape(item["title"]), styles["Normal"]))
        meta = []
        if item["publication_date"]:
            meta.append(str(item["publication_date"]))
        if item["country"]:
            meta.append(item["country"])
        if item["inventor"]:
            meta.append(item["inventor"])
        if item["applicant"]:
            meta.append(item["applicant"])
        if meta:
            story.append(Paragraph(_escape(" | ".join(meta)), styles["Normal"]))
        if item["is_synthetic"]:
            story.append(Paragraph("<b>Note:</b> This record is a synthetic test fixture, not an authentic patent.", styles["Italic"]))
        if item["source_url"]:
            story.append(Paragraph(f"Source: {_escape(item['source_url'])}", styles["Normal"]))
        if item["abstract"]:
            story.append(Paragraph(_escape(item["abstract"][:1200]), styles["Normal"]))
        for excerpt in item["excerpts"]:
            story.append(Paragraph(f"Excerpt ({excerpt['chunk_type']}): {_escape(excerpt['text'][:700])}", styles["Normal"]))
        story.append(Spacer(1, 0.1 * inch))
    story.append(Paragraph("Limitations", styles["Heading2"]))
    story.append(Paragraph(DISCLAIMER, styles["Normal"]))
    story.append(
        Paragraph(
            "Optional filters constrain metadata of semantically retrieved candidates. "
            "This report is assistance for MSME innovators and is not legal advice.",
            styles["Normal"],
        )
    )

    doc = SimpleDocTemplate(str(filepath), pagesize=A4)
    doc.build(story)

    report = Report(user_id=user.id, search_id=search.id, filename=filename, filepath=str(filepath))
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def _escape(value: str | None) -> str:
    text = value or ""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
