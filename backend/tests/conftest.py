import os

# Must be set before the app is imported: tests run on in-memory SQLite, no MySQL needed.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["RATE_LIMIT_ENABLED"] = "false"
os.environ["SECRET_KEY"] = "test-secret"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.database import Base, get_db
from app.main import app

engine = create_engine(
    "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
)
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def _override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def db():
    session = TestingSession()
    yield session
    session.close()


# ---------- helpers ----------
def register(client, name, email, role, password="password123"):
    r = client.post("/api/auth/register", json={"name": name, "email": email, "password": password, "role": role})
    assert r.status_code == 201, r.text
    data = r.json()
    return {"headers": {"Authorization": f"Bearer {data['access_token']}"}, "user": data["user"]}


@pytest.fixture
def owner(client):
    return register(client, "Owner A", "ownera@test.com", "owner")


@pytest.fixture
def owner_b(client):
    return register(client, "Owner B", "ownerb@test.com", "owner")


@pytest.fixture
def customer(client):
    return register(client, "Cust One", "cust1@test.com", "customer")


@pytest.fixture
def customer2(client):
    return register(client, "Cust Two", "cust2@test.com", "customer")


def make_space(client, owner, code="WH-001", capacity=300, price=2, availability="available"):
    r = client.post(
        "/api/spaces",
        headers=owner["headers"],
        json={
            "unique_code": code,
            "name": f"Space {code}",
            "total_capacity": capacity,
            "unit": "sq.ft",
            "unit_price": price,
            "location": "Jaffna",
            "availability": availability,
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


@pytest.fixture
def space(client, owner):
    return make_space(client, owner)


def request_rental(client, customer, space_id, capacity, start, end):
    return client.post(
        "/api/rentals",
        headers=customer["headers"],
        json={"space_id": space_id, "requested_capacity": capacity, "start_date": start, "end_date": end},
    )


def approve(client, owner, rental_id):
    return client.patch(f"/api/rentals/{rental_id}/status", headers=owner["headers"], json={"status": "approved"})


def book(client, owner, customer, space_id, capacity, start, end):
    """create + approve, returns the approve response"""
    r = request_rental(client, customer, space_id, capacity, start, end)
    assert r.status_code == 201, r.text
    return approve(client, owner, r.json()["id"])
