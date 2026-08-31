from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import uuid
from app.database import get_db
from app.models.user import User, RoleType
from app.models.inventory import Group, Family, SubFamily, Product, ProductStock, StockMovement, MovementType, ProductModifier
from app.models.location import Location
from app.models.sale import SaleItem
from app.models.table import TicketItem
from app.models.transfer import TransferItem
from app.models.loss import LossItem
from app.schemas.inventory import (
    GroupCreate, GroupUpdate, GroupResponse,
    FamilyCreate, FamilyUpdate, FamilyResponse,
    SubFamilyCreate, SubFamilyUpdate, SubFamilyResponse,
    ProductCreate, ProductUpdate, ProductResponse, ProductStockResponse,
    StockAdjustment, PurchaseCreate, BulkProductImport,
    ModifierCreate, ModifierUpdate, ModifierResponse
)
from app.utils.auth import get_current_user, require_role, require_module
from app.utils.location_scope import require_own_location, scoped_location_id

router = APIRouter(prefix="/api/inventory", tags=["Inventario"])

IMAGE_UPLOAD_DIR = "/data/uploads/images"


def _serialize_product(
    db: Session,
    product: Product,
    stocks: List[ProductStockResponse],
    modifiers: List[ModifierResponse]
) -> ProductResponse:
    location_name = None
    if product.location_id:
        location = db.query(Location).filter(Location.id == product.location_id).first()
        location_name = location.name if location else None
    return ProductResponse(
        id=product.id,
        code=product.code,
        barcode=product.barcode,
        name=product.name,
        description=product.description,
        subfamily_id=product.subfamily_id,
        location_id=product.location_id,
        location_name=location_name,
        unit=product.unit,
        sale_price=product.sale_price,
        weighted_cost=product.weighted_cost,
        min_stock=product.min_stock,
        max_stock=product.max_stock,
        is_active=product.is_active,
        is_sold_out=bool(product.is_sold_out),
        created_at=product.created_at,
        stocks=stocks,
        modifiers=modifiers
    )


def _validate_product_location(db: Session, location_id: Optional[int], current_user: User) -> None:
    """La sede de un producto debe ser del tenant y de la sede fija del usuario."""
    if not location_id:
        return
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    if current_user.tenant_id and location.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="La sede no pertenece a este cliente")
    require_own_location(current_user, location_id)


@router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    """Upload an image (for products, locations, etc.) and return its public URL."""
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail="Tipo de archivo no permitido. Use PNG, JPG o WEBP."
        )

    contents = await file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo no debe superar 5MB")

    os.makedirs(IMAGE_UPLOAD_DIR, exist_ok=True)
    ext = file.filename.split(".")[-1] if file.filename and "." in file.filename else "png"
    filename = f"img_{uuid.uuid4().hex[:12]}.{ext}"
    filepath = os.path.join(IMAGE_UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    return {"url": f"/uploads/images/{filename}"}


@router.get("/groups", response_model=List[GroupResponse])
async def get_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_module("inventory"))
):
    query = db.query(Group).filter(Group.is_active == True)
    if current_user.tenant_id:
        query = query.filter((Group.tenant_id == current_user.tenant_id) | (Group.tenant_id == None))
    return query.all()


@router.post("/groups", response_model=GroupResponse)
async def create_group(
    group: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN)),
    _module_check: User = Depends(require_module("inventory"))
):
    existing = db.query(Group).filter(Group.name == group.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un grupo con ese nombre")
    
    db_group = Group(**group.model_dump())
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group


@router.put("/groups/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: int,
    data: GroupUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN)),
    _module_check: User = Depends(require_module("inventory"))
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(group, field, value)
    db.commit()
    db.refresh(group)
    return group


@router.get("/families", response_model=List[FamilyResponse])
async def get_families(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_module("inventory"))
):
    query = db.query(Family).filter(Family.is_active == True)
    if current_user.tenant_id:
        query = query.filter((Family.tenant_id == current_user.tenant_id) | (Family.tenant_id == None))
    if group_id:
        query = query.filter(Family.group_id == group_id)
    return query.all()


@router.post("/families", response_model=FamilyResponse)
async def create_family(
    family: FamilyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN)),
    _module_check: User = Depends(require_module("inventory"))
):
    group = db.query(Group).filter(Group.id == family.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    db_family = Family(**family.model_dump())
    db.add(db_family)
    db.commit()
    db.refresh(db_family)
    return db_family


@router.put("/families/{family_id}", response_model=FamilyResponse)
async def update_family(
    family_id: int,
    data: FamilyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN)),
    _module_check: User = Depends(require_module("inventory"))
):
    family = db.query(Family).filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Familia no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(family, field, value)
    db.commit()
    db.refresh(family)
    return family


@router.get("/subfamilies", response_model=List[SubFamilyResponse])
async def get_subfamilies(
    family_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_module("inventory"))
):
    query = db.query(SubFamily).filter(SubFamily.is_active == True)
    if current_user.tenant_id:
        query = query.filter((SubFamily.tenant_id == current_user.tenant_id) | (SubFamily.tenant_id == None))
    if family_id:
        query = query.filter(SubFamily.family_id == family_id)
    return query.all()


@router.post("/subfamilies", response_model=SubFamilyResponse)
async def create_subfamily(
    subfamily: SubFamilyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN)),
    _module_check: User = Depends(require_module("inventory"))
):
    family = db.query(Family).filter(Family.id == subfamily.family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Familia no encontrada")
    
    db_subfamily = SubFamily(**subfamily.model_dump())
    db.add(db_subfamily)
    db.commit()
    db.refresh(db_subfamily)
    return db_subfamily


@router.put("/subfamilies/{subfamily_id}", response_model=SubFamilyResponse)
async def update_subfamily(
    subfamily_id: int,
    data: SubFamilyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN)),
    _module_check: User = Depends(require_module("inventory"))
):
    subfamily = db.query(SubFamily).filter(SubFamily.id == subfamily_id).first()
    if not subfamily:
        raise HTTPException(status_code=404, detail="SubFamilia no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(subfamily, field, value)
    db.commit()
    db.refresh(subfamily)
    return subfamily


@router.get("/products", response_model=List[ProductResponse])
async def get_products(
    subfamily_id: Optional[int] = None,
    location_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_module("inventory"))
):
    query = db.query(Product).filter(Product.is_active == True)
    if current_user.tenant_id:
        query = query.filter((Product.tenant_id == current_user.tenant_id) | (Product.tenant_id == None))

    # Un usuario con sede fija siempre ve la carta de su sede
    location_id = scoped_location_id(current_user, location_id)

    if subfamily_id:
        query = query.filter(Product.subfamily_id == subfamily_id)
    
    if location_id:
        # Carta por sede: una sede con carta propia solo muestra sus productos,
        # el resto tambien muestra los productos sin sede asignada
        location = db.query(Location).filter(Location.id == location_id).first()
        if location and location.has_own_menu:
            query = query.filter(Product.location_id == location_id)
        else:
            query = query.filter((Product.location_id == location_id) | (Product.location_id == None))
    
    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%")) |
            (Product.code.ilike(f"%{search}%")) |
            (Product.barcode.ilike(f"%{search}%"))
        )
    
    products = query.offset(skip).limit(limit).all()
    
    result = []
    for product in products:
        stocks = []
        if location_id:
            stock = db.query(ProductStock).filter(
                ProductStock.product_id == product.id,
                ProductStock.location_id == location_id
            ).first()
            if stock:
                location = db.query(Location).filter(Location.id == location_id).first()
                stocks.append(ProductStockResponse(
                    location_id=stock.location_id,
                    location_name=location.name if location else "",
                    quantity=stock.quantity,
                    last_inventory_date=stock.last_inventory_date
                ))
        else:
            for stock in product.stocks:
                location = db.query(Location).filter(Location.id == stock.location_id).first()
                stocks.append(ProductStockResponse(
                    location_id=stock.location_id,
                    location_name=location.name if location else "",
                    quantity=stock.quantity,
                    last_inventory_date=stock.last_inventory_date
                ))
        
        mods = [ModifierResponse(id=m.id, name=m.name, price_adjustment=m.price_adjustment, is_active=m.is_active, display_order=m.display_order) for m in (product.modifiers or []) if m.is_active]
        result.append(_serialize_product(db, product, stocks, mods))
    
    return result


@router.post("/products", response_model=ProductResponse)
async def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN)),
    _module_check: User = Depends(require_module("inventory"))
):
    existing = db.query(Product).filter(Product.code == product.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un producto con ese codigo")
    
    if product.barcode:
        existing_barcode = db.query(Product).filter(Product.barcode == product.barcode).first()
        if existing_barcode:
            raise HTTPException(status_code=400, detail="Ya existe un producto con ese codigo de barras")
    
    subfamily = db.query(SubFamily).filter(SubFamily.id == product.subfamily_id).first()
    if not subfamily:
        raise HTTPException(status_code=404, detail="Subfamilia no encontrada")
    
    _validate_product_location(db, product.location_id, current_user)

    product_data = product.model_dump()
    product_data["location_id"] = scoped_location_id(current_user, product.location_id)
    db_product = Product(**product_data, tenant_id=current_user.tenant_id)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    
    stock_query = db.query(Location)
    if db_product.location_id:
        stock_query = stock_query.filter(Location.id == db_product.location_id)
    elif current_user.tenant_id:
        stock_query = stock_query.filter(Location.tenant_id == current_user.tenant_id)
    locations = stock_query.all()
    for location in locations:
        stock = ProductStock(
            product_id=db_product.id,
            location_id=location.id,
            quantity=0
        )
        db.add(stock)
    db.commit()
    
    return _serialize_product(db, db_product, [], [])


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_module("inventory"))
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    require_own_location(current_user, product.location_id)
    
    stocks = []
    for stock in product.stocks:
        location = db.query(Location).filter(Location.id == stock.location_id).first()
        stocks.append(ProductStockResponse(
            location_id=stock.location_id,
            location_name=location.name if location else "",
            quantity=stock.quantity,
            last_inventory_date=stock.last_inventory_date
        ))
    
    mods = [ModifierResponse(id=m.id, name=m.name, price_adjustment=m.price_adjustment, is_active=m.is_active, display_order=m.display_order) for m in (product.modifiers or [])]
    return _serialize_product(db, product, stocks, mods)


@router.put("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_update: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN)),
    _module_check: User = Depends(require_module("inventory"))
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    require_own_location(current_user, product.location_id)
    
    update_data = product_update.model_dump(exclude_unset=True)
    
    if "min_stock" in update_data or "max_stock" in update_data:
        if current_user.role.role_type != RoleType.SUPERUSER:
            raise HTTPException(
                status_code=403,
                detail="Solo el superusuario puede modificar los umbrales de stock"
            )
    
    if "location_id" in update_data:
        _validate_product_location(db, update_data["location_id"], current_user)
    
    for field, value in update_data.items():
        setattr(product, field, value)
    
    db.commit()
    db.refresh(product)
    
    if product.location_id:
        existing_stock = db.query(ProductStock).filter(
            ProductStock.product_id == product.id,
            ProductStock.location_id == product.location_id
        ).first()
        if not existing_stock:
            db.add(ProductStock(product_id=product.id, location_id=product.location_id, quantity=0))
            db.commit()
    
    return _serialize_product(db, product, [], [])


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER)),
    _module_check: User = Depends(require_module("inventory"))
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    require_own_location(current_user, product.location_id)

    has_sales = db.query(SaleItem).filter(SaleItem.product_id == product_id).first()
    has_tickets = db.query(TicketItem).filter(TicketItem.product_id == product_id).first()
    has_transfers = db.query(TransferItem).filter(TransferItem.product_id == product_id).first()
    has_losses = db.query(LossItem).filter(LossItem.product_id == product_id).first()
    if has_sales or has_tickets or has_transfers or has_losses:
        product.is_active = False
        db.commit()
        return {"message": "Producto desactivado (tiene registros en ventas/mesas/traspasos)"}
    db.query(ProductStock).filter(ProductStock.product_id == product_id).delete()
    db.query(StockMovement).filter(StockMovement.product_id == product_id).delete()
    db.delete(product)
    db.commit()
    return {"message": "Producto eliminado"}


@router.delete("/families/{family_id}")
async def delete_family(
    family_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER)),
    _module_check: User = Depends(require_module("inventory"))
):
    family = db.query(Family).filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(status_code=404, detail="Familia no encontrada")
    subfamilies = db.query(SubFamily).filter(SubFamily.family_id == family_id).all()
    for sf in subfamilies:
        products = db.query(Product).filter(Product.subfamily_id == sf.id).all()
        if products:
            raise HTTPException(status_code=400, detail=f"No se puede eliminar: la subfamilia '{sf.name}' tiene productos asociados")
    for sf in subfamilies:
        db.delete(sf)
    db.delete(family)
    db.commit()
    return {"message": "Familia eliminada"}


@router.delete("/subfamilies/{subfamily_id}")
async def delete_subfamily(
    subfamily_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER)),
    _module_check: User = Depends(require_module("inventory"))
):
    subfamily = db.query(SubFamily).filter(SubFamily.id == subfamily_id).first()
    if not subfamily:
        raise HTTPException(status_code=404, detail="Subfamilia no encontrada")
    products = db.query(Product).filter(Product.subfamily_id == subfamily_id).all()
    if products:
        raise HTTPException(status_code=400, detail="No se puede eliminar: tiene productos asociados")
    db.delete(subfamily)
    db.commit()
    return {"message": "Subfamilia eliminada"}


@router.delete("/groups/{group_id}")
async def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER)),
    _module_check: User = Depends(require_module("inventory"))
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    families = db.query(Family).filter(Family.group_id == group_id).all()
    if families:
        raise HTTPException(status_code=400, detail="No se puede eliminar: tiene familias asociadas")
    db.delete(group)
    db.commit()
    return {"message": "Grupo eliminado"}


@router.post("/purchase")
async def register_purchase(
    purchase: PurchaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN)),
    _module_check: User = Depends(require_module("inventory"))
):
    product = db.query(Product).filter(Product.id == purchase.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    purchase_location_id = scoped_location_id(current_user, purchase.location_id)
    location = db.query(Location).filter(Location.id == purchase_location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Ubicacion no encontrada")
    
    stock = db.query(ProductStock).filter(
        ProductStock.product_id == purchase.product_id,
        ProductStock.location_id == purchase_location_id
    ).first()
    
    if not stock:
        stock = ProductStock(
            product_id=purchase.product_id,
            location_id=purchase_location_id,
            quantity=0
        )
        db.add(stock)
    
    current_quantity = stock.quantity
    current_cost = product.weighted_cost
    new_quantity = purchase.quantity
    new_cost = purchase.unit_cost
    
    total_quantity = current_quantity + new_quantity
    if total_quantity > 0:
        weighted_cost = ((current_quantity * current_cost) + (new_quantity * new_cost)) / total_quantity
        product.weighted_cost = weighted_cost
    
    stock.quantity += purchase.quantity
    
    movement = StockMovement(
        product_id=purchase.product_id,
        location_id=purchase_location_id,
        movement_type=MovementType.PURCHASE,
        quantity=purchase.quantity,
        unit_cost=purchase.unit_cost,
        notes=purchase.notes,
        created_by_id=current_user.id
    )
    db.add(movement)
    
    db.commit()
    
    return {
        "message": "Compra registrada exitosamente",
        "new_stock": stock.quantity,
        "weighted_cost": product.weighted_cost
    }


@router.post("/adjustment")
async def adjust_stock(
    adjustment: StockAdjustment,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN)),
    _module_check: User = Depends(require_module("inventory"))
):
    product = db.query(Product).filter(Product.id == adjustment.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    adjustment_location_id = scoped_location_id(current_user, adjustment.location_id)
    stock = db.query(ProductStock).filter(
        ProductStock.product_id == adjustment.product_id,
        ProductStock.location_id == adjustment_location_id
    ).first()
    
    if not stock:
        stock = ProductStock(
            product_id=adjustment.product_id,
            location_id=adjustment_location_id,
            quantity=0
        )
        db.add(stock)
    
    old_quantity = stock.quantity
    stock.quantity = adjustment.quantity
    
    movement = StockMovement(
        product_id=adjustment.product_id,
        location_id=adjustment_location_id,
        movement_type=MovementType.ADJUSTMENT,
        quantity=adjustment.quantity - old_quantity,
        notes=adjustment.notes,
        created_by_id=current_user.id
    )
    db.add(movement)
    
    db.commit()
    
    return {
        "message": "Stock ajustado exitosamente",
        "old_quantity": old_quantity,
        "new_quantity": stock.quantity
    }


@router.post("/blind-inventory")
async def blind_inventory(
    location_id: int,
    items: List[StockAdjustment],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_module("inventory"))
):
    from datetime import datetime
    from app.timezone import now_colombia

    location_id = scoped_location_id(current_user, location_id)
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Ubicacion no encontrada")
    
    results = []
    for item in items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            continue
        
        stock = db.query(ProductStock).filter(
            ProductStock.product_id == item.product_id,
            ProductStock.location_id == location_id
        ).first()
        
        if not stock:
            stock = ProductStock(
                product_id=item.product_id,
                location_id=location_id,
                quantity=0
            )
            db.add(stock)
        
        old_quantity = stock.quantity
        stock.quantity = item.quantity
        stock.last_inventory_date = now_colombia()
        
        movement = StockMovement(
            product_id=item.product_id,
            location_id=location_id,
            movement_type=MovementType.INVENTORY,
            quantity=item.quantity - old_quantity,
            notes=f"Inventario ciego - {item.notes or ''}",
            created_by_id=current_user.id
        )
        db.add(movement)
        
        results.append({
            "product_id": item.product_id,
            "product_name": product.name,
            "old_quantity": old_quantity,
            "new_quantity": item.quantity,
            "difference": item.quantity - old_quantity
        })
    
    db.commit()
    
    return {
        "message": "Inventario ciego completado",
        "results": results
    }


@router.get("/stock-alerts")
async def get_stock_alerts(
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN)),
    _module_check: User = Depends(require_module("inventory"))
):
    location_id = scoped_location_id(current_user, location_id)
    query = db.query(ProductStock).join(Product)
    
    if location_id:
        query = query.filter(ProductStock.location_id == location_id)
    
    stocks = query.all()
    
    alerts = []
    for stock in stocks:
        product = stock.product
        location = db.query(Location).filter(Location.id == stock.location_id).first()
        
        if stock.quantity <= product.min_stock:
            alerts.append({
                "type": "low_stock",
                "product_id": product.id,
                "product_name": product.name,
                "product_code": product.code,
                "location_id": stock.location_id,
                "location_name": location.name if location else "",
                "current_stock": stock.quantity,
                "min_stock": product.min_stock,
                "message": f"Stock bajo: {product.name} en {location.name if location else 'N/A'}"
            })
        elif stock.quantity >= product.max_stock:
            alerts.append({
                "type": "high_stock",
                "product_id": product.id,
                "product_name": product.name,
                "product_code": product.code,
                "location_id": stock.location_id,
                "location_name": location.name if location else "",
                "current_stock": stock.quantity,
                "max_stock": product.max_stock,
                "message": f"Stock alto: {product.name} en {location.name if location else 'N/A'}"
            })
    
    return alerts


@router.post("/bulk-import")
async def bulk_import_products(
    data: BulkProductImport,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "superuser"))
):
    """Bulk import products for a specific tenant. Creates groups, families, subfamilies, and products."""
    tenant_id = data.tenant_id
    
    # Create or get the group for this tenant
    group = db.query(Group).filter(
        Group.name == data.group_name,
        Group.tenant_id == tenant_id
    ).first()
    if not group:
        group = Group(name=data.group_name, tenant_id=tenant_id, description=f"Grupo principal para tenant {tenant_id}")
        db.add(group)
        db.flush()
    
    created_count = 0
    skipped_count = 0
    
    # Group products by category
    categories: dict = {}
    for p in data.products:
        cat = p.get("category", "General")
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(p)
    
    for cat_name, cat_products in categories.items():
        icon = cat_products[0].get("icon") if cat_products else None
        
        # Create or get family for this category
        family = db.query(Family).filter(
            Family.name == cat_name,
            Family.tenant_id == tenant_id,
            Family.group_id == group.id
        ).first()
        if not family:
            family = Family(
                name=cat_name,
                group_id=group.id,
                tenant_id=tenant_id,
                icon=icon,
                description=f"Categoría: {cat_name}"
            )
            db.add(family)
            db.flush()
        
        # Create or get subfamily (same name as family for simplicity)
        subfamily = db.query(SubFamily).filter(
            SubFamily.name == cat_name,
            SubFamily.tenant_id == tenant_id,
            SubFamily.family_id == family.id
        ).first()
        if not subfamily:
            subfamily = SubFamily(
                name=cat_name,
                family_id=family.id,
                tenant_id=tenant_id,
                description=f"Sub-categoría: {cat_name}"
            )
            db.add(subfamily)
            db.flush()
        
        for prod in cat_products:
            # Check if product already exists for this tenant
            existing = db.query(Product).filter(
                Product.name == prod["name"],
                Product.tenant_id == tenant_id
            ).first()
            if existing:
                skipped_count += 1
                continue
            
            # Generate product code
            code_prefix = cat_name[:3].upper()
            count = db.query(Product).filter(Product.tenant_id == tenant_id).count()
            code = f"{code_prefix}-{count + 1:04d}"
            
            product = Product(
                code=code,
                name=prod["name"],
                description=prod.get("description", ""),
                subfamily_id=subfamily.id,
                tenant_id=tenant_id,
                sale_price=prod.get("price", 0),
                unit=prod.get("unit", "unidad"),
                is_active=True
            )
            db.add(product)
            created_count += 1
    
    db.commit()
    
    return {
        "message": f"Import completed: {created_count} products created, {skipped_count} skipped (already exist)",
        "created": created_count,
        "skipped": skipped_count,
        "tenant_id": tenant_id
    }


# --- Product Modifiers ---

@router.get("/products/{product_id}/modifiers", response_model=List[ModifierResponse])
async def get_product_modifiers(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    modifiers = db.query(ProductModifier).filter(
        ProductModifier.product_id == product_id
    ).order_by(ProductModifier.display_order).all()
    return modifiers


@router.post("/products/{product_id}/modifiers", response_model=ModifierResponse)
async def create_product_modifier(
    product_id: int,
    data: ModifierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    modifier = ProductModifier(
        product_id=product_id,
        tenant_id=current_user.tenant_id,
        name=data.name,
        price_adjustment=data.price_adjustment,
        display_order=data.display_order
    )
    db.add(modifier)
    db.commit()
    db.refresh(modifier)
    return modifier


@router.put("/products/modifiers/{modifier_id}", response_model=ModifierResponse)
async def update_product_modifier(
    modifier_id: int,
    data: ModifierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    modifier = db.query(ProductModifier).filter(ProductModifier.id == modifier_id).first()
    if not modifier:
        raise HTTPException(status_code=404, detail="Modificador no encontrado")
    if data.name is not None:
        modifier.name = data.name
    if data.price_adjustment is not None:
        modifier.price_adjustment = data.price_adjustment
    if data.is_active is not None:
        modifier.is_active = data.is_active
    if data.display_order is not None:
        modifier.display_order = data.display_order
    db.commit()
    db.refresh(modifier)
    return modifier


@router.delete("/products/modifiers/{modifier_id}")
async def delete_product_modifier(
    modifier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    modifier = db.query(ProductModifier).filter(ProductModifier.id == modifier_id).first()
    if not modifier:
        raise HTTPException(status_code=404, detail="Modificador no encontrado")
    db.delete(modifier)
    db.commit()
    return {"message": "Modificador eliminado"}
