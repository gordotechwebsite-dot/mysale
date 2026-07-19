import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';

const PWAUpdatePrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] max-w-sm">
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 shadow-lg">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <RefreshCw size={18} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">Nueva versión disponible</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Hay una actualización lista. Actualiza para tener las últimas mejoras.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => updateServiceWorker(true)}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
            >
              Actualizar
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100"
            >
              Después
            </button>
          </div>
        </div>
        <button
          onClick={() => setNeedRefresh(false)}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Cerrar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default PWAUpdatePrompt;
