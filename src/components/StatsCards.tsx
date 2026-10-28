import React from 'react';
import { Package, DollarSign, AlertOctagon, TrendingDown, Layers } from 'lucide-react';
import { InventoryItem } from '../types/inventory';

interface StatsCardsProps {
  inventory: InventoryItem[];
  onFilterStatus: (status: 'all' | 'out_of_stock' | 'low_stock' | 'healthy') => void;
  activeStatusFilter: 'all' | 'out_of_stock' | 'low_stock' | 'healthy';
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  inventory,
  onFilterStatus,
  activeStatusFilter
}) => {
  const totalSKUs = inventory.length;
  const totalUnits = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = inventory.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const outOfStockCount = inventory.filter(item => item.quantity <= 0).length;
  const lowStockCount = inventory.filter(item => item.quantity > 0 && item.quantity <= item.minThreshold).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {/* Total Catalog Valuation */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider">Inventory Value</span>
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Across {totalUnits.toLocaleString()} total units in stock
          </span>
        </div>
      </div>

      {/* Catalog SKUs */}
      <div
        onClick={() => onFilterStatus('all')}
        className={`bg-white p-4 rounded-xl border shadow-2xs flex flex-col justify-between cursor-pointer transition-all ${
          activeStatusFilter === 'all'
            ? 'border-indigo-600 ring-2 ring-indigo-500/20'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider">Total SKUs</span>
          <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900">
            {totalSKUs}
          </div>
          <span className="text-[11px] text-indigo-600 font-semibold mt-0.5 block">
            View full active catalog →
          </span>
        </div>
      </div>

      {/* Low Stock Warnings */}
      <div
        onClick={() => onFilterStatus(activeStatusFilter === 'low_stock' ? 'all' : 'low_stock')}
        className={`bg-white p-4 rounded-xl border shadow-2xs flex flex-col justify-between cursor-pointer transition-all ${
          activeStatusFilter === 'low_stock'
            ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20'
            : lowStockCount > 0
            ? 'border-amber-200 hover:border-amber-300'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
            Low Stock Alerts
          </span>
          <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className={`text-xl sm:text-2xl font-black font-mono ${lowStockCount > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
            {lowStockCount}
          </div>
          <span className="text-[11px] text-amber-700 font-medium mt-0.5 block">
            {lowStockCount > 0 ? 'Below safety threshold' : 'All items well-stocked'}
          </span>
        </div>
      </div>

      {/* Out of Stock Critical */}
      <div
        onClick={() => onFilterStatus(activeStatusFilter === 'out_of_stock' ? 'all' : 'out_of_stock')}
        className={`bg-white p-4 rounded-xl border shadow-2xs flex flex-col justify-between cursor-pointer transition-all ${
          activeStatusFilter === 'out_of_stock'
            ? 'border-rose-600 ring-2 ring-rose-500/20 bg-rose-50/20'
            : outOfStockCount > 0
            ? 'border-rose-200 hover:border-rose-300'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex items-center justify-between text-slate-500 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
            Out of Stock
          </span>
          <div className="p-2 bg-rose-100 text-rose-700 rounded-lg">
            <AlertOctagon className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className={`text-xl sm:text-2xl font-black font-mono ${outOfStockCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
            {outOfStockCount}
          </div>
          <span className="text-[11px] text-rose-600 font-semibold mt-0.5 block">
            {outOfStockCount > 0 ? 'Immediate reorder needed' : 'Zero depleted items'}
          </span>
        </div>
      </div>
    </div>
  );
};
