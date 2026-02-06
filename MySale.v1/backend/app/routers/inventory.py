from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User, RoleType
from app.models.inventory import Group, Family, SubFamily, Product, ProductStock, StockMovement, MovementType
from app.models.location import Location
from app.schemas.inventory import (
    GroupCreate, GroupResponse,
    FamilyCreate, FamilyResponse,
    SubFamilyCreate, SubFamilyResponse,
    ProductCreate, ProductUpdate, ProductResponse, ProductStockResponse,
    StockAdjustment, PurchaseCreate
)
from app.utils.auth import get_current_user, require_role, get_current_tenant
from app.models.tenant import Tenant

router = APIRouter(prefix="/api/inventory", tags=["Inventario"])


@router.get("/groups", response_model=List[GroupResponse])
async def get_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Group).filter(Group.is_active == True)
    if current_user.tenant_id:
        query = query.filter(Group.tenant_id == current_user.tenant_id)
    return query.all()


@router.post("/groups", response_model=GroupResponse)
async def create_group(
    group: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    query = db.query(Group).filter(Group.name == group.name)
    if current_user.tenant_id:
        query = query.filter(Group.tenant_id == current_user.tenant_id)
    existing = query.first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un grupo con ese nombre")
    
    db_group = Group(**group.model_dump(), tenant_id=current_user.tenant_id)
    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    return db_group


@router.get("/families", response_model=List[FamilyResponse])
async def get_families(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Family).filter(Family.is_active == True)
    if current_user.tenant_id:
        query = query.filter(Family.tenant_id == current_user.tenant_id)
    if group_id:
        query = query.filter(Family.group_id == group_id)
    return query.all()


@router.post("/families", response_model=FamilyResponse)
async def create_family(
    family: FamilyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    query = db.query(Group).filter(Group.id == family.group_id)
    if current_user.tenant_id:
        query = query.filter(Group.tenant_id == current_user.tenant_id)
    group = query.first()
    if not group:
        raise HTTPException(status_code=404, detail="Grupo no encontrado")
    
    db_family = Family(**family.model_dump(), tenant_id=current_user.tenant_id)
    db.add(db_family)
    db.commit()
    db.refresh(db_family)
    return db_family


@router.get("/subfamilies", response_model=List[SubFamilyResponse])
async def get_subfamilies(
    family_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(SubFamily).filter(SubFamily.is_active == True)
    if current_user.tenant_id:
        query = query.filter(SubFamily.tenant_id == current_user.tenant_id)
    if family_id:
        query = query.filter(SubFamily.family_id == family_id)
    return query.all()


@router.post("/subfamilies", response_model=SubFamilyResponse)
async def create_subfamily(
    subfamily: SubFamilyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    query = db.query(Family).filter(Family.id == subfamily.family_id)
    if current_user.tenant_id:
        query = query.filter(Family.tenant_id == current_user.tenant_id)
    family = query.first()
    if not family:
        raise HTTPException(status_code=404, detail="Familia no encontrada")
    
    db_subfamily = SubFamily(**subfamily.model_dump(), tenant_id=current_user.tenant_id)
    db.add(db_subfamily)
    db.commit()
    db.refresh(db_subfamily)
    return db_subfamily


@router.get("/products/next-code")
async def get_next_product_code(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Product)
    if current_user.tenant_id:
        query = query.filter(Product.tenant_id == current_user.tenant_id)
    count = query.count()
    next_number = count + 1
    return {"code": f"PROD{next_number:04d}"}


@router.get("/products", response_model=List[ProductResponse])
async def get_products(
    subfamily_id: Optional[int] = None,
    location_id: Optional[int] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Product).filter(Product.is_active == True)
    if current_user.tenant_id:
        query = query.filter(Product.tenant_id == current_user.tenant_id)
    
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
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    code_query = db.query(Product).filter(Product.code == product.code)
    if current_user.tenant_id:
        code_query = code_query.filter(Product.tenant_id == current_user.tenant_id)
    existing = code_query.first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un producto con ese codigo")
    
    if product.barcode:
        barcode_query = db.query(Product).filter(Product.barcode == product.barcode)
        if current_user.tenant_id:
            barcode_query = barcode_query.filter(Product.tenant_id == current_user.tenant_id)
        existing_barcode = barcode_query.first()
        if existing_barcode:
            raise HTTPException(status_code=400, detail="Ya existe un producto con ese codigo de barras")
    
    if product.subfamily_id:
        subfamily_query = db.query(SubFamily).filter(SubFamily.id == product.subfamily_id)
        if current_user.tenant_id:
            subfamily_query = subfamily_query.filter(SubFamily.tenant_id == current_user.tenant_id)
        subfamily = subfamily_query.first()
        if not subfamily:
            raise HTTPException(status_code=404, detail="Subfamilia no encontrada")
    
    db_product = Product(**product.model_dump(), tenant_id=current_user.tenant_id)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    
    loc_query = db.query(Location)
    if current_user.tenant_id:
        loc_query = loc_query.filter(Location.tenant_id == current_user.tenant_id)
    locations = loc_query.all()
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
    current_user: User = Depends(get_current_user)
):
    query = db.query(Product).filter(Product.id == product_id)
    if current_user.tenant_id:
        query = query.filter(Product.tenant_id == current_user.tenant_id)
    product = query.first()
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
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    query = db.query(Product).filter(Product.id == product_id)
    if current_user.tenant_id:
        query = query.filter(Product.tenant_id == current_user.tenant_id)
    product = query.first()
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


@router.post("/purchase")
async def register_purchase(
    purchase: PurchaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    prod_query = db.query(Product).filter(Product.id == purchase.product_id)
    if current_user.tenant_id:
        prod_query = prod_query.filter(Product.tenant_id == current_user.tenant_id)
    product = prod_query.first()
    if not product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    
    loc_query = db.query(Location).filter(Location.id == purchase.location_id)
    if current_user.tenant_id:
        loc_query = loc_query.filter(Location.tenant_id == current_user.tenant_id)
    location = loc_query.first()
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
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    prod_query = db.query(Product).filter(Product.id == adjustment.product_id)
    if current_user.tenant_id:
        prod_query = prod_query.filter(Product.tenant_id == current_user.tenant_id)
    product = prod_query.first()
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
    current_user: User = Depends(get_current_user)
):
    from datetime import datetime
    
    loc_query = db.query(Location).filter(Location.id == location_id)
    if current_user.tenant_id:
        loc_query = loc_query.filter(Location.tenant_id == current_user.tenant_id)
    location = loc_query.first()
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
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    query = db.query(ProductStock).join(Product)
    if current_user.tenant_id:
        query = query.filter(Product.tenant_id == current_user.tenant_id)
    
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
