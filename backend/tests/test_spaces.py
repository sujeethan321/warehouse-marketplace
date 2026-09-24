from tests.conftest import make_space


def test_owner_crud(client, owner, space):
    r = client.get(f"/api/spaces/{space['id']}")
    assert r.status_code == 200 and r.json()["available_capacity"] == 300

    body = {k: space[k] for k in ["unique_code", "name", "total_capacity", "unit", "unit_price", "location", "availability"]}
    body["name"] = "Renamed"
    r = client.put(f"/api/spaces/{space['id']}", headers=owner["headers"], json=body)
    assert r.status_code == 200 and r.json()["name"] == "Renamed"

    assert client.delete(f"/api/spaces/{space['id']}", headers=owner["headers"]).status_code == 204
    assert client.get(f"/api/spaces/{space['id']}").status_code == 404


def test_customer_cannot_create_space(client, customer):
    r = client.post(
        "/api/spaces",
        headers=customer["headers"],
        json={"unique_code": "X", "name": "x", "total_capacity": 1, "unit": "u", "unit_price": 1, "location": "l"},
    )
    assert r.status_code == 403


def test_owner_a_cannot_touch_owner_b_space(client, owner, owner_b, space):
    body = {k: space[k] for k in ["unique_code", "name", "total_capacity", "unit", "unit_price", "location", "availability"]}
    assert client.put(f"/api/spaces/{space['id']}", headers=owner_b["headers"], json=body).status_code == 403
    assert client.delete(f"/api/spaces/{space['id']}", headers=owner_b["headers"]).status_code == 403


def test_duplicate_code_and_validation(client, owner, space):
    r = client.post(
        "/api/spaces",
        headers=owner["headers"],
        json={"unique_code": "WH-001", "name": "dup", "total_capacity": 5, "unit": "u", "unit_price": 1, "location": "l"},
    )
    assert r.status_code == 409
    r = client.post(
        "/api/spaces",
        headers=owner["headers"],
        json={"unique_code": "NEG", "name": "n", "total_capacity": -5, "unit": "u", "unit_price": 1, "location": "l"},
    )
    assert r.status_code == 422


def test_filters(client, owner):
    make_space(client, owner, "A", capacity=100, price=5)
    make_space(client, owner, "B", capacity=500, price=1)
    make_space(client, owner, "C", capacity=300, price=2, availability="unavailable")
    assert len(client.get("/api/spaces").json()) == 3
    assert len(client.get("/api/spaces?availability=available").json()) == 2
    assert [s["unique_code"] for s in client.get("/api/spaces?min_capacity=200&availability=available").json()] == ["B"]
    assert [s["unique_code"] for s in client.get("/api/spaces?max_price=1.5").json()] == ["B"]
    assert len(client.get("/api/spaces?location=jaff").json()) == 3
    assert len(client.get("/api/spaces/mine", headers=owner["headers"]).json()) == 3


def test_cannot_delete_space_with_rentals(client, owner, customer, space):
    from tests.conftest import request_rental
    assert request_rental(client, customer, space["id"], 10, "2099-10-01", "2099-10-05").status_code == 201
    assert client.delete(f"/api/spaces/{space['id']}", headers=owner["headers"]).status_code == 409
