import React from 'react';
import { AlertTriangle, AlertCircle, ArrowRight, X } from 'lucide-react';
import { InventoryItem } from '../types/inventory';

interface AlertBannerProps {
  inventory: InventoryItem[];
  onOpenAlerts: () => void;
  onDismiss?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  inventory,
  onOpenAlerts,
  onDismiss
}) => {
  const outOfStock = inventory.filter(i => i.quantity <= 0);
  const lowStock = inventory.filter(i => i.quantity > 0 && i.quantity <= i.minThreshold);

  if (outOfStock.length === 0 && lowStock.length === 0) {
    return null;
  }

  const isSevere = outOfStock.length > 0;

  return (
    <div
      className={`mb-6 p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 shadow-xs ${
        isSevere
          ? 'bg-rose-50 border-rose-200 text-rose-900'
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-xl shrink-0 ${
            isSevere ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
          }`}
        >
          {isSevere ? <AlertTriangle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
        </div>
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2">
            <span>Real-Time Inventory Alert:</span>
            {outOfStock.length > 0 && (
              <span className="font-mono bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full text-xs">
                {outOfStock.length} Depleted
              </span>
            )}
            {lowStock.length > 0 && (
              <span className="font-mono bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full text-xs">
                {lowStock.length} Low Stock
              </span>
            )}
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            {isSevere
              ? `Critical: ${outOfStock[0]?.name} ${outOfStock.length > 1 ? `and ${outOfStock.length - 1} other item(s)` : ''} have hit 0 stock.`
              : `Warning: ${lowStock.length} product(s) have dropped below their minimum safety thresholds.`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenAlerts}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer ${
            isSevere
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-amber-600 hover:bg-amber-700 text-white'
          }`}
        >
          <span>View Alerts</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
