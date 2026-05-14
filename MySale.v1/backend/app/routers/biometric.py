from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional
from datetime import datetime, timedelta
from app.timezone import now_colombia
from pydantic import BaseModel
import hashlib
import base64

from app.database import get_db
from app.models import User, Fingerprint, BiometricLog, AttendanceRecord, BiometricEventType, Location
from app.routers.auth import get_current_user, log_audit
from app.schemas.user import UserResponse, RoleResponse

router = APIRouter(prefix="/api/biometric", tags=["biometric"])


class FingerprintEnrollRequest(BaseModel):
    template: str
    finger_index: int = 1
    quality_score: Optional[int] = None
    is_primary: bool = False


class FingerprintVerifyRequest(BaseModel):
    template: str
    user_id: Optional[int] = None


class BiometricLoginRequest(BaseModel):
    template: str
    tenant_id: Optional[int] = None


class ClockInOutRequest(BaseModel):
    template: str
    location_id: Optional[int] = None


class AuthorizeActionRequest(BaseModel):
    template: str
    action_type: str
    reference_id: Optional[int] = None
    notes: Optional[str] = None


class FingerprintResponse(BaseModel):
    id: int
    user_id: int
    finger_index: int
    is_primary: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class AttendanceResponse(BaseModel):
    id: int
    user_id: int
    user_name: str
    clock_in: datetime
    clock_out: Optional[datetime]
    total_hours: Optional[int]
    location_name: Optional[str]

    class Config:
        from_attributes = True


def hash_template(template: str) -> str:
    return hashlib.sha256(template.encode()).hexdigest()


def verify_fingerprint_match(stored_template: str, captured_template: str) -> tuple[bool, int]:
    if stored_template == captured_template:
        return True, 100
    return False, 0


@router.get("/status")
async def get_biometric_status(current_user: User = Depends(get_current_user)):
    return {
        "enabled": True,
        "service_url": "http://localhost:8765",
        "message": "Biometric service available"
    }


@router.post("/enroll", response_model=FingerprintResponse)
async def enroll_fingerprint(
    request: FingerprintEnrollRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(Fingerprint).filter(
        and_(
            Fingerprint.user_id == current_user.id,
            Fingerprint.finger_index == request.finger_index,
            Fingerprint.is_active == True
        )
    ).first()
    
    if existing:
        existing.template = request.template
        existing.quality_score = request.quality_score
        existing.is_primary = request.is_primary
        existing.updated_at = now_colombia()
        db.commit()
        db.refresh(existing)
        return existing
    
    fingerprint = Fingerprint(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        finger_index=request.finger_index,
        template=request.template,
        quality_score=request.quality_score,
        is_primary=request.is_primary
    )
    
    db.add(fingerprint)
    db.commit()
    db.refresh(fingerprint)
    
    log = BiometricLog(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        event_type=BiometricEventType.LOGIN,
        success=True,
        notes="Fingerprint enrolled"
    )
    db.add(log)
    db.commit()
    
    return fingerprint


@router.post("/enroll-user/{user_id}", response_model=FingerprintResponse)
async def enroll_user_fingerprint(
    user_id: int,
    request: FingerprintEnrollRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if current_user.tenant_id and user.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Cannot enroll fingerprint for user from different tenant")
    
    existing = db.query(Fingerprint).filter(
        and_(
            Fingerprint.user_id == user_id,
            Fingerprint.finger_index == request.finger_index,
            Fingerprint.is_active == True
        )
    ).first()
    
    if existing:
        existing.template = request.template
        existing.quality_score = request.quality_score
        existing.is_primary = request.is_primary
        existing.updated_at = now_colombia()
        db.commit()
        db.refresh(existing)
        return existing
    
    fingerprint = Fingerprint(
        user_id=user_id,
        tenant_id=user.tenant_id,
        finger_index=request.finger_index,
        template=request.template,
        quality_score=request.quality_score,
        is_primary=request.is_primary
    )
    
    db.add(fingerprint)
    db.commit()
    db.refresh(fingerprint)
    
    return fingerprint


@router.post("/verify")
async def verify_fingerprint(
    request: FingerprintVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    user_id = request.user_id or current_user.id
    
    fingerprints = db.query(Fingerprint).filter(
        and_(
            Fingerprint.user_id == user_id,
            Fingerprint.is_active == True
        )
    ).all()
    
    if not fingerprints:
        raise HTTPException(status_code=404, detail="No fingerprints enrolled for this user")
    
    for fp in fingerprints:
        match, score = verify_fingerprint_match(fp.template, request.template)
        if match:
            log = BiometricLog(
                user_id=user_id,
                tenant_id=current_user.tenant_id,
                event_type=BiometricEventType.LOGIN,
                success=True,
                match_score=score
            )
            db.add(log)
            db.commit()
            
            return {
                "verified": True,
                "user_id": user_id,
                "match_score": score,
                "finger_index": fp.finger_index
            }
    
    log = BiometricLog(
        user_id=user_id,
        tenant_id=current_user.tenant_id,
        event_type=BiometricEventType.LOGIN,
        success=False,
        match_score=0
    )
    db.add(log)
    db.commit()
    
    return {
        "verified": False,
        "user_id": user_id,
        "match_score": 0
    }


@router.post("/login")
async def biometric_login(
    request: BiometricLoginRequest,
    http_request: Request,
    db: Session = Depends(get_db)
):
    query = db.query(Fingerprint).filter(Fingerprint.is_active == True)
    
    if request.tenant_id:
        query = query.filter(Fingerprint.tenant_id == request.tenant_id)
    
    fingerprints = query.all()
    
    for fp in fingerprints:
        match, score = verify_fingerprint_match(fp.template, request.template)
        if match:
            user = db.query(User).filter(User.id == fp.user_id).first()
            if user and user.is_active:
                log = BiometricLog(
                    user_id=user.id,
                    tenant_id=user.tenant_id,
                    event_type=BiometricEventType.LOGIN,
                    success=True,
                    match_score=score,
                    ip_address=http_request.client.host if http_request.client else None
                )
                db.add(log)
                db.commit()
                
                from app.utils.auth import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
                access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
                access_token = create_access_token(
                    data={"sub": user.username, "user_id": user.id},
                    expires_delta=access_token_expires
                )
                
                role_response = None
                if user.role:
                    role_response = RoleResponse(
                        id=user.role.id,
                        name=user.role.name,
                        role_type=user.role.role_type,
                        can_void_sales=user.role.can_void_sales,
                        can_manage_inventory=user.role.can_manage_inventory,
                        can_manage_users=user.role.can_manage_users,
                        can_view_reports=user.role.can_view_reports,
                        can_manage_locations=user.role.can_manage_locations,
                        can_set_stock_thresholds=user.role.can_set_stock_thresholds,
                        can_close_shifts=user.role.can_close_shifts,
                        created_at=user.role.created_at
                    )
                
                user_response = UserResponse(
                    id=user.id,
                    username=user.username,
                    email=user.email,
                    full_name=user.full_name,
                    role_id=user.role_id,
                    role=role_response,
                    location_id=user.location_id,
                    tenant_id=user.tenant_id,
                    is_active=user.is_active,
                    points=user.points,
                    created_at=user.created_at
                )
                
                log_audit(
                    db=db,
                    action="login",
                    user_id=user.id,
                    tenant_id=user.tenant_id,
                    username=user.username,
                    resource_type="session",
                    details={"method": "biometric", "match_score": score},
                    ip_address=http_request.client.host if http_request.client else None
                )
                
                return {
                    "access_token": access_token,
                    "token_type": "bearer",
                    "user": user_response
                }
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Huella no reconocida"
    )


@router.post("/clock-in-out")
async def clock_in_out(
    request: ClockInOutRequest,
    http_request: Request,
    db: Session = Depends(get_db)
):
    fingerprints = db.query(Fingerprint).filter(Fingerprint.is_active == True).all()
    
    matched_user = None
    match_score = 0
    
    for fp in fingerprints:
        match, score = verify_fingerprint_match(fp.template, request.template)
        if match:
            matched_user = db.query(User).filter(User.id == fp.user_id).first()
            match_score = score
            break
    
    if not matched_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Fingerprint not recognized"
        )
    
    today_start = now_colombia().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    open_attendance = db.query(AttendanceRecord).filter(
        and_(
            AttendanceRecord.user_id == matched_user.id,
            AttendanceRecord.clock_in >= today_start,
            AttendanceRecord.clock_in < today_end,
            AttendanceRecord.clock_out == None
        )
    ).first()
    
    if open_attendance:
        now = now_colombia()
        open_attendance.clock_out = now
        total_minutes = int((now - open_attendance.clock_in).total_seconds() / 60)
        open_attendance.total_hours = total_minutes
        
        log = BiometricLog(
            user_id=matched_user.id,
            tenant_id=matched_user.tenant_id,
            location_id=request.location_id,
            event_type=BiometricEventType.CLOCK_OUT,
            success=True,
            match_score=match_score,
            ip_address=http_request.client.host if http_request.client else None
        )
        db.add(log)
        open_attendance.clock_out_biometric_log_id = log.id
        
        db.commit()
        
        hours = total_minutes // 60
        minutes = total_minutes % 60
        
        return {
            "action": "clock_out",
            "user": {
                "id": matched_user.id,
                "full_name": matched_user.full_name
            },
            "clock_in": open_attendance.clock_in.isoformat(),
            "clock_out": now.isoformat(),
            "total_time": f"{hours}h {minutes}m"
        }
    else:
        now = now_colombia()
        
        log = BiometricLog(
            user_id=matched_user.id,
            tenant_id=matched_user.tenant_id,
            location_id=request.location_id,
            event_type=BiometricEventType.CLOCK_IN,
            success=True,
            match_score=match_score,
            ip_address=http_request.client.host if http_request.client else None
        )
        db.add(log)
        db.commit()
        
        attendance = AttendanceRecord(
            user_id=matched_user.id,
            tenant_id=matched_user.tenant_id,
            location_id=request.location_id,
            clock_in=now,
            clock_in_biometric_log_id=log.id
        )
        db.add(attendance)
        db.commit()
        
        return {
            "action": "clock_in",
            "user": {
                "id": matched_user.id,
                "full_name": matched_user.full_name
            },
            "clock_in": now.isoformat()
        }


@router.post("/authorize")
async def authorize_action(
    request: AuthorizeActionRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    fingerprints = db.query(Fingerprint).filter(
        and_(
            Fingerprint.is_active == True,
            Fingerprint.tenant_id == current_user.tenant_id
        )
    ).all()
    
    authorized_user = None
    match_score = 0
    
    for fp in fingerprints:
        match, score = verify_fingerprint_match(fp.template, request.template)
        if match:
            authorized_user = db.query(User).filter(User.id == fp.user_id).first()
            match_score = score
            break
    
    if not authorized_user:
        log = BiometricLog(
            user_id=current_user.id,
            tenant_id=current_user.tenant_id,
            event_type=BiometricEventType.AUTHORIZATION,
            success=False,
            notes=f"Failed authorization attempt for {request.action_type}",
            ip_address=http_request.client.host if http_request.client else None
        )
        db.add(log)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Fingerprint not recognized"
        )
    
    has_permission = False
    if authorized_user.role:
        if request.action_type == "void_sale":
            has_permission = authorized_user.role.can_void_sales
        elif request.action_type == "discount":
            has_permission = authorized_user.role.can_void_sales
        elif request.action_type == "manage_inventory":
            has_permission = authorized_user.role.can_manage_inventory
        else:
            has_permission = authorized_user.role.role_type.value in ["admin", "superuser"]
    
    event_type = BiometricEventType.VOID_SALE if request.action_type == "void_sale" else BiometricEventType.AUTHORIZATION
    
    log = BiometricLog(
        user_id=authorized_user.id,
        tenant_id=authorized_user.tenant_id,
        event_type=event_type,
        success=has_permission,
        match_score=match_score,
        notes=f"Authorization for {request.action_type}: {'granted' if has_permission else 'denied'}",
        ip_address=http_request.client.host if http_request.client else None
    )
    db.add(log)
    db.commit()
    
    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User {authorized_user.full_name} does not have permission for {request.action_type}"
        )
    
    return {
        "authorized": True,
        "user": {
            "id": authorized_user.id,
            "full_name": authorized_user.full_name,
            "role": authorized_user.role.name if authorized_user.role else None
        },
        "action_type": request.action_type,
        "match_score": match_score
    }


@router.get("/fingerprints", response_model=List[FingerprintResponse])
async def get_user_fingerprints(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    target_user_id = user_id or current_user.id
    
    fingerprints = db.query(Fingerprint).filter(
        and_(
            Fingerprint.user_id == target_user_id,
            Fingerprint.is_active == True
        )
    ).all()
    
    return fingerprints


@router.delete("/fingerprints/{fingerprint_id}")
async def delete_fingerprint(
    fingerprint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    fingerprint = db.query(Fingerprint).filter(Fingerprint.id == fingerprint_id).first()
    
    if not fingerprint:
        raise HTTPException(status_code=404, detail="Fingerprint not found")
    
    if fingerprint.user_id != current_user.id:
        if not current_user.role or current_user.role.role_type.value not in ["admin", "superuser"]:
            raise HTTPException(status_code=403, detail="Not authorized to delete this fingerprint")
    
    fingerprint.is_active = False
    db.commit()
    
    return {"message": "Fingerprint deleted successfully"}


@router.get("/attendance", response_model=List[AttendanceResponse])
async def get_attendance_records(
    user_id: Optional[int] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(AttendanceRecord)
    
    if current_user.tenant_id:
        query = query.filter(AttendanceRecord.tenant_id == current_user.tenant_id)
    
    if user_id:
        query = query.filter(AttendanceRecord.user_id == user_id)
    
    if start_date:
        query = query.filter(AttendanceRecord.clock_in >= start_date)
    
    if end_date:
        query = query.filter(AttendanceRecord.clock_in <= end_date)
    
    records = query.order_by(AttendanceRecord.clock_in.desc()).limit(100).all()
    
    result = []
    for record in records:
        user = db.query(User).filter(User.id == record.user_id).first()
        location = db.query(Location).filter(Location.id == record.location_id).first() if record.location_id else None
        
        result.append(AttendanceResponse(
            id=record.id,
            user_id=record.user_id,
            user_name=user.full_name if user else "Unknown",
            clock_in=record.clock_in,
            clock_out=record.clock_out,
            total_hours=record.total_hours,
            location_name=location.name if location else None
        ))
    
    return result


@router.get("/logs")
async def get_biometric_logs(
    user_id: Optional[int] = None,
    event_type: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(BiometricLog)
    
    if current_user.tenant_id:
        query = query.filter(BiometricLog.tenant_id == current_user.tenant_id)
    
    if user_id:
        query = query.filter(BiometricLog.user_id == user_id)
    
    if event_type:
        query = query.filter(BiometricLog.event_type == event_type)
    
    logs = query.order_by(BiometricLog.created_at.desc()).limit(limit).all()
    
    result = []
    for log in logs:
        user = db.query(User).filter(User.id == log.user_id).first()
        result.append({
            "id": log.id,
            "user_id": log.user_id,
            "user_name": user.full_name if user else "Unknown",
            "event_type": log.event_type.value,
            "success": log.success,
            "match_score": log.match_score,
            "notes": log.notes,
            "created_at": log.created_at.isoformat()
        })
    
    return result
