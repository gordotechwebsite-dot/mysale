from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from app.database import get_db
from app.models.faq import FAQ

router = APIRouter(prefix="/faq", tags=["FAQ"])


class FAQCreate(BaseModel):
    question: str
    keywords: str
    answer: str
    category: Optional[str] = None
    is_active: bool = True
    priority: int = 0


class FAQUpdate(BaseModel):
    question: Optional[str] = None
    keywords: Optional[str] = None
    answer: Optional[str] = None
    category: Optional[str] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None


class FAQResponse(BaseModel):
    id: int
    question: str
    keywords: str
    answer: str
    category: Optional[str]
    is_active: bool
    priority: int

    class Config:
        from_attributes = True


class ChatQuery(BaseModel):
    message: str


class ChatResponse(BaseModel):
    answer: str
    matched_faq_id: Optional[int] = None


@router.get("/", response_model=List[FAQResponse])
def get_all_faqs(db: Session = Depends(get_db)):
    """Get all FAQs for admin management"""
    faqs = db.query(FAQ).order_by(FAQ.priority.desc(), FAQ.id).all()
    return faqs


@router.post("/", response_model=FAQResponse)
def create_faq(faq_data: FAQCreate, db: Session = Depends(get_db)):
    """Create a new FAQ"""
    faq = FAQ(**faq_data.model_dump())
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq


@router.put("/{faq_id}", response_model=FAQResponse)
def update_faq(faq_id: int, faq_data: FAQUpdate, db: Session = Depends(get_db)):
    """Update an existing FAQ"""
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    update_data = faq_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(faq, key, value)
    
    db.commit()
    db.refresh(faq)
    return faq


@router.delete("/{faq_id}")
def delete_faq(faq_id: int, db: Session = Depends(get_db)):
    """Delete a FAQ"""
    faq = db.query(FAQ).filter(FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    db.delete(faq)
    db.commit()
    return {"message": "FAQ deleted successfully"}


@router.post("/chat", response_model=ChatResponse)
def chat_query(query: ChatQuery, db: Session = Depends(get_db)):
    """Process a chat message and return matching FAQ answer"""
    message = query.message.lower().strip()
    
    # Get all active FAQs ordered by priority
    faqs = db.query(FAQ).filter(FAQ.is_active == True).order_by(FAQ.priority.desc()).all()
    
    best_match = None
    best_score = 0
    
    for faq in faqs:
        keywords = [k.strip().lower() for k in faq.keywords.split(",")]
        score = 0
        
        for keyword in keywords:
            if keyword in message:
                score += 1
        
        if score > best_score:
            best_score = score
            best_match = faq
    
    if best_match and best_score > 0:
        return ChatResponse(answer=best_match.answer, matched_faq_id=best_match.id)
    
    # Default response if no match
    default_response = """No encontré una respuesta específica para tu pregunta. Puedes escribir:
• "ayuda" para ver las opciones disponibles
• "contacto" para hablar con soporte técnico

¿En qué más puedo asistirte?"""
    
    return ChatResponse(answer=default_response, matched_faq_id=None)


@router.post("/seed")
def seed_default_faqs(db: Session = Depends(get_db)):
    """Seed default FAQs if none exist"""
    existing = db.query(FAQ).count()
    if existing > 0:
        return {"message": f"FAQs already exist ({existing} records)"}
    
    default_faqs = [
        # GENERAL
        {
            "question": "Saludo inicial",
            "keywords": "hola,buenos dias,buenas tardes,buenas noches,hey,hi",
            "answer": "¡Hola! Soy el asistente virtual de MySale. ¿En qué puedo ayudarte hoy?\n\nEscribe 'ayuda' para ver todas las opciones disponibles.",
            "category": "general",
            "priority": 10
        },
        {
            "question": "Opciones de ayuda",
            "keywords": "ayuda,help,opciones,menu,que puedes hacer",
            "answer": "Puedo ayudarte con:\n\n• Dashboard - Resumen de ventas y métricas\n• Venta Rápida - Realizar ventas directas\n• Gestión de Mesas - Para restaurantes\n• Inventario - Productos y stock\n• Caja - Arqueos y cortes\n• Turnos - Gestión de turnos\n• Mermas - Registro de pérdidas\n• Control de Costos - Gastos operativos\n\n¿Sobre qué módulo necesitas ayuda?",
            "category": "general",
            "priority": 9
        },
        {
            "question": "Agradecimiento",
            "keywords": "gracias,thanks,perfecto,excelente,genial,ok,listo",
            "answer": "¡De nada! Estoy aquí para ayudarte. Si tienes más preguntas, no dudes en escribirme.",
            "category": "general",
            "priority": 3
        },
        
        # DASHBOARD
        {
            "question": "Dashboard",
            "keywords": "dashboard,panel,inicio,resumen,metricas,estadisticas",
            "answer": "El Dashboard te muestra:\n\n• Ventas del día y del mes\n• Productos más vendidos\n• Gráficos de rendimiento\n• Alertas de stock bajo\n\nEs la pantalla principal que ves al iniciar sesión. Si no ves datos, asegúrate de tener ventas registradas.",
            "category": "dashboard",
            "priority": 5
        },
        
        # VENTA RÁPIDA
        {
            "question": "Venta Rápida - General",
            "keywords": "venta rapida,vender,cobrar,factura,ticket",
            "answer": "Para realizar una venta rápida:\n\n1. Ve al módulo 'Venta Rápida'\n2. Busca o selecciona los productos\n3. Ajusta cantidades si es necesario\n4. Haz clic en 'Cobrar'\n5. Selecciona el método de pago\n6. Confirma la venta\n\n¿Tienes algún problema específico con las ventas?",
            "category": "ventas",
            "priority": 6
        },
        {
            "question": "Venta Rápida - No aparecen productos",
            "keywords": "no aparecen productos,productos vacios,sin productos,no hay productos",
            "answer": "Si no aparecen productos en Venta Rápida:\n\n1. Verifica que hayas agregado productos en el módulo 'Inventario'\n2. Asegúrate de que los productos tengan stock disponible\n3. Revisa que los productos estén activos\n4. Refresca la página (F5)\n\nSi el problema persiste, contacta soporte.",
            "category": "ventas",
            "priority": 7
        },
        {
            "question": "Venta Rápida - Métodos de pago",
            "keywords": "metodo pago,efectivo,tarjeta,transferencia,pagar",
            "answer": "MySale soporta varios métodos de pago:\n\n• Efectivo - Calcula el cambio automáticamente\n• Tarjeta de crédito/débito\n• Transferencia bancaria\n• Pago mixto - Combina varios métodos\n\nSelecciona el método al momento de cobrar la venta.",
            "category": "ventas",
            "priority": 5
        },
        
        # GESTIÓN DE MESAS
        {
            "question": "Gestión de Mesas - General",
            "keywords": "mesa,mesas,restaurante,zona,zonas,comanda",
            "answer": "El módulo de Gestión de Mesas te permite:\n\n1. Crear zonas (Terraza, Interior, etc.)\n2. Agregar mesas a cada zona\n3. Abrir cuentas en las mesas\n4. Agregar productos a la cuenta\n5. Dividir o unir cuentas\n6. Cobrar y cerrar mesas\n\n¿Necesitas ayuda con algo específico?",
            "category": "mesas",
            "priority": 6
        },
        {
            "question": "Gestión de Mesas - Crear zona",
            "keywords": "crear zona,nueva zona,agregar zona,configurar zona",
            "answer": "Para crear una zona:\n\n1. Ve a 'Gestión de Mesas'\n2. Haz clic en 'Nueva Zona'\n3. Escribe el nombre (ej: Terraza, Interior)\n4. Guarda los cambios\n\nNota: Solo usuarios administradores pueden crear zonas.",
            "category": "mesas",
            "priority": 5
        },
        {
            "question": "Gestión de Mesas - Crear mesa",
            "keywords": "crear mesa,nueva mesa,agregar mesa,añadir mesa",
            "answer": "Para crear una mesa:\n\n1. Ve a 'Gestión de Mesas'\n2. Selecciona la zona donde quieres la mesa\n3. Haz clic en 'Agregar Mesa'\n4. Asigna un número o nombre\n5. Define la capacidad (opcional)\n\nLas mesas aparecerán en el mapa de la zona.",
            "category": "mesas",
            "priority": 5
        },
        {
            "question": "Gestión de Mesas - Abrir cuenta",
            "keywords": "abrir cuenta,abrir mesa,ocupar mesa,iniciar cuenta",
            "answer": "Para abrir una cuenta en una mesa:\n\n1. Haz clic en la mesa disponible (verde)\n2. La mesa cambiará a ocupada (rojo)\n3. Agrega productos desde el menú\n4. Los productos se van sumando al ticket\n\nPuedes agregar más productos en cualquier momento.",
            "category": "mesas",
            "priority": 5
        },
        {
            "question": "Gestión de Mesas - Cobrar mesa",
            "keywords": "cobrar mesa,cerrar mesa,pagar mesa,cuenta mesa",
            "answer": "Para cobrar y cerrar una mesa:\n\n1. Haz clic en la mesa ocupada\n2. Revisa el ticket con todos los productos\n3. Haz clic en 'Cobrar'\n4. Selecciona el método de pago\n5. Confirma el pago\n\nLa mesa quedará disponible nuevamente.",
            "category": "mesas",
            "priority": 5
        },
        
        # INVENTARIO
        {
            "question": "Inventario - General",
            "keywords": "inventario,producto,productos,stock,existencias",
            "answer": "El módulo de Inventario te permite:\n\n• Crear grupos y familias de productos\n• Agregar productos con precio y stock\n• Ajustar existencias\n• Ver movimientos de inventario\n• Configurar alertas de stock bajo\n\n¿Qué necesitas hacer en inventario?",
            "category": "inventario",
            "priority": 6
        },
        {
            "question": "Inventario - Agregar producto",
            "keywords": "agregar producto,nuevo producto,crear producto,añadir producto",
            "answer": "Para agregar un producto:\n\n1. Ve a 'Inventario'\n2. Haz clic en 'Nuevo Producto'\n3. Completa: nombre, código, precio\n4. Selecciona grupo y familia\n5. Define el stock inicial\n6. Guarda el producto\n\nEl producto estará disponible para venta inmediatamente.",
            "category": "inventario",
            "priority": 5
        },
        {
            "question": "Inventario - Ajustar stock",
            "keywords": "ajustar stock,modificar stock,cambiar existencias,actualizar stock",
            "answer": "Para ajustar el stock de un producto:\n\n1. Ve a 'Inventario'\n2. Busca el producto\n3. Haz clic en 'Editar' o en el producto\n4. Modifica la cantidad de stock\n5. Guarda los cambios\n\nEl sistema registrará el movimiento de inventario.",
            "category": "inventario",
            "priority": 5
        },
        {
            "question": "Inventario - Precios",
            "keywords": "precio,precios,cambiar precio,modificar precio,costo",
            "answer": "Para cambiar el precio de un producto:\n\n1. Ve a 'Inventario'\n2. Busca el producto\n3. Haz clic en 'Editar'\n4. Modifica el precio de venta\n5. Guarda los cambios\n\nEl nuevo precio se aplicará en las próximas ventas.",
            "category": "inventario",
            "priority": 5
        },
        {
            "question": "Inventario - Stock bajo",
            "keywords": "stock bajo,alerta stock,sin stock,agotado,minimo",
            "answer": "Para configurar alertas de stock bajo:\n\n1. Ve a 'Inventario'\n2. Edita el producto\n3. Define el 'Stock mínimo'\n4. Guarda los cambios\n\nCuando el stock llegue al mínimo, verás una alerta en el Dashboard.",
            "category": "inventario",
            "priority": 5
        },
        
        # CAJA
        {
            "question": "Caja - General",
            "keywords": "caja,arqueo,corte,dinero,efectivo,cuadre",
            "answer": "El módulo de Caja te permite:\n\n• Realizar arqueos de caja\n• Registrar el efectivo por denominación\n• Hacer cortes de caja\n• Ver el historial de movimientos\n• Comparar efectivo esperado vs real\n\n¿Necesitas hacer un arqueo o corte?",
            "category": "caja",
            "priority": 6
        },
        {
            "question": "Caja - Arqueo",
            "keywords": "arqueo,contar dinero,contar efectivo,cuadrar caja",
            "answer": "Para hacer un arqueo de caja:\n\n1. Ve al módulo 'Caja'\n2. Haz clic en 'Nuevo Arqueo'\n3. Cuenta el efectivo por denominación\n4. Ingresa las cantidades de cada billete/moneda\n5. El sistema calculará el total\n6. Guarda el arqueo\n\nPodrás comparar con el efectivo esperado.",
            "category": "caja",
            "priority": 5
        },
        {
            "question": "Caja - Corte",
            "keywords": "corte caja,cerrar caja,cierre caja,corte diario",
            "answer": "Para hacer un corte de caja:\n\n1. Realiza primero un arqueo\n2. Haz clic en 'Corte de Caja'\n3. Revisa el resumen de ventas\n4. Verifica diferencias (faltante/sobrante)\n5. Agrega observaciones si es necesario\n6. Confirma el corte\n\nEsto cierra las operaciones del día.",
            "category": "caja",
            "priority": 5
        },
        
        # TURNOS
        {
            "question": "Turnos - General",
            "keywords": "turno,turnos,abrir turno,cerrar turno,jornada",
            "answer": "El módulo de Turnos te permite:\n\n• Iniciar turno al comenzar a trabajar\n• Registrar todas las ventas del turno\n• Ver el resumen de ventas por turno\n• Cerrar turno al finalizar\n\nCada empleado puede tener su propio turno activo.",
            "category": "turnos",
            "priority": 6
        },
        {
            "question": "Turnos - Abrir turno",
            "keywords": "abrir turno,iniciar turno,comenzar turno,empezar turno",
            "answer": "Para abrir un turno:\n\n1. Ve al módulo 'Turnos'\n2. Haz clic en 'Iniciar Turno'\n3. Selecciona la ubicación/sucursal\n4. Ingresa el fondo de caja inicial (opcional)\n5. Confirma\n\nYa puedes comenzar a registrar ventas.",
            "category": "turnos",
            "priority": 5
        },
        {
            "question": "Turnos - Cerrar turno",
            "keywords": "cerrar turno,finalizar turno,terminar turno,acabar turno",
            "answer": "Para cerrar un turno:\n\n1. Ve al módulo 'Turnos'\n2. Haz clic en 'Cerrar Turno'\n3. Revisa el resumen de ventas\n4. Realiza el arqueo de caja\n5. Confirma el cierre\n\nEl sistema generará un reporte del turno.",
            "category": "turnos",
            "priority": 5
        },
        
        # MERMAS
        {
            "question": "Mermas - General",
            "keywords": "merma,mermas,perdida,perdidas,desperdicio,dañado",
            "answer": "El módulo de Mermas te permite registrar:\n\n• Productos dañados\n• Productos vencidos\n• Pérdidas por robo\n• Desperdicios\n\nEsto ajusta automáticamente el inventario y genera reportes de pérdidas.",
            "category": "mermas",
            "priority": 6
        },
        {
            "question": "Mermas - Registrar",
            "keywords": "registrar merma,agregar merma,nueva merma,reportar perdida",
            "answer": "Para registrar una merma:\n\n1. Ve al módulo 'Mermas'\n2. Haz clic en 'Nueva Merma'\n3. Selecciona el producto\n4. Indica la cantidad perdida\n5. Selecciona el motivo (dañado, vencido, etc.)\n6. Agrega observaciones\n7. Guarda\n\nEl stock se ajustará automáticamente.",
            "category": "mermas",
            "priority": 5
        },
        
        # CONTROL DE COSTOS
        {
            "question": "Control de Costos - General",
            "keywords": "control costos,gastos,costos operativos,gastos fijos",
            "answer": "El módulo de Control de Costos te permite:\n\n• Registrar gastos operativos (luz, agua, renta)\n• Distribuir costos entre productos\n• Ver el impacto en el precio de venta\n• Generar reportes de gastos\n\n¿Necesitas registrar un gasto?",
            "category": "costos",
            "priority": 6
        },
        {
            "question": "Control de Costos - Registrar gasto",
            "keywords": "registrar gasto,nuevo gasto,agregar gasto,añadir costo",
            "answer": "Para registrar un gasto:\n\n1. Ve a 'Control de Costos'\n2. Haz clic en 'Nuevo Gasto'\n3. Selecciona la categoría (renta, servicios, etc.)\n4. Ingresa el monto\n5. Define cómo distribuirlo (por producto, porcentaje)\n6. Guarda\n\nEl sistema calculará el impacto en tus costos.",
            "category": "costos",
            "priority": 5
        },
        
        # ERRORES Y SOPORTE
        {
            "question": "Error - Página no carga",
            "keywords": "no carga,cargando,lento,tarda,espera,loading",
            "answer": "Si la página no carga correctamente:\n\n1. Refresca la página (F5 o Ctrl+R)\n2. Limpia la caché del navegador\n3. Verifica tu conexión a internet\n4. Intenta con otro navegador\n5. Cierra sesión y vuelve a entrar\n\nSi el problema persiste, contacta soporte.",
            "category": "soporte",
            "priority": 7
        },
        {
            "question": "Error - No puedo iniciar sesión",
            "keywords": "no puedo entrar,login,sesion,contraseña,usuario incorrecto",
            "answer": "Si no puedes iniciar sesión:\n\n1. Verifica que el usuario esté bien escrito\n2. Revisa que la contraseña sea correcta\n3. Asegúrate de no tener Bloq Mayús activado\n4. Intenta restablecer tu contraseña\n5. Contacta al administrador si el problema persiste\n\n¿Tu cuenta podría estar suspendida?",
            "category": "soporte",
            "priority": 7
        },
        {
            "question": "Error - General",
            "keywords": "error,problema,falla,no funciona,bug,fallo",
            "answer": "Si tienes un error técnico:\n\n1. Toma una captura de pantalla del error\n2. Anota qué estabas haciendo cuando ocurrió\n3. Refresca la página (F5)\n4. Cierra sesión y vuelve a entrar\n5. Si persiste, contacta soporte con los detalles\n\n¿Puedes describir el error que ves?",
            "category": "soporte",
            "priority": 6
        },
        {
            "question": "Contacto de soporte",
            "keywords": "contacto,soporte,telefono,email,whatsapp,humano,persona,hablar",
            "answer": "Para contactar soporte técnico:\n\n📧 Email: soporte@mysale.com\n📱 WhatsApp: +57 300 000 0000\n\nHorario de atención:\nLunes a Viernes: 8am - 6pm\nSábados: 9am - 1pm\n\nDescribe tu problema con el mayor detalle posible.",
            "category": "soporte",
            "priority": 8
        },
        
        # USUARIOS
        {
            "question": "Usuarios - General",
            "keywords": "usuario,usuarios,empleado,empleados,personal,acceso",
            "answer": "El módulo de Usuarios te permite:\n\n• Crear nuevos usuarios\n• Asignar roles y permisos\n• Activar/desactivar usuarios\n• Restablecer contraseñas\n\nSolo administradores pueden gestionar usuarios.",
            "category": "usuarios",
            "priority": 5
        },
        {
            "question": "Usuarios - Crear usuario",
            "keywords": "crear usuario,nuevo usuario,agregar empleado,añadir usuario",
            "answer": "Para crear un nuevo usuario:\n\n1. Ve al módulo 'Usuarios'\n2. Haz clic en 'Nuevo Usuario'\n3. Completa nombre, email, usuario\n4. Asigna una contraseña temporal\n5. Selecciona el rol (Cajero, Admin, etc.)\n6. Guarda\n\nEl usuario podrá iniciar sesión inmediatamente.",
            "category": "usuarios",
            "priority": 5
        }
    ]
    
    for faq_data in default_faqs:
        faq = FAQ(**faq_data)
        db.add(faq)
    
    db.commit()
    return {"message": f"Created {len(default_faqs)} default FAQs"}
