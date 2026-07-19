import { CloudOff, RefreshCw } from 'lucide-react';
import { useOfflineSalesSync } from '../hooks/useOfflineSalesSync';

const OfflineSalesIndicator: React.FC = () => {
  const { pendingCount, syncing } = useOfflineSalesSync();

  if (pendingCount === 0 && !syncing) return null;

  return (
    <div className="fixed bottom-4 left-4 z-[9998]">
      <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-2 shadow-lg">
        {syncing ? (
          <RefreshCw size={16} className="animate-spin text-emerald-600" />
        ) : (
          <CloudOff size={16} className="text-amber-500" />
        )}
        <span className="text-xs font-medium text-gray-700">
          {syncing
            ? 'Sincronizando ventas…'
            : `${pendingCount} ${pendingCount === 1 ? 'venta pendiente' : 'ventas pendientes'} de sincronizar`}
        </span>
      </div>
    </div>
  );
};

export default OfflineSalesIndicator;
