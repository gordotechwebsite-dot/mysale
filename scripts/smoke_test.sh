#!/bin/bash
# MySale POS - Smoke Test Post-Deploy
# ====================================
# Run after each deploy to validate critical endpoints.
# Usage: ./scripts/smoke_test.sh https://backend-morning-wildflower-3113.fly.dev
#
# Exit codes:
#   0 = All checks passed
#   1 = One or more checks failed

set -euo pipefail

BASE_URL="${1:-https://backend-morning-wildflower-3113.fly.dev}"
PASSED=0
FAILED=0
TOTAL=0

echo "========================================="
echo " MySale POS - Smoke Test"
echo " Backend: $BASE_URL"
echo " Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
echo "========================================="
echo ""

check() {
    local name="$1"
    local result="$2"
    TOTAL=$((TOTAL + 1))
    if [ "$result" -eq 0 ]; then
        PASSED=$((PASSED + 1))
        echo "  [PASS] $name"
    else
        FAILED=$((FAILED + 1))
        echo "  [FAIL] $name"
    fi
}

# --- 1. Health Check ---
echo "1. Health Check (/healthz)"
HTTP_CODE=$(curl -s -o /tmp/healthz_response.json -w "%{http_code}" "$BASE_URL/healthz" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    DB_STATUS=$(python3 -c "import json; data=json.load(open('/tmp/healthz_response.json')); print(data.get('checks',{}).get('database','unknown'))" 2>/dev/null || echo "unknown")
    check "API responds 200" 0
    if [ "$DB_STATUS" = "ok" ]; then
        check "Database connected" 0
    else
        check "Database connected (status=$DB_STATUS)" 1
    fi
else
    check "API responds (got $HTTP_CODE)" 1
    check "Database connected" 1
fi
echo ""

# --- 2. Login ---
echo "2. Login (/api/auth/login)"
LOGIN_RESPONSE=$(curl -s -o /tmp/login_response.json -w "%{http_code}" \
    -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=admin&password=admin123" 2>/dev/null || echo "000")
if [ "$LOGIN_RESPONSE" = "200" ]; then
    check "Admin login successful" 0
    TOKEN=$(python3 -c "import json; print(json.load(open('/tmp/login_response.json')).get('access_token',''))" 2>/dev/null || echo "")
else
    check "Admin login (got $LOGIN_RESPONSE)" 1
    TOKEN=""
fi
echo ""

# --- 3. Modules ---
echo "3. Modules (/api/users/me/modules)"
if [ -n "$TOKEN" ]; then
    MODULES_CODE=$(curl -s -o /tmp/modules_response.json -w "%{http_code}" \
        "$BASE_URL/api/users/me/modules" \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
    if [ "$MODULES_CODE" = "200" ]; then
        MODULE_COUNT=$(python3 -c "import json; print(len(json.load(open('/tmp/modules_response.json'))))" 2>/dev/null || echo "0")
        check "Modules endpoint responds" 0
        if [ "$MODULE_COUNT" -gt "0" ]; then
            check "Modules returned ($MODULE_COUNT modules)" 0
        else
            check "Modules returned (got 0)" 1
        fi
    else
        check "Modules endpoint (got $MODULES_CODE)" 1
        check "Modules returned" 1
    fi
else
    check "Modules endpoint (skipped - no token)" 1
    check "Modules returned (skipped)" 1
fi
echo ""

# --- 4. Tenants (Factory) ---
echo "4. Tenants (/api/admin/tenants)"
if [ -n "$TOKEN" ]; then
    TENANTS_CODE=$(curl -s -o /tmp/tenants_response.json -w "%{http_code}" \
        "$BASE_URL/api/admin/tenants" \
        -H "Authorization: Bearer $TOKEN" 2>/dev/null || echo "000")
    if [ "$TENANTS_CODE" = "200" ]; then
        check "Tenants list accessible" 0
    else
        check "Tenants list (got $TENANTS_CODE)" 1
    fi
else
    check "Tenants list (skipped - no token)" 1
fi
echo ""

# --- Summary ---
echo "========================================="
echo " Results: $PASSED/$TOTAL passed, $FAILED failed"
echo "========================================="

if [ "$FAILED" -gt 0 ]; then
    echo ""
    echo "SMOKE TEST FAILED - Do NOT proceed with release"
    exit 1
else
    echo ""
    echo "SMOKE TEST PASSED - Safe to release"
    exit 0
fi
