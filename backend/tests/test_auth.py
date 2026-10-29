def test_register_login_me(client):
    email = "authcase@example.com"
    register = client.post(
        "/api/auth/register",
        json={"email": email, "password": "password123", "full_name": "Auth Case"},
    )
    assert register.status_code == 201
    token = register.json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == email
    assert "password" not in me.json()
    assert "password_hash" not in me.json()


def test_login_rejects_bad_password(client):
    client.post(
        "/api/auth/register",
        json={"email": "badpass@example.com", "password": "password123", "full_name": "Bad Pass"},
    )
    response = client.post("/api/auth/login", json={"email": "badpass@example.com", "password": "wrong-password"})
    assert response.status_code == 401


def test_protected_route_requires_auth(client):
    response = client.get("/api/search/history")
    assert response.status_code == 401
