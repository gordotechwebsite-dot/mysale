# MySale POS - Ambientes de Despliegue

## Ambientes

### 1. Local (Desarrollo)

**Backend:**
```bash
cd MySale.v1/backend
poetry install
poetry run uvicorn app.main:app --reload --port 8000
```

**Frontend Cliente (POS):**
```bash
cd MySale.v1/frontend
npm install
npm run dev
```
- URL: http://localhost:5173

**Frontend Admin (Factory):**
```bash
cd pos-admin
npm install
npm run dev
```
- URL: http://localhost:5174

**Base de datos:** SQLite local (`mysale.db`)

---

### 2. Staging

> **Regla:** Si en staging crear un cliente, entrar y validar modulos funciona, entonces pasa a produccion. Sin staging, produccion termina siendo el laboratorio.

**Configuracion recomendada:**
- Backend: Fly.io app separada (ej. `mysale-staging.fly.dev`)
- Frontend: Rama `staging` en Vercel con preview URL
- Base de datos: SQLite separada en volumen de staging

**Validacion en staging antes de pasar a produccion:**
1. Ejecutar smoke test: `./scripts/smoke_test.sh https://mysale-staging.fly.dev`
2. Ejecutar tests: `cd MySale.v1/backend && poetry run python -m pytest tests/ -v`
3. Ejecutar checklist de flujo critico completo (ver CRITICAL_FLOW_CHECKLIST.md)

---

### 3. Produccion

**Backend:** https://backend-morning-wildflower-3113.fly.dev
- Fly.io app: `backend-morning-wildflower-3113`
- Base de datos: SQLite en volumen persistente (`/data/mysale.db`)

**Frontend Cliente (POS):** https://www.pos-mysale.co
- Vercel project con dominio personalizado

**Frontend Admin (Factory):** https://admin.pos-mysale.co
- Vercel project separado (`mysale-l1zn`)

**Credenciales admin del sistema:**
- Usuario: `admin`
- Password: `admin123` (cambiar en produccion)

---

## Reglas de Despliegue

1. **NUNCA** desplegar directamente a produccion sin validar flujo critico
2. **SIEMPRE** ejecutar smoke test despues de deploy: `./scripts/smoke_test.sh <URL>`
3. **SIEMPRE** ejecutar tests antes de commit: `poetry run python -m pytest tests/ -v`
4. **SIEMPRE** validar: login, modulos, creacion de tenant, permisos por tenant

## Fuente de Verdad

| Dato | Tabla | Notas |
|------|-------|-------|
| Usuarios | `users` | Siempre con `tenant_id` para usuarios de tenant |
| Tenants/Clientes | `tenants` | Credenciales POS generadas automaticamente |
| Modulos habilitados | `tenant_modules` | `is_enabled` determina acceso |
| Roles/Permisos | `roles` | Cada tenant tiene sus propios roles |

> No strings sueltos, no campos duplicados, no "temporalmente lo guardamos aqui".
