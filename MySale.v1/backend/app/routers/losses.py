from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from app.database import get_db
from app.models.user import User, RoleType
from app.models.loss import Loss, LossItem, LossType
from app.models.inventory import Product, ProductStock, StockMovement, MovementType
from app.models.location import Location
from app.schemas.loss import LossCreate, LossResponse, LossItemResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/losses", tags=["Mermas y Roturas"])


@router.get("/", response_model=List[LossResponse])
async def get_losses(
    location_id: Optional[int] = None,
    loss_type: Optional[LossType] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Loss)
    
    if location_id:
        query = query.filter(Loss.location_id == location_id)
    if loss_type:
        query = query.filter(Loss.loss_type == loss_type)
    if start_date:
        query = query.filter(Loss.created_at >= datetime.combine(start_date, datetime.min.time()))
    if end_date:
        query = query.filter(Loss.created_at <= datetime.combine(end_date, datetime.max.time()))
    
    losses = query.order_by(Loss.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for loss in losses:
        location = db.query(Location).filter(Location.id == loss.location_id).first()
        user = db.query(User).filter(User.id == loss.reported_by).first()
        
        items = []
        for item in loss.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            items.append(LossItemResponse(
                id=item.id,
                product_id=item.product_id,
                product_name=product.name if product else None,
                quantity=item.quantity,
                unit_cost=item.unit_cost,
                total_cost=item.total_cost,
                reason=item.reason
            ))
        
        result.append(LossResponse(
            id=loss.id,
            location_id=loss.location_id,
            location_name=location.name if location else None,
            reported_by=loss.reported_by,
            reported_by_name=user.full_name if user else None,
            loss_type=loss.loss_type,
            total_value=loss.total_value,
            description=loss.description,
            created_at=loss.created_at,
            items=items
        ))
    
    return result


@router.post("/", response_model=LossResponse)
async def create_loss(
    loss_data: LossCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    location = db.query(Location).filter(Location.id == loss_data.location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Ubicacion no encontrada")
    
    total_value = 0.0
    loss_items = []
    
    for item_data in loss_data.items:
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Producto {item_data.product_id} no encontrado"
            )
        
        stock = db.query(ProductStock).filter(
            ProductStock.product_id == item_data.product_id,
            ProductStock.location_id == loss_data.location_id
        ).first()
        
        if not stock or stock.quantity < item_data.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para {product.name}"
            )
        
        item_cost = product.weighted_cost * item_data.quantity
        total_value += item_cost
        
        loss_items.append({
            "product": product,
            "stock": stock,
            "quantity": item_data.quantity,
            "unit_cost": product.weighted_cost,
            "total_cost": item_cost,
            "reason": item_data.reason
        })
    
    loss = Loss(
        location_id=loss_data.location_id,
        reported_by=current_user.id,
        loss_type=loss_data.loss_type,
        total_value=total_value,
        description=loss_data.description
    )
    db.add(loss)
    db.flush()
    
    for item_info in loss_items:
        loss_item = LossItem(
            loss_id=loss.id,
            product_id=item_info["product"].id,
            quantity=item_info["quantity"],
            unit_cost=item_info["unit_cost"],
            total_cost=item_info["total_cost"],
            reason=item_info["reason"]
        )
        db.add(loss_item)
        
        item_info["stock"].quantity -= item_info["quantity"]
        
        movement = StockMovement(
            product_id=item_info["product"].id,
            location_id=loss_data.location_id,
            movement_type=MovementType.LOSS,
            quantity=-item_info["quantity"],
            reference_id=loss.id,
            reference_type="loss",
            notes=f"Merma: {loss_data.loss_type.value} - {item_info['reason'] or ''}",
            created_by_id=current_user.id
        )
        db.add(movement)
    
    db.commit()
    db.refresh(loss)
    
    items_response = []
    for item in loss.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        items_response.append(LossItemResponse(
            id=item.id,
            product_id=item.product_id,
            product_name=product.name if product else None,
            quantity=item.quantity,
            unit_cost=item.unit_cost,
            total_cost=item.total_cost,
            reason=item.reason
        ))
    
    return LossResponse(
        id=loss.id,
        location_id=loss.location_id,
        location_name=location.name,
        reported_by=loss.reported_by,
        reported_by_name=current_user.full_name,
        loss_type=loss.loss_type,
        total_value=loss.total_value,
        description=loss.description,
        created_at=loss.created_at,
        items=items_response
    )


@router.get("/{loss_id}", response_model=LossResponse)
async def get_loss(
    loss_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    loss = db.query(Loss).filter(Loss.id == loss_id).first()
    if not loss:
        raise HTTPException(status_code=404, detail="Merma no encontrada")
    
    location = db.query(Location).filter(Location.id == loss.location_id).first()
    user = db.query(User).filter(User.id == loss.reported_by).first()
    
    items = []
    for item in loss.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        items.append(LossItemResponse(
            id=item.id,
            product_id=item.product_id,
            product_name=product.name if product else None,
            quantity=item.quantity,
            unit_cost=item.unit_cost,
            total_cost=item.total_cost,
            reason=item.reason
        ))
    
    return LossResponse(
        id=loss.id,
        location_id=loss.location_id,
        location_name=location.name if location else None,
        reported_by=loss.reported_by,
        reported_by_name=user.full_name if user else None,
        loss_type=loss.loss_type,
        total_value=loss.total_value,
        description=loss.description,
        created_at=loss.created_at,
        items=items
    )
