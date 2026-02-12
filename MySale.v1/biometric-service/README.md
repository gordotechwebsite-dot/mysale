# MySale Biometric Service

Servicio local para Windows que permite la integración del lector de huellas DigitalPersona 4500 con el sistema MySale.

## Requisitos

- Windows 10/11
- Python 3.9+
- Driver de DigitalPersona 4500 instalado
- SDK de DigitalPersona (U.ARE.U SDK)

## Instalación

1. Instalar el driver de DigitalPersona 4500 desde https://www.hidglobal.com/drivers
2. Instalar las dependencias de Python:
   ```
   pip install -r requirements.txt
   ```
3. Ejecutar el servicio con ventana grafica (recomendado):
   ```
   python biometric_gui.py
   ```
   O desde linea de comandos:
   ```
   python biometric_server.py
   ```

## API Endpoints

El servicio expone una API REST en `http://localhost:8765`

### GET /status
Verifica el estado del lector

### POST /capture
Captura una huella digital y retorna el template en base64

### POST /verify
Verifica una huella contra un template almacenado

## Uso con MySale

El frontend de MySale se conecta automáticamente a este servicio cuando detecta que está disponible.
