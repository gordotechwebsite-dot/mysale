from typing import Optional

from sqlalchemy.orm import Session

from app.models.inventory import MovementType, Product, ProductStock, StockMovement


def register_sale_stock_exit(
    db: Session,
    product: Product,
    location_id: int,
    quantity: float,
    reference_id: int,
    reference_type: str,
    created_by_id: Optional[int] = None,
    notes: Optional[str] = None
) -> None:
    """Descuenta del inventario lo vendido y deja el movimiento de salida.

    El stock solo se descuenta cuando la sede ya lleva inventario del producto;
    el movimiento siempre queda registrado para poder auditar la salida.
    """
    stock = db.query(ProductStock).filter(
        ProductStock.product_id == product.id,
        ProductStock.location_id == location_id
    ).first()

    if stock:
        stock.quantity -= quantity

    db.add(StockMovement(
        product_id=product.id,
        location_id=location_id,
        movement_type=MovementType.SALE,
        quantity=-quantity,
        unit_cost=product.weighted_cost,
        reference_id=reference_id,
        reference_type=reference_type,
        created_by_id=created_by_id,
        notes=notes
    ))
