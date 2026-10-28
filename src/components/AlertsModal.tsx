import React, { useState } from 'react';
import {
  AlertTriangle,
  X,
  PackageX,
  TrendingDown,
  Plus,
  CheckCircle,
  ExternalLink,
  DollarSign
} from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { sound } from '../services/soundService';

interface AlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onQuickRestock: (itemId: string, restockQty: number) => void;
}

export const AlertsModal: React.FC<AlertsModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onQuickRestock
}) => {
  const [filter, setFilter] = useState<'all' | 'out' | 'low'>('all');
  const [restockSuccessId, setRestockSuccessId] = useState<string | null>(null);

  if (!isOpen) return null;

  const outOfStockItems = inventory.filter(i => i.quantity <= 0);
  const lowStockItems = inventory.filter(i => i.quantity > 0 && i.quantity <= i.minThreshold);

  const displayItems =
    filter === 'out'
      ? outOfStockItems
      : filter === 'low'
      ? lowStockItems
      : [...outOfStockItems, ...lowStockItems];

  // Calculate estimated restock cost to bring all low/out items to minThreshold + 10 units
  const totalRestockCost = displayItems.reduce((acc, item) => {
    const deficit = Math.max(1, (item.minThreshold + 5) - item.quantity);
    return acc + deficit * item.unitPrice;
  }, 0);

  const handleRestock = (item: InventoryItem) => {
    const recommendedQty = Math.max(10, item.minThreshold * 2);
    onQuickRestock(item.id, recommendedQty);
    sound.playScanSuccess();
    setRestockSuccessId(item.id);
    setTimeout(() => {
      setRestockSuccessId(null);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-600 text-white shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Real-Time Stock Alerts
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">
                  {outOfStockItems.length + lowStockItems.length} Needs Attention
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Products currently exhausted or below safe operating reorder thresholds
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter and summary banner */}
        <div className="px-5 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                filter === 'all'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              All Alerts ({outOfStockItems.length + lowStockItems.length})
            </button>
            <button
              onClick={() => setFilter('out')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                filter === 'out'
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Out of Stock ({outOfStockItems.length})
            </button>
            <button
              onClick={() => setFilter('low')}
              className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                filter === 'low'
                  ? 'bg-amber-600 text-white font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Low Stock ({lowStockItems.length})
            </button>
          </div>

          <div className="text-right text-slate-300 font-mono text-[11px]">
            Est. Restock Value: <strong className="text-white">${totalRestockCost.toFixed(2)}</strong>
          </div>
        </div>

        {/* List of alert items */}
        <div className="p-5 overflow-y-auto space-y-3 flex-1">
          {displayItems.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-slate-800">Inventory Levels Healthy!</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                No items are currently below their minimum threshold in this category.
              </p>
            </div>
          ) : (
            displayItems.map(item => {
              const isOut = item.quantity <= 0;
              const deficit = item.minThreshold - item.quantity;
              const recommendedRestock = Math.max(10, item.minThreshold * 2);

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isOut
                      ? 'bg-rose-50/50 border-rose-200'
                      : 'bg-amber-50/50 border-amber-200'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isOut
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isOut ? <PackageX className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {isOut ? 'Depleted / 0 Units' : 'Below Safety Level'}
                        </span>
                        <span className="text-xs font-mono text-slate-500 font-medium">
                          SKU: {item.sku}
                        </span>
                        <span className="text-xs text-slate-400">• {item.category}</span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>

                      <div className="mt-1.5 flex flex-wrap gap-x-4 text-xs text-slate-600">
                        <span>
                          Current: <strong className={isOut ? 'text-rose-600' : 'text-amber-700'}>{item.quantity}</strong>
                        </span>
                        <span>
                          Min Threshold: <strong className="text-slate-800">{item.minThreshold}</strong>
                        </span>
                        <span>
                          Deficit: <strong className="text-rose-600 font-mono">{deficit > 0 ? `-${deficit}` : '0'}</strong>
                        </span>
                        <span>
                          Location: <strong className="text-slate-700">{item.location}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Quick Restock Action Button */}
                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        onClick={() => handleRestock(item)}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer ${
                          restockSuccessId === item.id
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {restockSuccessId === item.id ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
                            Restocked!
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            Quick Restock (+{recommendedRestock})
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg cursor-pointer"
          >
            Close Alert Center
          </button>
        </div>
      </div>
    </div>
  );
};
