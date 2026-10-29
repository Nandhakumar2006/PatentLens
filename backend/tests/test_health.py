def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_health_database(client):
    response = client.get("/api/health/database")
    assert response.status_code == 200
    assert response.json()["ok"] is True


def test_health_index(client):
    response = client.get("/api/health/index")
    body = response.json()
    assert body["ok"] is True
    assert body["vector_count"] > 0
