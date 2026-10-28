export interface InventoryItem {
  id: string;
  sku: string; // Barcode or SKU
  name: string;
  category: string;
  quantity: number;
  minThreshold: number;
  unitPrice: number;
  location: string;
  notes?: string;
  lastUpdated: string; // ISO date string
}

export type StockStatus = 'out_of_stock' | 'low_stock' | 'healthy';

export interface StockAlert {
  id: string;
  itemId: string;
  itemSku: string;
  itemName: string;
  currentQuantity: number;
  minThreshold: number;
  status: 'out_of_stock' | 'low_stock';
  timestamp: string;
}

export interface ActivityLog {
  id: string;
  type: 'scan' | 'add' | 'edit' | 'delete' | 'restock' | 'deduct' | 'sheet_sync';
  description: string;
  timestamp: string;
  itemId?: string;
  sku?: string;
  quantityChange?: number;
}

export interface GoogleSheetMetadata {
  id: string;
  name: string;
  url: string;
  lastSyncedAt?: string;
}

export type ScanAction = 'lookup' | 'increment' | 'decrement' | 'continuous_in' | 'continuous_out';
