"""
Table Sale Tests - MySale POS
=============================
Validate that paying a table account behaves like a real sale:

1. Paying a ticket creates a Sale (type table) with its items.
2. The sale feeds the shift totals by payment method.
3. Inventory is discounted and the stock movement is registered.
4. Retrying the payment does not duplicate the sale.

Run with: python -m pytest tests/test_table_sale.py -v
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app, init_default_data, init_default_modules
from app.models.inventory import MovementType, ProductStock, StockMovement
from app.models.sale import Sale, SaleType
from app.models.shift import Shift

TEST_DATABASE_URL = "sqlite:///./test_table_sale.db"
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
    if os.path.exists("./test_table_sale.db"):
        os.remove("./test_table_sale.db")


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def headers(client):
    response = client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "admin123"}
    )
    assert response.status_code == 200, f"Admin login failed: {response.json()}"
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture(scope="module")
def context(client, headers):
    """Sede con zona, mesa y un producto con inventario."""
    loc = client.post(
        "/api/locations/",
        json={"name": "Sucursal Mesas", "code": "MESALOC", "location_type": "pos"},
        headers=headers,
    )
    assert loc.status_code == 200, f"create location failed: {loc.json()}"
    location_id = loc.json()["id"]

    group = client.post("/api/inventory/groups", json={"name": "Grupo Mesas"}, headers=headers)
    fam = client.post(
        "/api/inventory/families",
        json={"name": "Familia Mesas", "group_id": group.json()["id"]},
        headers=headers,
    )
    subfam = client.post(
        "/api/inventory/subfamilies",
        json={"name": "SubFamilia Mesas", "family_id": fam.json()["id"]},
        headers=headers,
    )
    prod = client.post(
        "/api/inventory/products",
        json={
            "code": "MESAPROD1",
            "name": "Producto Mesas",
            "subfamily_id": subfam.json()["id"],
            "sale_price": 4000,
        },
        headers=headers,
    )
    assert prod.status_code == 200, f"create product failed: {prod.json()}"
    product_id = prod.json()["id"]

    db = TestSessionLocal()
    stock = db.query(ProductStock).filter(
        ProductStock.product_id == product_id,
        ProductStock.location_id == location_id,
    ).first()
    if not stock:
        stock = ProductStock(product_id=product_id, location_id=location_id)
        db.add(stock)
    stock.quantity = 10
    db.commit()
    db.close()

    zone = client.post(
        "/api/tables/zones",
        json={"name": "Zona Mesas", "location_id": location_id},
        headers=headers,
    )
    assert zone.status_code == 200, f"create zone failed: {zone.json()}"

    return {
        "location_id": location_id,
        "product_id": product_id,
        "zone_id": zone.json()["id"],
    }


def _open_ticket(client, headers, context, table_name):
    table = client.post(
        "/api/tables/",
        json={"name": table_name, "zone_id": context["zone_id"], "capacity": 4},
        headers=headers,
    )
    assert table.status_code == 200, f"create table failed: {table.json()}"

    ticket = client.post(
        "/api/tables/tickets",
        json={
            "table_id": table.json()["id"],
            "location_id": context["location_id"],
            "num_people": 2,
        },
        headers=headers,
    )
    assert ticket.status_code == 200, f"create ticket failed: {ticket.json()}"

    added = client.post(
        f"/api/tables/tickets/{ticket.json()['id']}/items",
        json={"items": [
            {"product_id": context["product_id"], "quantity": 3, "unit_price": 4000}
        ]},
        headers=headers,
    )
    assert added.status_code == 200, f"add items failed: {added.json()}"
    assert added.json()["total"] == 12000
    return added.json()


class TestTableSale:
    def test_pay_ticket_creates_sale_with_items(self, client, headers, context):
        ticket = _open_ticket(client, headers, context, "Mesa Venta")

        paid = client.post(
            f"/api/tables/tickets/{ticket['id']}/pay",
            json={"payments": [{"payment_method": "cash", "amount": 12000}]},
            headers=headers,
        )
        assert paid.status_code == 200, f"pay failed: {paid.json()}"
        assert paid.json()["status"] == "paid"
        sale_id = paid.json()["sale_id"]
        assert sale_id, "la cuenta pagada debe quedar ligada a una venta"

        db = TestSessionLocal()
        sale = db.query(Sale).filter(Sale.id == sale_id).one()
        assert sale.sale_type == SaleType.TABLE
        assert sale.total == 12000
        assert sale.location_id == context["location_id"]
        assert len(sale.items) == 1
        assert sale.items[0].quantity == 3
        assert sale.items[0].subtotal == 12000

        shift = db.query(Shift).filter(Shift.id == sale.shift_id).one()
        assert shift.total_sales == 12000
        assert shift.total_cash_sales == 12000

        stock = db.query(ProductStock).filter(
            ProductStock.product_id == context["product_id"],
            ProductStock.location_id == context["location_id"],
        ).one()
        assert stock.quantity == 7

        movements = db.query(StockMovement).filter(
            StockMovement.reference_id == sale.id,
            StockMovement.reference_type == "sale",
        ).all()
        assert len(movements) == 1
        assert movements[0].movement_type == MovementType.SALE
        assert movements[0].quantity == -3
        db.close()

    def test_paying_twice_does_not_duplicate_the_sale(self, client, headers, context):
        ticket = _open_ticket(client, headers, context, "Mesa Reintento")
        payload = {"payments": [{"payment_method": "card", "amount": 12000}]}

        first = client.post(f"/api/tables/tickets/{ticket['id']}/pay", json=payload, headers=headers)
        assert first.status_code == 200, f"pay failed: {first.json()}"
        sale_id = first.json()["sale_id"]

        retry = client.post(f"/api/tables/tickets/{ticket['id']}/pay", json=payload, headers=headers)
        assert retry.status_code == 200, f"retry failed: {retry.json()}"
        assert retry.json()["sale_id"] == sale_id

        db = TestSessionLocal()
        sales = db.query(Sale).filter(Sale.notes.like(f"%cuenta #{ticket['id']}%")).all()
        assert len(sales) == 1
        movements = db.query(StockMovement).filter(
            StockMovement.reference_id == sale_id,
            StockMovement.reference_type == "sale",
        ).all()
        assert len(movements) == 1
        db.close()

    def test_split_payment_feeds_each_shift_total(self, client, headers, context):
        ticket = _open_ticket(client, headers, context, "Mesa Mixta")

        paid = client.post(
            f"/api/tables/tickets/{ticket['id']}/pay",
            json={"payments": [
                {"payment_method": "cash", "amount": 5000},
                {"payment_method": "transfer", "amount": 7000},
            ]},
            headers=headers,
        )
        assert paid.status_code == 200, f"pay failed: {paid.json()}"

        db = TestSessionLocal()
        sale = db.query(Sale).filter(Sale.id == paid.json()["sale_id"]).one()
        shift = db.query(Shift).filter(Shift.id == sale.shift_id).one()
        assert shift.total_transfer_sales == 7000
        db.close()

    def test_cancelled_items_are_not_sold(self, client, headers, context):
        ticket = _open_ticket(client, headers, context, "Mesa Anulada")
        item_id = ticket["items"][0]["id"]

        removed = client.delete(
            f"/api/tables/tickets/{ticket['id']}/items/{item_id}", headers=headers
        )
        assert removed.status_code == 200, f"delete item failed: {removed.text}"

        added = client.post(
            f"/api/tables/tickets/{ticket['id']}/items",
            json={"items": [
                {"product_id": context["product_id"], "quantity": 1, "unit_price": 4000}
            ]},
            headers=headers,
        )
        assert added.json()["total"] == 4000

        paid = client.post(
            f"/api/tables/tickets/{ticket['id']}/pay",
            json={"payments": [{"payment_method": "cash", "amount": 4000}]},
            headers=headers,
        )
        assert paid.status_code == 200, f"pay failed: {paid.json()}"

        db = TestSessionLocal()
        sale = db.query(Sale).filter(Sale.id == paid.json()["sale_id"]).one()
        assert len(sale.items) == 1
        assert sale.items[0].quantity == 1
        assert sale.total == 4000
        db.close()
