from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class BranchCreate(BaseModel):
    name: str
    code: str
    city: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None


class BranchUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    is_active: Optional[bool] = None


class BranchResponse(BaseModel):
    id: int
    tenant_id: int
    name: str
    code: str
    city: Optional[str]
    address: Optional[str]
    phone: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class WorkSessionCreate(BaseModel):
    branch_id: int
    notes: Optional[str] = None


class WorkSessionClockOut(BaseModel):
    notes: Optional[str] = None


class WorkSessionResponse(BaseModel):
    id: int
    tenant_id: int
    user_id: int
    branch_id: int
    branch_name: Optional[str] = None
    user_name: Optional[str] = None
    employee_code: Optional[str] = None
    clock_in: datetime
    clock_out: Optional[datetime]
    total_minutes: Optional[int]
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class WorkSessionSummary(BaseModel):
    """Summary of work sessions for reporting"""
    user_id: int
    user_name: str
    employee_code: Optional[str]
    total_sessions: int
    total_minutes: int
    total_hours: float
    branches_worked: List[str]


class BranchWorkReport(BaseModel):
    """Work report for a specific branch"""
    branch_id: int
    branch_name: str
    total_sessions: int
    total_minutes: int
    total_hours: float
    employees: List[WorkSessionSummary]
