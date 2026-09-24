"""The overlap engine - the one piece of logic that matters."""
from datetime import date

from app.services.capacity import check_capacity
from tests.conftest import approve, book, make_space, request_rental

Y = "2099"


def d(m, day):
    return f"{Y}-{m:02d}-{day:02d}"


def test_exact_capacity_limit_accepted(client, owner, customer, customer2, space, db):
    # 100 + 150 = 250 on a 300 cap
    assert book(client, owner, customer, space["id"], 100, d(10, 1), d(10, 15)).status_code == 200
    r = book(client, owner, customer2, space["id"], 150, d(10, 5), d(10, 10))
    assert r.status_code == 200
    # ...and exactly 300 is still fine
    r = book(client, owner, customer, space["id"], 50, d(10, 6), d(10, 8))
    assert r.status_code == 200


def test_over_capacity_by_one_rejected(client, owner, customer, customer2, space):
    assert book(client, owner, customer, space["id"], 100, d(10, 1), d(10, 15)).status_code == 200
    assert book(client, owner, customer2, space["id"], 150, d(10, 5), d(10, 10)).status_code == 200
    assert book(client, owner, customer, space["id"], 50, d(10, 6), d(10, 8)).status_code == 200  # 300 exactly
    r = book(client, owner, customer2, space["id"], 1, d(10, 6), d(10, 8))  # 301
    assert r.status_code == 409
    assert "Not enough capacity" in r.json()["detail"]


def test_viva_demo_script(client, owner, customer, customer2, space):
    sid = space["id"]
    assert book(client, owner, customer, sid, 100, d(10, 1), d(10, 15)).status_code == 200  # existing
    assert book(client, owner, customer2, sid, 150, d(10, 5), d(10, 10)).status_code == 200  # 250 <= 300
    assert book(client, owner, customer, sid, 100, d(10, 7), d(10, 12)).status_code == 409  # 350 > 300
    assert book(client, owner, customer, sid, 100, d(10, 20), d(10, 25)).status_code == 200  # no overlap


def test_adjacent_dates_do_not_overlap(client, owner, customer, customer2):
    sp = make_space(client, owner, "ADJ", capacity=100)
    assert book(client, owner, customer, sp["id"], 100, d(10, 1), d(10, 15)).status_code == 200
    # starts on the day the first one moves out -> end-exclusive, so no overlap
    assert book(client, owner, customer2, sp["id"], 100, d(10, 15), d(10, 20)).status_code == 200
    # gap between rentals
    assert book(client, owner, customer2, sp["id"], 100, d(10, 25), d(10, 30)).status_code == 200


def test_partial_and_full_overlap(client, owner, customer, customer2):
    sp = make_space(client, owner, "OV", capacity=100)
    assert book(client, owner, customer, sp["id"], 60, d(10, 10), d(10, 20)).status_code == 200
    assert book(client, owner, customer2, sp["id"], 50, d(10, 5), d(10, 12)).status_code == 409   # partial (left)
    assert book(client, owner, customer2, sp["id"], 50, d(10, 18), d(10, 25)).status_code == 409   # partial (right)
    assert book(client, owner, customer2, sp["id"], 50, d(10, 1), d(10, 30)).status_code == 409    # fully covers
    assert book(client, owner, customer2, sp["id"], 50, d(10, 12), d(10, 14)).status_code == 409   # fully inside
    assert book(client, owner, customer2, sp["id"], 40, d(10, 12), d(10, 14)).status_code == 200   # fits


def test_rejected_and_cancelled_do_not_consume_capacity(client, owner, customer, customer2):
    sp = make_space(client, owner, "RC", capacity=100)
    r1 = request_rental(client, customer, sp["id"], 100, d(10, 1), d(10, 10)).json()
    client.patch(f"/api/rentals/{r1['id']}/status", headers=owner["headers"], json={"status": "rejected"})
    r2 = request_rental(client, customer, sp["id"], 100, d(10, 1), d(10, 10)).json()
    assert approve(client, owner, r2["id"]).status_code == 200
    client.patch(f"/api/rentals/{r2['id']}/status", headers=customer["headers"], json={"status": "cancelled"})
    # pending rentals also never count
    request_rental(client, customer2, sp["id"], 100, d(10, 1), d(10, 10))
    r4 = request_rental(client, customer2, sp["id"], 100, d(10, 1), d(10, 10)).json()
    assert approve(client, owner, r4["id"]).status_code == 200


def test_peak_is_used_not_a_blind_sum(client, owner, customer, customer2):
    """Two old rentals overlap the request window but never overlap each other."""
    sp = make_space(client, owner, "PK", capacity=300)
    assert book(client, owner, customer, sp["id"], 200, d(10, 1), d(10, 10)).status_code == 200
    assert book(client, owner, customer, sp["id"], 200, d(10, 10), d(10, 20)).status_code == 200
    # peak concurrent use is 200, so 100 more (=300) is fine even though 200+200+100 > 300
    assert book(client, owner, customer2, sp["id"], 100, d(10, 5), d(10, 15)).status_code == 200
    assert book(client, owner, customer2, sp["id"], 1, d(10, 5), d(10, 15)).status_code == 409


def test_check_capacity_function_directly(client, owner, customer, space, db):
    book(client, owner, customer, space["id"], 100, d(10, 1), d(10, 15))
    res = check_capacity(db, space["id"], date(2099, 10, 5), date(2099, 10, 10), 150)
    assert res == {"ok": True, "used": 100.0, "projected": 250.0, "total": 300.0, "available": 200.0}
    res = check_capacity(db, space["id"], date(2099, 10, 5), date(2099, 10, 10), 201)
    assert res["ok"] is False
    # exclude_rental_id (used for edits/extensions)
    res = check_capacity(db, space["id"], date(2099, 10, 5), date(2099, 10, 10), 300, exclude_rental_id=1)
    assert res["ok"] is True


def test_availability_endpoint(client, owner, customer, space):
    book(client, owner, customer, space["id"], 100, d(10, 1), d(10, 15))
    r = client.get(f"/api/spaces/{space['id']}/availability?start={d(10,5)}&end={d(10,10)}")
    assert r.status_code == 200
    body = r.json()
    assert body["used"] == 100 and body["available"] == 200 and len(body["timeline"]) == 5
    r = client.get(f"/api/spaces/{space['id']}/availability?start={d(10,20)}&end={d(10,25)}")
    assert r.json()["available"] == 300
    assert client.get(f"/api/spaces/{space['id']}/availability?start={d(10,10)}&end={d(10,5)}").status_code == 400
