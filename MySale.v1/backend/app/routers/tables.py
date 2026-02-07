from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.database import get_db
from app.models.table import (
    Zone, Table, Ticket, TicketItem, Comanda, TicketPayment,
    TableStatus, TableShape, TicketStatus, TicketItemStatus,
    ComandaArea, ComandaStatus
)
from app.models.inventory import Product
from app.models.user import User
from app.schemas.table import (
    ZoneCreate, ZoneUpdate, ZoneResponse, ZoneWithTablesResponse,
    TableCreate, TableUpdate, TableResponse,
    TicketCreate, TicketUpdate, TicketResponse,
    TicketItemCreate, TicketItemResponse,
    ComandaCreate, ComandaResponse,
    TicketPaymentCreate, TicketPaymentResponse,
    PayTicketRequest, MoveTicketRequest, MergeTicketsRequest,
    SplitTicketRequest, AddItemsRequest
)
from app.utils.auth import get_current_user, require_role

router = APIRouter(prefix="/api/tables", tags=["tables"])


def filter_by_tenant(query, model, tenant_id):
    """Helper function to filter queries by tenant_id if present."""
    if tenant_id:
        return query.filter(model.tenant_id == tenant_id)
    return query


def get_table_response(table: Table, db: Session) -> TableResponse:
    current_ticket = db.query(Ticket).filter(
        Ticket.table_id == table.id,
        Ticket.status.in_([TicketStatus.OPEN, TicketStatus.TO_PAY])
    ).first()
    
    pending_comandas = 0
    ticket_total = None
    ticket_time = None
    waiter_name = None
    
    if current_ticket:
        pending_comandas = db.query(Comanda).filter(
            Comanda.ticket_id == current_ticket.id,
            Comanda.status.in_([ComandaStatus.PENDING, ComandaStatus.IN_PREPARATION])
        ).count()
        ticket_total = current_ticket.total if current_ticket.total > 0 else None
        if current_ticket.opened_at:
            delta = datetime.utcnow() - current_ticket.opened_at
            hours, remainder = divmod(int(delta.total_seconds()), 3600)
            minutes, seconds = divmod(remainder, 60)
            ticket_time = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        waiter = db.query(User).filter(User.id == current_ticket.waiter_id).first()
        waiter_name = waiter.full_name if waiter else None
    
    zone = db.query(Zone).filter(Zone.id == table.zone_id).first()
    
    return TableResponse(
        id=table.id,
        name=table.name,
        zone_id=table.zone_id,
        zone_name=zone.name if zone else None,
        capacity=table.capacity,
        shape=table.shape.value,
        status=table.status.value,
        position_x=table.position_x,
        position_y=table.position_y,
        width=table.width,
        height=table.height,
        is_active=table.is_active,
        created_at=table.created_at,
        current_ticket_id=current_ticket.id if current_ticket else None,
        pending_comandas=pending_comandas,
        ticket_total=ticket_total,
        ticket_time=ticket_time,
        waiter_name=waiter_name
    )


@router.get("/zones", response_model=List[ZoneResponse])
async def get_zones(
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Zone).filter(Zone.is_active == True)
    query = filter_by_tenant(query, Zone, current_user.tenant_id)
    if location_id:
        query = query.filter(Zone.location_id == location_id)
    zones = query.order_by(Zone.display_order).all()
    return [ZoneResponse(
        id=z.id,
        name=z.name,
        location_id=z.location_id,
        description=z.description,
        color=z.color,
        display_order=z.display_order,
        is_active=z.is_active,
        created_at=z.created_at
    ) for z in zones]


@router.get("/zones-with-tables", response_model=List[ZoneWithTablesResponse])
async def get_zones_with_tables(
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Zone).filter(Zone.is_active == True)
    query = filter_by_tenant(query, Zone, current_user.tenant_id)
    if location_id:
        query = query.filter(Zone.location_id == location_id)
    zones = query.order_by(Zone.display_order).all()
    
    result = []
    for zone in zones:
        tables = db.query(Table).filter(
            Table.zone_id == zone.id,
            Table.is_active == True
        ).all()
        
        table_responses = [get_table_response(t, db) for t in tables]
        
        result.append(ZoneWithTablesResponse(
            id=zone.id,
            name=zone.name,
            location_id=zone.location_id,
            description=zone.description,
            color=zone.color,
            display_order=zone.display_order,
            is_active=zone.is_active,
            tables=table_responses
        ))
    
    return result


@router.post("/zones", response_model=ZoneResponse)
async def create_zone(
    data: ZoneCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    zone = Zone(
        tenant_id=current_user.tenant_id,
        name=data.name,
        location_id=data.location_id,
        description=data.description,
        color=data.color or "#4ade80",
        display_order=data.display_order or 0
    )
    db.add(zone)
    db.commit()
    db.refresh(zone)
    
    return ZoneResponse(
        id=zone.id,
        name=zone.name,
        location_id=zone.location_id,
        description=zone.description,
        color=zone.color,
        display_order=zone.display_order,
        is_active=zone.is_active,
        created_at=zone.created_at
    )


@router.put("/zones/{zone_id}", response_model=ZoneResponse)
async def update_zone(
    zone_id: int,
    data: ZoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    if data.name is not None:
        zone.name = data.name
    if data.description is not None:
        zone.description = data.description
    if data.color is not None:
        zone.color = data.color
    if data.display_order is not None:
        zone.display_order = data.display_order
    if data.is_active is not None:
        zone.is_active = data.is_active
    
    db.commit()
    db.refresh(zone)
    
    return ZoneResponse(
        id=zone.id,
        name=zone.name,
        location_id=zone.location_id,
        description=zone.description,
        color=zone.color,
        display_order=zone.display_order,
        is_active=zone.is_active,
        created_at=zone.created_at
    )


@router.delete("/zones/{zone_id}")
async def delete_zone(
    zone_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    zone.is_active = False
    db.commit()
    return {"message": "Zone deactivated successfully"}


@router.get("/", response_model=List[TableResponse])
async def get_tables(
    zone_id: Optional[int] = None,
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Table).filter(Table.is_active == True)
    if zone_id:
        query = query.filter(Table.zone_id == zone_id)
    if location_id:
        query = query.join(Zone).filter(Zone.location_id == location_id)
    
    tables = query.all()
    return [get_table_response(t, db) for t in tables]


@router.post("/", response_model=TableResponse)
async def create_table(
    data: TableCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    try:
        shape = TableShape(data.shape) if data.shape else TableShape.SQUARE
    except ValueError:
        shape = TableShape.SQUARE
    
    table = Table(
        name=data.name,
        zone_id=data.zone_id,
        capacity=data.capacity or 4,
        shape=shape,
        position_x=data.position_x or 0,
        position_y=data.position_y or 0,
        width=data.width or 100,
        height=data.height or 100
    )
    db.add(table)
    db.commit()
    db.refresh(table)
    
    return get_table_response(table, db)


@router.put("/{table_id}", response_model=TableResponse)
async def update_table(
    table_id: int,
    data: TableUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    if data.name is not None:
        table.name = data.name
    if data.zone_id is not None:
        table.zone_id = data.zone_id
    if data.capacity is not None:
        table.capacity = data.capacity
    if data.shape is not None:
        try:
            table.shape = TableShape(data.shape)
        except ValueError:
            pass
    if data.status is not None:
        try:
            table.status = TableStatus(data.status)
        except ValueError:
            pass
    if data.position_x is not None:
        table.position_x = data.position_x
    if data.position_y is not None:
        table.position_y = data.position_y
    if data.width is not None:
        table.width = data.width
    if data.height is not None:
        table.height = data.height
    if data.is_active is not None:
        table.is_active = data.is_active
    
    db.commit()
    db.refresh(table)
    
    return get_table_response(table, db)


@router.put("/batch-update", response_model=List[TableResponse])
async def batch_update_tables(
    tables: List[TableUpdate],
    table_ids: List[int],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    results = []
    for i, table_id in enumerate(table_ids):
        if i < len(tables):
            table = db.query(Table).filter(Table.id == table_id).first()
            if table:
                data = tables[i]
                if data.position_x is not None:
                    table.position_x = data.position_x
                if data.position_y is not None:
                    table.position_y = data.position_y
                if data.width is not None:
                    table.width = data.width
                if data.height is not None:
                    table.height = data.height
                results.append(table)
    
    db.commit()
    return [get_table_response(t, db) for t in results]


@router.delete("/{table_id}")
async def delete_table(
    table_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("superuser"))
):
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    table.is_active = False
    db.commit()
    return {"message": "Table deactivated successfully"}


def get_ticket_response(ticket: Ticket, db: Session) -> TicketResponse:
    items = db.query(TicketItem).filter(TicketItem.ticket_id == ticket.id).all()
    item_responses = []
    for item in items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        item_responses.append(TicketItemResponse(
            id=item.id,
            ticket_id=item.ticket_id,
            product_id=item.product_id,
            product_name=product.name if product else None,
            product_code=product.code if product else None,
            comanda_id=item.comanda_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount=item.discount,
            subtotal=item.subtotal,
            notes=item.notes,
            status=item.status.value,
            created_at=item.created_at
        ))
    
    table = db.query(Table).filter(Table.id == ticket.table_id).first()
    waiter = db.query(User).filter(User.id == ticket.waiter_id).first()
    
    pending_comandas = db.query(Comanda).filter(
        Comanda.ticket_id == ticket.id,
        Comanda.status.in_([ComandaStatus.PENDING, ComandaStatus.IN_PREPARATION])
    ).count()
    
    return TicketResponse(
        id=ticket.id,
        table_id=ticket.table_id,
        table_name=table.name if table else None,
        location_id=ticket.location_id,
        waiter_id=ticket.waiter_id,
        waiter_name=waiter.full_name if waiter else None,
        customer_name=ticket.customer_name,
        num_people=ticket.num_people,
        notes=ticket.notes,
        status=ticket.status.value,
        subtotal=ticket.subtotal,
        tax=ticket.tax,
        tip=ticket.tip,
        service_charge=ticket.service_charge,
        discount=ticket.discount,
        total=ticket.total,
        opened_at=ticket.opened_at,
        closed_at=ticket.closed_at,
        items=item_responses,
        pending_comandas=pending_comandas
    )


def recalculate_ticket_totals(ticket: Ticket, db: Session):
    items = db.query(TicketItem).filter(
        TicketItem.ticket_id == ticket.id,
        TicketItem.status != TicketItemStatus.CANCELLED
    ).all()
    
    subtotal = sum(item.subtotal for item in items)
    tax = subtotal * 0.0
    total = subtotal + tax + ticket.tip + ticket.service_charge - ticket.discount
    
    ticket.subtotal = subtotal
    ticket.tax = tax
    ticket.total = total


@router.post("/tickets", response_model=TicketResponse)
async def create_ticket(
    data: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    table = db.query(Table).filter(Table.id == data.table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    existing_ticket = db.query(Ticket).filter(
        Ticket.table_id == data.table_id,
        Ticket.status.in_([TicketStatus.OPEN, TicketStatus.TO_PAY])
    ).first()
    if existing_ticket:
        raise HTTPException(status_code=400, detail="Table already has an open ticket")
    
    ticket = Ticket(
        table_id=data.table_id,
        location_id=data.location_id,
        waiter_id=current_user.id,
        customer_name=data.customer_name,
        num_people=data.num_people or 1,
        notes=data.notes
    )
    db.add(ticket)
    
    table.status = TableStatus.BILL_OPEN
    
    db.commit()
    db.refresh(ticket)
    
    return get_ticket_response(ticket, db)


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    return get_ticket_response(ticket, db)


@router.get("/{table_id}/ticket", response_model=TicketResponse)
async def get_table_ticket(
    table_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(
        Ticket.table_id == table_id,
        Ticket.status.in_([TicketStatus.OPEN, TicketStatus.TO_PAY])
    ).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="No open ticket for this table")
    
    return get_ticket_response(ticket, db)


@router.put("/tickets/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: int,
    data: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if data.customer_name is not None:
        ticket.customer_name = data.customer_name
    if data.num_people is not None:
        ticket.num_people = data.num_people
    if data.notes is not None:
        ticket.notes = data.notes
    if data.tip is not None:
        ticket.tip = data.tip
    if data.service_charge is not None:
        ticket.service_charge = data.service_charge
    if data.discount is not None:
        ticket.discount = data.discount
    
    recalculate_ticket_totals(ticket, db)
    db.commit()
    db.refresh(ticket)
    
    return get_ticket_response(ticket, db)


@router.post("/tickets/{ticket_id}/items", response_model=TicketResponse)
async def add_items_to_ticket(
    ticket_id: int,
    data: AddItemsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket.status not in [TicketStatus.OPEN, TicketStatus.TO_PAY]:
        raise HTTPException(status_code=400, detail="Cannot add items to closed ticket")
    
    for item_data in data.items:
        product = db.query(Product).filter(Product.id == item_data.product_id).first()
        if not product:
            continue
        
        subtotal = item_data.quantity * item_data.unit_price - item_data.discount
        
        item = TicketItem(
            ticket_id=ticket_id,
            product_id=item_data.product_id,
            quantity=item_data.quantity,
            unit_price=item_data.unit_price,
            discount=item_data.discount or 0,
            subtotal=subtotal,
            notes=item_data.notes
        )
        db.add(item)
    
    recalculate_ticket_totals(ticket, db)
    db.commit()
    db.refresh(ticket)
    
    return get_ticket_response(ticket, db)


@router.delete("/tickets/{ticket_id}/items/{item_id}")
async def remove_item_from_ticket(
    ticket_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    item = db.query(TicketItem).filter(
        TicketItem.id == item_id,
        TicketItem.ticket_id == ticket_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if item.comanda_id:
        item.status = TicketItemStatus.CANCELLED
    else:
        db.delete(item)
    
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if ticket:
        recalculate_ticket_totals(ticket, db)
    
    db.commit()
    return {"message": "Item removed successfully"}


@router.post("/tickets/{ticket_id}/comandas", response_model=ComandaResponse)
async def create_comanda(
    ticket_id: int,
    data: ComandaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    try:
        area = ComandaArea(data.area)
    except ValueError:
        area = ComandaArea.KITCHEN
    
    comanda = Comanda(
        ticket_id=ticket_id,
        area=area,
        notes=data.notes,
        created_by_id=current_user.id
    )
    db.add(comanda)
    db.flush()
    
    for item_id in data.item_ids:
        item = db.query(TicketItem).filter(
            TicketItem.id == item_id,
            TicketItem.ticket_id == ticket_id
        ).first()
        if item and not item.comanda_id:
            item.comanda_id = comanda.id
            item.status = TicketItemStatus.ORDERED
    
    db.commit()
    db.refresh(comanda)
    
    items = db.query(TicketItem).filter(TicketItem.comanda_id == comanda.id).all()
    item_responses = []
    for item in items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        item_responses.append(TicketItemResponse(
            id=item.id,
            ticket_id=item.ticket_id,
            product_id=item.product_id,
            product_name=product.name if product else None,
            product_code=product.code if product else None,
            comanda_id=item.comanda_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount=item.discount,
            subtotal=item.subtotal,
            notes=item.notes,
            status=item.status.value,
            created_at=item.created_at
        ))
    
    return ComandaResponse(
        id=comanda.id,
        ticket_id=comanda.ticket_id,
        area=comanda.area.value,
        status=comanda.status.value,
        notes=comanda.notes,
        created_by_id=comanda.created_by_id,
        created_by_name=current_user.full_name,
        created_at=comanda.created_at,
        completed_at=comanda.completed_at,
        items=item_responses
    )


@router.get("/tickets/{ticket_id}/comandas", response_model=List[ComandaResponse])
async def get_ticket_comandas(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comandas = db.query(Comanda).filter(Comanda.ticket_id == ticket_id).order_by(Comanda.created_at.desc()).all()
    
    result = []
    for comanda in comandas:
        items = db.query(TicketItem).filter(TicketItem.comanda_id == comanda.id).all()
        item_responses = []
        for item in items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            item_responses.append(TicketItemResponse(
                id=item.id,
                ticket_id=item.ticket_id,
                product_id=item.product_id,
                product_name=product.name if product else None,
                product_code=product.code if product else None,
                comanda_id=item.comanda_id,
                quantity=item.quantity,
                unit_price=item.unit_price,
                discount=item.discount,
                subtotal=item.subtotal,
                notes=item.notes,
                status=item.status.value,
                created_at=item.created_at
            ))
        
        creator = db.query(User).filter(User.id == comanda.created_by_id).first()
        result.append(ComandaResponse(
            id=comanda.id,
            ticket_id=comanda.ticket_id,
            area=comanda.area.value,
            status=comanda.status.value,
            notes=comanda.notes,
            created_by_id=comanda.created_by_id,
            created_by_name=creator.full_name if creator else None,
            created_at=comanda.created_at,
            completed_at=comanda.completed_at,
            items=item_responses
        ))
    
    return result


@router.put("/comandas/{comanda_id}/status")
async def update_comanda_status(
    comanda_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    comanda = db.query(Comanda).filter(Comanda.id == comanda_id).first()
    if not comanda:
        raise HTTPException(status_code=404, detail="Comanda not found")
    
    try:
        comanda.status = ComandaStatus(status)
        if status == "delivered":
            comanda.completed_at = datetime.utcnow()
            items = db.query(TicketItem).filter(TicketItem.comanda_id == comanda_id).all()
            for item in items:
                item.status = TicketItemStatus.SERVED
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    db.commit()
    return {"message": "Comanda status updated"}


@router.post("/tickets/{ticket_id}/move", response_model=TicketResponse)
async def move_ticket(
    ticket_id: int,
    data: MoveTicketRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    new_table = db.query(Table).filter(Table.id == data.new_table_id).first()
    if not new_table:
        raise HTTPException(status_code=404, detail="New table not found")
    
    existing = db.query(Ticket).filter(
        Ticket.table_id == data.new_table_id,
        Ticket.status.in_([TicketStatus.OPEN, TicketStatus.TO_PAY])
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Target table already has an open ticket")
    
    old_table = db.query(Table).filter(Table.id == ticket.table_id).first()
    if old_table:
        old_table.status = TableStatus.FREE
    
    ticket.table_id = data.new_table_id
    new_table.status = TableStatus.BILL_OPEN
    
    db.commit()
    db.refresh(ticket)
    
    return get_ticket_response(ticket, db)


@router.post("/tickets/merge", response_model=TicketResponse)
async def merge_tickets(
    data: MergeTicketsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_table = db.query(Table).filter(Table.id == data.target_table_id).first()
    if not target_table:
        raise HTTPException(status_code=404, detail="Target table not found")
    
    target_ticket = db.query(Ticket).filter(
        Ticket.table_id == data.target_table_id,
        Ticket.status.in_([TicketStatus.OPEN, TicketStatus.TO_PAY])
    ).first()
    
    if not target_ticket:
        zone = db.query(Zone).filter(Zone.id == target_table.zone_id).first()
        target_ticket = Ticket(
            table_id=data.target_table_id,
            location_id=zone.location_id if zone else 1,
            waiter_id=current_user.id
        )
        db.add(target_ticket)
        db.flush()
    
    for source_id in data.source_ticket_ids:
        source_ticket = db.query(Ticket).filter(Ticket.id == source_id).first()
        if source_ticket and source_ticket.id != target_ticket.id:
            items = db.query(TicketItem).filter(TicketItem.ticket_id == source_id).all()
            for item in items:
                item.ticket_id = target_ticket.id
            
            source_table = db.query(Table).filter(Table.id == source_ticket.table_id).first()
            if source_table:
                source_table.status = TableStatus.FREE
            
            source_ticket.status = TicketStatus.CANCELLED
    
    target_table.status = TableStatus.BILL_OPEN
    recalculate_ticket_totals(target_ticket, db)
    
    db.commit()
    db.refresh(target_ticket)
    
    return get_ticket_response(target_ticket, db)


@router.post("/tickets/{ticket_id}/split", response_model=TicketResponse)
async def split_ticket(
    ticket_id: int,
    data: SplitTicketRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    original_ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not original_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    new_table = db.query(Table).filter(Table.id == data.new_table_id).first()
    if not new_table:
        raise HTTPException(status_code=404, detail="New table not found")
    
    existing = db.query(Ticket).filter(
        Ticket.table_id == data.new_table_id,
        Ticket.status.in_([TicketStatus.OPEN, TicketStatus.TO_PAY])
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Target table already has an open ticket")
    
    new_ticket = Ticket(
        table_id=data.new_table_id,
        location_id=original_ticket.location_id,
        waiter_id=current_user.id
    )
    db.add(new_ticket)
    db.flush()
    
    for item_id in data.item_ids:
        item = db.query(TicketItem).filter(
            TicketItem.id == item_id,
            TicketItem.ticket_id == ticket_id
        ).first()
        if item:
            item.ticket_id = new_ticket.id
    
    new_table.status = TableStatus.BILL_OPEN
    
    recalculate_ticket_totals(original_ticket, db)
    recalculate_ticket_totals(new_ticket, db)
    
    db.commit()
    db.refresh(new_ticket)
    
    return get_ticket_response(new_ticket, db)


@router.post("/tickets/{ticket_id}/pay", response_model=TicketResponse)
async def pay_ticket(
    ticket_id: int,
    data: PayTicketRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if ticket.status == TicketStatus.PAID:
        raise HTTPException(status_code=400, detail="Ticket already paid")
    
    if data.tip:
        ticket.tip = data.tip
        recalculate_ticket_totals(ticket, db)
    
    total_paid = sum(p.amount for p in data.payments)
    if total_paid < ticket.total:
        raise HTTPException(status_code=400, detail=f"Payment amount ({total_paid}) is less than total ({ticket.total})")
    
    for payment_data in data.payments:
        payment = TicketPayment(
            ticket_id=ticket_id,
            payment_method=payment_data.payment_method,
            amount=payment_data.amount,
            reference=payment_data.reference,
            created_by_id=current_user.id
        )
        db.add(payment)
    
    ticket.status = TicketStatus.PAID
    ticket.closed_at = datetime.utcnow()
    
    table = db.query(Table).filter(Table.id == ticket.table_id).first()
    if table:
        table.status = TableStatus.FREE
    
    db.commit()
    db.refresh(ticket)
    
    return get_ticket_response(ticket, db)


@router.get("/tickets/{ticket_id}/payments", response_model=List[TicketPaymentResponse])
async def get_ticket_payments(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    payments = db.query(TicketPayment).filter(TicketPayment.ticket_id == ticket_id).all()
    return [TicketPaymentResponse(
        id=p.id,
        ticket_id=p.ticket_id,
        payment_method=p.payment_method,
        amount=p.amount,
        reference=p.reference,
        created_by_id=p.created_by_id,
        created_at=p.created_at
    ) for p in payments]


@router.post("/tickets/{ticket_id}/precheck")
async def generate_precheck(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket.status = TicketStatus.TO_PAY
    
    table = db.query(Table).filter(Table.id == ticket.table_id).first()
    if table:
        table.status = TableStatus.TO_PAY
    
    db.commit()
    
    return get_ticket_response(ticket, db)
