import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Minus,
  Edit2,
  Trash2,
  Barcode,
  Printer,
  ChevronDown,
  ArrowUpDown,
  MapPin,
  AlertTriangle,
  PackageX,
  CheckCircle2,
  Tag
} from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { BarcodeRenderer } from './BarcodeRenderer';

interface InventoryTableProps {
  items: InventoryItem[];
  onEditItem: (item: InventoryItem) => void;
  onDeleteItem: (item: InventoryItem) => void;
  onQuickAdjustQuantity: (itemId: string, delta: number) => void;
  onDirectQuantityChange: (itemId: string, newQty: number) => void;
  onPrintItemLabel: (item: InventoryItem) => void;
  onAddNew: () => void;
  activeStatusFilter: 'all' | 'out_of_stock' | 'low_stock' | 'healthy';
  onChangeStatusFilter: (status: 'all' | 'out_of_stock' | 'low_stock' | 'healthy') => void;
}

type SortField = 'name' | 'quantity' | 'unitPrice' | 'lastUpdated' | 'sku';
type SortOrder = 'asc' | 'desc';

export const InventoryTable: React.FC<InventoryTableProps> = ({
  items,
  onEditItem,
  onDeleteItem,
  onQuickAdjustQuantity,
  onDirectQuantityChange,
  onPrintItemLabel,
  onAddNew,
  activeStatusFilter,
  onChangeStatusFilter
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('lastUpdated');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [tempQty, setTempQty] = useState<string>('');

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set(items.map(i => i.category));
    return Array.from(set).sort();
  }, [items]);

  // Filter & Sort
  const filteredItems = useMemo(() => {
    return items
      .filter(item => {
        // Search filter
        const q = search.toLowerCase().trim();
        const matchesSearch =
          !q ||
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.location.toLowerCase().includes(q) ||
          (item.notes && item.notes.toLowerCase().includes(q));

        if (!matchesSearch) return false;

        // Category filter
        if (selectedCategory !== 'all' && item.category !== selectedCategory) {
          return false;
        }

        // Stock status filter
        if (activeStatusFilter === 'out_of_stock') {
          return item.quantity <= 0;
        }
        if (activeStatusFilter === 'low_stock') {
          return item.quantity > 0 && item.quantity <= item.minThreshold;
        }
        if (activeStatusFilter === 'healthy') {
          return item.quantity > item.minThreshold;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = valB.toLowerCase();
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [items, search, selectedCategory, activeStatusFilter, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const startEditQty = (item: InventoryItem) => {
    setEditingQtyId(item.id);
    setTempQty(String(item.quantity));
  };

  const saveEditQty = (itemId: string) => {
    const parsed = parseInt(tempQty, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onDirectQuantityChange(itemId, parsed);
    }
    setEditingQtyId(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
      {/* Search and Filters Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by SKU, product name, barcode, shelf..."
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Right: Filters & Add button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Status filters */}
          <div className="inline-flex rounded-xl bg-slate-100 p-1 text-xs">
            <button
              onClick={() => onChangeStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeStatusFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({items.length})
            </button>
            <button
              onClick={() => onChangeStatusFilter('low_stock')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeStatusFilter === 'low_stock'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              Low
            </button>
            <button
              onClick={() => onChangeStatusFilter('out_of_stock')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                activeStatusFilter === 'out_of_stock'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              Out
            </button>
          </div>

          {/* Add Product Button */}
          <button
            onClick={onAddNew}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* Main Table view */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <th
                onClick={() => handleSort('sku')}
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
              >
                <div className="flex items-center gap-1.5">
                  <Barcode className="w-3.5 h-3.5 text-slate-400" />
                  <span>SKU / Barcode</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort('name')}
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none"
              >
                <div className="flex items-center gap-1.5">
                  <span>Product Details</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4 hidden md:table-cell">
                Location
              </th>
              <th
                onClick={() => handleSort('quantity')}
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none text-center"
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span>Stock Count</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4 text-center">
                Alert Status
              </th>
              <th
                onClick={() => handleSort('unitPrice')}
                className="py-3 px-4 cursor-pointer hover:text-slate-900 select-none text-right"
              >
                <div className="flex items-center justify-end gap-1.5">
                  <span>Price</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                  No inventory products found matching your search and filter criteria.
                </td>
              </tr>
            ) : (
              filteredItems.map(item => {
                const isOutOfStock = item.quantity <= 0;
                const isLowStock = item.quantity > 0 && item.quantity <= item.minThreshold;

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isOutOfStock
                        ? 'bg-rose-50/30'
                        : isLowStock
                        ? 'bg-amber-50/20'
                        : ''
                    }`}
                  >
                    {/* Barcode & SKU */}
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{item.sku}</span>
                        <div className="mt-1">
                          <BarcodeRenderer value={item.sku} height={26} showText={false} className="p-1 scale-90 origin-left" />
                        </div>
                      </div>
                    </td>

                    {/* Name & Category */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">
                        {item.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-slate-500 text-[11px]">
                        <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                          {item.category}
                        </span>
                        {item.notes && (
                          <span className="truncate max-w-[140px] text-slate-400" title={item.notes}>
                            {item.notes}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-slate-600 hidden md:table-cell">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-medium">{item.location}</span>
                      </div>
                    </td>

                    {/* Quantity + Quick Adjust */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onQuickAdjustQuantity(item.id, -1)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
                          title="Decrease by 1"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        {editingQtyId === item.id ? (
                          <input
                            type="number"
                            min="0"
                            autoFocus
                            value={tempQty}
                            onChange={e => setTempQty(e.target.value)}
                            onBlur={() => saveEditQty(item.id)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') saveEditQty(item.id);
                              if (e.key === 'Escape') setEditingQtyId(null);
                            }}
                            className="w-16 py-1 text-center font-mono font-bold text-sm bg-white border-2 border-indigo-500 rounded-lg outline-hidden"
                          />
                        ) : (
                          <span
                            onClick={() => startEditQty(item)}
                            className="min-w-[42px] px-2 py-1 text-center font-mono font-extrabold text-sm rounded-lg hover:bg-slate-100 cursor-pointer text-slate-900 border border-transparent hover:border-slate-200"
                            title="Click to manually edit quantity"
                          >
                            {item.quantity}
                          </span>
                        )}

                        <button
                          onClick={() => onQuickAdjustQuantity(item.id, 1)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer"
                          title="Increase by 1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="block text-center text-[10px] text-slate-400 mt-0.5">
                        Alert threshold: {item.minThreshold}
                      </span>
                    </td>

                    {/* Alert Status Pill */}
                    <td className="py-3.5 px-4 text-center">
                      {isOutOfStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700">
                          <PackageX className="w-3 h-3" />
                          Out of Stock
                        </span>
                      ) : isLowStock ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                          <AlertTriangle className="w-3 h-3" />
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" />
                          Healthy
                        </span>
                      )}
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                      ${item.unitPrice.toFixed(2)}
                      <span className="block font-normal text-[10px] text-slate-400">
                        Total: ${(item.quantity * item.unitPrice).toFixed(2)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onPrintItemLabel(item)}
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Print Barcode Tag"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEditItem(item)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteItem(item)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Product"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span>
          Showing <strong className="text-slate-800">{filteredItems.length}</strong> of{' '}
          <strong className="text-slate-800">{items.length}</strong> catalog items
        </span>
        <span className="hidden sm:inline">
          Tip: Click on any stock count number to edit directly
        </span>
      </div>
    </div>
  );
};
