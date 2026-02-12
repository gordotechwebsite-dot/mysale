"""
MySale Biometric Service v4.0.0
Servicio local para Windows - lector de huellas DigitalPersona 4500
Modos: wrapper (uareu4500.dll) | direct (dpfpdd+dpfj) | winbio (WBF) | simulation
"""

import os
import sys
import json
import base64
import ctypes
import hashlib
import time
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

HOST = 'localhost'
PORT = 8765

script_dir = os.path.dirname(os.path.abspath(__file__))

DPFPDD_SUCCESS = 0
DPFPDD_IMG_FMT_ANSI381 = 0x001B0401
DPFJ_FID_ANSI_381_2004 = 0x001B0401
DPFJ_FMD_ANSI_378_2004 = 0x001B0001
MAX_FMD_SIZE = 9999
CAPTURE_BUFFER_SIZE = 512000

WINBIO_TYPE_FINGERPRINT = 0x00000008
WINBIO_POOL_SYSTEM = 0x00000001
WINBIO_FLAG_DEFAULT = 0x00000000
WINBIO_ID_TYPE_SID = 3
WINBIO_ID_TYPE_NULL = 0
SECURITY_MAX_SID_SIZE = 68
S_OK = 0
WINBIO_E_UNKNOWN_ID = 0x80098005
WINBIO_E_BAD_CAPTURE = 0x80098003
WINBIO_E_ENROLLMENT_IN_PROGRESS = 0x8009800B


class DPFPDD_VER_INFO(ctypes.Structure):
    _fields_ = [("major", ctypes.c_int), ("minor", ctypes.c_int), ("maintenance", ctypes.c_int)]


class DPFPDD_HW_DESCR(ctypes.Structure):
    _fields_ = [
        ("vendor_name", ctypes.c_char * 128),
        ("product_name", ctypes.c_char * 128),
        ("serial_num", ctypes.c_char * 128),
    ]


class DPFPDD_HW_ID(ctypes.Structure):
    _fields_ = [("vendor_id", ctypes.c_ushort), ("product_id", ctypes.c_ushort)]


class DPFPDD_HW_VERSION(ctypes.Structure):
    _fields_ = [("fw_ver", DPFPDD_VER_INFO), ("usb_ver", DPFPDD_VER_INFO)]


class DPFPDD_DEV_INFO(ctypes.Structure):
    _fields_ = [
        ("size", ctypes.c_uint),
        ("name", ctypes.c_char * 1040),
        ("descr", DPFPDD_HW_DESCR),
        ("id", DPFPDD_HW_ID),
        ("ver", DPFPDD_HW_VERSION),
        ("modality", ctypes.c_uint),
        ("technology", ctypes.c_uint),
    ]


class DPFPDD_CAPTURE_PARAM(ctypes.Structure):
    _fields_ = [
        ("size", ctypes.c_uint),
        ("image_fmt", ctypes.c_uint),
        ("image_proc", ctypes.c_uint),
        ("image_res", ctypes.c_uint),
    ]


class DPFPDD_CAPTURE_RESULT(ctypes.Structure):
    _fields_ = [
        ("size", ctypes.c_uint),
        ("success", ctypes.c_int),
        ("quality", ctypes.c_uint),
        ("score", ctypes.c_uint),
        ("info", ctypes.c_uint),
    ]


class _WINBIO_ACCOUNTSID(ctypes.Structure):
    _fields_ = [
        ("AccountSidSize", ctypes.c_ulong),
        ("AccountSid", ctypes.c_ubyte * SECURITY_MAX_SID_SIZE),
    ]


class _WINBIO_IDENTITY_VALUE(ctypes.Union):
    _fields_ = [
        ("Null", ctypes.c_ulong),
        ("Wildcard", ctypes.c_ulong),
        ("TemplateGuid", ctypes.c_ubyte * 16),
        ("AccountSid", _WINBIO_ACCOUNTSID),
        ("SecureId", ctypes.c_longlong),
    ]


class WINBIO_IDENTITY(ctypes.Structure):
    _fields_ = [
        ("Type", ctypes.c_ulong),
        ("Value", _WINBIO_IDENTITY_VALUE),
    ]


reader_status = {
    'connected': False,
    'device_name': None,
    'last_error': None
}

sdk_mode = 'simulation'
fingerprint_lib = None
dpfpdd_lib = None
dpfj_lib = None
dp_device_handle = ctypes.c_void_p()
winbio_session = None
winbio_lib = None


def _try_wrapper():
    global fingerprint_lib, sdk_mode
    dll_path = os.path.join(script_dir, 'uareu4500.dll')
    if not os.path.exists(dll_path):
        print(f"[SDK] uareu4500.dll no encontrado en {script_dir}")
        return False
    try:
        fingerprint_lib = ctypes.CDLL(dll_path, winmode=0)
        fingerprint_lib.python_read_fingerprint_and_get_base64_string.restype = ctypes.c_char_p
        fingerprint_lib.python_compare_base64_string_with_finger.argtypes = [ctypes.c_char_p]
        fingerprint_lib.python_compare_base64_string_with_finger.restype = ctypes.c_int
        sdk_mode = 'wrapper'
        print("[SDK] uareu4500.dll cargado (modo wrapper)")
        return True
    except Exception as e:
        print(f"[SDK] Error al cargar uareu4500.dll: {e}")
        fingerprint_lib = None
        return False


def _try_direct():
    global dpfpdd_lib, dpfj_lib, dp_device_handle, sdk_mode
    dpfpdd_path = os.path.join(script_dir, 'dpfpdd.dll')
    dpfj_path = os.path.join(script_dir, 'dpfj.dll')

    if not os.path.exists(dpfpdd_path) or not os.path.exists(dpfj_path):
        print("[SDK] dpfpdd.dll o dpfj.dll no encontrado")
        return False

    os.environ['PATH'] = script_dir + os.pathsep + os.environ.get('PATH', '')
    if hasattr(os, 'add_dll_directory'):
        os.add_dll_directory(script_dir)

    try:
        dpfpdd_lib = ctypes.WinDLL(dpfpdd_path, winmode=0)
        dpfj_lib = ctypes.WinDLL(dpfj_path, winmode=0)
        print("[SDK] dpfpdd.dll y dpfj.dll cargados")
    except Exception as e:
        print(f"[SDK] Error al cargar dpfpdd/dpfj: {e}")
        return False

    result = dpfpdd_lib.dpfpdd_init()
    if result != DPFPDD_SUCCESS:
        print(f"[SDK] dpfpdd_init fallo: codigo {result}")
        return False
    print("[SDK] dpfpdd_init OK")

    dev_cnt = ctypes.c_uint(0)
    dpfpdd_lib.dpfpdd_query_devices(ctypes.byref(dev_cnt), None)
    if dev_cnt.value == 0:
        print("[SDK] No se encontraron lectores")
        dpfpdd_lib.dpfpdd_exit()
        return False

    dev_infos = (DPFPDD_DEV_INFO * dev_cnt.value)()
    for i in range(dev_cnt.value):
        dev_infos[i].size = ctypes.sizeof(DPFPDD_DEV_INFO)
    dpfpdd_lib.dpfpdd_query_devices(ctypes.byref(dev_cnt), dev_infos)

    dp_device_handle = ctypes.c_void_p()
    result = dpfpdd_lib.dpfpdd_open(dev_infos[0].name, ctypes.byref(dp_device_handle))
    if result != DPFPDD_SUCCESS:
        print(f"[SDK] dpfpdd_open fallo: {result}")
        dpfpdd_lib.dpfpdd_exit()
        return False

    sdk_mode = 'direct'
    print("[SDK] Modo directo (dpfpdd + dpfj) OK")
    return True


def _try_winbio():
    global winbio_session, winbio_lib, sdk_mode
    try:
        winbio_lib = ctypes.windll.winbio
    except Exception as e:
        print(f"[WBF] winbio.dll no disponible: {e}")
        return False

    session_handle = ctypes.c_size_t()
    hr = winbio_lib.WinBioOpenSession(
        ctypes.c_uint(WINBIO_TYPE_FINGERPRINT),
        ctypes.c_uint(WINBIO_POOL_SYSTEM),
        ctypes.c_uint(WINBIO_FLAG_DEFAULT),
        None,
        ctypes.c_size_t(0),
        None,
        ctypes.byref(session_handle)
    )
    if hr != S_OK:
        print(f"[WBF] WinBioOpenSession fallo: 0x{hr & 0xFFFFFFFF:08X}")
        return False

    winbio_session = session_handle.value
    sdk_mode = 'winbio'
    print(f"[WBF] Sesion abierta (handle={winbio_session})")
    return True


if sys.platform == 'win32':
    print("[SDK] Intentando cargar uareu4500.dll...")
    if not _try_wrapper():
        print("[SDK] Intentando modo directo (dpfpdd + dpfj)...")
        if not _try_direct():
            print("[WBF] Intentando Windows Biometric Framework...")
            _try_winbio()

if sdk_mode != 'simulation':
    reader_status['connected'] = True
    reader_status['device_name'] = 'DigitalPersona 4500'
else:
    reader_status['last_error'] = 'Ningun SDK disponible'


def _winbio_refresh_session():
    global winbio_session
    try:
        winbio_lib.WinBioCloseSession(ctypes.c_size_t(winbio_session))
        print("[WBF] Sesion cerrada para refrescar")
    except Exception:
        pass
    session_handle = ctypes.c_size_t()
    hr = winbio_lib.WinBioOpenSession(
        ctypes.c_uint(WINBIO_TYPE_FINGERPRINT),
        ctypes.c_uint(WINBIO_POOL_SYSTEM),
        ctypes.c_uint(WINBIO_FLAG_DEFAULT),
        None,
        ctypes.c_size_t(0),
        None,
        ctypes.byref(session_handle)
    )
    if hr != S_OK:
        raise Exception(f'WinBioOpenSession fallo al refrescar: 0x{hr & 0xFFFFFFFF:08X}')
    winbio_session = session_handle.value
    print(f"[WBF] Sesion refrescada (handle={winbio_session})")


def _winbio_identify():
    _winbio_refresh_session()

    unit_id = ctypes.c_uint(0)
    identity = WINBIO_IDENTITY()
    sub_factor = ctypes.c_ubyte(0)
    reject_detail = ctypes.c_uint(0)

    result_holder = {'hr': None, 'error': None}

    def do_identify():
        try:
            result_holder['hr'] = winbio_lib.WinBioIdentify(
                ctypes.c_size_t(winbio_session),
                ctypes.byref(unit_id),
                ctypes.byref(identity),
                ctypes.byref(sub_factor),
                ctypes.byref(reject_detail)
            )
        except Exception as e:
            result_holder['error'] = str(e)

    print("[WBF] Esperando huella en el lector (30s timeout)...")
    t = threading.Thread(target=do_identify, daemon=True)
    t.start()
    t.join(timeout=30)

    if t.is_alive():
        print("[WBF] Timeout - cancelando operacion...")
        winbio_lib.WinBioCancel(ctypes.c_size_t(winbio_session))
        t.join(timeout=5)
        raise Exception('Timeout: no se detecto huella en 30 segundos. Intente de nuevo.')

    if result_holder['error']:
        raise Exception(f'WinBioIdentify error: {result_holder["error"]}')

    hr = result_holder['hr']
    error_code = hr & 0xFFFFFFFF
    if hr != S_OK:
        if error_code == WINBIO_E_UNKNOWN_ID:
            raise Exception('Huella no registrada en Windows. Registre su huella en: Configuracion > Cuentas > Opciones de inicio de sesion > Huella digital')
        if error_code == WINBIO_E_BAD_CAPTURE:
            raise Exception(f'Captura de mala calidad. Intente de nuevo.')
        raise Exception(f'WinBioIdentify fallo: 0x{error_code:08X}')

    sf = sub_factor.value
    print(f"[WBF] Identificacion OK, unidad: {unit_id.value}, tipo identidad: {identity.Type}, subfactor: {sf}")

    if identity.Type == WINBIO_ID_TYPE_SID:
        sid_size = identity.Value.AccountSid.AccountSidSize
        sid_bytes = bytes(identity.Value.AccountSid.AccountSid[:sid_size])
        sid_b64 = base64.b64encode(sid_bytes).decode('utf-8')
        template = f"{sid_b64}:{sf}"
        print(f"[WBF] SID identificado: {sid_size} bytes, subfactor: {sf}")
        return template
    else:
        raw_bytes = bytes(ctypes.string_at(ctypes.byref(identity.Value), ctypes.sizeof(identity.Value)))
        raw_b64 = base64.b64encode(raw_bytes).decode('utf-8')
        return f"{raw_b64}:{sf}"


def sdk_capture_base64():
    if sdk_mode == 'wrapper':
        fmd_ptr = fingerprint_lib.python_read_fingerprint_and_get_base64_string()
        if not fmd_ptr:
            raise Exception('No se pudo capturar la huella')
        return ctypes.string_at(fmd_ptr).decode('utf-8')

    if sdk_mode == 'direct':
        param = DPFPDD_CAPTURE_PARAM()
        param.size = ctypes.sizeof(DPFPDD_CAPTURE_PARAM)
        param.image_fmt = DPFPDD_IMG_FMT_ANSI381
        param.image_proc = 0
        param.image_res = 500

        cap_res = DPFPDD_CAPTURE_RESULT()
        cap_res.size = ctypes.sizeof(DPFPDD_CAPTURE_RESULT)

        buf_size = ctypes.c_uint(CAPTURE_BUFFER_SIZE)
        image_data = (ctypes.c_ubyte * CAPTURE_BUFFER_SIZE)()

        print("[SDK] Esperando huella en el lector...")
        result = dpfpdd_lib.dpfpdd_capture(
            dp_device_handle, ctypes.byref(param),
            ctypes.c_uint(0xFFFFFFFF),
            ctypes.byref(cap_res),
            ctypes.byref(buf_size), image_data
        )

        if result != DPFPDD_SUCCESS:
            raise Exception(f'Error al capturar: codigo {result}')

        fmd_size = ctypes.c_uint(MAX_FMD_SIZE)
        fmd_data = (ctypes.c_ubyte * MAX_FMD_SIZE)()
        result = dpfj_lib.dpfj_create_fmd_from_fid(
            ctypes.c_uint(DPFJ_FID_ANSI_381_2004),
            image_data, ctypes.c_uint(buf_size.value),
            ctypes.c_uint(DPFJ_FMD_ANSI_378_2004),
            fmd_data, ctypes.byref(fmd_size)
        )
        if result != 0:
            raise Exception(f'Error al crear FMD: codigo {result}')
        return base64.b64encode(bytes(fmd_data[:fmd_size.value])).decode('utf-8')

    if sdk_mode == 'winbio':
        return _winbio_identify()

    raise Exception('SDK no disponible')


def sdk_compare_with_finger(stored_b64):
    if sdk_mode == 'wrapper':
        result = fingerprint_lib.python_compare_base64_string_with_finger(
            stored_b64.encode('utf-8')
        )
        return bool(result)

    if sdk_mode == 'direct':
        new_b64 = sdk_capture_base64()
        stored_fmd = base64.b64decode(stored_b64)
        new_fmd = base64.b64decode(new_b64)
        stored_arr = (ctypes.c_ubyte * len(stored_fmd)).from_buffer_copy(stored_fmd)
        new_arr = (ctypes.c_ubyte * len(new_fmd)).from_buffer_copy(new_fmd)
        result = dpfj_lib.dpfj_compare(
            ctypes.c_uint(DPFJ_FMD_ANSI_378_2004),
            stored_arr, ctypes.c_uint(len(stored_fmd)), ctypes.c_uint(0),
            ctypes.c_uint(DPFJ_FMD_ANSI_378_2004),
            new_arr, ctypes.c_uint(len(new_fmd)), ctypes.c_uint(0)
        )
        return result == DPFPDD_SUCCESS

    if sdk_mode == 'winbio':
        new_id = _winbio_identify()
        return new_id == stored_b64

    raise Exception('SDK no disponible')


class BiometricHandler(BaseHTTPRequestHandler):

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
        self._set_headers()
        self.wfile.write(json.dumps({
            'status': 'ok',
            'service': 'MySale Biometric Service',
            'version': '4.0.0'
        }).encode())

    def _handle_status(self):
        self._set_headers()
        self.wfile.write(json.dumps({
            'reader_connected': reader_status['connected'],
            'device_name': reader_status['device_name'],
            'service_running': True,
            'sdk_mode': sdk_mode,
            'last_error': reader_status['last_error']
        }).encode())

    def _handle_capture(self, data):
        self._set_headers()
        if sdk_mode == 'simulation':
            response = {
                'success': True,
                'template': self._generate_mock_template(),
                'quality': 85,
                'message': 'Huella capturada (modo simulacion)',
                'simulation': True
            }
        else:
            try:
                template = sdk_capture_base64()
                response = {
                    'success': True,
                    'template': template,
                    'quality': 90,
                    'message': 'Huella capturada exitosamente'
                }
            except Exception as e:
                print(f"[ERROR] Captura fallida: {e}")
                response = {
                    'success': False,
                    'error': str(e),
                    'message': 'Error al capturar huella'
                }
        self.wfile.write(json.dumps(response).encode())

    def _handle_verify(self, data):
        self._set_headers()
        stored_template = data.get('template')
        if not stored_template:
            self.wfile.write(json.dumps({
                'success': False,
                'error': 'No se proporciono template para verificar'
            }).encode())
            return
        if sdk_mode == 'simulation':
            response = {
                'success': True,
                'match': True,
                'score': 95,
                'message': 'Verificacion exitosa (modo simulacion)',
                'simulation': True
            }
        else:
            try:
                match = sdk_compare_with_finger(stored_template)
                response = {
                    'success': True,
                    'match': match,
                    'score': 100 if match else 0,
                    'message': 'Verificacion completada'
                }
            except Exception as e:
                print(f"[ERROR] Verificacion fallida: {e}")
                response = {
                    'success': False,
                    'error': str(e),
                    'message': 'Error al verificar huella'
                }
        self.wfile.write(json.dumps(response).encode())

    def _handle_enroll(self, data):
        self._set_headers()
        num_captures = data.get('num_captures', 3)
        if sdk_mode == 'simulation':
            response = {
                'success': True,
                'template': self._generate_mock_template(),
                'quality': 92,
                'captures_completed': num_captures,
                'message': f'Enrolamiento completado con {num_captures} capturas (modo simulacion)',
                'simulation': True
            }
        else:
            try:
                best_template = None
                for i in range(num_captures):
                    print(f"[SDK] Enrolamiento: captura {i + 1}/{num_captures}")
                    best_template = sdk_capture_base64()
                response = {
                    'success': True,
                    'template': best_template,
                    'quality': 92,
                    'captures_completed': num_captures,
                    'message': f'Enrolamiento completado con {num_captures} capturas'
                }
            except Exception as e:
                print(f"[ERROR] Enrolamiento fallido: {e}")
                response = {
                    'success': False,
                    'error': str(e),
                    'message': 'Error durante el enrolamiento'
                }
        self.wfile.write(json.dumps(response).encode())

    def _generate_mock_template(self):
        unique_data = f"mock_fingerprint_{time.time()}_{os.urandom(16).hex()}"
        template_hash = hashlib.sha256(unique_data.encode()).digest()
        return base64.b64encode(template_hash).decode()

    def log_message(self, format, *args):
        print(f"[BiometricService] {args[0]}")


def run_server():
    server_address = (HOST, PORT)
    httpd = HTTPServer(server_address, BiometricHandler)

    mode_text = {
        'wrapper': 'Conectado (wrapper uareu4500.dll)',
        'direct': 'Conectado (directo dpfpdd + dpfj)',
        'winbio': 'Conectado (Windows Biometric Framework)',
        'simulation': 'No conectado (modo simulacion)',
    }

    print("")
    print("==========================================================")
    print("  MySale Biometric Service v4.0.0")
    print("==========================================================")
    print(f"  Estado: {mode_text.get(sdk_mode, 'Desconocido')}")
    print(f"  Dispositivo: {reader_status['device_name'] or 'N/A'}")
    print(f"  Servidor: http://{HOST}:{PORT}")
    print("==========================================================")
    print("")

    if sdk_mode == 'simulation':
        print("  MODO SIMULACION: No se pudo conectar al lector.")
        if reader_status['last_error']:
            print(f"  Ultimo error: {reader_status['last_error']}")
        print("")

    if sdk_mode == 'winbio':
        print("  Usando Windows Biometric Framework (WinBioIdentify).")
        print("  REQUISITO: Las huellas deben estar registradas en Windows Hello.")
        print("  (Configuracion > Cuentas > Opciones de inicio de sesion > Huella)")
        print("")

    if '--hide' in sys.argv and sys.platform == 'win32':
        try:
            kernel32 = ctypes.windll.kernel32
            user32 = ctypes.windll.user32
            hwnd = kernel32.GetConsoleWindow()
            if hwnd:
                GWL_EXSTYLE = -20
                WS_EX_TOOLWINDOW = 0x00000080
                WS_EX_APPWINDOW = 0x00040000
                style = user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
                style = (style | WS_EX_TOOLWINDOW) & ~WS_EX_APPWINDOW
                user32.SetWindowLongW(hwnd, GWL_EXSTYLE, style)
                user32.ShowWindow(hwnd, 6)
                user32.MoveWindow(hwnd, -32000, -32000, 100, 100, False)
                print("[HIDE] Ventana oculta de la barra de tareas")
        except Exception as e:
            print(f"[HIDE] Error: {e}")
    else:
        print("Presione Ctrl+C para detener el servicio.")
    print("")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("")
        print("Deteniendo servicio...")
        if winbio_session and winbio_lib:
            winbio_lib.WinBioCloseSession(ctypes.c_size_t(winbio_session))
        httpd.shutdown()


if __name__ == '__main__':
    run_server()
