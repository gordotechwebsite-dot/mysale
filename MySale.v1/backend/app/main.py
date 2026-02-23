from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import engine, Base, SessionLocal
from app.models import *
from app.routers import auth, users, locations, inventory, shifts, sales, cash, losses, transfers, expenses, reports, cost_control, tables, tenants, integration, faq, biometric, branches


def run_migrations():
    """Run database migrations to add missing columns and modules"""
    from sqlalchemy import text
    from app.database import SessionLocal
    from app.models.tenant import Module
    
    db = SessionLocal()
    try:
        # Check if image_url column exists in locations table
        result = db.execute(text("PRAGMA table_info(locations)"))
        columns = [row[1] for row in result.fetchall()]
        
        if 'image_url' not in columns:
            db.execute(text("ALTER TABLE locations ADD COLUMN image_url VARCHAR(500)"))
            db.commit()
            print("Migration: Added image_url column to locations table")
        
        # Check if products table exists and fix subfamily_id constraint
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='products'"))
        if result.fetchone():
            result = db.execute(text("PRAGMA table_info(products)"))
            product_columns = {row[1]: row for row in result.fetchall()}
            
            if 'group_id' not in product_columns:
                db.execute(text("ALTER TABLE products ADD COLUMN group_id INTEGER REFERENCES groups(id)"))
                db.commit()
                print("Migration: Added group_id column to products table")
            
            if 'is_weighted' not in product_columns:
                db.execute(text("ALTER TABLE products ADD COLUMN is_weighted BOOLEAN DEFAULT 0"))
                db.commit()
                print("Migration: Added is_weighted column to products table")
            
            if 'price_per_kg' not in product_columns:
                db.execute(text("ALTER TABLE products ADD COLUMN price_per_kg FLOAT"))
                db.commit()
                print("Migration: Added price_per_kg column to products table")
            
            if 'plu_code' not in product_columns:
                db.execute(text("ALTER TABLE products ADD COLUMN plu_code VARCHAR(10)"))
                db.commit()
                print("Migration: Added plu_code column to products table")
            
            if 'image_url' not in product_columns:
                db.execute(text("ALTER TABLE products ADD COLUMN image_url VARCHAR(500)"))
                db.commit()
                print("Migration: Added image_url column to products table")
        
        # Check if users table needs new columns
        result = db.execute(text("PRAGMA table_info(users)"))
        user_columns = [row[1] for row in result.fetchall()]
        
        if 'employee_code' not in user_columns:
            db.execute(text("ALTER TABLE users ADD COLUMN employee_code VARCHAR(20)"))
            db.commit()
            print("Migration: Added employee_code column to users table")
        
        if 'default_branch_id' not in user_columns:
            db.execute(text("ALTER TABLE users ADD COLUMN default_branch_id INTEGER REFERENCES branches(id)"))
            db.commit()
            print("Migration: Added default_branch_id column to users table")
        
        # Fix branches table tenant_id constraint (must allow NULL)
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='branches'"))
        if result.fetchone():
            result = db.execute(text("PRAGMA table_info(branches)"))
            branch_columns = {row[1]: row for row in result.fetchall()}
            if 'tenant_id' in branch_columns:
                col_info = branch_columns['tenant_id']
                notnull = col_info[3]  # notnull flag is at index 3
                if notnull:
                    print("Migration: Fixing branches.tenant_id NOT NULL constraint...")
                    db.execute(text("PRAGMA foreign_keys=OFF"))
                    db.execute(text("""
                        CREATE TABLE branches_new (
                            id INTEGER PRIMARY KEY,
                            tenant_id INTEGER REFERENCES tenants(id),
                            name VARCHAR(200) NOT NULL,
                            code VARCHAR(50) NOT NULL,
                            city VARCHAR(100),
                            address TEXT,
                            phone VARCHAR(50),
                            is_active BOOLEAN DEFAULT 1,
                            created_at DATETIME,
                            updated_at DATETIME
                        )
                    """))
                    db.execute(text("INSERT INTO branches_new SELECT * FROM branches"))
                    db.execute(text("DROP TABLE branches"))
                    db.execute(text("ALTER TABLE branches_new RENAME TO branches"))
                    db.execute(text("CREATE INDEX ix_branches_id ON branches(id)"))
                    db.execute(text("PRAGMA foreign_keys=ON"))
                    db.commit()
                    print("Migration: Fixed branches.tenant_id to allow NULL")
        
        # Fix work_sessions table tenant_id constraint (must allow NULL)
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='work_sessions'"))
        if result.fetchone():
            result = db.execute(text("PRAGMA table_info(work_sessions)"))
            ws_columns = {row[1]: row for row in result.fetchall()}
            if 'tenant_id' in ws_columns:
                col_info = ws_columns['tenant_id']
                notnull = col_info[3]  # notnull flag is at index 3
                if notnull:
                    print("Migration: Fixing work_sessions.tenant_id NOT NULL constraint...")
                    db.execute(text("PRAGMA foreign_keys=OFF"))
                    db.execute(text("""
                        CREATE TABLE work_sessions_new (
                            id INTEGER PRIMARY KEY,
                            tenant_id INTEGER REFERENCES tenants(id),
                            user_id INTEGER NOT NULL REFERENCES users(id),
                            branch_id INTEGER NOT NULL REFERENCES branches(id),
                            clock_in DATETIME NOT NULL,
                            clock_out DATETIME,
                            total_minutes INTEGER,
                            notes TEXT,
                            created_at DATETIME,
                            updated_at DATETIME
                        )
                    """))
                    db.execute(text("INSERT INTO work_sessions_new SELECT * FROM work_sessions"))
                    db.execute(text("DROP TABLE work_sessions"))
                    db.execute(text("ALTER TABLE work_sessions_new RENAME TO work_sessions"))
                    db.execute(text("CREATE INDEX ix_work_sessions_id ON work_sessions(id)"))
                    db.execute(text("PRAGMA foreign_keys=ON"))
                    db.commit()
                    print("Migration: Fixed work_sessions.tenant_id to allow NULL")
        
        # Check if products table exists and fix subfamily_id constraint
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='products'"))
        if result.fetchone():
            result = db.execute(text("PRAGMA table_info(products)"))
            product_columns = {row[1]: row for row in result.fetchall()}
            
            # Check if subfamily_id has NOT NULL constraint and fix it
            if 'subfamily_id' in product_columns:
                col_info = product_columns['subfamily_id']
                notnull = col_info[3]  # notnull flag is at index 3
                if notnull:
                    print("Migration: Fixing subfamily_id NOT NULL constraint...")
                    db.execute(text("PRAGMA foreign_keys=OFF"))
                    db.execute(text("""
                        CREATE TABLE products_new (
                            id INTEGER PRIMARY KEY,
                            tenant_id INTEGER REFERENCES tenants(id),
                            code VARCHAR(50) NOT NULL,
                            barcode VARCHAR(50),
                            name VARCHAR(200) NOT NULL,
                            description TEXT,
                            subfamily_id INTEGER REFERENCES subfamilies(id),
                            group_id INTEGER REFERENCES groups(id),
                            unit VARCHAR(20) DEFAULT 'unidad',
                            sale_price FLOAT NOT NULL,
                            weighted_cost FLOAT DEFAULT 0.0,
                            min_stock INTEGER DEFAULT 0,
                            max_stock INTEGER DEFAULT 1000,
                            is_active BOOLEAN DEFAULT 1,
                            is_weighted BOOLEAN DEFAULT 0,
                            price_per_kg FLOAT,
                            plu_code VARCHAR(10),
                            created_at DATETIME,
                            updated_at DATETIME
                        )
                    """))
                    db.execute(text("""
                        INSERT INTO products_new SELECT * FROM products
                    """))
                    db.execute(text("DROP TABLE products"))
                    db.execute(text("ALTER TABLE products_new RENAME TO products"))
                    db.execute(text("CREATE INDEX ix_products_id ON products(id)"))
                    db.execute(text("CREATE INDEX ix_products_code ON products(code)"))
                    db.execute(text("CREATE INDEX ix_products_barcode ON products(barcode)"))
                    db.execute(text("CREATE INDEX ix_products_plu_code ON products(plu_code)"))
                    db.execute(text("PRAGMA foreign_keys=ON"))
                    db.commit()
                    print("Migration: Fixed subfamily_id to allow NULL")
        
        # Ensure all modules exist in the database
        all_modules = [
            {"code": "dashboard", "name": "Dashboard", "description": "Panel principal con resumen de ventas y métricas", "icon": "LayoutDashboard", "route": "/dashboard", "display_order": 1, "is_core": True},
            {"code": "quick_sale", "name": "Venta Rapida", "description": "Interfaz rapida para ventas directas sin turno", "icon": "Zap", "route": "/quick-sale", "display_order": 2, "is_core": False},
            {"code": "inventory", "name": "Inventario", "description": "Gestión de productos, grupos, familias y stock", "icon": "Package", "route": "/inventory", "display_order": 3, "is_core": True},
            {"code": "tables", "name": "Gestion de Mesas", "description": "Control de mesas, cuentas y comandas para restaurantes", "icon": "UtensilsCrossed", "route": "/tables", "display_order": 4, "is_core": False},
            {"code": "losses", "name": "Mermas", "description": "Registro y control de pérdidas de inventario", "icon": "AlertTriangle", "route": "/losses", "display_order": 5, "is_core": False},
            {"code": "transfers", "name": "Traspasos", "description": "Transferencias de productos entre sucursales", "icon": "ArrowLeftRight", "route": "/transfers", "display_order": 6, "is_core": False},
            {"code": "expenses", "name": "Gastos", "description": "Registro de gastos operativos", "icon": "Receipt", "route": "/expenses", "display_order": 7, "is_core": False},
            {"code": "cost_control", "name": "Control de Costos", "description": "Gestión y distribución de costos operativos", "icon": "Calculator", "route": "/cost-control", "display_order": 8, "is_core": False},
            {"code": "cash", "name": "Caja", "description": "Arqueos y cortes de caja", "icon": "Banknote", "route": "/cash", "display_order": 9, "is_core": False},
            {"code": "shifts", "name": "Turnos", "description": "Gestión de turnos de trabajo y horarios", "icon": "Clock", "route": "/shifts", "display_order": 10, "is_core": False},
            {"code": "reports", "name": "Reportes", "description": "Reportes de ventas, inventario y empleados", "icon": "BarChart3", "route": "/reports", "display_order": 11, "is_core": False},
            {"code": "users", "name": "Usuarios", "description": "Gestión de usuarios y roles", "icon": "Users", "route": "/users", "display_order": 12, "is_core": False},
                    {"code": "locations", "name": "Sucursales", "description": "Gestión de puntos de venta y almacenes", "icon": "MapPin", "route": "/locations", "display_order": 13, "is_core": False},
                    {"code": "branches", "name": "Sedes", "description": "Gestión de sedes y sucursales del negocio", "icon": "Building2", "route": "/branches", "display_order": 14, "is_core": False},
                    {"code": "work_report", "name": "Horas Trabajadas", "description": "Reporte de horas trabajadas por empleado", "icon": "ClipboardList", "route": "/work-report", "display_order": 15, "is_core": False},
                    {"code": "super_admin", "name": "Super Admin", "description": "Panel de administración de tenants", "icon": "Shield", "route": "/super-admin", "display_order": 16, "is_core": False},
                ]
        
        for module_data in all_modules:
            existing = db.query(Module).filter(Module.code == module_data["code"]).first()
            if not existing:
                new_module = Module(
                    code=module_data["code"],
                    name=module_data["name"],
                    description=module_data["description"],
                    icon=module_data["icon"],
                    route=module_data["route"],
                    display_order=module_data["display_order"],
                    is_core=module_data["is_core"],
                    is_active=True
                )
                db.add(new_module)
                print(f"Migration: Added {module_data['code']} module")
        
        db.commit()
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
    init_default_modules()
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
app.include_router(branches.router)
app.include_router(inventory.router)
app.include_router(shifts.router)
app.include_router(sales.router)
app.include_router(cash.router)
app.include_router(losses.router)
app.include_router(transfers.router)
app.include_router(expenses.router)
app.include_router(reports.router)
app.include_router(cost_control.router)
app.include_router(tables.router)
app.include_router(tenants.router)
app.include_router(integration.router)
app.include_router(faq.router)
app.include_router(biometric.router)


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


def init_default_modules():
    from app.models.tenant import Module
    
    db = SessionLocal()
    try:
        existing_module = db.query(Module).first()
        if existing_module:
            return
        
        modules = [
            Module(code="dashboard", name="Dashboard", description="Panel principal con resumen de ventas y métricas", icon="LayoutDashboard", route="/dashboard", display_order=1, is_core=True),
            Module(code="quick_sale", name="Venta Rapida", description="Interfaz rapida para ventas directas sin turno", icon="Zap", route="/quick-sale", display_order=2, is_core=False),
            Module(code="inventory", name="Inventario", description="Gestión de productos, grupos, familias y stock", icon="Package", route="/inventory", display_order=3, is_core=True),
            Module(code="tables", name="Gestion de Mesas", description="Control de mesas, cuentas y comandas para restaurantes", icon="UtensilsCrossed", route="/tables", display_order=4, is_core=False),
            Module(code="losses", name="Mermas", description="Registro y control de pérdidas de inventario", icon="AlertTriangle", route="/losses", display_order=5, is_core=False),
            Module(code="transfers", name="Traspasos", description="Transferencias de productos entre sucursales", icon="ArrowLeftRight", route="/transfers", display_order=6, is_core=False),
            Module(code="expenses", name="Gastos", description="Registro de gastos operativos", icon="Receipt", route="/expenses", display_order=7, is_core=False),
            Module(code="cost_control", name="Control de Costos", description="Gestión y distribución de costos operativos", icon="Calculator", route="/cost-control", display_order=8, is_core=False),
            Module(code="cash", name="Caja", description="Arqueos y cortes de caja", icon="Banknote", route="/cash", display_order=9, is_core=False),
            Module(code="shifts", name="Turnos", description="Gestión de turnos de trabajo y horarios", icon="Clock", route="/shifts", display_order=10, is_core=False),
            Module(code="reports", name="Reportes", description="Reportes de ventas, inventario y empleados", icon="BarChart3", route="/reports", display_order=11, is_core=False),
            Module(code="users", name="Usuarios", description="Gestión de usuarios y roles", icon="Users", route="/users", display_order=12, is_core=False),
                    Module(code="locations", name="Sucursales", description="Gestión de puntos de venta y almacenes", icon="MapPin", route="/locations", display_order=13, is_core=False),
                    Module(code="branches", name="Sedes", description="Gestión de sedes y sucursales del negocio", icon="Building2", route="/branches", display_order=14, is_core=False),
                    Module(code="work_report", name="Horas Trabajadas", description="Reporte de horas trabajadas por empleado", icon="ClipboardList", route="/work-report", display_order=15, is_core=False),
                    Module(code="super_admin", name="Super Admin", description="Panel de administración de tenants", icon="Shield", route="/super-admin", display_order=16, is_core=False),
                ]
        
        for module in modules:
            db.add(module)
        
        db.commit()
        print("Módulos iniciales creados exitosamente")
        
    except Exception as e:
        db.rollback()
        print(f"Error al crear módulos iniciales: {e}")
    finally:
        db.close()


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
