import React, { useState } from 'react';
import { X, Printer, CheckSquare, Square, Tag, Download } from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { BarcodeRenderer } from './BarcodeRenderer';

interface BarcodeLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
}

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({
  isOpen,
  onClose,
  inventory
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(inventory.map(i => i.id));
  const [labelSize, setLabelSize] = useState<'standard' | 'compact'>('standard');

  if (!isOpen) return null;

  const toggleSelectAll = () => {
    if (selectedIds.length === inventory.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(inventory.map(i => i.id));
    }
  };

  const toggleItem = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const selectedItems = inventory.filter(i => selectedIds.includes(i.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header - hide on print */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Print Barcode Labels & Shelf Tags
              </h3>
              <p className="text-xs text-slate-500">
                Generate high-resolution printable barcode labels for inventory scanning
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={selectedItems.length === 0}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print ({selectedItems.length} Labels)
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Controls - hide on print */}
        <div className="px-5 py-3 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 font-semibold text-slate-700 hover:text-indigo-600 cursor-pointer"
            >
              {selectedIds.length === inventory.length ? (
                <CheckSquare className="w-4 h-4 text-indigo-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              Select All ({inventory.length})
            </button>
            <span className="text-slate-500">
              Selected: <strong className="text-slate-900 font-mono">{selectedIds.length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Layout:</span>
            <button
              onClick={() => setLabelSize('standard')}
              className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                labelSize === 'standard'
                  ? 'bg-white shadow-2xs text-slate-900 border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Standard (Shelf Tag)
            </button>
            <button
              onClick={() => setLabelSize('compact')}
              className={`px-3 py-1 rounded-md font-semibold cursor-pointer ${
                labelSize === 'compact'
                  ? 'bg-white shadow-2xs text-slate-900 border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Compact (Product Sticker)
            </button>
          </div>
        </div>

        {/* Printable Label Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/70 print:bg-white print:p-0 print:overflow-visible">
          {selectedItems.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              No items selected. Select items from the list below to preview labels.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 print:grid-cols-3 print:gap-3">
              {selectedItems.map(item => (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl border border-slate-300 p-4 shadow-xs flex flex-col items-center justify-between text-center print:shadow-none print:border-black print:rounded-none ${
                    labelSize === 'compact' ? 'py-3' : 'py-4'
                  }`}
                >
                  <div className="w-full mb-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block truncate">
                      {item.category} • {item.location}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5" title={item.name}>
                      {item.name}
                    </h4>
                  </div>

                  <div className="my-2 flex justify-center w-full">
                    <BarcodeRenderer
                      value={item.sku}
                      height={labelSize === 'compact' ? 38 : 50}
                      showText={true}
                    />
                  </div>

                  <div className="w-full flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="font-mono text-[10px] text-slate-500">
                      Stock: {item.quantity}
                    </span>
                    <span className="font-bold text-slate-900 font-mono">
                      ${item.unitPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Item Selector Checklist (hidden during print) */}
          <div className="mt-8 pt-6 border-t border-slate-200 print:hidden">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Select Products to Include
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {inventory.map(item => {
                const isChecked = selectedIds.includes(item.id);
                return (
                  <label
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      isChecked
                        ? 'bg-indigo-50/70 border-indigo-200 text-slate-900'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="truncate">
                      <span className="font-semibold block truncate">{item.name}</span>
                      <span className="font-mono text-[10px] text-slate-400">{item.sku}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 print:hidden">
          <span>Tip: Supports standard letter sheets or continuous label printers via browser print</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
