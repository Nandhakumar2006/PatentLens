def test_semantic_search_returns_related_fixture(auth_client):
    response = auth_client.post(
        "/api/search",
        json={
            "title": "Solar drip irrigation for vegetable plots",
            "description": (
                "A small-farm system that uses a photovoltaic array to drive a water pump "
                "and soil moisture sensors to open drip irrigation valves only when the root zone is dry."
            ),
            "technical_features": [
                "photovoltaic water pump",
                "soil moisture gated drip valves",
            ],
            "top_k": 5,
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["result_count"] >= 1
    ids = [item["patent_id"] for item in body["results"]]
    assert any(pid in {"SYN-0001", "SYN-0002", "SYN-0003"} for pid in ids)
    for item in body["results"]:
        assert 0 <= item["similarity_score"] <= 1.0001 or item["similarity_score"] <= 1.5
        assert item["is_synthetic"] is True
        assert item["source_url"] in (None, "")


def test_search_history_is_user_scoped(auth_client, client):
    auth_client.post(
        "/api/search",
        json={"description": "Enzyme leather unhairing process for small tanneries using protease.", "top_k": 3},
    )
    other = client.post(
        "/api/auth/register",
        json={"email": "other@example.com", "password": "password123", "full_name": "Other User"},
    )
    other_token = other.json()["access_token"]
    history = client.get("/api/search/history", headers={"Authorization": f"Bearer {other_token}"})
    assert history.status_code == 200
    assert history.json()["total"] == 0


def test_save_patent_and_report(auth_client):
    search = auth_client.post(
        "/api/search",
        json={"description": "Battery pack liquid cooling plate for electric three wheel cargo rickshaw.", "top_k": 3},
    )
    body = search.json()
    patent_id = body["results"][0]["id"]
    saved = auth_client.post(f"/api/patents/{patent_id}/save")
    assert saved.status_code == 200
    listed = auth_client.get("/api/patents/saved")
    assert listed.json()["total"] >= 1
    report = auth_client.post("/api/reports/generate", params={"search_id": body["search_id"]})
    assert report.status_code == 200
    report_id = report.json()["id"]
    download = auth_client.get(f"/api/reports/{report_id}/download")
    assert download.status_code == 200
    assert download.content[:4] == b"%PDF"


def test_compare_uses_retrieved_claims(auth_client):
    search = auth_client.post(
        "/api/search",
        json={
            "description": "Irrigation using solar photovoltaic pumping and moisture sensors for drip lines.",
            "technical_features": ["MPPT photovoltaic pump controller", "capacitive soil moisture probe"],
            "top_k": 5,
        },
    )
    search_id = search.json()["search_id"]
    compared = auth_client.post(
        "/api/analysis/compare",
        json={
            "search_id": search_id,
            "technical_features": ["MPPT photovoltaic pump controller", "quantum entanglement communicator"],
        },
    )
    assert compared.status_code == 200
    payload = compared.json()
    assert payload["llm_used"] is False
    features = {row["feature"]: row for row in payload["comparisons"]}
    assert features["quantum entanglement communicator"]["no_evidence_found"] is True
    assert "interpretation_source" in payload["comparisons"][0]
