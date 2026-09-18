"""
Roles Matrix Tests - MySale POS
===============================
Validate the role matrix:

1. Mesero: solo vende en Gestion de Mesas (venta rapida y domicilios bloqueados).
2. Cajero: cobra la cuenta de mesa y la mueve, pero no anula ventas.
3. Administrador: anula una venta, el inventario vuelve y queda la auditoria.

Run with: python -m pytest tests/test_roles_matrix.py -v
"""

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app, init_default_data, init_default_modules
from app.models.inventory import ProductStock
from app.models.sale import SaleVoid

TEST_DATABASE_URL = "sqlite:///./test_roles_matrix.db"
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
    if os.path.exists("./test_roles_matrix.db"):
        os.remove("./test_roles_matrix.db")


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


def _login(client, username, password):
    response = client.post(
        "/api/auth/login",
        data={"username": username, "password": password}
    )
    assert response.status_code == 200, f"login {username} failed: {response.json()}"
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture(scope="module")
def context(client, admin_headers):
    """Una sede con un producto con stock, un cajero y un mesero."""
    location = client.post(
        "/api/locations/",
        json={"name": "Sede Roles", "code": "ROLES", "location_type": "pos"},
        headers=admin_headers,
    )
    assert location.status_code == 200, f"create location failed: {location.json()}"
    location_id = location.json()["id"]

    group = client.post("/api/inventory/groups", json={"name": "Grupo Roles"}, headers=admin_headers)
    family = client.post(
        "/api/inventory/families",
        json={"name": "Familia Roles", "group_id": group.json()["id"]},
        headers=admin_headers,
    )
    subfamily = client.post(
        "/api/inventory/subfamilies",
        json={"name": "SubFamilia Roles", "family_id": family.json()["id"]},
        headers=admin_headers,
    )

    product = client.post(
        "/api/inventory/products",
        json={
            "code": "ROLPROD",
            "name": "Producto Roles",
            "subfamily_id": subfamily.json()["id"],
            "sale_price": 4000,
            "location_id": location_id,
        },
        headers=admin_headers,
    )
    assert product.status_code == 200, f"create product failed: {product.json()}"
    product_id = product.json()["id"]

    roles = client.get("/api/users/roles", headers=admin_headers).json()
    cashier_role = next(r for r in roles if r["role_type"] == "cashier")
    waiter_role = next(r for r in roles if r["role_type"] == "waiter")

    for username, role_id in (
        ("cajero_roles", cashier_role["id"]),
        ("mesero_roles", waiter_role["id"]),
    ):
        created = client.post(
            "/api/users/",
            json={
                "username": username,
                "full_name": username,
                "password": "clave123",
                "role_id": role_id,
                "location_id": location_id,
            },
            headers=admin_headers,
        )
        assert created.status_code == 200, f"create {username} failed: {created.json()}"

    cashier_headers = _login(client, "cajero_roles", "clave123")
    waiter_headers = _login(client, "mesero_roles", "clave123")

    shift = client.post(
        "/api/shifts/open",
        json={"initial_cash": 0, "location_id": location_id},
        headers=cashier_headers,
    )
    assert shift.status_code == 200, f"open shift failed: {shift.json()}"

    return {
        "location_id": location_id,
        "product_id": product_id,
        "cashier_headers": cashier_headers,
        "waiter_headers": waiter_headers,
    }


def _stock_quantity(product_id, location_id):
    db = TestSessionLocal()
    try:
        stock = db.query(ProductStock).filter(
            ProductStock.product_id == product_id,
            ProductStock.location_id == location_id,
        ).first()
        return stock.quantity if stock else None
    finally:
        db.close()


class TestWaiterRestrictions:
    def test_waiter_cannot_create_quick_sale(self, client, context):
        response = client.post(
            "/api/sales/",
            json={
                "payment_method": "cash",
                "items": [{"product_id": context["product_id"], "quantity": 1}],
                "location_id": context["location_id"],
            },
            headers=context["waiter_headers"],
        )
        assert response.status_code == 403

    def test_waiter_cannot_create_delivery(self, client, context):
        response = client.post(
            "/api/deliveries/",
            json={
                "payment_method": "cash",
                "items": [{"product_id": context["product_id"], "quantity": 1}],
                "customer_name": "Cliente",
                "customer_phone": "3000000000",
                "customer_address": "Calle 1",
            },
            headers=context["waiter_headers"],
        )
        assert response.status_code == 403


class TestVoidSale:
    def test_cashier_cannot_void_and_admin_can(self, client, context, admin_headers):
        sale = client.post(
            "/api/sales/",
            json={
                "payment_method": "cash",
                "items": [{"product_id": context["product_id"], "quantity": 2}],
                "location_id": context["location_id"],
                "amount_received": 20000,
            },
            headers=context["cashier_headers"],
        )
        assert sale.status_code == 200, f"create sale failed: {sale.json()}"
        sale_id = sale.json()["id"]
        folio = sale.json()["folio"]
        stock_after_sale = _stock_quantity(context["product_id"], context["location_id"])

        denied = client.post(
            f"/api/sales/{sale_id}/void",
            json={"reason": "prueba"},
            headers=context["cashier_headers"],
        )
        assert denied.status_code == 403

        voided = client.post(
            f"/api/sales/{sale_id}/void",
            json={"reason": "cobro equivocado"},
            headers=admin_headers,
        )
        assert voided.status_code == 200, f"void failed: {voided.json()}"

        assert client.get(f"/api/sales/{sale_id}", headers=admin_headers).status_code == 404

        if stock_after_sale is not None:
            assert _stock_quantity(context["product_id"], context["location_id"]) == stock_after_sale + 2

        db = TestSessionLocal()
        try:
            audit = db.query(SaleVoid).filter(SaleVoid.folio == folio).first()
            assert audit is not None
            assert audit.reason == "cobro equivocado"
            assert audit.total == sale.json()["total"]
        finally:
            db.close()
