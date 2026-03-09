## Descripcion del cambio

<!-- Describe brevemente que cambio se hizo y por que -->

## Criterios de aceptacion

Antes de aprobar este PR, se DEBE validar que lo siguiente sigue funcionando:

### Flujo Critico (obligatorio si se toca auth, tenants, modulos o backend)

- [ ] **Crear tenant en Factory** - Login admin, crear nuevo cliente, verificar credenciales generadas
- [ ] **Crear usuario del tenant** - Verificar User en tabla users con tenant_id correcto (NO null)
- [ ] **Asignar modulos** - Habilitar/deshabilitar modulos, verificar tenant_modules
- [ ] **Login POS** - Ingresar con credenciales generadas en pos-mysale.co
- [ ] **Validar modulos** - Solo aparecen modulos habilitados en sidebar
- [ ] **Permisos por tenant** - Modulos deshabilitados NO accesibles
- [ ] **Admin sigue funcionando** - Login admin muestra TODOS los modulos

### Tests automaticos

- [ ] `cd MySale.v1/backend && poetry run python -m pytest tests/ -v` pasa
- [ ] `./scripts/smoke_test.sh https://backend-morning-wildflower-3113.fly.dev` pasa (post-deploy)

### Verificacion general

- [ ] No hay soluciones temporales sin documentar
- [ ] Migraciones versionadas en el repo (no scripts invisibles)
- [ ] Logs claros para operaciones criticas

## Tipo de cambio

- [ ] Bug fix
- [ ] Nueva funcionalidad
- [ ] Refactor / mejora de codigo
- [ ] Infraestructura / DevOps
- [ ] Documentacion

## Archivos criticos modificados

<!-- Marcar si aplica -->

- [ ] auth.py
- [ ] users.py
- [ ] tenants.py
- [ ] main.py
- [ ] AuthContext.tsx
- [ ] Layout.tsx

> Si alguno de estos archivos fue modificado, el flujo critico completo DEBE ser validado.
