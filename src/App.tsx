/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { Camera } from 'lucide-react';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken
} from './services/firebaseAuth';
import {
  readInventoryFromSheet,
  syncInventoryToSheet
} from './services/sheetsService';
import { sound } from './services/soundService';
import { INITIAL_INVENTORY_ITEMS } from './mockData';
import { InventoryItem, ActivityLog } from './types/inventory';

import { Navbar } from './components/Navbar';
import { StatsCards } from './components/StatsCards';
import { AlertBanner } from './components/AlertBanner';
import { InventoryTable } from './components/InventoryTable';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { ItemModal } from './components/ItemModal';
import { AlertsModal } from './components/AlertsModal';
import { SheetsConnectModal } from './components/SheetsConnectModal';
import { BarcodeLabelModal } from './components/BarcodeLabelModal';
import { ActivityLogModal } from './components/ActivityLogModal';
import { ConfirmationModal } from './components/ConfirmationModal';

const LOCAL_STORAGE_ITEMS_KEY = 'stockpulse_inventory_items';
const LOCAL_STORAGE_SHEET_KEY = 'stockpulse_connected_sheet';
const LOCAL_STORAGE_LOGS_KEY = 'stockpulse_activity_logs';

export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Google Sheets state
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [sheetName, setSheetName] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Inventory data
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse local storage inventory', e);
    }
    return INITIAL_INVENTORY_ITEMS;
  });

  // Activity audit log
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'log-init',
        type: 'add',
        description: 'StockPulse initialized catalog with sample warehouse inventory',
        timestamp: new Date().toISOString()
      }
    ];
  });

  // Modals state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [pendingBarcode, setPendingBarcode] = useState<string>('');
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isLabelsModalOpen, setIsLabelsModalOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);

  // Confirmation modal state for destructive operations (Workspace Integration Skill requirement)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    isDestructive?: boolean;
    affectedCount?: number;
    action: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {}
  });

  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'out_of_stock' | 'low_stock' | 'healthy'>('all');
  const [isMuted, setIsMuted] = useState(sound.getMuted());

  // Save inventory to local storage on change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(inventory));
    } catch (e) {}
  }, [inventory]);

  // Save logs to local storage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(activityLogs));
    } catch (e) {}
  }, [activityLogs]);

  // Load saved sheet metadata from local storage
  useEffect(() => {
    try {
      const savedSheet = localStorage.getItem(LOCAL_STORAGE_SHEET_KEY);
      if (savedSheet) {
        const parsed = JSON.parse(savedSheet);
        setSheetId(parsed.id);
        setSheetName(parsed.name);
      }
    } catch (e) {}
  }, []);

  // Initialize Firebase Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, token) => {
        setUser(currentUser);
        setAccessToken(token);
      },
      () => {
        setUser(null);
        setAccessToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        sound.playScanSuccess();
        // Prompt to link sheets if not linked
        if (!sheetId) {
          setIsSheetsModalOpen(true);
        }
      }
    } catch (err: any) {
      console.error('Google Login Error:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
  };

  const addActivity = useCallback((
    type: ActivityLog['type'],
    description: string,
    sku?: string,
    quantityChange?: number
  ) => {
    const newLog: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      description,
      timestamp: new Date().toISOString(),
      sku,
      quantityChange
    };
    setActivityLogs(prev => [newLog, ...prev.slice(0, 99)]);
  }, []);

  // Sync with connected Google Sheet
  const handleSyncWithSheet = async () => {
    if (!sheetId) {
      setIsSheetsModalOpen(true);
      return;
    }

    let token = accessToken;
    if (!token) {
      token = await getAccessToken();
    }

    if (!token) {
      handleLogin();
      return;
    }

    setIsSyncing(true);
    setSyncStatusMsg('Syncing with Google Sheets...');

    try {
      // First attempt to read latest values from the sheet
      const { items: remoteItems, title } = await readInventoryFromSheet(token, sheetId);

      if (remoteItems.length > 0) {
        // Merge or adopt remote items
        setInventory(remoteItems);
        addActivity('sheet_sync', `Synchronized ${remoteItems.length} items from Google Sheet "${title}"`);
        setSyncStatusMsg(`Successfully loaded ${remoteItems.length} products from sheet.`);
      } else {
        // Sheet was empty, push current local items up to the sheet!
        await syncInventoryToSheet(token, sheetId, inventory);
        addActivity('sheet_sync', `Exported ${inventory.length} local items to populate new Google Sheet`);
        setSyncStatusMsg(`Spreadsheet updated with ${inventory.length} catalog items.`);
      }

      sound.playSyncSuccess();
      setTimeout(() => setSyncStatusMsg(null), 4000);
    } catch (err: any) {
      console.error('Sync failed:', err);
      // Fallback: try to write local inventory to the sheet
      try {
        await syncInventoryToSheet(token, sheetId, inventory);
        sound.playSyncSuccess();
        setSyncStatusMsg(`Synced ${inventory.length} items to Google Sheet.`);
        addActivity('sheet_sync', `Pushed catalog to Google Sheet`);
        setTimeout(() => setSyncStatusMsg(null), 4000);
      } catch (writeErr: any) {
        alert(`Google Sheets Sync Error: ${writeErr.message || 'Check spreadsheet permissions'}`);
        setSyncStatusMsg(null);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Push current changes to Google Sheet in background if sheet is linked
  const backgroundSyncToSheet = async (updatedItems: InventoryItem[]) => {
    if (!sheetId) return;
    const token = accessToken || (await getAccessToken());
    if (!token) return;

    try {
      await syncInventoryToSheet(token, sheetId, updatedItems);
    } catch (e) {
      console.warn('Background sync failed non-fatally:', e);
    }
  };

  // Select or link a Google Spreadsheet
  const handleSelectSpreadsheet = async (id: string, name: string) => {
    setSheetId(id);
    setSheetName(name);
    localStorage.setItem(LOCAL_STORAGE_SHEET_KEY, JSON.stringify({ id, name }));

    const token = accessToken || (await getAccessToken());
    if (token) {
      try {
        setIsSyncing(true);
        // Test read
        const { items: sheetItems } = await readInventoryFromSheet(token, id);
        if (sheetItems.length > 0) {
          setInventory(sheetItems);
          addActivity('sheet_sync', `Linked and loaded ${sheetItems.length} items from "${name}"`);
        } else {
          // Upload local items to empty sheet
          await syncInventoryToSheet(token, id, inventory);
          addActivity('sheet_sync', `Linked and populated Google Sheet "${name}" with current inventory`);
        }
      } catch (err) {
        console.error('Initial sheet load failed:', err);
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleDisconnectSpreadsheet = () => {
    setSheetId(null);
    setSheetName(null);
    localStorage.removeItem(LOCAL_STORAGE_SHEET_KEY);
    addActivity('sheet_sync', 'Disconnected Google Sheet integration');
  };

  // Adjust quantity (+/-)
  const handleQuickAdjustQuantity = (itemId: string, delta: number) => {
    setInventory(prev => {
      const next = prev.map(item => {
        if (item.id === itemId) {
          const newQty = Math.max(0, item.quantity + delta);
          const updated = {
            ...item,
            quantity: newQty,
            lastUpdated: new Date().toISOString()
          };

          if (delta > 0) {
            sound.playScanSuccess();
            addActivity('restock', `Stock incremented (+${delta}) for ${item.name}`, item.sku, delta);
          } else {
            addActivity('deduct', `Stock deducted (${delta}) for ${item.name}`, item.sku, delta);
            if (newQty <= item.minThreshold) {
              sound.playStockAlert();
            }
          }

          return updated;
        }
        return item;
      });

      backgroundSyncToSheet(next);
      return next;
    });
  };

  // Direct quantity input change
  const handleDirectQuantityChange = (itemId: string, newQty: number) => {
    setInventory(prev => {
      const target = prev.find(i => i.id === itemId);
      if (!target || target.quantity === newQty) return prev;

      const delta = newQty - target.quantity;
      const next = prev.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity: newQty,
            lastUpdated: new Date().toISOString()
          };
        }
        return item;
      });

      addActivity(
        delta >= 0 ? 'restock' : 'deduct',
        `Adjusted stock for ${target.name} from ${target.quantity} to ${newQty}`,
        target.sku,
        delta
      );

      if (newQty <= target.minThreshold) {
        sound.playStockAlert();
      }

      backgroundSyncToSheet(next);
      return next;
    });
  };

  // Save new or edited item
  const handleSaveItem = (itemData: Omit<InventoryItem, 'id' | 'lastUpdated'>, existingId?: string) => {
    const now = new Date().toISOString();

    setInventory(prev => {
      let next: InventoryItem[];
      if (existingId) {
        // Edit
        next = prev.map(item =>
          item.id === existingId
            ? { ...item, ...itemData, lastUpdated: now }
            : item
        );
        addActivity('edit', `Updated item details: ${itemData.name}`, itemData.sku);
      } else {
        // Add new
        const newItem: InventoryItem = {
          ...itemData,
          id: `item-${Date.now()}`,
          lastUpdated: now
        };
        next = [newItem, ...prev];
        addActivity('add', `Added new catalog product: ${newItem.name}`, newItem.sku);
      }

      backgroundSyncToSheet(next);
      return next;
    });

    sound.playScanSuccess();
  };

  // Delete item with Mandatory User Confirmation Dialog (Workspace Integration requirement)
  const handleDeleteItem = (item: InventoryItem) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Catalog Item?',
      message: `Are you sure you want to delete "${item.name}" (SKU: ${item.sku})? This item will be permanently removed from your catalog${sheetId ? ' and updated on your connected Google Sheet' : ''}. This operation cannot be undone.`,
      confirmLabel: 'Delete Item',
      isDestructive: true,
      affectedCount: 1,
      action: () => {
        setInventory(prev => {
          const next = prev.filter(i => i.id !== item.id);
          backgroundSyncToSheet(next);
          return next;
        });
        addActivity('delete', `Deleted item "${item.name}" (${item.sku})`, item.sku);
        setConfirmDialog(c => ({ ...c, isOpen: false }));
      }
    });
  };

  // Quick Restock from Alert Center
  const handleQuickRestock = (itemId: string, restockQty: number) => {
    setInventory(prev => {
      const next = prev.map(item => {
        if (item.id === itemId) {
          const newQty = item.quantity + restockQty;
          addActivity('restock', `Restocked +${restockQty} units of ${item.name}`, item.sku, restockQty);
          return {
            ...item,
            quantity: newQty,
            lastUpdated: new Date().toISOString()
          };
        }
        return item;
      });

      backgroundSyncToSheet(next);
      return next;
    });
  };

  // Active Alert count
  const alertCount = inventory.filter(i => i.quantity <= i.minThreshold).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
        sheetId={sheetId}
        sheetName={sheetName}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
        onSyncWithSheet={handleSyncWithSheet}
        isSyncing={isSyncing}
        alertCount={alertCount}
        onOpenAlertsModal={() => setIsAlertsOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenLabelsModal={() => setIsLabelsModalOpen(true)}
        onOpenActivityLog={() => setIsActivityOpen(true)}
        isMuted={isMuted}
        onToggleMute={() => {
          const nextMuted = !isMuted;
          sound.setMuted(nextMuted);
          setIsMuted(nextMuted);
        }}
      />

      {/* Sync Status Banner */}
      {syncStatusMsg && (
        <div className="bg-emerald-600 text-white text-xs font-semibold py-2 px-4 text-center shadow-inner flex items-center justify-center gap-2 animate-in fade-in duration-200">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>{syncStatusMsg}</span>
        </div>
      )}

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Real-time stock alerts banner (if any items depleted or low) */}
        <AlertBanner
          inventory={inventory}
          onOpenAlerts={() => setIsAlertsOpen(true)}
        />

        {/* High-level KPI Stats */}
        <StatsCards
          inventory={inventory}
          onFilterStatus={setStatusFilter}
          activeStatusFilter={statusFilter}
        />

        {/* Main Inventory Grid & Management */}
        <InventoryTable
          items={inventory}
          onEditItem={item => {
            setEditingItem(item);
            setIsItemModalOpen(true);
          }}
          onDeleteItem={handleDeleteItem}
          onQuickAdjustQuantity={handleQuickAdjustQuantity}
          onDirectQuantityChange={handleDirectQuantityChange}
          onPrintItemLabel={item => {
            setIsLabelsModalOpen(true);
          }}
          onAddNew={() => {
            setEditingItem(null);
            setPendingBarcode('');
            setIsItemModalOpen(true);
          }}
          activeStatusFilter={statusFilter}
          onChangeStatusFilter={setStatusFilter}
        />
      </main>

      {/* Floating Barcode Scanner FAB for mobile hand-held use */}
      <div className="fixed bottom-6 right-6 z-30 sm:hidden">
        <button
          onClick={() => setIsScannerOpen(true)}
          className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-all cursor-pointer border-2 border-white"
          title="Open Barcode Camera Scanner"
        >
          <Camera className="w-6 h-6" />
        </button>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        inventory={inventory}
        onUpdateQuantity={(itemId, newQty, reason) => {
          handleDirectQuantityChange(itemId, newQty);
        }}
        onAddNewItemWithBarcode={barcode => {
          setEditingItem(null);
          setPendingBarcode(barcode);
          setIsItemModalOpen(true);
        }}
        onLogScanActivity={(actionType, sku, itemName, change) => {
          if (actionType === 'scan') {
            addActivity('scan', `Scanned barcode for ${itemName}`, sku);
          } else if (actionType === 'restock') {
            addActivity('restock', `Inbound batch scan (+${change || 1}) for ${itemName}`, sku, change || 1);
          } else if (actionType === 'deduct') {
            addActivity('deduct', `Outbound batch scan (${change || -1}) for ${itemName}`, sku, change || -1);
          }
        }}
      />

      {/* Add / Edit Item Modal */}
      <ItemModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
          setPendingBarcode('');
        }}
        onSave={handleSaveItem}
        initialItem={editingItem}
        initialBarcode={pendingBarcode}
      />

      {/* Real-time Alerts Modal */}
      <AlertsModal
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        inventory={inventory}
        onQuickRestock={handleQuickRestock}
      />

      {/* Google Sheets Modal */}
      <SheetsConnectModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        accessToken={accessToken}
        currentSpreadsheetId={sheetId}
        currentSpreadsheetName={sheetName}
        onSelectSpreadsheet={handleSelectSpreadsheet}
        onDisconnectSpreadsheet={handleDisconnectSpreadsheet}
      />

      {/* Print Barcode Labels Modal */}
      <BarcodeLabelModal
        isOpen={isLabelsModalOpen}
        onClose={() => setIsLabelsModalOpen(false)}
        inventory={inventory}
      />

      {/* Activity Log Modal */}
      <ActivityLogModal
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
        logs={activityLogs}
        onClearLogs={() => setActivityLogs([])}
      />

      {/* Mandatory User Confirmation Dialog for Destructive Operations */}
      <ConfirmationModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        isDestructive={confirmDialog.isDestructive}
        affectedItemsCount={confirmDialog.affectedCount}
        onConfirm={confirmDialog.action}
        onCancel={() => setConfirmDialog(c => ({ ...c, isOpen: false }))}
      />
    </div>
  );
}
