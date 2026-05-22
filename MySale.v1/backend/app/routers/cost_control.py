from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from app.timezone import now_colombia

from app.database import get_db
from app.models.cost_control import CostEntry, CostConfig, CostApplication, CostDistributionMethod, CostEntryCategory
from app.models.inventory import Product
from app.models.user import User
from app.schemas.cost_control import (
    CostEntryCreate, CostEntryUpdate, CostEntryResponse,
    CostConfigUpdate, CostConfigResponse,
    CostCalculation, ApplyCostsRequest, CostApplicationResponse
)
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/cost-control", tags=["cost-control"])


@router.get("/entries", response_model=List[CostEntryResponse])
async def get_cost_entries(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CostEntry)
    # Tenant isolation
    if current_user.tenant_id:
        query = query.filter(CostEntry.tenant_id == current_user.tenant_id)
    if active_only:
        query = query.filter(CostEntry.is_active == True)
    entries = query.order_by(CostEntry.created_at.desc()).all()
    
    result = []
    for entry in entries:
        creator = db.query(User).filter(User.id == entry.created_by_id).first()
        result.append(CostEntryResponse(
            id=entry.id,
            name=entry.name,
            category=entry.category.value,
            amount=entry.amount,
            description=entry.description,
            is_recurring=entry.is_recurring,
            recurrence_period=entry.recurrence_period,
            start_date=entry.start_date,
            end_date=entry.end_date,
            is_active=entry.is_active,
            created_by_id=entry.created_by_id,
            created_by_name=creator.full_name if creator else None,
            created_at=entry.created_at,
            updated_at=entry.updated_at
        ))
    return result


@router.post("/entries", response_model=CostEntryResponse)
async def create_cost_entry(
    data: CostEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        category = CostEntryCategory(data.category)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid category: {data.category}")
    
    entry = CostEntry(
        name=data.name,
        category=category,
        amount=data.amount,
        description=data.description,
        is_recurring=data.is_recurring,
        recurrence_period=data.recurrence_period,
        start_date=data.start_date or now_colombia(),
        end_date=data.end_date,
        created_by_id=current_user.id,
        tenant_id=current_user.tenant_id
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    
    return CostEntryResponse(
        id=entry.id,
        name=entry.name,
        category=entry.category.value,
        amount=entry.amount,
        description=entry.description,
        is_recurring=entry.is_recurring,
        recurrence_period=entry.recurrence_period,
        start_date=entry.start_date,
        end_date=entry.end_date,
        is_active=entry.is_active,
        created_by_id=entry.created_by_id,
        created_by_name=current_user.full_name,
        created_at=entry.created_at,
        updated_at=entry.updated_at
    )


@router.put("/entries/{entry_id}", response_model=CostEntryResponse)
async def update_cost_entry(
    entry_id: int,
    data: CostEntryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entry = db.query(CostEntry).filter(CostEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Cost entry not found")
    
    if data.name is not None:
        entry.name = data.name
    if data.category is not None:
        try:
            entry.category = CostEntryCategory(data.category)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid category: {data.category}")
    if data.amount is not None:
        entry.amount = data.amount
    if data.description is not None:
        entry.description = data.description
    if data.is_recurring is not None:
        entry.is_recurring = data.is_recurring
    if data.recurrence_period is not None:
        entry.recurrence_period = data.recurrence_period
    if data.start_date is not None:
        entry.start_date = data.start_date
    if data.end_date is not None:
        entry.end_date = data.end_date
    if data.is_active is not None:
        entry.is_active = data.is_active
    
    db.commit()
    db.refresh(entry)
    
    creator = db.query(User).filter(User.id == entry.created_by_id).first()
    return CostEntryResponse(
        id=entry.id,
        name=entry.name,
        category=entry.category.value,
        amount=entry.amount,
        description=entry.description,
        is_recurring=entry.is_recurring,
        recurrence_period=entry.recurrence_period,
        start_date=entry.start_date,
        end_date=entry.end_date,
        is_active=entry.is_active,
        created_by_id=entry.created_by_id,
        created_by_name=creator.full_name if creator else None,
        created_at=entry.created_at,
        updated_at=entry.updated_at
    )


@router.delete("/entries/{entry_id}")
async def delete_cost_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entry = db.query(CostEntry).filter(CostEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Cost entry not found")
    
    entry.is_active = False
    db.commit()
    return {"message": "Cost entry deactivated successfully"}


@router.get("/config", response_model=CostConfigResponse)
async def get_cost_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    config_query = db.query(CostConfig)
    if current_user.tenant_id:
        config_query = config_query.filter(CostConfig.tenant_id == current_user.tenant_id)
    config = config_query.first()
    if not config:
        config = CostConfig(
            distribution_method=CostDistributionMethod.PER_PRODUCT,
            percentage_value=0.0,
            is_auto_apply=False,
            tenant_id=current_user.tenant_id
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    
    return CostConfigResponse(
        id=config.id,
        distribution_method=config.distribution_method.value,
        percentage_value=config.percentage_value,
        is_auto_apply=config.is_auto_apply,
        last_applied_at=config.last_applied_at,
        updated_by_id=config.updated_by_id,
        updated_at=config.updated_at
    )


@router.put("/config", response_model=CostConfigResponse)
async def update_cost_config(
    data: CostConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    config_query = db.query(CostConfig)
    if current_user.tenant_id:
        config_query = config_query.filter(CostConfig.tenant_id == current_user.tenant_id)
    config = config_query.first()
    if not config:
        config = CostConfig(tenant_id=current_user.tenant_id)
        db.add(config)
    
    if data.distribution_method is not None:
        try:
            config.distribution_method = CostDistributionMethod(data.distribution_method)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid distribution method: {data.distribution_method}")
    if data.percentage_value is not None:
        config.percentage_value = data.percentage_value
    if data.is_auto_apply is not None:
        config.is_auto_apply = data.is_auto_apply
    
    config.updated_by_id = current_user.id
    db.commit()
    db.refresh(config)
    
    return CostConfigResponse(
        id=config.id,
        distribution_method=config.distribution_method.value,
        percentage_value=config.percentage_value,
        is_auto_apply=config.is_auto_apply,
        last_applied_at=config.last_applied_at,
        updated_by_id=config.updated_by_id,
        updated_at=config.updated_at
    )


@router.get("/calculate", response_model=CostCalculation)
async def calculate_costs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entry_query = db.query(CostEntry).filter(CostEntry.is_active == True)
    product_query = db.query(Product).filter(Product.is_active == True)
    config_query = db.query(CostConfig)
    # Tenant isolation
    if current_user.tenant_id:
        entry_query = entry_query.filter(CostEntry.tenant_id == current_user.tenant_id)
        product_query = product_query.filter(Product.tenant_id == current_user.tenant_id)
        config_query = config_query.filter(CostConfig.tenant_id == current_user.tenant_id)
    active_entries = entry_query.all()
    total_cost = sum(entry.amount for entry in active_entries)
    
    product_count = product_query.count()
    
    config = config_query.first()
    distribution_method = config.distribution_method.value if config else "per_product"
    
    if product_count > 0:
        if distribution_method == "per_product":
            cost_per_product = total_cost / product_count
        elif distribution_method == "percentage":
            cost_per_product = config.percentage_value if config else 0.0
        else:
            cost_per_product = total_cost / product_count
    else:
        cost_per_product = 0.0
    
    return CostCalculation(
        total_active_costs=total_cost,
        product_count=product_count,
        cost_per_product=round(cost_per_product, 2),
        distribution_method=distribution_method
    )


@router.post("/apply", response_model=CostApplicationResponse)
async def apply_costs_to_products(
    data: ApplyCostsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entry_query = db.query(CostEntry).filter(CostEntry.is_active == True)
    product_query = db.query(Product).filter(Product.is_active == True)
    # Tenant isolation
    if current_user.tenant_id:
        entry_query = entry_query.filter(CostEntry.tenant_id == current_user.tenant_id)
        product_query = product_query.filter(Product.tenant_id == current_user.tenant_id)
    active_entries = entry_query.all()
    total_cost = sum(entry.amount for entry in active_entries)
    
    products = product_query.all()
    product_count = len(products)
    
    if product_count == 0:
        raise HTTPException(status_code=400, detail="No active products to apply costs to")
    
    config_query = db.query(CostConfig)
    if current_user.tenant_id:
        config_query = config_query.filter(CostConfig.tenant_id == current_user.tenant_id)
    config = config_query.first()
    distribution_method = config.distribution_method if config else CostDistributionMethod.PER_PRODUCT
    
    if distribution_method == CostDistributionMethod.PER_PRODUCT:
        cost_per_product = total_cost / product_count
    elif distribution_method == CostDistributionMethod.PERCENTAGE:
        cost_per_product = config.percentage_value if config else 0.0
    else:
        cost_per_product = total_cost / product_count
    
    for product in products:
        product.weighted_cost = product.weighted_cost + cost_per_product
    
    if config:
        config.last_applied_at = now_colombia()
    
    application = CostApplication(
        total_cost=total_cost,
        product_count=product_count,
        cost_per_product=round(cost_per_product, 2),
        distribution_method=distribution_method,
        applied_by_id=current_user.id,
        tenant_id=current_user.tenant_id,
        notes=data.notes
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    
    return CostApplicationResponse(
        id=application.id,
        total_cost=application.total_cost,
        product_count=application.product_count,
        cost_per_product=application.cost_per_product,
        distribution_method=application.distribution_method.value,
        applied_by_id=application.applied_by_id,
        applied_at=application.applied_at,
        notes=application.notes
    )


@router.get("/applications", response_model=List[CostApplicationResponse])
async def get_cost_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(CostApplication)
    # Tenant isolation
    if current_user.tenant_id:
        query = query.filter(CostApplication.tenant_id == current_user.tenant_id)
    applications = query.order_by(CostApplication.applied_at.desc()).limit(50).all()
    
    return [
        CostApplicationResponse(
            id=app.id,
            total_cost=app.total_cost,
            product_count=app.product_count,
            cost_per_product=app.cost_per_product,
            distribution_method=app.distribution_method.value,
            applied_by_id=app.applied_by_id,
            applied_at=app.applied_at,
            notes=app.notes
        )
        for app in applications
    ]
