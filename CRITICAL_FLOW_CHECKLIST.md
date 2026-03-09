# MySale - Checklist de Flujo Critico

Este checklist es **obligatorio** antes de aprobar cualquier cambio que toque:
auth, tenants, modulos, usuarios, backend, login, o permisos.

## Flujo Critico (en orden)

### 1. Crear cliente en Factory
- [ ] Login en Factory con admin/admin123
- [ ] Crear nuevo tenant con datos completos
- [ ] Verificar que se generaron credenciales POS (pos_username, pos_password)
- [ ] Verificar que el tenant aparece en la lista de tenants

### 2. Crear usuario real del tenant
- [ ] Verificar que al crear el tenant se creo un User en la tabla users
- [ ] Verificar que el User tiene tenant_id correcto (NO null)
- [ ] Verificar que el User tiene role_id apuntando a un rol del tenant (NO global)
- [ ] Verificar que el hashed_password corresponde al pos_password del tenant

### 3. Asignar modulos al tenant
- [ ] Desde Factory, habilitar/deshabilitar modulos para el tenant
- [ ] Verificar que TenantModule registra is_enabled correctamente
- [ ] Verificar que modulos core (dashboard, inventory) estan habilitados

### 4. Login en POS con credenciales generadas
- [ ] Ir a pos-mysale.co/login
- [ ] Ingresar pos_username y pos_password del tenant
- [ ] Verificar login exitoso (redirect a dashboard)
- [ ] Verificar que el usuario logueado muestra nombre correcto

### 5. Validar modulos en sidebar
- [ ] Solo aparecen los modulos habilitados para el tenant
- [ ] Modulos deshabilitados NO aparecen en sidebar
- [ ] Al acceder directamente a ruta de modulo deshabilitado, se bloquea

### 6. Verificar admin sigue funcionando
- [ ] Login con admin/admin123 muestra TODOS los modulos
- [ ] Factory sigue accesible y funcional
- [ ] Dashboard del admin carga correctamente

## Cuando ejecutar este checklist

- **Siempre** antes de merge a produccion
- **Siempre** despues de deploy a Fly.io
- **Siempre** que se modifique: auth.py, users.py, tenants.py, main.py, AuthContext.tsx, Layout.tsx

## Smoke test automatico

Ejecutar despues de cada deploy:
```bash
./scripts/smoke_test.sh https://backend-morning-wildflower-3113.fly.dev
```

## Tests automaticos

Ejecutar antes de cada commit:
```bash
cd MySale.v1/backend && python -m pytest tests/ -v
```
