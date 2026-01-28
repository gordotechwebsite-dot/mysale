from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.database import get_db
from app.models.user import User, RoleType
from app.models.transfer import Transfer, TransferItem, TransferStatus
from app.models.inventory import Product, ProductStock, StockMovement, MovementType
from app.models.location import Location
from app.schemas.transfer import TransferCreate, TransferResponse, TransferItemResponse, TransferReceive
from app.utils.auth import get_current_user, require_role

router = APIRouter(prefix="/api/transfers", tags=["Transferencias"])


@router.get("/", response_model=List[TransferResponse])
async def get_transfers(
    from_location_id: Optional[int] = None,
    to_location_id: Optional[int] = None,
    status: Optional[TransferStatus] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Transfer)
    
    if from_location_id:
        query = query.filter(Transfer.from_location_id == from_location_id)
    if to_location_id:
        query = query.filter(Transfer.to_location_id == to_location_id)
    if status:
        query = query.filter(Transfer.status == status)
    
    transfers = query.order_by(Transfer.created_at.desc()).offset(skip).limit(limit).all()
    
    result = []
    for transfer in transfers:
        from_loc = db.query(Location).filter(Location.id == transfer.from_location_id).first()
        to_loc = db.query(Location).filter(Location.id == transfer.to_location_id).first()
        created_by = db.query(User).filter(User.id == transfer.created_by_id).first()
        received_by = db.query(User).filter(User.id == transfer.received_by_id).first() if transfer.received_by_id else None
        
        items = []
        for item in transfer.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            items.append(TransferItemResponse(
                id=item.id,
                product_id=item.product_id,
                product_name=product.name if product else None,
                quantity=item.quantity,
                sale_price=item.sale_price,
                total_value=item.total_value
            ))
        
        result.append(TransferResponse(
            id=transfer.id,
            from_location_id=transfer.from_location_id,
            from_location_name=from_loc.name if from_loc else None,
            to_location_id=transfer.to_location_id,
            to_location_name=to_loc.name if to_loc else None,
            created_by_id=transfer.created_by_id,
            created_by_name=created_by.full_name if created_by else None,
            received_by_id=transfer.received_by_id,
            received_by_name=received_by.full_name if received_by else None,
            status=transfer.status,
            total_value_at_sale_price=transfer.total_value_at_sale_price,
            notes=transfer.notes,
            created_at=transfer.created_at,
            completed_at=transfer.completed_at,
            items=items
        ))
    
    return result


@router.post("/", response_model=TransferResponse)
async def create_transfer(
    transfer_data: TransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    from_loc = db.query(Location).filter(Location.id == transfer_data.from_location_id).first()
    if not from_loc:
        raise HTTPException(status_code=404, detail="Ubicacion de origen no encontrada")
    
    to_loc = db.query(Location).filter(Location.id == transfer_data.to_location_id).first()
    if not to_loc:
        raise HTTPException(status_code=404, detail="Ubicacion de destino no encontrada")
    
    if transfer_data.from_location_id == transfer_data.to_location_id:
        raise HTTPException(status_code=400, detail="Las ubicaciones de origen y destino deben ser diferentes")
    
    total_value = 0.0
    transfer_items = []
    
    for item_data in transfer_data.items:
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Producto {item_data.product_id} no encontrado"
            )
        
        stock = db.query(ProductStock).filter(
            ProductStock.product_id == item_data.product_id,
            ProductStock.location_id == transfer_data.from_location_id
        ).first()
        
        if not stock or stock.quantity < item_data.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Stock insuficiente para {product.name} en ubicacion de origen"
            )
        
        item_value = product.sale_price * item_data.quantity
        total_value += item_value
        
        transfer_items.append({
            "product": product,
            "from_stock": stock,
            "quantity": item_data.quantity,
            "sale_price": product.sale_price,
            "total_value": item_value
        })
    
    transfer = Transfer(
        from_location_id=transfer_data.from_location_id,
        to_location_id=transfer_data.to_location_id,
        created_by_id=current_user.id,
        status=TransferStatus.PENDING,
        total_value_at_sale_price=total_value,
        notes=transfer_data.notes
    )
    db.add(transfer)
    db.flush()
    
    for item_info in transfer_items:
        transfer_item = TransferItem(
            transfer_id=transfer.id,
            product_id=item_info["product"].id,
            quantity=item_info["quantity"],
            sale_price=item_info["sale_price"],
            total_value=item_info["total_value"]
        )
        db.add(transfer_item)
        
        item_info["from_stock"].quantity -= item_info["quantity"]
        
        movement = StockMovement(
            product_id=item_info["product"].id,
            location_id=transfer_data.from_location_id,
            movement_type=MovementType.TRANSFER_OUT,
            quantity=-item_info["quantity"],
            reference_id=transfer.id,
            reference_type="transfer",
            created_by_id=current_user.id
        )
        db.add(movement)
    
    db.commit()
    db.refresh(transfer)
    
    items_response = []
    for item in transfer.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        items_response.append(TransferItemResponse(
            id=item.id,
            product_id=item.product_id,
            product_name=product.name if product else None,
            quantity=item.quantity,
            sale_price=item.sale_price,
            total_value=item.total_value
        ))
    
    return TransferResponse(
        id=transfer.id,
        from_location_id=transfer.from_location_id,
        from_location_name=from_loc.name,
        to_location_id=transfer.to_location_id,
        to_location_name=to_loc.name,
        created_by_id=transfer.created_by_id,
        created_by_name=current_user.full_name,
        received_by_id=None,
        received_by_name=None,
        status=transfer.status,
        total_value_at_sale_price=transfer.total_value_at_sale_price,
        notes=transfer.notes,
        created_at=transfer.created_at,
        completed_at=None,
        items=items_response
    )


@router.post("/{transfer_id}/receive", response_model=TransferResponse)
async def receive_transfer(
    transfer_id: int,
    receive_data: TransferReceive,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    transfer = db.query(Transfer).filter(Transfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transferencia no encontrada")
    
    if transfer.status != TransferStatus.PENDING:
        raise HTTPException(status_code=400, detail="La transferencia ya fue procesada")
    
    for item in transfer.items:
        to_stock = db.query(ProductStock).filter(
            ProductStock.product_id == item.product_id,
            ProductStock.location_id == transfer.to_location_id
        ).first()
        
        if not to_stock:
            to_stock = ProductStock(
                product_id=item.product_id,
                location_id=transfer.to_location_id,
                quantity=0
            )
            db.add(to_stock)
        
        to_stock.quantity += item.quantity
        
        movement = StockMovement(
            product_id=item.product_id,
            location_id=transfer.to_location_id,
            movement_type=MovementType.TRANSFER_IN,
            quantity=item.quantity,
            reference_id=transfer.id,
            reference_type="transfer",
            created_by_id=current_user.id
        )
        db.add(movement)
    
    transfer.status = TransferStatus.COMPLETED
    transfer.received_by_id = current_user.id
    transfer.completed_at = datetime.utcnow()
    if receive_data.notes:
        transfer.notes = (transfer.notes or "") + f"\nRecibido: {receive_data.notes}"
    
    db.commit()
    db.refresh(transfer)
    
    from_loc = db.query(Location).filter(Location.id == transfer.from_location_id).first()
    to_loc = db.query(Location).filter(Location.id == transfer.to_location_id).first()
    created_by = db.query(User).filter(User.id == transfer.created_by_id).first()
    
    items_response = []
    for item in transfer.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        items_response.append(TransferItemResponse(
            id=item.id,
            product_id=item.product_id,
            product_name=product.name if product else None,
            quantity=item.quantity,
            sale_price=item.sale_price,
            total_value=item.total_value
        ))
    
    return TransferResponse(
        id=transfer.id,
        from_location_id=transfer.from_location_id,
        from_location_name=from_loc.name if from_loc else None,
        to_location_id=transfer.to_location_id,
        to_location_name=to_loc.name if to_loc else None,
        created_by_id=transfer.created_by_id,
        created_by_name=created_by.full_name if created_by else None,
        received_by_id=transfer.received_by_id,
        received_by_name=current_user.full_name,
        status=transfer.status,
        total_value_at_sale_price=transfer.total_value_at_sale_price,
        notes=transfer.notes,
        created_at=transfer.created_at,
        completed_at=transfer.completed_at,
        items=items_response
    )


@router.post("/{transfer_id}/cancel")
async def cancel_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    transfer = db.query(Transfer).filter(Transfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transferencia no encontrada")
    
    if transfer.status != TransferStatus.PENDING:
        raise HTTPException(status_code=400, detail="Solo se pueden cancelar transferencias pendientes")
    
    for item in transfer.items:
        from_stock = db.query(ProductStock).filter(
            ProductStock.product_id == item.product_id,
            ProductStock.location_id == transfer.from_location_id
        ).first()
        
        if from_stock:
            from_stock.quantity += item.quantity
        
        movement = StockMovement(
            product_id=item.product_id,
            location_id=transfer.from_location_id,
            movement_type=MovementType.ADJUSTMENT,
            quantity=item.quantity,
            reference_id=transfer.id,
            reference_type="transfer_cancel",
            notes="Cancelacion de transferencia",
            created_by_id=current_user.id
        )
        db.add(movement)
    
    transfer.status = TransferStatus.CANCELLED
    db.commit()
    
    return {"message": "Transferencia cancelada exitosamente"}
