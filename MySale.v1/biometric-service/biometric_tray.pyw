"""
MySale Biometric Service - Bandeja del Sistema
Ejecuta el servicio biometrico en segundo plano con un icono en la bandeja del sistema.
Doble clic en este archivo (.pyw) para iniciar - no se abre ninguna ventana CMD.
"""

import os
import sys
import subprocess
import socket
import time
import json
import urllib.request

script_dir = os.path.dirname(os.path.abspath(__file__))
HOST = 'localhost'
PORT = 8765
SW_HIDE = 0
PID_FILE = os.path.join(script_dir, "biometric_service.pid")

try:
    import pystray
    from PIL import Image, ImageDraw
    HAS_PYSTRAY = True
except ImportError:
    HAS_PYSTRAY = False


def find_python_exe():
    exe = sys.executable
    d = os.path.dirname(exe)
    for name in ['python.exe', 'python3.exe']:
        candidate = os.path.join(d, name)
        if os.path.exists(candidate):
            return candidate
    return exe


def is_port_in_use():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex((HOST, PORT)) == 0


def get_service_status():
    try:
        req = urllib.request.Request(f'http://{HOST}:{PORT}/status', method='GET')
        with urllib.request.urlopen(req, timeout=3) as resp:
            return json.loads(resp.read().decode())
    except Exception:
        return None


def create_icon_image(running=True):
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    color = (0, 255, 136) if running else (233, 69, 96)
    draw.ellipse([8, 4, 56, 52], outline=color, width=3)
    draw.ellipse([18, 14, 46, 42], outline=color, width=2)
    draw.ellipse([27, 23, 37, 33], fill=color)
    draw.ellipse([22, 52, 42, 63], fill=color)
    return img


class TrayBiometricService:
    def __init__(self):
        self.proc = None
        self.tray_icon = None

    def start_server(self):
        python_exe = find_python_exe()
        server_script = os.path.join(script_dir, 'biometric_server.py')
        si = subprocess.STARTUPINFO()
        si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        si.wShowWindow = SW_HIDE
        self.proc = subprocess.Popen(
            [python_exe, server_script],
            cwd=script_dir,
            startupinfo=si,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        with open(PID_FILE, 'w') as f:
            f.write(str(self.proc.pid))

    def stop(self, icon=None, item=None):
        if self.proc and self.proc.poll() is None:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.proc.kill()
        try:
            os.remove(PID_FILE)
        except OSError:
            pass
        if self.tray_icon:
            self.tray_icon.stop()

    def run_with_tray(self):
        self.start_server()
        time.sleep(2)

        status = get_service_status()
        if status and status.get('service_running'):
            sdk = status.get('sdk_mode', 'unknown')
            mode_names = {'wrapper': 'SDK', 'direct': 'SDK Directo', 'winbio': 'Windows Biometric', 'simulation': 'Simulacion'}
            if status.get('reader_connected'):
                status_text = f"Conectado ({mode_names.get(sdk, sdk)})"
            else:
                status_text = 'Lector no detectado'
        else:
            status_text = 'Error al iniciar servicio'

        menu = pystray.Menu(
            pystray.MenuItem("MySale Biometric Service", None, enabled=False),
            pystray.MenuItem(f"Puerto: {PORT}", None, enabled=False),
            pystray.MenuItem(f"Estado: {status_text}", None, enabled=False),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Detener servicio", self.stop)
        )

        self.tray_icon = pystray.Icon(
            "mysale_biometric",
            create_icon_image(status is not None),
            f"MySale Biometric - {HOST}:{PORT}",
            menu
        )

        self.tray_icon.run()

    def run_silent(self):
        self.start_server()
        try:
            self.proc.wait()
        except KeyboardInterrupt:
            self.stop()


def main():
    if is_port_in_use():
        if HAS_PYSTRAY:
            import ctypes
            ctypes.windll.user32.MessageBoxW(
                0,
                f"El servicio biometrico ya esta ejecutandose en el puerto {PORT}.",
                "MySale Biometric Service",
                0x40
            )
        sys.exit(1)

    service = TrayBiometricService()

    if HAS_PYSTRAY:
        service.run_with_tray()
    else:
        service.run_silent()


if __name__ == '__main__':
    main()
