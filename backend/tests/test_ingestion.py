from app.utils.text import parse_date, split_claims
from app.services.ingestion import clean_row


def test_claim_split():
    claims = split_claims("1. First claim. 2. Second claim with details.")
    assert claims[0][0] == 1
    assert "First" in claims[0][1]
    assert claims[1][0] == 2


def test_date_parse():
    assert str(parse_date("2020-07-01")) == "2020-07-01"
    assert parse_date("not-a-date") is None


def test_clean_row_rejects_empty():
    assert clean_row({"patent_id": "X"}) is None
    row = clean_row({"patent_id": "SYN-X", "title": "Hello", "publication_number": "SYN-1"})
    assert row["is_synthetic"] is True
