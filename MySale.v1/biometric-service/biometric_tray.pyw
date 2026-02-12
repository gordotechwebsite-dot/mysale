"""
MySale Biometric Service - Bandeja del Sistema
Ejecuta el servicio biometrico en segundo plano con un icono en la bandeja del sistema.
Doble clic en este archivo (.pyw) para iniciar - no se abre ninguna ventana CMD.
"""

import os
import sys
import threading
import socket

script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)

from http.server import HTTPServer
from biometric_server import BiometricHandler, HOST, PORT, reader_status, sdk_mode

PID_FILE = os.path.join(script_dir, "biometric_service.pid")

try:
    import pystray
    from PIL import Image, ImageDraw
    HAS_PYSTRAY = True
except ImportError:
    HAS_PYSTRAY = False


def is_port_in_use():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex((HOST, PORT)) == 0


def create_icon_image(running=True):
    img = Image.new('RGBA', (64, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    color = (0, 255, 136) if running else (233, 69, 96)
    draw.ellipse([8, 4, 56, 52], outline=color, width=3)
    draw.ellipse([18, 14, 46, 42], outline=color, width=2)
    draw.ellipse([27, 23, 37, 33], fill=color)
    draw.ellipse([22, 52, 42, 63], fill=color)
    return img


def write_pid():
    with open(PID_FILE, 'w') as f:
        f.write(str(os.getpid()))


def remove_pid():
    try:
        os.remove(PID_FILE)
    except OSError:
        pass


class TrayBiometricService:
    def __init__(self):
        self.httpd = None
        self.server_thread = None
        self.tray_icon = None

    def start_server(self):
        self.httpd = HTTPServer((HOST, PORT), BiometricHandler)
        self.server_thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)
        self.server_thread.start()
        write_pid()

    def stop(self, icon=None, item=None):
        if self.httpd:
            threading.Thread(target=self.httpd.shutdown, daemon=True).start()
        remove_pid()
        if self.tray_icon:
            self.tray_icon.stop()

    def run_with_tray(self):
        self.start_server()

        if sdk_mode == 'simulation':
            status_text = 'Modo simulacion'
        elif reader_status.get('connected'):
            mode_names = {'wrapper': 'SDK', 'direct': 'SDK Directo', 'winbio': 'Windows Biometric'}
            status_text = f"Conectado ({mode_names.get(sdk_mode, sdk_mode)})"
        else:
            status_text = 'Lector no detectado'

        menu = pystray.Menu(
            pystray.MenuItem(f"MySale Biometric Service", None, enabled=False),
            pystray.MenuItem(f"Puerto: {PORT}", None, enabled=False),
            pystray.MenuItem(f"Estado: {status_text}", None, enabled=False),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Detener servicio", self.stop)
        )

        self.tray_icon = pystray.Icon(
            "mysale_biometric",
            create_icon_image(),
            f"MySale Biometric - {HOST}:{PORT}",
            menu
        )

        self.tray_icon.run()

    def run_silent(self):
        self.start_server()
        try:
            self.server_thread.join()
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
