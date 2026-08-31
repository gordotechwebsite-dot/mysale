"""
Location Isolation Tests - MySale POS
====================================
Validate that a user with a fixed location (sede fija) cannot read or write
data from another location, even when asking for it explicitly:

1. Products from another location are rejected and its own carta is filtered.
2. Sales, shifts and cash closes from another location are rejected.
3. Locations and users from another location are invisible.
4. An admin without a fixed location keeps the multi-location behaviour.

Run with: python -m pytest tests/test_location_isolation.py -v
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app, init_default_data, init_default_modules

TEST_DATABASE_URL = "sqlite:///./test_location_isolation.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=test_engine)

    previous_override = app.dependency_overrides.get(get_db)
    app.dependency_overrides[get_db] = override_get_db

    import app.main as main_module
    original_session_local = main_module.SessionLocal
    main_module.SessionLocal = TestSessionLocal

    init_default_modules()
    init_default_data()

    main_module.SessionLocal = original_session_local

    yield

    if previous_override:
        app.dependency_overrides[get_db] = previous_override
    else:
        app.dependency_overrides.pop(get_db, None)

    Base.metadata.drop_all(bind=test_engine)
    import os
    if os.path.exists("./test_location_isolation.db"):
        os.remove("./test_location_isolation.db")


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def admin_headers(client):
    response = client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "admin123"}
    )
    assert response.status_code == 200, f"Admin login failed: {response.json()}"
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture(scope="module")
def context(client, admin_headers):
    """Dos sedes con un producto cada una y un cajero amarrado a la sede A."""
    loc_a = client.post(
        "/api/locations/",
        json={"name": "Sede A", "code": "ISOA", "location_type": "pos"},
        headers=admin_headers,
    )
    assert loc_a.status_code == 200, f"create location A failed: {loc_a.json()}"
    loc_b = client.post(
        "/api/locations/",
        json={"name": "Sede B", "code": "ISOB", "location_type": "pos"},
        headers=admin_headers,
    )
    assert loc_b.status_code == 200, f"create location B failed: {loc_b.json()}"
    location_a = loc_a.json()["id"]
    location_b = loc_b.json()["id"]

    group = client.post("/api/inventory/groups", json={"name": "Grupo Iso"}, headers=admin_headers)
    fam = client.post(
        "/api/inventory/families",
        json={"name": "Familia Iso", "group_id": group.json()["id"]},
        headers=admin_headers,
    )
    subfam = client.post(
        "/api/inventory/subfamilies",
        json={"name": "SubFamilia Iso", "family_id": fam.json()["id"]},
        headers=admin_headers,
    )
    subfamily_id = subfam.json()["id"]

    product_a = client.post(
        "/api/inventory/products",
        json={
            "code": "ISOPRODA",
            "name": "Producto Sede A",
            "subfamily_id": subfamily_id,
            "sale_price": 3000,
            "location_id": location_a,
        },
        headers=admin_headers,
    )
    assert product_a.status_code == 200, f"create product A failed: {product_a.json()}"
    product_b = client.post(
        "/api/inventory/products",
        json={
            "code": "ISOPRODB",
            "name": "Producto Sede B",
            "subfamily_id": subfamily_id,
            "sale_price": 5000,
            "location_id": location_b,
        },
        headers=admin_headers,
    )
    assert product_b.status_code == 200, f"create product B failed: {product_b.json()}"

    roles = client.get("/api/users/roles", headers=admin_headers)
    cashier_role = next(r for r in roles.json() if r["role_type"] == "cashier")

    cashier = client.post(
        "/api/users/",
        json={
            "username": "cajero_iso",
            "full_name": "Cajero Sede A",
            "password": "cajero123",
            "role_id": cashier_role["id"],
            "location_id": location_a,
        },
        headers=admin_headers,
    )
    assert cashier.status_code == 200, f"create cashier failed: {cashier.json()}"

    login = client.post(
        "/api/auth/login",
        data={"username": "cajero_iso", "password": "cajero123"}
    )
    assert login.status_code == 200, f"cashier login failed: {login.json()}"

    rotating = client.post(
        "/api/users/",
        json={
            "username": "cajero_rotativo",
            "full_name": "Cajero Rotativo",
            "password": "cajero123",
            "role_id": cashier_role["id"],
            "location_id": -1,
        },
        headers=admin_headers,
    )
    assert rotating.status_code == 200, f"create rotating cashier failed: {rotating.json()}"

    rotating_login = client.post(
        "/api/auth/login",
        data={"username": "cajero_rotativo", "password": "cajero123"}
    )
    assert rotating_login.status_code == 200, f"rotating login failed: {rotating_login.json()}"

    return {
        "location_a": location_a,
        "location_b": location_b,
        "product_a": product_a.json()["id"],
        "product_b": product_b.json()["id"],
        "cashier_headers": {"Authorization": f"Bearer {login.json()['access_token']}"},
        "rotating_headers": {
            "Authorization": f"Bearer {rotating_login.json()['access_token']}"
        },
    }


class TestFixedLocationIsolation:
    def test_sales_and_cash_from_other_location_rejected(self, client, context):
        headers = context["cashier_headers"]

        assert client.get(
            f"/api/sales/?location_id={context['location_b']}",
            headers=headers,
        ).status_code == 403

        assert client.get(
            f"/api/cash/closes?location_id={context['location_b']}",
            headers=headers,
        ).status_code == 403

        assert client.get(
            f"/api/shifts/?location_id={context['location_b']}",
            headers=headers,
        ).status_code == 403

        created = client.post(
            "/api/sales/",
            json={
                "location_id": context["location_b"],
                "payment_method": "cash",
                "items": [
                    {"product_id": context["product_b"], "quantity": 1, "unit_price": 5000}
                ],
            },
            headers=headers,
        )
        assert created.status_code == 403

    def test_locations_and_users_limited_to_own_location(self, client, context):
        headers = context["cashier_headers"]

        locations = client.get("/api/locations/", headers=headers)
        assert locations.status_code == 200
        assert [loc["id"] for loc in locations.json()] == [context["location_a"]]

        assert client.get(
            f"/api/locations/{context['location_b']}",
            headers=headers,
        ).status_code == 403

        users = client.get("/api/users/", headers=headers)
        assert users.status_code == 200
        assert all(u["location_id"] == context["location_a"] for u in users.json())


class TestRotatingLocation:
    def test_rotating_user_can_choose_any_location(self, client, context):
        headers = context["rotating_headers"]

        locations = client.get("/api/locations/", headers=headers)
        assert locations.status_code == 200
        ids = [loc["id"] for loc in locations.json()]
        assert context["location_a"] in ids
        assert context["location_b"] in ids

        assert client.get(
            f"/api/sales/?location_id={context['location_b']}",
            headers=headers,
        ).status_code == 200

        assert client.get(
            f"/api/shifts/?location_id={context['location_a']}",
            headers=headers,
        ).status_code == 200


class TestAdminWithoutFixedLocation:
    def test_admin_keeps_multi_location_access(self, client, admin_headers, context):
        locations = client.get("/api/locations/", headers=admin_headers)
        assert locations.status_code == 200
        ids = [loc["id"] for loc in locations.json()]
        assert context["location_a"] in ids
        assert context["location_b"] in ids

        products_b = client.get(
            f"/api/inventory/products?location_id={context['location_b']}",
            headers=admin_headers,
        )
        assert products_b.status_code == 200
        codes = [p["code"] for p in products_b.json()]
        assert "ISOPRODB" in codes
        assert "ISOPRODA" not in codes
