from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from app.models.sale import PaymentMethod


class SalesReportRequest(BaseModel):
    start_date: date
    end_date: date
    location_id: Optional[int] = None
    cashier_id: Optional[int] = None


class SaleDetailReport(BaseModel):
    sale_id: int
    folio: str
    date: datetime
    time: str
    product_name: str
    product_code: str
    quantity: float
    unit_price: float
    subtotal: float
    payment_method: PaymentMethod
    cashier_name: str
    location_name: str


class SalesReportResponse(BaseModel):
    total_sales: float
    total_transactions: int
    total_cash: float
    total_card: float
    total_transfer: float
    sales_by_day: List[dict]
    details: List[SaleDetailReport] = []


class ProductStockReport(BaseModel):
    product_id: int
    product_code: str
    product_name: str
    group_name: str
    family_name: str
    subfamily_name: str
    unit: str
    sale_price: float
    weighted_cost: float
    quantity: float
    min_stock: int
    max_stock: int
    stock_value: float
    status: str


class InventoryReportResponse(BaseModel):
    location_id: Optional[int]
    location_name: Optional[str]
    total_products: int
    total_stock_value: float
    low_stock_count: int
    high_stock_count: int
    products: List[ProductStockReport] = []


class EmployeeShiftReport(BaseModel):
    shift_id: int
    date: date
    start_time: datetime
    end_time: Optional[datetime]
    hours_worked: Optional[float]
    total_sales: float
    transactions_count: int


class EmployeeReportResponse(BaseModel):
    user_id: int
    user_name: str
    total_hours: float
    total_sales: float
    total_transactions: int
    points: int
    alerts_count: int
    shifts: List[EmployeeShiftReport] = []


class EmployeeSummary(BaseModel):
    user_id: int
    full_name: str
    username: str
    role: str
    total_hours: float
    total_shifts: int
    total_sales: float
    total_transactions: int
    avg_sales_per_shift: float
    avg_hours_per_shift: float
    points: int
    is_active: bool


class EmployeesReportResponse(BaseModel):
    start_date: date
    end_date: date
    total_employees: int
    total_hours_all: float
    total_sales_all: float
    total_transactions_all: int
    employees: List[EmployeeSummary] = []


class ProfitabilityByDay(BaseModel):
    date: str
    sales: float
    cost_of_goods: float
    expenses: float
    losses: float
    gross_profit: float
    net_profit: float


class ProfitabilitySummary(BaseModel):
    total_sales: float
    total_cost_of_goods: float
    gross_profit: float
    gross_margin_pct: float
    total_expenses: float
    total_losses: float
    net_profit: float
    net_margin_pct: float
    total_transactions: int
    expenses_by_category: dict = {}
    losses_by_type: dict = {}


class ProfitabilityReportResponse(BaseModel):
    start_date: date
    end_date: date
    location_name: Optional[str]
    summary: ProfitabilitySummary
    by_day: List[ProfitabilityByDay] = []


class PurchaseDetail(BaseModel):
    id: int
    date: str
    product_code: str
    product_name: str
    location_name: str
    quantity: float
    unit_cost: float
    total_cost: float
    registered_by: str
    notes: Optional[str] = None


class PurchasesReportResponse(BaseModel):
    start_date: date
    end_date: date
    location_name: Optional[str]
    total_purchases: int
    total_quantity: float
    total_cost: float
    purchases: List[PurchaseDetail] = []
