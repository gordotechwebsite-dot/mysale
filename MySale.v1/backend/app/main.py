from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import asyncio
import logging
from contextlib import asynccontextmanager
from app.database import engine, Base, SessionLocal
from app.models import *
from app.routers import auth, users, locations, inventory, shifts, sales, cash, losses, transfers, expenses, reports, cost_control, tables, tenants, integration, faq, biometric, branches, deliveries, business_profile, notifications
from app.routers.tenants import public_router as tenants_public_router

logger = logging.getLogger("mysale.scheduler")


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

        if 'receipt_logo_url' not in columns:
            db.execute(text("ALTER TABLE locations ADD COLUMN receipt_logo_url VARCHAR(500)"))
            db.commit()
            print("Migration: Added receipt_logo_url column to locations table")

        if 'receipt_business_name' not in columns:
            db.execute(text("ALTER TABLE locations ADD COLUMN receipt_business_name VARCHAR(100)"))
            db.commit()
            print("Migration: Added receipt_business_name column to locations table")

        receipt_profile_columns = {
            'receipt_razon_social': 'VARCHAR(150)',
            'receipt_nit': 'VARCHAR(50)',
            'receipt_slogan': 'VARCHAR(200)',
            'receipt_address': 'VARCHAR(255)',
            'receipt_phone': 'VARCHAR(50)',
            'receipt_email': 'VARCHAR(120)',
        }
        for column_name, column_type in receipt_profile_columns.items():
            if column_name not in columns:
                db.execute(text(f"ALTER TABLE locations ADD COLUMN {column_name} {column_type}"))
                db.commit()
                print(f"Migration: Added {column_name} column to locations table")
        
        if 'has_own_menu' not in columns:
            db.execute(text("ALTER TABLE locations ADD COLUMN has_own_menu BOOLEAN DEFAULT 0 NOT NULL"))
            db.commit()
            # A location that already has its own products keeps only its own menu
            has_products = db.execute(text(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='products'"
            )).fetchone()
            if has_products:
                product_columns = [row[1] for row in db.execute(text("PRAGMA table_info(products)")).fetchall()]
                if 'location_id' in product_columns:
                    db.execute(text(
                        "UPDATE locations SET has_own_menu = 1 WHERE id IN "
                        "(SELECT DISTINCT location_id FROM products WHERE location_id IS NOT NULL)"
                    ))
                    db.commit()
            print("Migration: Added has_own_menu column to locations table")
        
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
            
            if 'location_id' not in product_columns:
                db.execute(text("ALTER TABLE products ADD COLUMN location_id INTEGER REFERENCES locations(id)"))
                db.commit()
                print("Migration: Added location_id column to products table")
            
            if 'is_sold_out' not in product_columns:
                db.execute(text("ALTER TABLE products ADD COLUMN is_sold_out BOOLEAN DEFAULT 0 NOT NULL"))
                db.commit()
                print("Migration: Added is_sold_out column to products table")
        
        # Las mesas creadas sin tenant quedaban invisibles: se toma el tenant de su zona
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='tables'"))
        if result.fetchone():
            db.execute(text(
                "UPDATE tables SET tenant_id = ("
                "SELECT zones.tenant_id FROM zones WHERE zones.id = tables.zone_id"
                ") WHERE tenant_id IS NULL"
            ))
            db.commit()

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
        
        if 'pin_hash' not in user_columns:
            db.execute(text("ALTER TABLE users ADD COLUMN pin_hash VARCHAR(255)"))
            db.commit()
            print("Migration: Added pin_hash column to users table")
        
        if 'pin' in user_columns:
            cleared = db.execute(text("UPDATE users SET pin = NULL WHERE pin IS NOT NULL")).rowcount
            db.commit()
            if cleared:
                print(f"Migration: Cleared {cleared} plain text PIN(s) from users table")
        
        if 'phone' not in user_columns:
            db.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(50)"))
            db.commit()
            print("Migration: Added phone column to users table")
        
        if 'cedula' not in user_columns:
            db.execute(text("ALTER TABLE users ADD COLUMN cedula VARCHAR(50)"))
            db.commit()
            print("Migration: Added cedula column to users table")
        
        if 'photo_url' not in user_columns:
            db.execute(text("ALTER TABLE users ADD COLUMN photo_url VARCHAR(500)"))
            db.commit()
            print("Migration: Added photo_url column to users table")
        
        # Add pos_url, pos_username, pos_password columns to tenants table BEFORE querying tenants
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='tenants'"))
        if result.fetchone():
            result = db.execute(text("PRAGMA table_info(tenants)"))
            tenant_cols = [row[1] for row in result.fetchall()]
            
            if 'pos_url' not in tenant_cols:
                db.execute(text("ALTER TABLE tenants ADD COLUMN pos_url VARCHAR(500)"))
                db.commit()
                print("Migration: Added pos_url column to tenants table")
            
            if 'pos_username' not in tenant_cols:
                db.execute(text("ALTER TABLE tenants ADD COLUMN pos_username VARCHAR(100)"))
                db.commit()
                print("Migration: Added pos_username column to tenants table")
            
            if 'pos_password' not in tenant_cols:
                db.execute(text("ALTER TABLE tenants ADD COLUMN pos_password VARCHAR(100)"))
                db.commit()
                print("Migration: Added pos_password column to tenants table")
            
            if 'razon_social' not in tenant_cols:
                db.execute(text("ALTER TABLE tenants ADD COLUMN razon_social VARCHAR(300)"))
                db.commit()
                print("Migration: Added razon_social column to tenants table")
            
            if 'nit' not in tenant_cols:
                db.execute(text("ALTER TABLE tenants ADD COLUMN nit VARCHAR(50)"))
                db.commit()
                print("Migration: Added nit column to tenants table")
            
            if 'slogan' not in tenant_cols:
                db.execute(text("ALTER TABLE tenants ADD COLUMN slogan TEXT"))
                db.commit()
                print("Migration: Added slogan column to tenants table")

            if 'client_id' not in tenant_cols:
                db.execute(text("ALTER TABLE tenants ADD COLUMN client_id VARCHAR(20)"))
                db.commit()
                print("Migration: Added client_id column to tenants table")

            # Backfill client_id for tenants that don't have one yet
            import secrets as _secrets
            _alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
            rows = db.execute(text(
                "SELECT id FROM tenants WHERE client_id IS NULL OR client_id = ''"
            )).fetchall()
            for row in rows:
                existing_ids = {
                    r[0] for r in db.execute(text(
                        "SELECT client_id FROM tenants WHERE client_id IS NOT NULL"
                    )).fetchall()
                }
                while True:
                    p1 = ''.join(_secrets.choice(_alphabet) for _ in range(4))
                    p2 = ''.join(_secrets.choice(_alphabet) for _ in range(4))
                    new_id = f"MYS-{p1}-{p2}"
                    if new_id not in existing_ids:
                        break
                db.execute(
                    text("UPDATE tenants SET client_id = :cid WHERE id = :tid"),
                    {"cid": new_id, "tid": row[0]}
                )
                db.commit()
                print(f"Migration: Backfilled client_id for tenant id={row[0]} -> {new_id}")
        
        # Add delivery columns to sales table
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='sales'"))
        if result.fetchone():
            result = db.execute(text("PRAGMA table_info(sales)"))
            sale_cols = [row[1] for row in result.fetchall()]
            
            for col_name, col_def in [
                ('sale_type', "VARCHAR(20) DEFAULT 'regular'"),
                ('customer_name', 'VARCHAR(200)'),
                ('customer_phone', 'VARCHAR(50)'),
                ('customer_address', 'TEXT'),
                ('delivery_person', 'VARCHAR(200)'),
                ('delivery_fee', 'FLOAT DEFAULT 0.0'),
                ('delivery_status', 'VARCHAR(20)'),
                ('delivered_at', 'DATETIME'),
                ('client_uuid', 'VARCHAR(64)'),
            ]:
                if col_name not in sale_cols:
                    db.execute(text(f"ALTER TABLE sales ADD COLUMN {col_name} {col_def}"))
                    db.commit()
                    print(f"Migration: Added {col_name} column to sales table")

            # Unique index on client_uuid guarantees offline sales are never
            # duplicated even if the sync queue retries a request.
            db.execute(text(
                "CREATE UNIQUE INDEX IF NOT EXISTS ix_sales_client_uuid "
                "ON sales (client_uuid) WHERE client_uuid IS NOT NULL"
            ))
            db.commit()
        
        # Add notes column to sale_items table
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='sale_items'"))
        if result.fetchone():
            result = db.execute(text("PRAGMA table_info(sale_items)"))
            si_cols = [row[1] for row in result.fetchall()]
            if 'notes' not in si_cols:
                db.execute(text("ALTER TABLE sale_items ADD COLUMN notes TEXT"))
                db.commit()
                print("Migration: Added notes column to sale_items table")
        
        # Add rotation column to tables table
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='tables'"))
        if result.fetchone():
            result = db.execute(text("PRAGMA table_info(tables)"))
            table_cols = [row[1] for row in result.fetchall()]
            
            if 'rotation' not in table_cols:
                db.execute(text("ALTER TABLE tables ADD COLUMN rotation INTEGER DEFAULT 0"))
                db.commit()
                print("Migration: Added rotation column to tables table")
            
            if 'reserved_by' not in table_cols:
                db.execute(text("ALTER TABLE tables ADD COLUMN reserved_by VARCHAR(100)"))
                db.commit()
                print("Migration: Added reserved_by column to tables table")
            
            if 'reserved_time' not in table_cols:
                db.execute(text("ALTER TABLE tables ADD COLUMN reserved_time VARCHAR(10)"))
                db.commit()
                print("Migration: Added reserved_time column to tables table")
            
            if 'reserved_phone' not in table_cols:
                db.execute(text("ALTER TABLE tables ADD COLUMN reserved_phone VARCHAR(20)"))
                db.commit()
                print("Migration: Added reserved_phone column to tables table")
            
            if 'is_active' not in table_cols:
                db.execute(text("ALTER TABLE tables ADD COLUMN is_active BOOLEAN DEFAULT 1"))
                db.commit()
                print("Migration: Added is_active column to tables table")
            
            db.execute(text("UPDATE tables SET is_active = 1 WHERE is_active IS NULL"))
            db.commit()
            
            # Normalize shape/status values to lowercase (enum expects lowercase)
            db.execute(text("UPDATE tables SET shape = LOWER(shape) WHERE shape != LOWER(shape)"))
            db.execute(text("UPDATE tables SET status = LOWER(status) WHERE status != LOWER(status)"))
            # Migrate old 'round' shape to 'pair'
            db.execute(text("UPDATE tables SET shape = 'pair' WHERE LOWER(shape) = 'round'"))
            db.commit()
        
        # Add missing columns to tickets table
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='tickets'"))
        if result.fetchone():
            result = db.execute(text("PRAGMA table_info(tickets)"))
            ticket_cols = [row[1] for row in result.fetchall()]
            
            if 'opened_at' not in ticket_cols:
                db.execute(text("ALTER TABLE tickets ADD COLUMN opened_at DATETIME"))
                db.commit()
                print("Migration: Added opened_at column to tickets table")
            
            if 'service_charge' not in ticket_cols:
                db.execute(text("ALTER TABLE tickets ADD COLUMN service_charge FLOAT DEFAULT 0"))
                db.commit()
                print("Migration: Added service_charge column to tickets table")
            
            if 'sale_id' not in ticket_cols:
                db.execute(text("ALTER TABLE tickets ADD COLUMN sale_id INTEGER"))
                db.commit()
                print("Migration: Added sale_id column to tickets table")
        
        # Add missing columns to ticket_payments table
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='ticket_payments'"))
        if result.fetchone():
            result = db.execute(text("PRAGMA table_info(ticket_payments)"))
            ticket_payment_cols = [row[1] for row in result.fetchall()]
            
            if 'created_by_id' not in ticket_payment_cols:
                db.execute(text("ALTER TABLE ticket_payments ADD COLUMN created_by_id INTEGER"))
                db.commit()
                print("Migration: Added created_by_id column to ticket_payments table")
        
        # Ensure all tenants have access to all modules (assign missing modules)
        from app.models.tenant import Tenant, TenantModule
        tenants = db.query(Tenant).all()
        all_modules = db.query(Module).filter(Module.is_active == True).all()
        for tenant in tenants:
            for module in all_modules:
                existing = db.query(TenantModule).filter(
                    TenantModule.tenant_id == tenant.id,
                    TenantModule.module_id == module.id
                ).first()
                if not existing:
                    new_tm = TenantModule(
                        tenant_id=tenant.id,
                        module_id=module.id,
                        is_enabled=module.is_core  # Enable core modules by default
                    )
                    db.add(new_tm)
                    print(f"Migration: Added module {module.code} to tenant {tenant.name}")
        db.commit()
        
        # Deactivate duplicate/redundant modules
        modules_to_deactivate = ['branches', 'work_report', 'super_admin', 'cost_control']
        for code in modules_to_deactivate:
            mod = db.query(Module).filter(Module.code == code).first()
            if mod and mod.is_active:
                mod.is_active = False
                print(f"Migration: Deactivated module {code}")
        db.commit()
        
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
        
        # Add tenant_id to inventory tables (groups, families, subfamilies) for multi-tenant scoping
        for table_name in ['groups', 'families', 'subfamilies']:
            result = db.execute(text(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table_name}'"))
            if result.fetchone():
                result = db.execute(text(f"PRAGMA table_info({table_name})"))
                cols = [row[1] for row in result.fetchall()]
                if 'tenant_id' not in cols:
                    db.execute(text(f"ALTER TABLE {table_name} ADD COLUMN tenant_id INTEGER REFERENCES tenants(id)"))
                    db.commit()
                    print(f"Migration: Added tenant_id column to {table_name} table")
        
        # Add icon column to families table
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='families'"))
        if result.fetchone():
            result = db.execute(text("PRAGMA table_info(families)"))
            fam_cols = [row[1] for row in result.fetchall()]
            if 'icon' not in fam_cols:
                db.execute(text("ALTER TABLE families ADD COLUMN icon VARCHAR(100)"))
                db.commit()
                print("Migration: Added icon column to families table")
        
        # Add tenant_id to products table if not present
        result = db.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='products'"))
        if result.fetchone():
            result = db.execute(text("PRAGMA table_info(products)"))
            prod_cols = [row[1] for row in result.fetchall()]
            if 'tenant_id' not in prod_cols:
                db.execute(text("ALTER TABLE products ADD COLUMN tenant_id INTEGER REFERENCES tenants(id)"))
                db.commit()
                print("Migration: Added tenant_id column to products table")
        
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
                    {"code": "deliveries", "name": "Domicilios", "description": "Registro y seguimiento de ventas a domicilio", "icon": "Bike", "route": "/deliveries", "display_order": 5, "is_core": False},
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


def init_summer_sed_products():
    """Seed SUMMER SED product catalog: Bebidas Calientes, Bebidas Frías, Helados, Pastelería, Postres, Raspados."""
    from app.models.inventory import Group, Family, SubFamily, Product

    db = SessionLocal()
    try:
        existing = db.query(Group).filter(Group.name == "Menu Summer Sed").first()
        if existing:
            return

        group = Group(name="Menu Summer Sed", description="Catálogo de productos Summer Sed")
        db.add(group)
        db.flush()

        products_by_category = {
            "Bebidas Calientes": {
                "icon": "Coffee",
                "items": [
                    ("Aromática Con Frutas", 3600),
                    ("Aromática Pequeña", 2300),
                    ("Avena", 4800),
                    ("Cigarrillos", 1500),
                    ("Milo", 4800),
                    ("Perico", 2100),
                    ("Tinto Grande", 2100),
                    ("Tinto Pequeño", 1600),
                ],
            },
            "Bebidas Frías": {
                "icon": "GlassWater",
                "items": [
                    ("Agua En Botella", 1700),
                    ("Cerveza", 5500),
                    ("Cremas En Leche", 4800),
                    ("Gaseosa Pequeña", 2400),
                    ("Ginger - Bretaña", 4100),
                    ("Jugos Naturales", 4400),
                    ("Limonada Clasica", 3900),
                    ("Limonada Summer-Sed", 4800),
                    ("Malteadas", 9800),
                    ("Micheladas", 8400),
                    ("Naranjada Grande", 4900),
                    ("Naranjada Pequeña", 3600),
                    ("Shirley Temple (Coctel sin licor)", 6700),
                    ("Te Frio Limón - Durazno", 3800),
                ],
            },
            "Helados": {
                "icon": "IceCream",
                "items": [
                    ("Choco-Cono", 3000),
                    ("Cono Pequeño", 2500),
                    ("Cookie Shot", 5200),
                    ("Helado Mascotas", 3500),
                    ("Vaso Grande", 5200),
                    ("Vaso Mediano", 3800),
                ],
            },
            "Pastelería": {
                "icon": "Cake",
                "items": [
                    ("Cochinitos", 3300),
                    ("Empanadas", 3300),
                ],
            },
            "Postres": {
                "icon": "CakeSlice",
                "items": [
                    ("Banana Split", 6900),
                    ("Brownie Con Helado", 8800),
                    ("Brownie Frutal", 8800),
                    ("Fresas Con Crema - Chocolate", 7800),
                    ("Merengón Summer-Sed", 8900),
                    ("Oblea", 3400),
                    ("Wafle Con Helado", 9800),
                    ("Wafle Frutal", 8900),
                    ("Wafle Sencillo", 8200),
                ],
            },
            "Raspados": {
                "icon": "Snowflake",
                "items": [
                    ("Raspado Grande", 4800),
                    ("Raspado Pequeño", 3200),
                ],
            },
        }

        product_counter = 0
        for cat_name, cat_data in products_by_category.items():
            family = Family(
                name=cat_name,
                group_id=group.id,
                icon=cat_data["icon"],
                description=f"Categoría: {cat_name}",
            )
            db.add(family)
            db.flush()

            subfamily = SubFamily(
                name=cat_name,
                family_id=family.id,
                description=f"Sub-categoría: {cat_name}",
            )
            db.add(subfamily)
            db.flush()

            for prod_name, price in cat_data["items"]:
                product_counter += 1
                code_prefix = cat_name[:3].upper()
                code = f"SS-{code_prefix}-{product_counter:04d}"
                product = Product(
                    code=code,
                    name=prod_name,
                    description="",
                    subfamily_id=subfamily.id,
                    sale_price=price,
                    unit="unidad",
                    is_active=True,
                )
                db.add(product)

        db.commit()
        print("Productos Summer Sed creados exitosamente (41 productos)")

    except Exception as e:
        db.rollback()
        print(f"Error al crear productos Summer Sed: {e}")
    finally:
        db.close()


def init_asadero_products():
    """Seed the Asadero sede menu. Products stay tied to that sede (carta propia)."""
    from app.models.inventory import Group, Family, SubFamily, Product
    from app.models.location import Location

    db = SessionLocal()
    try:
        locations = db.query(Location).filter(Location.name.ilike("%asadero%")).all()
        if not locations:
            print("Sede Asadero no encontrada: se omite la carta del asadero")
            return

        products_by_category = {
            "Bebidas Y Cervezas": {
                "icon": "Beer",
                "items": [
                    ("Agua Natural O Con Gas", 4800),
                    ("Bretaña", 5500),
                    ("Coca Cola", 3600),
                    ("Colombiana", 3600),
                    ("Ginger", 5500),
                    ("Hipinto", 3600),
                    ("Jugo Del Dia", 6500),
                    ("Limonada Con Hierbabuena", 4800),
                    ("Limonada Con Hierbabuena - Jarra", 16000),
                    ("Preparada", 4800),
                    ("Preparada - Jarra", 16000),
                    ("Aguardiente Amarillo O Azul Media", 54000),
                    ("Andina", 4800),
                    ("Cerveza De La Casa - Jarra", 12000),
                    ("Heineken", 5500),
                    ("Refajo", 5000),
                    ("Refajo De La Casa - Jarra", 18000),
                    ("Sol", 4800),
                ],
            },
            "Entradas Y Complementos": {
                "icon": "Salad",
                "items": [
                    ("Arepas Con Hogao", 5500),
                    ("Chorizo", 5500),
                    ("Chunchullo Con Papa", 25000),
                    ("Empanadas De La Casa", 9500),
                    ("Encurtido De La Huerta", 6500),
                    ("Ensalada De La Casa Para Dos", 12000),
                    ("Envueltos", 5500),
                    ("Guacamole", 8500),
                    ("Lengua En Vinagreta", 14000),
                    ("Morcilla", 4500),
                    ("Papa Salada", 6500),
                    ("Patacones Con Suero", 6500),
                    ("Plátano Con Bocadillo Y Queso", 14000),
                    ("Yuca Hervida", 6500),
                ],
            },
            "Sopas": {
                "icon": "Soup",
                "items": [
                    ("Cuchuco De Trigo", 12000),
                    ("Mondongo", 12000),
                    ("Mute De Mazorca", 12000),
                    ("Media Sopa", 9000),
                ],
            },
            "Carnes": {
                "icon": "Beef",
                "items": [
                    ("Cerdo Al Chuzo", 38000),
                    ("Mixta", 38000),
                    ("Pollo Ahumado Al Barril", 42000),
                    ("Res A La Llanera", 38000),
                ],
            },
            "Comida Típica": {
                "icon": "Utensils",
                "items": [
                    ("Churrasco De Res", 42000),
                    ("Guiso De Pata", 18000),
                    ("Hígado Encebollado", 24000),
                    ("Lengua En Salsa Criolla", 38000),
                    ("Pechuga De Pollo A La Plancha", 36000),
                    ("Sobrebarriga Criolla", 38000),
                    ("Trucha A La Plancha", 34000),
                ],
            },
            "Postres": {
                "icon": "CakeSlice",
                "items": [
                    ("Arroz Con Leche", 7500),
                    ("Cuajada Con Melao", 12500),
                    ("Flan Con Arquipe", 12500),
                    ("Helados De La Casa", 0),
                ],
            },
            "Salsas Y Aderezos": {
                "icon": "Droplets",
                "items": [
                    ("Aji De La Casa", 0),
                    ("Chimichurri", 0),
                    ("Guacamole", 0),
                    ("Hogao", 0),
                    ("Suero Costeño", 0),
                ],
            },
        }

        for location in locations:
            existing = db.query(Group).filter(
                Group.name == "Menu Asadero",
                Group.tenant_id == location.tenant_id,
            ).first()
            if existing:
                continue

            group = Group(
                name="Menu Asadero",
                description="Carta de la sede Asadero",
                tenant_id=location.tenant_id,
            )
            db.add(group)
            db.flush()

            product_counter = 0
            for cat_name, cat_data in products_by_category.items():
                family = Family(
                    name=cat_name,
                    group_id=group.id,
                    icon=cat_data["icon"],
                    description=f"Categoría: {cat_name}",
                    tenant_id=location.tenant_id,
                )
                db.add(family)
                db.flush()

                subfamily = SubFamily(
                    name=cat_name,
                    family_id=family.id,
                    description=f"Sub-categoría: {cat_name}",
                    tenant_id=location.tenant_id,
                )
                db.add(subfamily)
                db.flush()

                for prod_name, price in cat_data["items"]:
                    product_counter += 1
                    code_prefix = cat_name[:3].upper()
                    code = f"AS{location.id}-{code_prefix}-{product_counter:04d}"
                    product = Product(
                        code=code,
                        name=prod_name,
                        description="",
                        subfamily_id=subfamily.id,
                        tenant_id=location.tenant_id,
                        location_id=location.id,
                        sale_price=price,
                        unit="unidad",
                        is_active=True,
                    )
                    db.add(product)

            location.has_own_menu = True
            db.commit()
            print(f"Carta del Asadero creada en {location.name} ({product_counter} productos)")

    except Exception as e:
        db.rollback()
        print(f"Error al crear la carta del Asadero: {e}")
    finally:
        db.close()


def generate_payment_reminders():
    """Generate payment reminder notifications on the 6th of each month."""
    from app.timezone import now_colombia
    from app.models.tenant import Tenant
    from app.models.notification import Notification, NotificationType

    now = now_colombia()
    if now.day < 6:
        return

    db = SessionLocal()
    try:
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        active_tenants = db.query(Tenant).filter(Tenant.is_active == True).all()

        created_count = 0
        for tenant in active_tenants:
            existing = db.query(Notification).filter(
                Notification.tenant_id == tenant.id,
                Notification.type == NotificationType.PAYMENT_REMINDER,
                Notification.created_at >= month_start
            ).first()
            if not existing:
                notification = Notification(
                    tenant_id=tenant.id,
                    title="Recordatorio de pago",
                    message=f"Tu corte de servicio es el dia 6 de cada mes. Por favor realiza tu pago para evitar la suspension del servicio.",
                    type=NotificationType.PAYMENT_REMINDER
                )
                db.add(notification)
                created_count += 1

        if created_count > 0:
            db.commit()
            logger.info(f"Recordatorios de pago: {created_count} notificacion(es) creada(s)")
    except Exception as e:
        db.rollback()
        logger.error(f"Error generando recordatorios de pago: {e}")
    finally:
        db.close()


def check_and_suspend_unpaid_tenants():
    """Suspend tenants who haven't paid by the 6th of the month (Bogota time)."""
    from app.timezone import now_colombia
    from app.models.tenant import Tenant, TenantPayment, PaymentStatus
    from sqlalchemy import func

    now = now_colombia()
    if now.day < 6:
        return

    db = SessionLocal()
    try:
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        active_tenants = db.query(Tenant).filter(
            Tenant.is_active == True,
            Tenant.payment_status.in_([PaymentStatus.ACTIVE, PaymentStatus.PENDING, PaymentStatus.OVERDUE])
        ).all()

        suspended_count = 0
        for tenant in active_tenants:
            has_payment = db.query(TenantPayment).filter(
                TenantPayment.tenant_id == tenant.id,
                TenantPayment.payment_date >= month_start
            ).first()

            if not has_payment:
                tenant.payment_status = PaymentStatus.SUSPENDED
                suspended_count += 1
                logger.info(f"Tenant '{tenant.name}' (ID:{tenant.id}) suspendido por falta de pago")

        if suspended_count > 0:
            db.commit()
            logger.info(f"Suspensión automática: {suspended_count} tenant(s) suspendido(s)")
        else:
            logger.info("Suspensión automática: todos los tenants activos tienen pago registrado")
    except Exception as e:
        db.rollback()
        logger.error(f"Error en suspensión automática: {e}")
    finally:
        db.close()


async def payment_check_scheduler():
    """Background task that checks daily at 00:00 Bogota time for unpaid tenants."""
    from app.timezone import now_colombia

    while True:
        try:
            now = now_colombia()
            # Calculate seconds until next 00:05 Bogota time (small buffer after midnight)
            tomorrow = (now.replace(hour=0, minute=5, second=0, microsecond=0))
            if now.hour >= 0 and now.minute >= 5:
                from datetime import timedelta
                tomorrow = tomorrow + timedelta(days=1)
            wait_seconds = (tomorrow - now).total_seconds()
            logger.info(f"Scheduler: próxima verificación de pagos en {wait_seconds/3600:.1f}h")
            await asyncio.sleep(wait_seconds)
            check_and_suspend_unpaid_tenants()
            generate_payment_reminders()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Error en scheduler de pagos: {e}")
            await asyncio.sleep(3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    run_migrations()
    init_default_data()
    init_default_modules()
    init_summer_sed_products()
    init_asadero_products()
    # Run payment check and reminders on startup (in case server was down on the 6th)
    check_and_suspend_unpaid_tenants()
    generate_payment_reminders()
    # Start background scheduler
    scheduler_task = asyncio.create_task(payment_check_scheduler())
    yield
    scheduler_task.cancel()


app = FastAPI(
    title="MySale.v1 - Sistema POS",
    description="Sistema de Punto de Venta para GALIA 1539",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration - specific origins with credentials support
ALLOWED_ORIGINS = [
    "https://www.pos-mysale.co",
    "https://pos-mysale.co",
    "https://admin.pos-mysale.co",
    "https://galia-address-app-hhgq2rtr.devinapps.com",
    "https://galia-location-app-7ena2v2t.devinapps.com",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
app.include_router(tenants_public_router)
app.include_router(integration.router)
app.include_router(faq.router)
app.include_router(biometric.router)
app.include_router(deliveries.router)
app.include_router(business_profile.router)
app.include_router(notifications.router)

# Serve uploaded logos as static files
LOGO_UPLOAD_DIR = "/data/uploads/logos"
os.makedirs(LOGO_UPLOAD_DIR, exist_ok=True)
app.mount("/uploads/logos", StaticFiles(directory=LOGO_UPLOAD_DIR), name="logos")

# Serve uploaded images (products, locations, etc.) as static files
IMAGE_UPLOAD_DIR = "/data/uploads/images"
os.makedirs(IMAGE_UPLOAD_DIR, exist_ok=True)
app.mount("/uploads/images", StaticFiles(directory=IMAGE_UPLOAD_DIR), name="images")


@app.get("/healthz")
async def healthz():
    """Health check endpoint - verifies backend and database are operational."""
    import logging
    logger = logging.getLogger("mysale.health")
    checks = {"api": "ok", "database": "unknown"}
    try:
        db = SessionLocal()
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        checks["database"] = "ok"
        db.close()
    except Exception as e:
        checks["database"] = f"error: {str(e)}"
        logger.error(f"HEALTHZ: Database check failed: {e}")
        return {"status": "degraded", "checks": checks}
    
    return {"status": "ok", "checks": checks}


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
