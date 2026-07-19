"""
Offline Sales Sync Tests - MySale POS
=====================================
Validate that sales submitted from the offline PWA sync safely:

1. A sale with a client_uuid is created and returns that client_uuid.
2. Re-submitting the SAME client_uuid does NOT create a duplicate (idempotency).
3. The client_created_at timestamp is honored (offline time, not sync time).

Run with: python -m pytest tests/test_offline_sales_sync.py -v
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app, init_default_data, init_default_modules

TEST_DATABASE_URL = "sqlite:///./test_offline_sales.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=test_engine)

    import app.main as main_module
    original_session_local = main_module.SessionLocal
    main_module.SessionLocal = TestSessionLocal

    init_default_modules()
    init_default_data()

    main_module.SessionLocal = original_session_local

    yield

    Base.metadata.drop_all(bind=test_engine)
    import os
    if os.path.exists("./test_offline_sales.db"):
        os.remove("./test_offline_sales.db")


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def token(client):
    response = client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "admin123"}
    )
    assert response.status_code == 200, f"Admin login failed: {response.json()}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def sale_context(client, headers):
    """Create location, group/family/subfamily and a product to sell."""
    loc = client.post(
        "/api/locations/",
        json={"name": "Sucursal Offline", "code": "OFFLOC", "location_type": "pos"},
        headers=headers,
    )
    assert loc.status_code == 200, f"create location failed: {loc.json()}"
    location_id = loc.json()["id"]

    group = client.post(
        "/api/inventory/groups",
        json={"name": "Grupo Offline"},
        headers=headers,
    )
    assert group.status_code == 200, f"create group failed: {group.json()}"
    group_id = group.json()["id"]

    fam = client.post(
        "/api/inventory/families",
        json={"name": "Familia Offline", "group_id": group_id},
        headers=headers,
    )
    assert fam.status_code == 200, f"create family failed: {fam.json()}"
    family_id = fam.json()["id"]

    subfam = client.post(
        "/api/inventory/subfamilies",
        json={"name": "SubFamilia Offline", "family_id": family_id},
        headers=headers,
    )
    assert subfam.status_code == 200, f"create subfamily failed: {subfam.json()}"
    subfamily_id = subfam.json()["id"]

    prod = client.post(
        "/api/inventory/products",
        json={
            "code": "OFFPROD1",
            "name": "Producto Offline",
            "subfamily_id": subfamily_id,
            "sale_price": 5000,
        },
        headers=headers,
    )
    assert prod.status_code == 200, f"create product failed: {prod.json()}"
    product_id = prod.json()["id"]

    return {"location_id": location_id, "product_id": product_id}


def _sale_payload(context, client_uuid, created_at=None):
    payload = {
        "payment_method": "cash",
        "items": [{"product_id": context["product_id"], "quantity": 2}],
        "amount_received": 10000,
        "location_id": context["location_id"],
        "client_uuid": client_uuid,
    }
    if created_at:
        payload["client_created_at"] = created_at
    return payload


class TestOfflineSalesSync:
    def test_create_sale_returns_client_uuid(self, client, headers, sale_context):
        uuid = "test-uuid-0001"
        resp = client.post("/api/sales/", json=_sale_payload(sale_context, uuid), headers=headers)
        assert resp.status_code == 200, f"create sale failed: {resp.json()}"
        data = resp.json()
        assert data["client_uuid"] == uuid
        assert data["total"] == 10000

    def test_duplicate_client_uuid_is_idempotent(self, client, headers, sale_context):
        uuid = "test-uuid-dup"
        first = client.post("/api/sales/", json=_sale_payload(sale_context, uuid), headers=headers)
        assert first.status_code == 200
        first_id = first.json()["id"]
        first_folio = first.json()["folio"]

        # Re-submit the exact same client_uuid (as the sync queue would on retry)
        second = client.post("/api/sales/", json=_sale_payload(sale_context, uuid), headers=headers)
        assert second.status_code == 200
        # Must return the SAME sale, not a new one
        assert second.json()["id"] == first_id
        assert second.json()["folio"] == first_folio

        # Verify only one sale exists for this uuid
        all_sales = client.get("/api/sales/", headers=headers).json()
        matching = [s for s in all_sales if s.get("client_uuid") == uuid]
        assert len(matching) == 1, f"Expected exactly 1 sale for uuid, got {len(matching)}"

    def test_client_created_at_is_honored(self, client, headers, sale_context):
        uuid = "test-uuid-time"
        past = "2020-01-15T10:30:00"
        resp = client.post(
            "/api/sales/",
            json=_sale_payload(sale_context, uuid, created_at=past),
            headers=headers,
        )
        assert resp.status_code == 200, f"create sale failed: {resp.json()}"
        assert resp.json()["created_at"].startswith("2020-01-15")

    def test_sale_without_client_uuid_still_works(self, client, headers, sale_context):
        payload = {
            "payment_method": "cash",
            "items": [{"product_id": sale_context["product_id"], "quantity": 1}],
            "amount_received": 5000,
            "location_id": sale_context["location_id"],
        }
        resp = client.post("/api/sales/", json=payload, headers=headers)
        assert resp.status_code == 200, f"create sale failed: {resp.json()}"
        assert resp.json()["client_uuid"] is None
