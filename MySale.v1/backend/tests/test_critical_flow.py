"""
Critical Flow Tests - MySale POS
================================
These tests validate the critical business flow that MUST NOT break:

1. Create tenant in Factory
2. Generate credentials (pos_username, pos_password)
3. Create real User record with correct tenant_id
4. Assign modules to tenant
5. Login with generated credentials
6. Validate only enabled modules are returned
7. Block access to disabled modules

Run with: python -m pytest tests/test_critical_flow.py -v
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app, init_default_data, init_default_modules

# Use in-memory SQLite for tests
TEST_DATABASE_URL = "sqlite:///./test_critical_flow.db"
test_engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(scope="module", autouse=True)
def setup_database():
    """Create tables and seed default data before all tests."""
    Base.metadata.create_all(bind=test_engine)

    # Temporarily patch SessionLocal for init functions
    import app.main as main_module
    original_session_local = main_module.SessionLocal
    main_module.SessionLocal = TestSessionLocal

    init_default_modules()
    init_default_data()

    main_module.SessionLocal = original_session_local

    yield

    Base.metadata.drop_all(bind=test_engine)
    import os
    if os.path.exists("./test_critical_flow.db"):
        os.remove("./test_critical_flow.db")


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


@pytest.fixture(scope="module")
def admin_token(client):
    """Get admin token for Factory operations."""
    response = client.post(
        "/api/auth/login",
        data={"username": "admin", "password": "admin123"}
    )
    assert response.status_code == 200, f"Admin login failed: {response.json()}"
    return response.json()["access_token"]


class TestCriticalFlow:
    """Tests for the complete critical flow from tenant creation to module validation."""

    tenant_id = None
    pos_username = None
    pos_password = None
    tenant_token = None

    # ==================== STEP 1: Create tenant in Factory ====================

    def test_01_create_tenant(self, client, admin_token):
        """Step 1: Create a new tenant (client) from Factory."""
        response = client.post(
            "/api/admin/tenants",
            json={
                "name": "Test Restaurant",
                "code": "TESTREST001",
                "contact_name": "Juan Test",
                "contact_email": "juan@test.com",
                "contact_phone": "3001234567",
                "address": "Calle Test 123",
                "monthly_fee": 50000
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Create tenant failed: {response.json()}"
        data = response.json()
        TestCriticalFlow.tenant_id = data["id"]
        assert data["name"] == "Test Restaurant"
        assert data["code"] == "TESTREST001"

    # ==================== STEP 2: Verify credentials were generated ====================

    def test_02_verify_credentials_generated(self, client, admin_token):
        """Step 2: Verify that POS credentials were auto-generated for the tenant."""
        response = client.get(
            f"/api/admin/tenants/{TestCriticalFlow.tenant_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        # Get tenant list to see pos_username/pos_password (they're in list response)
        response = client.get(
            "/api/admin/tenants",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        tenants = response.json()
        test_tenant = next(t for t in tenants if t["id"] == TestCriticalFlow.tenant_id)
        assert test_tenant["pos_username"] is not None, "pos_username was not generated"
        assert test_tenant["pos_password"] is not None, "pos_password was not generated"
        assert len(test_tenant["pos_username"]) > 0
        assert len(test_tenant["pos_password"]) > 0
        TestCriticalFlow.pos_username = test_tenant["pos_username"]
        TestCriticalFlow.pos_password = test_tenant["pos_password"]

    # ==================== STEP 3: Verify User record was created ====================

    def test_03_verify_user_created_with_tenant_id(self, client, admin_token):
        """Step 3: Verify a real User was created with correct tenant_id (NOT null)."""
        # Login as the tenant user to verify User record exists
        response = client.post(
            "/api/auth/login",
            data={
                "username": TestCriticalFlow.pos_username,
                "password": TestCriticalFlow.pos_password
            }
        )
        assert response.status_code == 200, (
            f"Tenant user login failed - User record may not have been created. "
            f"username='{TestCriticalFlow.pos_username}', error={response.json()}"
        )
        data = response.json()
        TestCriticalFlow.tenant_token = data["access_token"]

        # Verify user details
        user = data["user"]
        assert user["username"] == TestCriticalFlow.pos_username
        assert user["full_name"] == "Juan Test"
        assert user["role"] is not None, "User has no role assigned"
        assert user["role"]["role_type"] == "superuser", "User role should be superuser for tenant admin"

    # ==================== STEP 4: Verify modules assigned ====================

    def test_04_verify_core_modules_assigned(self, client):
        """Step 4: Verify that core modules are enabled for the new tenant."""
        response = client.get(
            "/api/users/me/modules",
            headers={"Authorization": f"Bearer {TestCriticalFlow.tenant_token}"}
        )
        assert response.status_code == 200
        modules = response.json()
        assert len(modules) > 0, "No modules returned for tenant user"

        module_codes = [m["code"] for m in modules]
        # Core modules should be enabled
        assert "dashboard" in module_codes, "Dashboard (core) should be enabled"
        assert "inventory" in module_codes, "Inventory (core) should be enabled"

    # ==================== STEP 5: Enable/disable specific modules ====================

    def test_05_update_tenant_modules(self, client, admin_token):
        """Step 5: Enable quick_sale and verify it appears; tables stays disabled."""
        # Get all available modules from the system
        response = client.get(
            "/api/admin/modules",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        all_modules = response.json()

        # Find quick_sale and tables module IDs from the global module list
        quick_sale_mod = next((m for m in all_modules if m["code"] == "quick_sale"), None)
        tables_mod = next((m for m in all_modules if m["code"] == "tables"), None)

        assert quick_sale_mod is not None, "quick_sale module should exist in system"
        assert tables_mod is not None, "tables module should exist in system"

        # Enable quick_sale, explicitly disable tables
        response = client.put(
            f"/api/admin/tenants/{TestCriticalFlow.tenant_id}/modules",
            json=[
                {"module_id": quick_sale_mod["id"], "is_enabled": True},
                {"module_id": tables_mod["id"], "is_enabled": False}
            ],
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200

    def test_06_verify_enabled_modules_in_sidebar(self, client):
        """Step 6: Verify only enabled modules are returned for tenant user."""
        response = client.get(
            "/api/users/me/modules",
            headers={"Authorization": f"Bearer {TestCriticalFlow.tenant_token}"}
        )
        assert response.status_code == 200
        modules = response.json()
        module_codes = [m["code"] for m in modules]

        assert "dashboard" in module_codes, "Dashboard should be enabled"
        assert "inventory" in module_codes, "Inventory should be enabled"
        assert "quick_sale" in module_codes, "Quick Sale was enabled and should appear"
        assert "tables" not in module_codes, "Tables was disabled and should NOT appear"

    # ==================== STEP 6: Admin still sees all modules ====================

    def test_07_admin_sees_all_modules(self, client, admin_token):
        """Step 7: System admin (no tenant_id) should see ALL active modules."""
        response = client.get(
            "/api/users/me/modules",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        modules = response.json()
        module_codes = [m["code"] for m in modules]

        # Admin should see all active modules
        assert "dashboard" in module_codes
        assert "inventory" in module_codes
        assert "quick_sale" in module_codes
        assert "tables" in module_codes
        assert len(modules) >= 6, f"Admin should see many modules, got {len(modules)}"


class TestHealthCheck:
    """Tests for the health check endpoint."""

    def test_healthz_returns_ok(self, client):
        response = client.get("/healthz")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["checks"]["api"] == "ok"
        assert data["checks"]["database"] == "ok"


class TestLoginEdgeCases:
    """Tests for login edge cases."""

    def test_login_with_wrong_password(self, client):
        response = client.post(
            "/api/auth/login",
            data={"username": "admin", "password": "wrongpassword"}
        )
        assert response.status_code == 401

    def test_login_with_nonexistent_user(self, client):
        response = client.post(
            "/api/auth/login",
            data={"username": "nonexistent_user_xyz", "password": "anypass"}
        )
        assert response.status_code == 401

    def test_admin_login_works(self, client):
        response = client.post(
            "/api/auth/login",
            data={"username": "admin", "password": "admin123"}
        )
        assert response.status_code == 200
        assert "access_token" in response.json()
