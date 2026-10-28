import React, { useState, useEffect } from 'react';
import { X, Barcode, Save, Sparkles, MapPin, Tag, DollarSign, Layers } from 'lucide-react';
import { InventoryItem } from '../types/inventory';
import { BarcodeRenderer } from './BarcodeRenderer';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<InventoryItem, 'id' | 'lastUpdated'>, existingId?: string) => void;
  initialItem?: InventoryItem | null;
  initialBarcode?: string;
}

const CATEGORY_SUGGESTIONS = [
  'Electronics',
  'Beverages',
  'Food & Pantry',
  'Packaging',
  'Hardware & Tools',
  'Warehouse & Safety',
  'Apparel',
  'Office Supplies'
];

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  initialBarcode
}) => {
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Electronics');
  const [quantity, setQuantity] = useState(10);
  const [minThreshold, setMinThreshold] = useState(5);
  const [unitPrice, setUnitPrice] = useState(9.99);
  const [location, setLocation] = useState('Aisle 1 - Shelf A');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialItem) {
      setSku(initialItem.sku);
      setName(initialItem.name);
      setCategory(initialItem.category);
      setQuantity(initialItem.quantity);
      setMinThreshold(initialItem.minThreshold);
      setUnitPrice(initialItem.unitPrice);
      setLocation(initialItem.location);
      setNotes(initialItem.notes || '');
    } else {
      // New item
      setSku(initialBarcode || generateRandomBarcode());
      setName('');
      setCategory('Electronics');
      setQuantity(15);
      setMinThreshold(5);
      setUnitPrice(12.00);
      setLocation('Aisle 1 - Bay 01');
      setNotes('');
    }
  }, [initialItem, initialBarcode, isOpen]);

  const generateRandomBarcode = () => {
    // Generate a standard 12-digit UPC-like number
    return '0' + Math.floor(10000000000 + Math.random() * 90000000000).toString();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sku.trim() || !name.trim()) return;

    onSave(
      {
        sku: sku.trim(),
        name: name.trim(),
        category: category.trim() || 'General',
        quantity: Math.max(0, Number(quantity) || 0),
        minThreshold: Math.max(0, Number(minThreshold) || 1),
        unitPrice: Math.max(0, Number(unitPrice) || 0),
        location: location.trim() || 'Warehouse',
        notes: notes.trim()
      },
      initialItem?.id
    );
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {initialItem ? 'Edit Inventory Item' : 'Register New Inventory Product'}
              </h3>
              <p className="text-xs text-slate-500">
                Set item barcode, threshold alert levels, and warehouse storage coordinates
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* SKU / Barcode + Live Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Barcode / SKU
                </label>
                <button
                  type="button"
                  onClick={() => setSku(generateRandomBarcode())}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" /> Auto-Generate
                </button>
              </div>
              <input
                type="text"
                required
                value={sku}
                onChange={e => setSku(e.target.value)}
                placeholder="e.g. 012000000133"
                className="w-full px-3 py-1.5 text-sm font-mono font-semibold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Standard UPC-A, EAN-13, or alphanumeric warehouse code
              </span>
            </div>

            <div className="flex justify-center">
              <BarcodeRenderer value={sku || '000000000000'} height={42} showText />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Product Title / Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Wireless Ergonomic Mouse"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Category & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-slate-400" /> Category
              </label>
              <input
                type="text"
                list="category-options"
                value={category}
                onChange={e => setCategory(e.target.value)}
                placeholder="Category"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <datalist id="category-options">
                {CATEGORY_SUGGESTIONS.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" /> Aisle / Location
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Aisle 4 - Shelf B"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Quantity, Min Alert Threshold, Unit Price */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Quantity In Stock
              </label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-rose-700 mb-1">
                Low Stock Alert At
              </label>
              <input
                type="number"
                min="0"
                value={minThreshold}
                onChange={e => setMinThreshold(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-sm font-mono font-bold bg-white border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Unit Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 text-sm font-mono font-bold bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Internal Notes / Supplier Details
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Supplier code, reorder batch size, expiration details..."
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {initialItem ? 'Save Modifications' : 'Create Inventory Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
