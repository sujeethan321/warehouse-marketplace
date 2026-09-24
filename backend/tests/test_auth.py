from tests.conftest import register


def test_register_login_and_me(client):
    reg = register(client, "Maya Chen", "maya@test.com", "customer")
    assert "password" not in str(reg["user"]).lower()
    r = client.post("/api/auth/login", json={"email": "maya@test.com", "password": "password123"})
    assert r.status_code == 200
    token = r.json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200 and me.json()["role"] == "customer"
    assert "password_hash" not in me.json()


def test_wrong_password_and_duplicate_email(client):
    register(client, "A", "a@test.com", "owner")
    assert client.post("/api/auth/login", json={"email": "a@test.com", "password": "nope-nope"}).status_code == 401
    dup = client.post(
        "/api/auth/register",
        json={"name": "A2", "email": "A@test.com", "password": "password123", "role": "owner"},
    )
    assert dup.status_code == 409


def test_short_password_and_bad_role_rejected(client):
    r = client.post("/api/auth/register", json={"name": "x", "email": "x@test.com", "password": "123", "role": "owner"})
    assert r.status_code == 422
    r = client.post("/api/auth/register", json={"name": "x", "email": "x@test.com", "password": "password123", "role": "admin"})
    assert r.status_code == 422


def test_protected_routes_need_token(client):
    assert client.get("/api/auth/me").status_code == 401
    assert client.get("/api/rentals/my").status_code == 401
    assert client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_role_enforced_server_side(client, owner, customer):
    assert client.get("/api/rentals/my", headers=owner["headers"]).status_code == 403
    assert client.get("/api/owner/rentals", headers=customer["headers"]).status_code == 403
    assert client.get("/api/reports/revenue", headers=customer["headers"]).status_code == 403
