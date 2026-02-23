"""
MySale Biometric Service - GUI
Ventana grafica para ejecutar el servicio biometrico sin necesidad de usar CMD.
Doble clic en este archivo para iniciar el servicio.
"""

import os
import sys
import threading
import tkinter as tk
from tkinter import scrolledtext
from datetime import datetime

script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, script_dir)

from biometric_server import run_server, reader_status, fingerprint_lib, HOST, PORT


class BiometricServiceGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("MySale - Servicio Biometrico")
        self.root.geometry("600x450")
        self.root.resizable(True, True)
        self.root.configure(bg="#1a1a2e")

        try:
            self.root.iconbitmap(os.path.join(script_dir, "icon.ico"))
        except Exception:
            pass

        self.server_thread = None
        self.server_running = False

        self._build_ui()
        self._start_server()

    def _build_ui(self):
        header = tk.Frame(self.root, bg="#16213e", pady=10)
        header.pack(fill=tk.X)

        tk.Label(
            header, text="MySale Biometric Service",
            font=("Segoe UI", 18, "bold"), fg="#e94560", bg="#16213e"
        ).pack()

        tk.Label(
            header, text="Servicio de Lector de Huellas DigitalPersona 4500",
            font=("Segoe UI", 10), fg="#a0a0b0", bg="#16213e"
        ).pack()

        status_frame = tk.Frame(self.root, bg="#0f3460", pady=8, padx=12)
        status_frame.pack(fill=tk.X, padx=10, pady=(10, 5))

        self.status_label = tk.Label(
            status_frame, text="Iniciando...",
            font=("Segoe UI", 11, "bold"), fg="#ffd700", bg="#0f3460", anchor="w"
        )
        self.status_label.pack(side=tk.LEFT)

        self.reader_label = tk.Label(
            status_frame, text="",
            font=("Segoe UI", 10), fg="#a0a0b0", bg="#0f3460", anchor="e"
        )
        self.reader_label.pack(side=tk.RIGHT)

        log_frame = tk.Frame(self.root, bg="#1a1a2e")
        log_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        tk.Label(
            log_frame, text="Registro de actividad:",
            font=("Segoe UI", 9), fg="#a0a0b0", bg="#1a1a2e", anchor="w"
        ).pack(fill=tk.X)

        self.log_text = scrolledtext.ScrolledText(
            log_frame, font=("Consolas", 9), bg="#0a0a1a", fg="#00ff88",
            insertbackground="#00ff88", height=12, state=tk.DISABLED,
            relief=tk.FLAT, borderwidth=2
        )
        self.log_text.pack(fill=tk.BOTH, expand=True)

        btn_frame = tk.Frame(self.root, bg="#1a1a2e", pady=8)
        btn_frame.pack(fill=tk.X, padx=10)

        self.btn_toggle = tk.Button(
            btn_frame, text="Detener Servicio",
            font=("Segoe UI", 10, "bold"), bg="#e94560", fg="white",
            activebackground="#c0392b", activeforeground="white",
            relief=tk.FLAT, padx=20, pady=6, cursor="hand2",
            command=self._toggle_server
        )
        self.btn_toggle.pack(side=tk.LEFT)

        tk.Button(
            btn_frame, text="Limpiar Log",
            font=("Segoe UI", 10), bg="#0f3460", fg="white",
            activebackground="#16213e", activeforeground="white",
            relief=tk.FLAT, padx=20, pady=6, cursor="hand2",
            command=self._clear_log
        ).pack(side=tk.LEFT, padx=(10, 0))

        footer = tk.Frame(self.root, bg="#16213e", pady=4)
        footer.pack(fill=tk.X, side=tk.BOTTOM)

        tk.Label(
            footer, text=f"Puerto: {PORT}  |  GALIA 1539",
            font=("Segoe UI", 8), fg="#606080", bg="#16213e"
        ).pack()

    def _log(self, message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_text.config(state=tk.NORMAL)
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.log_text.see(tk.END)
        self.log_text.config(state=tk.DISABLED)

    def _update_status(self):
        if self.server_running:
            self.status_label.config(text="Servicio Activo", fg="#00ff88")
            self.btn_toggle.config(text="Detener Servicio", bg="#e94560")
        else:
            self.status_label.config(text="Servicio Detenido", fg="#e94560")
            self.btn_toggle.config(text="Iniciar Servicio", bg="#27ae60")

        if fingerprint_lib:
            self.reader_label.config(
                text=f"Lector: {reader_status.get('device_name', 'Conectado')}",
                fg="#00ff88"
            )
        else:
            self.reader_label.config(text="Modo Simulacion", fg="#ffd700")

    def _start_server(self):
        if self.server_running:
            return

        self.server_running = True
        self._update_status()

        self._log("Iniciando servicio biometrico...")

        if fingerprint_lib:
            self._log(f"Lector detectado: {reader_status.get('device_name', 'DigitalPersona 4500')}")
        else:
            self._log("MODO SIMULACION: SDK de DigitalPersona no disponible")
            self._log("Para lector real, instale el SDK y coloque uareu4500.dll aqui")

        self._log(f"Servidor escuchando en http://{HOST}:{PORT}")

        self.server_thread = threading.Thread(target=self._run_server_thread, daemon=True)
        self.server_thread.start()

    def _run_server_thread(self):
        from http.server import HTTPServer
        from biometric_server import BiometricHandler

        gui_ref = self

        class GUIBiometricHandler(BiometricHandler):
            def log_message(self, format, *args):
                msg = f"{args[0]}"
                gui_ref.root.after(0, gui_ref._log, msg)

        try:
            self.httpd = HTTPServer((HOST, PORT), GUIBiometricHandler)
            self.httpd.serve_forever()
        except OSError as e:
            self.root.after(0, self._log, f"Error: {e}")
            self.root.after(0, self._on_server_stopped)
        except Exception as e:
            self.root.after(0, self._log, f"Error inesperado: {e}")
            self.root.after(0, self._on_server_stopped)

    def _stop_server(self):
        if not self.server_running:
            return
        self._log("Deteniendo servicio...")
        if hasattr(self, 'httpd'):
            threading.Thread(target=self.httpd.shutdown, daemon=True).start()
        self._on_server_stopped()

    def _on_server_stopped(self):
        self.server_running = False
        self._update_status()
        self._log("Servicio detenido")

    def _toggle_server(self):
        if self.server_running:
            self._stop_server()
        else:
            self._start_server()

    def _clear_log(self):
        self.log_text.config(state=tk.NORMAL)
        self.log_text.delete(1.0, tk.END)
        self.log_text.config(state=tk.DISABLED)


def main():
    root = tk.Tk()
    BiometricServiceGUI(root)

    def on_close():
        root.destroy()
        sys.exit(0)

    root.protocol("WM_DELETE_WINDOW", on_close)
    root.mainloop()


if __name__ == '__main__':
    main()
