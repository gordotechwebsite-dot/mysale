from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User, RoleType
from app.models.inventory import Group, Family, SubFamily, Product, ProductStock, StockMovement, MovementType
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
    StockAdjustment, PurchaseCreate, BulkProductImport
)
from app.utils.auth import get_current_user, require_role, require_module

router = APIRouter(prefix="/api/inventory", tags=["Inventario"])


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
    
    if subfamily_id:
        query = query.filter(Product.subfamily_id == subfamily_id)
    
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
        
        result.append(ProductResponse(
            id=product.id,
            code=product.code,
            barcode=product.barcode,
            name=product.name,
            description=product.description,
            subfamily_id=product.subfamily_id,
            unit=product.unit,
            sale_price=product.sale_price,
            weighted_cost=product.weighted_cost,
            min_stock=product.min_stock,
            max_stock=product.max_stock,
            is_active=product.is_active,
            created_at=product.created_at,
            stocks=stocks
        ))
    
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
    
    db_product = Product(**product.model_dump())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    
    locations = db.query(Location).all()
    for location in locations:
        stock = ProductStock(
            product_id=db_product.id,
            location_id=location.id,
            quantity=0
        )
        db.add(stock)
    db.commit()
    
    return ProductResponse(
        id=db_product.id,
        code=db_product.code,
        barcode=db_product.barcode,
        name=db_product.name,
        description=db_product.description,
        subfamily_id=db_product.subfamily_id,
        unit=db_product.unit,
        sale_price=db_product.sale_price,
        weighted_cost=db_product.weighted_cost,
        min_stock=db_product.min_stock,
        max_stock=db_product.max_stock,
        is_active=db_product.is_active,
        created_at=db_product.created_at,
        stocks=[]
    )


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_module("inventory"))
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    stocks = []
    for stock in product.stocks:
        location = db.query(Location).filter(Location.id == stock.location_id).first()
        stocks.append(ProductStockResponse(
            location_id=stock.location_id,
            location_name=location.name if location else "",
            quantity=stock.quantity,
            last_inventory_date=stock.last_inventory_date
        ))
    
    return ProductResponse(
        id=product.id,
        code=product.code,
        barcode=product.barcode,
        name=product.name,
        description=product.description,
        subfamily_id=product.subfamily_id,
        unit=product.unit,
        sale_price=product.sale_price,
        weighted_cost=product.weighted_cost,
        min_stock=product.min_stock,
        max_stock=product.max_stock,
        is_active=product.is_active,
        created_at=product.created_at,
        stocks=stocks
    )


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
    
    update_data = product_update.model_dump(exclude_unset=True)
    
    if "min_stock" in update_data or "max_stock" in update_data:
        if current_user.role.role_type != RoleType.SUPERUSER:
            raise HTTPException(
                status_code=403,
                detail="Solo el superusuario puede modificar los umbrales de stock"
            )
    
    for field, value in update_data.items():
        setattr(product, field, value)
    
    db.commit()
    db.refresh(product)
    
    return ProductResponse(
        id=product.id,
        code=product.code,
        barcode=product.barcode,
        name=product.name,
        description=product.description,
        subfamily_id=product.subfamily_id,
        unit=product.unit,
        sale_price=product.sale_price,
        weighted_cost=product.weighted_cost,
        min_stock=product.min_stock,
        max_stock=product.max_stock,
        is_active=product.is_active,
        created_at=product.created_at,
        stocks=[]
    )


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
    
    location = db.query(Location).filter(Location.id == purchase.location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Ubicacion no encontrada")
    
    stock = db.query(ProductStock).filter(
        ProductStock.product_id == purchase.product_id,
        ProductStock.location_id == purchase.location_id
    ).first()
    
    if not stock:
        stock = ProductStock(
            product_id=purchase.product_id,
            location_id=purchase.location_id,
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
        location_id=purchase.location_id,
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
    
    stock = db.query(ProductStock).filter(
        ProductStock.product_id == adjustment.product_id,
        ProductStock.location_id == adjustment.location_id
    ).first()
    
    if not stock:
        stock = ProductStock(
            product_id=adjustment.product_id,
            location_id=adjustment.location_id,
            quantity=0
        )
        db.add(stock)
    
    old_quantity = stock.quantity
    stock.quantity = adjustment.quantity
    
    movement = StockMovement(
        product_id=adjustment.product_id,
        location_id=adjustment.location_id,
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
        stock.last_inventory_date = datetime.utcnow()
        
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
