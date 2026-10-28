import { InventoryItem } from './types/inventory';

export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: 'item-001',
    sku: '012000000133', // Pepsi 12oz UPC
    name: 'Sparkling Citrus Soda (12-Pack)',
    category: 'Beverages',
    quantity: 3,
    minThreshold: 10,
    unitPrice: 6.99,
    location: 'Aisle 3 - Shelf B',
    notes: 'Fast-moving summer item. Reorder from distributor A.',
    lastUpdated: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'item-002',
    sku: '0711719541028', // EAN-13
    name: 'Wireless Ergonomic Optical Mouse',
    category: 'Electronics',
    quantity: 0,
    minThreshold: 8,
    unitPrice: 29.99,
    location: 'Aisle 7 - Bin 14',
    notes: 'Out of stock! 2 customer backorders waiting.',
    lastUpdated: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 'item-003',
    sku: '8806091234567',
    name: 'USB-C Fast Charging Cable 2m (Braided)',
    category: 'Electronics',
    quantity: 42,
    minThreshold: 15,
    unitPrice: 12.50,
    location: 'Aisle 7 - Bin 08',
    notes: 'High margin inventory.',
    lastUpdated: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    id: 'item-004',
    sku: '049000028904',
    name: 'Heavy Duty Thermal Shipping Labels (500pk)',
    category: 'Packaging',
    quantity: 4,
    minThreshold: 12,
    unitPrice: 18.00,
    location: 'Aisle 1 - Bay 02',
    notes: 'Critical warehouse operational supply.',
    lastUpdated: new Date(Date.now() - 3600000 * 8).toISOString()
  },
  {
    id: 'item-005',
    sku: '7350053850019',
    name: 'Organic Colombian Dark Roast Whole Bean (1kg)',
    category: 'Food & Pantry',
    quantity: 26,
    minThreshold: 10,
    unitPrice: 22.40,
    location: 'Aisle 2 - Shelf A',
    notes: 'Batch #2026-B. Expiry Nov 2027.',
    lastUpdated: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'item-006',
    sku: '076455102001',
    name: 'Stainless Precision Digital Caliper (6 Inch)',
    category: 'Hardware & Tools',
    quantity: 1,
    minThreshold: 5,
    unitPrice: 34.95,
    location: 'Tool Cage - Drawer 3',
    notes: 'Low stock warning triggered.',
    lastUpdated: new Date(Date.now() - 3600000 * 18).toISOString()
  },
  {
    id: 'item-007',
    sku: '841479100123',
    name: 'Heavy-Duty Reinforced Packing Tape (6 Rolls)',
    category: 'Packaging',
    quantity: 0,
    minThreshold: 15,
    unitPrice: 15.90,
    location: 'Aisle 1 - Bay 04',
    notes: 'Vendor shipment expected next Tuesday.',
    lastUpdated: new Date(Date.now() - 3600000 * 48).toISOString()
  },
  {
    id: 'item-008',
    sku: '028400064057',
    name: 'Artisan Sea Salt Potato Crisps (150g)',
    category: 'Food & Pantry',
    quantity: 58,
    minThreshold: 20,
    unitPrice: 3.49,
    location: 'Aisle 2 - Shelf C',
    notes: 'Freshly stocked yesterday.',
    lastUpdated: new Date(Date.now() - 3600000 * 6).toISOString()
  },
  {
    id: 'item-009',
    sku: '600100010010',
    name: 'Anti-Static Microfiber Cleaning Cloths (Pack of 10)',
    category: 'Warehouse & Safety',
    quantity: 19,
    minThreshold: 10,
    unitPrice: 8.75,
    location: 'Aisle 4 - Shelf D',
    notes: 'Standard stock.',
    lastUpdated: new Date(Date.now() - 3600000 * 30).toISOString()
  },
  {
    id: 'item-010',
    sku: '037000123984',
    name: 'Industrial Nitrile Work Gloves (Size L, 100pk)',
    category: 'Warehouse & Safety',
    quantity: 7,
    minThreshold: 10,
    unitPrice: 16.50,
    location: 'Safety Locker 2',
    notes: 'Check expiration date on box before distribution.',
    lastUpdated: new Date(Date.now() - 3600000 * 10).toISOString()
  }
];
