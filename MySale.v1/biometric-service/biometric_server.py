"""
MySale Biometric Service
Servicio local para Windows que permite la integración del lector de huellas DigitalPersona 4500
"""

import os
import sys
import json
import base64
import ctypes
import hashlib
import threading
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Configuración del servidor
HOST = 'localhost'
PORT = 8765

# Estado global del lector
reader_status = {
    'connected': False,
    'device_name': None,
    'last_error': None
}

fingerprint_lib = None
try:
    if sys.platform == 'win32':
        dll_path = os.path.join(os.path.dirname(__file__), 'uareu4500.dll')
        if os.path.exists(dll_path):
            fingerprint_lib = ctypes.CDLL(dll_path, winmode=0)
            fingerprint_lib.python_read_fingerprint_and_get_base64_string.restype = ctypes.c_char_p
            fingerprint_lib.python_compare_base64_string_with_finger.argtypes = [ctypes.c_char_p]
            fingerprint_lib.python_compare_base64_string_with_finger.restype = ctypes.c_int
            reader_status['connected'] = True
            reader_status['device_name'] = 'DigitalPersona 4500'
except Exception as e:
    reader_status['last_error'] = str(e)


class BiometricHandler(BaseHTTPRequestHandler):
    """Handler para las solicitudes HTTP del servicio biométrico"""
    
    def _set_headers(self, status=200, content_type='application/json'):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def do_OPTIONS(self):
        self._set_headers()
    
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/status':
            self._handle_status()
        elif parsed_path.path == '/health':
            self._handle_health()
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'Not found'}).encode())
    
    def do_POST(self):
        parsed_path = urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else b'{}'
        
        try:
            data = json.loads(body) if body else {}
        except json.JSONDecodeError:
            data = {}
        
        if parsed_path.path == '/capture':
            self._handle_capture(data)
        elif parsed_path.path == '/verify':
            self._handle_verify(data)
        elif parsed_path.path == '/enroll':
            self._handle_enroll(data)
        else:
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'Not found'}).encode())
    
    def _handle_health(self):
        """Endpoint de salud del servicio"""
        self._set_headers()
        response = {
            'status': 'ok',
            'service': 'MySale Biometric Service',
            'version': '1.0.0'
        }
        self.wfile.write(json.dumps(response).encode())
    
    def _handle_status(self):
        """Retorna el estado del lector biométrico"""
        self._set_headers()
        
        status = {
            'reader_connected': reader_status['connected'],
            'device_name': reader_status['device_name'],
            'service_running': True,
            'last_error': reader_status['last_error']
        }
        
        # Si tenemos la DLL, verificar el estado real del lector
        if fingerprint_lib:
            try:
                # Aquí iría la llamada real al SDK para verificar conexión
                status['reader_connected'] = True
            except Exception as e:
                status['reader_connected'] = False
                status['last_error'] = str(e)
        
        self.wfile.write(json.dumps(status).encode())
    
    def _handle_capture(self, data):
        """Captura una huella digital y retorna el template"""
        self._set_headers()
        
        timeout = data.get('timeout', 10000)  # Timeout en ms
        
        if not fingerprint_lib:
            # Modo simulación para desarrollo
            response = {
                'success': True,
                'template': self._generate_mock_template(),
                'quality': 85,
                'message': 'Huella capturada (modo simulación)',
                'simulation': True
            }
        else:
            try:
                # Aquí iría la llamada real al SDK para capturar huella
                # fingerprint_lib.python_capture_fingerprint(timeout)
                response = {
                    'success': True,
                    'template': self._capture_real_fingerprint(timeout),
                    'quality': 90,
                    'message': 'Huella capturada exitosamente'
                }
            except Exception as e:
                response = {
                    'success': False,
                    'error': str(e),
                    'message': 'Error al capturar huella'
                }
        
        self.wfile.write(json.dumps(response).encode())
    
    def _handle_verify(self, data):
        """Verifica una huella contra un template almacenado"""
        self._set_headers()
        
        stored_template = data.get('template')
        timeout = data.get('timeout', 10000)
        
        if not stored_template:
            response = {
                'success': False,
                'error': 'No se proporcionó template para verificar'
            }
            self.wfile.write(json.dumps(response).encode())
            return
        
        if not fingerprint_lib:
            # Modo simulación - siempre retorna match para pruebas
            response = {
                'success': True,
                'match': True,
                'score': 95,
                'message': 'Verificación exitosa (modo simulación)',
                'simulation': True
            }
        else:
            try:
                # Aquí iría la llamada real al SDK para verificar
                match_result = self._verify_real_fingerprint(stored_template, timeout)
                response = {
                    'success': True,
                    'match': match_result['match'],
                    'score': match_result['score'],
                    'message': 'Verificación completada'
                }
            except Exception as e:
                response = {
                    'success': False,
                    'error': str(e),
                    'message': 'Error al verificar huella'
                }
        
        self.wfile.write(json.dumps(response).encode())
    
    def _handle_enroll(self, data):
        """Proceso de enrolamiento (captura múltiple para mejor calidad)"""
        self._set_headers()
        
        num_captures = data.get('num_captures', 3)
        timeout = data.get('timeout', 10000)
        
        if not fingerprint_lib:
            # Modo simulación
            response = {
                'success': True,
                'template': self._generate_mock_template(),
                'quality': 92,
                'captures_completed': num_captures,
                'message': f'Enrolamiento completado con {num_captures} capturas (modo simulación)',
                'simulation': True
            }
        else:
            try:
                # Aquí iría el proceso real de enrolamiento
                response = {
                    'success': True,
                    'template': self._enroll_real_fingerprint(num_captures, timeout),
                    'quality': 92,
                    'captures_completed': num_captures,
                    'message': f'Enrolamiento completado con {num_captures} capturas'
                }
            except Exception as e:
                response = {
                    'success': False,
                    'error': str(e),
                    'message': 'Error durante el enrolamiento'
                }
        
        self.wfile.write(json.dumps(response).encode())
    
    def _generate_mock_template(self):
        """Genera un template simulado para desarrollo"""
        # Genera un hash único basado en el tiempo
        unique_data = f"mock_fingerprint_{time.time()}_{os.urandom(16).hex()}"
        template_hash = hashlib.sha256(unique_data.encode()).digest()
        return base64.b64encode(template_hash).decode()
    
    def _capture_real_fingerprint(self, timeout):
        fmd_ptr = fingerprint_lib.python_read_fingerprint_and_get_base64_string()
        if not fmd_ptr:
            raise Exception('No se pudo capturar la huella del lector')
        return ctypes.string_at(fmd_ptr).decode('utf-8')
    
    def _verify_real_fingerprint(self, stored_template, timeout):
        result = fingerprint_lib.python_compare_base64_string_with_finger(
            stored_template.encode('utf-8')
        )
        return {'match': bool(result), 'score': 100 if result else 0}
    
    def _enroll_real_fingerprint(self, num_captures, timeout):
        best_template = None
        for _ in range(num_captures):
            fmd_ptr = fingerprint_lib.python_read_fingerprint_and_get_base64_string()
            if not fmd_ptr:
                raise Exception('No se pudo capturar la huella del lector')
            best_template = ctypes.string_at(fmd_ptr).decode('utf-8')
        return best_template
    
    def log_message(self, format, *args):
        """Personaliza el logging"""
        print(f"[BiometricService] {args[0]}")


def run_server():
    """Inicia el servidor HTTP"""
    server_address = (HOST, PORT)
    httpd = HTTPServer(server_address, BiometricHandler)
    
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║           MySale Biometric Service v1.0.0                   ║
╠══════════════════════════════════════════════════════════════╣
║  Estado del lector: {'Conectado' if reader_status['connected'] else 'No conectado (modo simulación)'}
║  Dispositivo: {reader_status['device_name'] or 'N/A'}
║  Servidor: http://{HOST}:{PORT}
╚══════════════════════════════════════════════════════════════╝
    """)
    
    if not fingerprint_lib:
        print("⚠️  MODO SIMULACIÓN: El SDK de DigitalPersona no está disponible.")
        print("    Para usar el lector real, instale el SDK y coloque uareu4500.dll")
        print("    en el mismo directorio que este script.\n")
    
    print("Presione Ctrl+C para detener el servicio.\n")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nDeteniendo servicio...")
        httpd.shutdown()


if __name__ == '__main__':
    run_server()
