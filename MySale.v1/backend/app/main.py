from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import engine, Base, SessionLocal
from app.models import *
from app.routers import auth, users, locations, inventory, shifts, sales, cash, losses, transfers, expenses, reports, cost_control


def run_migrations():
    """Run database migrations to add missing columns"""
    from sqlalchemy import text
    from app.database import SessionLocal
    
    db = SessionLocal()
    try:
        # Check if image_url column exists in locations table
        result = db.execute(text("PRAGMA table_info(locations)"))
        columns = [row[1] for row in result.fetchall()]
        
        if 'image_url' not in columns:
            db.execute(text("ALTER TABLE locations ADD COLUMN image_url VARCHAR(500)"))
            db.commit()
            print("Migration: Added image_url column to locations table")
    except Exception as e:
        print(f"Migration error: {e}")
        db.rollback()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    run_migrations()
    init_default_data()
    yield


app = FastAPI(
    title="MySale.v1 - Sistema POS",
    description="Sistema de Punto de Venta para GALIA 1539",
    version="1.0.0",
    lifespan=lifespan
)

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(locations.router)
app.include_router(inventory.router)
app.include_router(shifts.router)
app.include_router(sales.router)
app.include_router(cash.router)
app.include_router(losses.router)
app.include_router(transfers.router)
app.include_router(expenses.router)
app.include_router(reports.router)
app.include_router(cost_control.router)


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/")
async def root():
    return {
        "name": "MySale.v1",
        "version": "1.0.0",
        "description": "Sistema POS para GALIA 1539"
    }


def init_default_data():
    from app.models.user import Role, User, RoleType
    from app.models.location import Location, LocationType
    from app.utils.auth import get_password_hash
    
    db = SessionLocal()
    try:
        existing_role = db.query(Role).first()
        if existing_role:
            return
        
        superuser_role = Role(
            name="Superusuario",
            role_type=RoleType.SUPERUSER,
            can_void_sales=True,
            can_manage_inventory=True,
            can_manage_users=True,
            can_view_reports=True,
            can_manage_locations=True,
            can_set_stock_thresholds=True,
            can_close_shifts=True
        )
        db.add(superuser_role)
        
        admin_role = Role(
            name="Administrador",
            role_type=RoleType.ADMIN,
            can_void_sales=False,
            can_manage_inventory=True,
            can_manage_users=True,
            can_view_reports=True,
            can_manage_locations=False,
            can_set_stock_thresholds=False,
            can_close_shifts=False
        )
        db.add(admin_role)
        
        cashier_role = Role(
            name="Cajero",
            role_type=RoleType.CASHIER,
            can_void_sales=False,
            can_manage_inventory=False,
            can_manage_users=False,
            can_view_reports=False,
            can_manage_locations=False,
            can_set_stock_thresholds=False,
            can_close_shifts=False
        )
        db.add(cashier_role)
        db.flush()
        
        galia = Location(
            name="GALIA 1539",
            code="GALIA",
            location_type=LocationType.POS,
            daily_base_cash=100000,
            folio_prefix="G"
        )
        db.add(galia)
        
        summer1 = Location(
            name="SUMMER SED 1",
            code="SUMMER1",
            location_type=LocationType.POS,
            daily_base_cash=100000,
            folio_prefix="S1"
        )
        db.add(summer1)
        
        summer2 = Location(
            name="SUMMER SED 2",
            code="SUMMER2",
            location_type=LocationType.POS,
            daily_base_cash=100000,
            folio_prefix="S2"
        )
        db.add(summer2)
        
        warehouse = Location(
            name="Almacen Central",
            code="ALMACEN",
            location_type=LocationType.WAREHOUSE,
            daily_base_cash=0,
            folio_prefix="A"
        )
        db.add(warehouse)
        db.flush()
        
        admin_user = User(
            username="admin",
            email="admin@mysale.com",
            full_name="Administrador del Sistema",
            hashed_password=get_password_hash("admin123"),
            role_id=superuser_role.id,
            is_active=True
        )
        db.add(admin_user)
        
        db.commit()
        print("Datos iniciales creados exitosamente")
        
    except Exception as e:
        db.rollback()
        print(f"Error al crear datos iniciales: {e}")
    finally:
        db.close()
