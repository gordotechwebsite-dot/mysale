from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
from app.database import get_db
from app.models.user import User, RoleType
from app.models.branch import Branch, WorkSession
from app.schemas.branch import (
    BranchCreate, BranchUpdate, BranchResponse,
    WorkSessionCreate, WorkSessionClockOut, WorkSessionResponse,
    WorkSessionSummary, BranchWorkReport
)
from app.utils.auth import get_current_user, require_role

router = APIRouter(prefix="/api/branches", tags=["Sedes"])


def filter_by_tenant(query, model, tenant_id):
    """Helper function to filter queries by tenant_id if present."""
    if tenant_id:
        return query.filter(model.tenant_id == tenant_id)
    return query


# ==================== BRANCH CRUD ====================

@router.get("/", response_model=List[BranchResponse])
async def get_branches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all branches for the current tenant"""
    query = db.query(Branch)
    query = filter_by_tenant(query, Branch, current_user.tenant_id)
    return query.order_by(Branch.name).all()


@router.post("/", response_model=BranchResponse)
async def create_branch(
    branch: BranchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    """Create a new branch (sede)"""
    # Check if code already exists for this tenant
    query = db.query(Branch).filter(Branch.code == branch.code)
    query = filter_by_tenant(query, Branch, current_user.tenant_id)
    existing = query.first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una sede con ese codigo"
        )
    
    db_branch = Branch(**branch.model_dump(), tenant_id=current_user.tenant_id)
    db.add(db_branch)
    db.commit()
    db.refresh(db_branch)
    return db_branch


@router.get("/{branch_id}", response_model=BranchResponse)
async def get_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific branch by ID"""
    query = db.query(Branch).filter(Branch.id == branch_id)
    query = filter_by_tenant(query, Branch, current_user.tenant_id)
    branch = query.first()
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sede no encontrada"
        )
    return branch


@router.put("/{branch_id}", response_model=BranchResponse)
async def update_branch(
    branch_id: int,
    branch_update: BranchUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    """Update a branch"""
    query = db.query(Branch).filter(Branch.id == branch_id)
    query = filter_by_tenant(query, Branch, current_user.tenant_id)
    branch = query.first()
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sede no encontrada"
        )
    
    # Check if new code already exists
    if branch_update.code and branch_update.code != branch.code:
        existing = db.query(Branch).filter(
            Branch.code == branch_update.code,
            Branch.tenant_id == current_user.tenant_id,
            Branch.id != branch_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe otra sede con ese codigo"
            )
    
    update_data = branch_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(branch, field, value)
    
    db.commit()
    db.refresh(branch)
    return branch


@router.delete("/{branch_id}")
async def delete_branch(
    branch_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER))
):
    """Deactivate a branch (soft delete)"""
    query = db.query(Branch).filter(Branch.id == branch_id)
    query = filter_by_tenant(query, Branch, current_user.tenant_id)
    branch = query.first()
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sede no encontrada"
        )
    
    branch.is_active = False
    db.commit()
    
    return {"message": "Sede desactivada exitosamente"}


# ==================== WORK SESSIONS (Clock In/Out) ====================

@router.post("/clock-in", response_model=WorkSessionResponse)
async def clock_in(
    session_data: WorkSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clock in to start a work session at a branch"""
    # Verify branch exists and belongs to tenant
    query = db.query(Branch).filter(Branch.id == session_data.branch_id)
    query = filter_by_tenant(query, Branch, current_user.tenant_id)
    branch = query.first()
    if not branch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sede no encontrada"
        )
    
    if not branch.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La sede no esta activa"
        )
    
    # Check if user already has an open session
    open_session = db.query(WorkSession).filter(
        WorkSession.user_id == current_user.id,
        WorkSession.clock_out.is_(None)
    ).first()
    if open_session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya tienes una sesion de trabajo abierta. Debes cerrarla primero."
        )
    
    # Create new work session
    work_session = WorkSession(
        tenant_id=current_user.tenant_id,
        user_id=current_user.id,
        branch_id=session_data.branch_id,
        clock_in=datetime.utcnow(),
        notes=session_data.notes
    )
    db.add(work_session)
    db.commit()
    db.refresh(work_session)
    
    return WorkSessionResponse(
        id=work_session.id,
        tenant_id=work_session.tenant_id,
        user_id=work_session.user_id,
        branch_id=work_session.branch_id,
        branch_name=branch.name,
        user_name=current_user.full_name,
        employee_code=current_user.employee_code,
        clock_in=work_session.clock_in,
        clock_out=work_session.clock_out,
        total_minutes=work_session.total_minutes,
        notes=work_session.notes,
        created_at=work_session.created_at
    )


@router.post("/clock-out", response_model=WorkSessionResponse)
async def clock_out(
    session_data: WorkSessionClockOut,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clock out to end the current work session"""
    # Find open session for user
    work_session = db.query(WorkSession).filter(
        WorkSession.user_id == current_user.id,
        WorkSession.clock_out.is_(None)
    ).first()
    
    if not work_session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No tienes una sesion de trabajo abierta"
        )
    
    # Calculate total minutes worked
    clock_out_time = datetime.utcnow()
    total_minutes = int((clock_out_time - work_session.clock_in).total_seconds() / 60)
    
    work_session.clock_out = clock_out_time
    work_session.total_minutes = total_minutes
    if session_data.notes:
        work_session.notes = (work_session.notes or "") + " | " + session_data.notes
    
    db.commit()
    db.refresh(work_session)
    
    branch = db.query(Branch).filter(Branch.id == work_session.branch_id).first()
    
    return WorkSessionResponse(
        id=work_session.id,
        tenant_id=work_session.tenant_id,
        user_id=work_session.user_id,
        branch_id=work_session.branch_id,
        branch_name=branch.name if branch else None,
        user_name=current_user.full_name,
        employee_code=current_user.employee_code,
        clock_in=work_session.clock_in,
        clock_out=work_session.clock_out,
        total_minutes=work_session.total_minutes,
        notes=work_session.notes,
        created_at=work_session.created_at
    )


@router.get("/current-session", response_model=Optional[WorkSessionResponse])
async def get_current_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the current open work session for the user"""
    work_session = db.query(WorkSession).filter(
        WorkSession.user_id == current_user.id,
        WorkSession.clock_out.is_(None)
    ).first()
    
    if not work_session:
        return None
    
    branch = db.query(Branch).filter(Branch.id == work_session.branch_id).first()
    
    return WorkSessionResponse(
        id=work_session.id,
        tenant_id=work_session.tenant_id,
        user_id=work_session.user_id,
        branch_id=work_session.branch_id,
        branch_name=branch.name if branch else None,
        user_name=current_user.full_name,
        employee_code=current_user.employee_code,
        clock_in=work_session.clock_in,
        clock_out=work_session.clock_out,
        total_minutes=work_session.total_minutes,
        notes=work_session.notes,
        created_at=work_session.created_at
    )


@router.get("/work-sessions", response_model=List[WorkSessionResponse])
async def get_work_sessions(
    branch_id: Optional[int] = None,
    user_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get work sessions with optional filters. Admin can see all, employees see only their own."""
    query = db.query(WorkSession)
    query = filter_by_tenant(query, WorkSession, current_user.tenant_id)
    
    # Non-admin users can only see their own sessions
    if current_user.role.role_type not in [RoleType.SUPERUSER, RoleType.ADMIN]:
        query = query.filter(WorkSession.user_id == current_user.id)
    elif user_id:
        query = query.filter(WorkSession.user_id == user_id)
    
    if branch_id:
        query = query.filter(WorkSession.branch_id == branch_id)
    
    if start_date:
        query = query.filter(WorkSession.clock_in >= start_date)
    
    if end_date:
        query = query.filter(WorkSession.clock_in <= end_date)
    
    sessions = query.order_by(WorkSession.clock_in.desc()).limit(100).all()
    
    result = []
    for session in sessions:
        branch = db.query(Branch).filter(Branch.id == session.branch_id).first()
        user = db.query(User).filter(User.id == session.user_id).first()
        result.append(WorkSessionResponse(
            id=session.id,
            tenant_id=session.tenant_id,
            user_id=session.user_id,
            branch_id=session.branch_id,
            branch_name=branch.name if branch else None,
            user_name=user.full_name if user else None,
            employee_code=user.employee_code if user else None,
            clock_in=session.clock_in,
            clock_out=session.clock_out,
            total_minutes=session.total_minutes,
            notes=session.notes,
            created_at=session.created_at
        ))
    
    return result


@router.get("/work-report", response_model=List[WorkSessionSummary])
async def get_work_report(
    branch_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(RoleType.SUPERUSER, RoleType.ADMIN))
):
    """Get work hours report grouped by employee"""
    query = db.query(WorkSession).filter(WorkSession.clock_out.isnot(None))
    query = filter_by_tenant(query, WorkSession, current_user.tenant_id)
    
    if branch_id:
        query = query.filter(WorkSession.branch_id == branch_id)
    
    if start_date:
        query = query.filter(WorkSession.clock_in >= start_date)
    
    if end_date:
        query = query.filter(WorkSession.clock_in <= end_date)
    
    sessions = query.all()
    
    # Group by user
    user_sessions = {}
    for session in sessions:
        if session.user_id not in user_sessions:
            user = db.query(User).filter(User.id == session.user_id).first()
            user_sessions[session.user_id] = {
                "user_id": session.user_id,
                "user_name": user.full_name if user else "Unknown",
                "employee_code": user.employee_code if user else None,
                "total_sessions": 0,
                "total_minutes": 0,
                "branches_worked": set()
            }
        
        user_sessions[session.user_id]["total_sessions"] += 1
        user_sessions[session.user_id]["total_minutes"] += session.total_minutes or 0
        
        branch = db.query(Branch).filter(Branch.id == session.branch_id).first()
        if branch:
            user_sessions[session.user_id]["branches_worked"].add(branch.name)
    
    result = []
    for user_data in user_sessions.values():
        result.append(WorkSessionSummary(
            user_id=user_data["user_id"],
            user_name=user_data["user_name"],
            employee_code=user_data["employee_code"],
            total_sessions=user_data["total_sessions"],
            total_minutes=user_data["total_minutes"],
            total_hours=round(user_data["total_minutes"] / 60, 2),
            branches_worked=list(user_data["branches_worked"])
        ))
    
    return sorted(result, key=lambda x: x.total_hours, reverse=True)
