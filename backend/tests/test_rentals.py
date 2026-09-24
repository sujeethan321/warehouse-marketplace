from tests.conftest import approve, book, make_space, request_rental

Y = "2099"


def test_price_is_computed_on_the_server(client, customer, space):
    # 100 sq.ft x 2 per day x 10 days = 2000 (end date is exclusive)
    r = request_rental(client, customer, space["id"], 100, f"{Y}-10-01", f"{Y}-10-11")
    assert r.status_code == 201
    body = r.json()
    assert body["total_price"] == 2000 and body["days"] == 10 and body["status"] == "pending"
    assert body["history"] is None
    # a price sent by the client is ignored
    r = client.post(
        "/api/rentals",
        headers=customer["headers"],
        json={"space_id": space["id"], "requested_capacity": 1, "start_date": f"{Y}-10-01", "end_date": f"{Y}-10-02", "total_price": 1, "status": "approved"},
    )
    assert r.json()["total_price"] == 2 and r.json()["status"] == "pending"


def test_request_validation(client, customer, owner, space):
    assert request_rental(client, customer, space["id"], 10, f"{Y}-10-05", f"{Y}-10-05").status_code == 422
    assert request_rental(client, customer, space["id"], 10, "2000-01-01", "2000-01-05").status_code == 400  # past
    assert request_rental(client, customer, space["id"], 301, f"{Y}-10-01", f"{Y}-10-05").status_code == 400  # > total
    assert request_rental(client, customer, space["id"], -5, f"{Y}-10-01", f"{Y}-10-05").status_code == 422
    assert request_rental(client, customer, 9999, 5, f"{Y}-10-01", f"{Y}-10-05").status_code == 404
    assert request_rental(client, owner, space["id"], 5, f"{Y}-10-01", f"{Y}-10-05").status_code == 403
    sp2 = make_space(client, owner, "OFF", availability="unavailable")
    assert request_rental(client, customer, sp2["id"], 5, f"{Y}-10-01", f"{Y}-10-05").status_code == 400


def test_invalid_status_transitions_are_400(client, owner, customer, space):
    rid = request_rental(client, customer, space["id"], 10, f"{Y}-10-01", f"{Y}-10-05").json()["id"]
    url = f"/api/rentals/{rid}/status"
    assert client.patch(url, headers=owner["headers"], json={"status": "rejected"}).status_code == 200
    assert client.patch(url, headers=owner["headers"], json={"status": "approved"}).status_code == 400  # rejected -> approved
    assert client.patch(url, headers=customer["headers"], json={"status": "cancelled"}).status_code == 400
    assert client.patch(url, headers=owner["headers"], json={"status": "pending"}).status_code == 422


def test_approved_can_be_cancelled_but_not_rejected(client, owner, customer, space):
    rid = request_rental(client, customer, space["id"], 10, f"{Y}-10-01", f"{Y}-10-05").json()["id"]
    assert approve(client, owner, rid).status_code == 200
    assert client.patch(f"/api/rentals/{rid}/status", headers=owner["headers"], json={"status": "rejected"}).status_code == 400
    assert approve(client, owner, rid).status_code == 400  # approved -> approved
    assert client.patch(f"/api/rentals/{rid}/status", headers=customer["headers"], json={"status": "cancelled"}).status_code == 200


def test_ownership_checks(client, owner, owner_b, customer, customer2, space):
    rid = request_rental(client, customer, space["id"], 10, f"{Y}-10-01", f"{Y}-10-05").json()["id"]
    url = f"/api/rentals/{rid}/status"
    # another owner cannot approve/reject
    assert client.patch(url, headers=owner_b["headers"], json={"status": "approved"}).status_code == 403
    # a customer cannot approve their own request
    assert client.patch(url, headers=customer["headers"], json={"status": "approved"}).status_code == 403
    # another customer cannot cancel it
    assert client.patch(url, headers=customer2["headers"], json={"status": "cancelled"}).status_code == 403
    # and cannot read it
    assert client.get(f"/api/rentals/{rid}", headers=customer2["headers"]).status_code == 403
    assert client.get(f"/api/rentals/{rid}", headers=owner_b["headers"]).status_code == 403
    assert client.get(f"/api/rentals/{rid}", headers=owner["headers"]).status_code == 200


def test_my_rentals_and_owner_rentals_are_scoped(client, owner, owner_b, customer, customer2, space):
    sp_b = make_space(client, owner_b, "B-1")
    request_rental(client, customer, space["id"], 10, f"{Y}-10-01", f"{Y}-10-05")
    request_rental(client, customer2, sp_b["id"], 10, f"{Y}-10-01", f"{Y}-10-05")
    assert len(client.get("/api/rentals/my", headers=customer["headers"]).json()) == 1
    assert len(client.get("/api/owner/rentals", headers=owner["headers"]).json()) == 1
    assert len(client.get("/api/owner/rentals", headers=owner_b["headers"]).json()) == 1


def test_status_history_audit_trail(client, owner, customer, space):
    rid = request_rental(client, customer, space["id"], 10, f"{Y}-10-01", f"{Y}-10-05").json()["id"]
    approve(client, owner, rid)
    body = client.get(f"/api/rentals/{rid}", headers=customer["headers"]).json()
    trail = [(h["old_status"], h["new_status"]) for h in body["history"]]
    assert trail == [(None, "pending"), ("pending", "approved")]


def test_second_approval_that_would_overbook_fails(client, owner, customer, customer2):
    """Sequential stand-in for the concurrency test (see README: on MySQL the space row is locked
    with SELECT ... FOR UPDATE, so two simultaneous approvals are serialised and the second one
    sees the first one's booking and gets this same 409)."""
    sp = make_space(client, owner, "RACE", capacity=100)
    a = request_rental(client, customer, sp["id"], 80, f"{Y}-10-01", f"{Y}-10-10").json()["id"]
    b = request_rental(client, customer2, sp["id"], 80, f"{Y}-10-05", f"{Y}-10-15").json()["id"]
    codes = sorted([approve(client, owner, a).status_code, approve(client, owner, b).status_code])
    assert codes == [200, 409]
    # the loser stays pending
    still = client.get(f"/api/rentals/{b}", headers=customer2["headers"]).json()
    assert still["status"] == "pending"


def test_reports(client, owner, customer, space):
    book(client, owner, customer, space["id"], 100, f"{Y}-10-01", f"{Y}-10-11")
    request_rental(client, customer, space["id"], 50, f"{Y}-10-01", f"{Y}-10-03")
    h = owner["headers"]
    rev = client.get("/api/reports/revenue", headers=h).json()
    assert rev["totals"]["revenue"] == 2000 and rev["totals"]["count"] == 2 and rev["totals"]["pending_value"] == 200
    assert rev["by_month"] == [{"month": f"{Y}-10", "revenue": 2000.0}]
    assert len(client.get("/api/reports/revenue?status=approved", headers=h).json()["rows"]) == 1

    util = client.get(f"/api/reports/utilisation?start={Y}-10-01&end={Y}-10-11", headers=h).json()
    assert util["spaces"][0]["utilisation_pct"] == round(100 / 300 * 100, 1)
    assert util["spaces"][0]["peak_used"] == 100

    occ = client.get(f"/api/reports/occupancy?start={Y}-10-01&end={Y}-10-11&bucket=week", headers=h).json()
    assert occ["total_capacity"] == 300 and len(occ["points"]) >= 1
    assert client.get(f"/api/reports/occupancy?start={Y}-10-10&end={Y}-10-01", headers=h).status_code == 400


def test_reports_only_show_own_data(client, owner, owner_b, customer, space):
    book(client, owner, customer, space["id"], 100, f"{Y}-10-01", f"{Y}-10-11")
    other = client.get("/api/reports/revenue", headers=owner_b["headers"]).json()
    assert other["totals"]["count"] == 0
