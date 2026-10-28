import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  X,
  Camera,
  Upload,
  RefreshCw,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Package,
  Volume2,
  VolumeX,
  Keyboard
} from 'lucide-react';
import { InventoryItem, ScanAction } from '../types/inventory';
import { sound } from '../services/soundService';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onUpdateQuantity: (itemId: string, newQty: number, reason: string) => void;
  onAddNewItemWithBarcode: (barcode: string) => void;
  onLogScanActivity: (actionType: 'scan' | 'restock' | 'deduct', sku: string, itemName: string, change?: number) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onUpdateQuantity,
  onAddNewItemWithBarcode,
  onLogScanActivity
}) => {
  const [scanMode, setScanMode] = useState<ScanAction>('lookup');
  const [activeTab, setActiveTab] = useState<'camera' | 'upload' | 'manual'>('camera');
  const [scannedResult, setScannedResult] = useState<{
    code: string;
    item: InventoryItem | null;
    timestamp: number;
    message?: string;
  } | null>(null);

  const [recentScans, setRecentScans] = useState<Array<{ code: string; name: string; time: string; success: boolean }>>([]);
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScannerRunning, setIsScannerRunning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'interactive-barcode-viewport';
  const lastScannedCodeRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  // Toggle audio
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    sound.setMuted(nextMuted);
    setIsMuted(nextMuted);
  };

  // Get available video devices
  useEffect(() => {
    if (!isOpen) return;

    Html5Qrcode.getCameras()
      .then(devices => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back camera if available
          const backCam = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setCameraError('No video input devices found on this device.');
        }
      })
      .catch(err => {
        console.warn('Camera enumeration error:', err);
        setCameraError('Camera access was denied or is unavailable. You can use manual entry or upload an image.');
      });
  }, [isOpen]);

  // Start / Stop camera scanner
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera' || !selectedCameraId) {
      stopCameraScanner();
      return;
    }

    startCameraScanner(selectedCameraId);

    return () => {
      stopCameraScanner();
    };
  }, [isOpen, activeTab, selectedCameraId]);

  const startCameraScanner = async (cameraId: string) => {
    try {
      setCameraError(null);
      if (scannerRef.current) {
        await stopCameraScanner();
      }

      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.ITF
        ],
        verbose: false
      });

      scannerRef.current = html5QrCode;

      const config = {
        fps: 15,
        qrbox: { width: 280, height: 160 },
        aspectRatio: 1.333
      };

      await html5QrCode.start(
        cameraId,
        config,
        (decodedText) => {
          handleBarcodeDetected(decodedText);
        },
        () => {
          // Frame scanned without code detected; ignore
        }
      );

      setIsScannerRunning(true);
    } catch (err: any) {
      console.error('Failed to start camera scanner:', err);
      setCameraError(err.message || 'Unable to open camera stream. Please check browser permissions.');
      setIsScannerRunning(false);
    }
  };

  const stopCameraScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
      scannerRef.current = null;
    }
    setIsScannerRunning(false);
  };

  const handleBarcodeDetected = (rawCode: string) => {
    const code = rawCode.trim();
    const now = Date.now();

    // Prevent immediate re-trigger for same code within 1.5 seconds in lookup mode,
    // or 1.0 second in continuous mode
    const cooldown = scanMode === 'lookup' ? 1500 : 1000;
    if (code === lastScannedCodeRef.current && (now - lastScanTimeRef.current) < cooldown) {
      return;
    }

    lastScannedCodeRef.current = code;
    lastScanTimeRef.current = now;

    // Search inventory for matching barcode/SKU
    const matchedItem = inventory.find(
      i => i.sku.toLowerCase() === code.toLowerCase() ||
           i.sku.replace(/[^0-9a-zA-Z]/g, '') === code.replace(/[^0-9a-zA-Z]/g, '')
    );

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (matchedItem) {
      sound.playScanSuccess();

      if (scanMode === 'continuous_in') {
        // Continuous Receiving (+1)
        const nextQty = matchedItem.quantity + 1;
        onUpdateQuantity(matchedItem.id, nextQty, 'Continuous Inbound scan');
        onLogScanActivity('restock', matchedItem.sku, matchedItem.name, 1);
        setScannedResult({
          code,
          item: { ...matchedItem, quantity: nextQty },
          timestamp: now,
          message: `Received +1! Current stock: ${nextQty}`
        });
      } else if (scanMode === 'continuous_out') {
        // Continuous Fulfillment (-1)
        const nextQty = Math.max(0, matchedItem.quantity - 1);
        onUpdateQuantity(matchedItem.id, nextQty, 'Continuous Outbound scan');
        onLogScanActivity('deduct', matchedItem.sku, matchedItem.name, -1);
        if (nextQty <= matchedItem.minThreshold) {
          sound.playStockAlert();
        }
        setScannedResult({
          code,
          item: { ...matchedItem, quantity: nextQty },
          timestamp: now,
          message: `Fulfilled -1! Remaining stock: ${nextQty}`
        });
      } else {
        // Standard Lookup
        onLogScanActivity('scan', matchedItem.sku, matchedItem.name);
        setScannedResult({
          code,
          item: matchedItem,
          timestamp: now
        });
      }

      setRecentScans(prev => [
        { code, name: matchedItem.name, time: timeStr, success: true },
        ...prev.slice(0, 14)
      ]);
    } else {
      sound.playScanError();
      setScannedResult({
        code,
        item: null,
        timestamp: now,
        message: 'Barcode not found in catalog'
      });

      setRecentScans(prev => [
        { code, name: 'Unknown Item', time: timeStr, success: false },
        ...prev.slice(0, 14)
      ]);
    }
  };

  // Handle uploaded image scan
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode('file-scanner-temp');
      const decodedText = await html5QrCode.scanFile(file, true);
      handleBarcodeDetected(decodedText);
      html5QrCode.clear();
    } catch (err: any) {
      sound.playScanError();
      alert('Could not detect a clear barcode in the uploaded image. Please try another photo or ensure good lighting.');
    }
  };

  // Handle manual code submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleBarcodeDetected(manualCode.trim());
    setManualCode('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Barcode & QR Scanner
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">
                  Live View
                </span>
              </h2>
              <p className="text-xs text-slate-500">Scan UPC, EAN-13, Code 128, or QR codes to adjust stock instantly</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleMute}
              title={isMuted ? 'Unmute scanner beeps' : 'Mute scanner beeps'}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                isMuted
                  ? 'border-rose-200 text-rose-500 bg-rose-50'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scan Mode Selector */}
        <div className="px-5 py-2.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-300">
            <span>Operating Mode:</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setScanMode('lookup')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                scanMode === 'lookup'
                  ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Lookup & Adjust
            </button>
            <button
              type="button"
              onClick={() => setScanMode('continuous_in')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                scanMode === 'continuous_in'
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Inbound (+1 Beep)
            </button>
            <button
              type="button"
              onClick={() => setScanMode('continuous_out')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                scanMode === 'continuous_out'
                  ? 'bg-amber-600 text-white font-semibold shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Outbound (-1 Beep)
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* Scanner Left Panel */}
          <div className="lg:col-span-7 p-5 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-200">
            {/* Input tabs */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setActiveTab('camera')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'camera'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                Live Camera
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                Upload Photo
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'manual'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                Manual Input
              </button>
            </div>

            {/* Camera Viewport */}
            {activeTab === 'camera' && (
              <div className="flex-1 flex flex-col">
                <div className="relative aspect-4/3 w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                  <div id={scannerContainerId} className="w-full h-full" />

                  {/* Aiming Reticle Overlay */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6">
                    <div className="relative w-64 h-40 border-2 border-indigo-400/80 rounded-lg shadow-lg">
                      {/* Targeting Corners */}
                      <span className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-indigo-300 rounded-tl" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-indigo-300 rounded-tr" />
                      <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-indigo-300 rounded-bl" />
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-indigo-300 rounded-br" />

                      {/* Moving laser scanline */}
                      <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-bounce duration-1000" />
                    </div>
                    <span className="mt-3 px-2 py-0.5 bg-slate-900/80 text-[11px] text-slate-200 rounded font-medium backdrop-blur-xs">
                      Align barcode within bounds
                    </span>
                  </div>

                  {cameraError && (
                    <div className="absolute inset-0 bg-slate-900/90 p-6 flex flex-col items-center justify-center text-center">
                      <AlertCircle className="w-10 h-10 text-amber-400 mb-2" />
                      <p className="text-sm font-medium text-white mb-1">Camera Stream Notice</p>
                      <p className="text-xs text-slate-300 max-w-sm mb-4">{cameraError}</p>
                      <button
                        onClick={() => setActiveTab('manual')}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold"
                      >
                        Switch to Manual / USB Barcode Reader
                      </button>
                    </div>
                  )}
                </div>

                {/* Camera selector */}
                {cameras.length > 1 && (
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                    <span className="font-medium">Camera Lens:</span>
                    <select
                      value={selectedCameraId}
                      onChange={e => setSelectedCameraId(e.target.value)}
                      className="bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800"
                    >
                      {cameras.map(cam => (
                        <option key={cam.id} value={cam.id}>
                          {cam.label || `Camera ${cam.id}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Photo upload tab */}
            {activeTab === 'upload' && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/50 text-center">
                <div id="file-scanner-temp" className="hidden" />
                <Upload className="w-10 h-10 text-slate-400 mb-3" />
                <h4 className="text-sm font-semibold text-slate-800 mb-1">Upload Barcode Snapshot</h4>
                <p className="text-xs text-slate-500 mb-4 max-w-xs">
                  Take a photo of the product package barcode or upload a saved label
                </p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg shadow-xs cursor-pointer">
                  <span>Browse Image File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {/* Manual input tab */}
            {activeTab === 'manual' && (
              <div className="flex-1 flex flex-col justify-center p-6 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-indigo-600" />
                  Manual SKU or USB Scanner Entry
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  Handheld USB or Bluetooth barcode scanners act as keyboard input. Focus this field and scan, or type code directly.
                </p>
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Barcode / SKU String
                    </label>
                    <input
                      type="text"
                      value={manualCode}
                      onChange={e => setManualCode(e.target.value)}
                      placeholder="e.g. 012000000133"
                      autoFocus
                      className="w-full px-3.5 py-2 text-sm font-mono bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Lookup & Process Barcode
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Results & Quick Adjust Right Panel */}
          <div className="lg:col-span-5 p-5 flex flex-col bg-slate-50/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              Scan Results & Stock Adjustment
            </h3>

            {scannedResult ? (
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs mb-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-semibold">
                    {scannedResult.code}
                  </span>
                  {scannedResult.item ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Found
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                      <AlertCircle className="w-3.5 h-3.5" /> Unregistered
                    </span>
                  )}
                </div>

                {scannedResult.item ? (
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {scannedResult.item.name}
                    </h4>
                    <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
                      <span>Category: <strong className="text-slate-700">{scannedResult.item.category}</strong></span>
                      <span>Loc: <strong className="text-slate-700">{scannedResult.item.location}</strong></span>
                    </div>

                    {scannedResult.message && (
                      <div className="mt-2.5 p-2 bg-indigo-50 border border-indigo-100 text-indigo-800 text-xs rounded-lg font-medium">
                        {scannedResult.message}
                      </div>
                    )}

                    {/* Stock level indicator */}
                    <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold block">
                          Current In Stock
                        </span>
                        <div className="flex items-baseline gap-2 mt-0.5">
                          <span className={`text-2xl font-black font-mono ${
                            scannedResult.item.quantity <= 0
                              ? 'text-rose-600'
                              : scannedResult.item.quantity <= scannedResult.item.minThreshold
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}>
                            {scannedResult.item.quantity}
                          </span>
                          <span className="text-xs text-slate-500">
                            (Min alert: {scannedResult.item.minThreshold})
                          </span>
                        </div>
                      </div>

                      {/* Manual Quick +/- Buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            const newQty = Math.max(0, scannedResult.item!.quantity - 1);
                            onUpdateQuantity(scannedResult.item!.id, newQty, 'Manual barcode scan adjustment (-1)');
                            onLogScanActivity('deduct', scannedResult.item!.sku, scannedResult.item!.name, -1);
                            setScannedResult(prev => prev ? {
                              ...prev,
                              item: { ...prev.item!, quantity: newQty }
                            } : null);
                          }}
                          className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 active:scale-95 transition-all shadow-xs cursor-pointer"
                          title="Decrease 1"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const newQty = scannedResult.item!.quantity + 1;
                            onUpdateQuantity(scannedResult.item!.id, newQty, 'Manual barcode scan adjustment (+1)');
                            onLogScanActivity('restock', scannedResult.item!.sku, scannedResult.item!.name, 1);
                            setScannedResult(prev => prev ? {
                              ...prev,
                              item: { ...prev.item!, quantity: newQty }
                            } : null);
                          }}
                          className="p-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 transition-all shadow-xs cursor-pointer"
                          title="Increase 1"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-2">
                    <p className="text-xs text-slate-600 mb-3">
                      This barcode isn't tied to any catalog product yet. Would you like to create an item entry with this barcode?
                    </p>
                    <button
                      onClick={() => {
                        onAddNewItemWithBarcode(scannedResult.code);
                        onClose();
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Register New Product for {scannedResult.code}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-200 rounded-xl bg-white text-center mb-4">
                <Package className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-medium text-slate-600">Awaiting Barcode</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Point camera at an item barcode or enter code to inspect & adjust stock
                </p>
              </div>
            )}

            {/* Recent Scans Session Feed */}
            <div className="flex-1 flex flex-col min-h-0">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Session Scan Activity
              </span>
              <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                {recentScans.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No items scanned this session yet.</p>
                ) : (
                  recentScans.map((scan, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200 text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${scan.success ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                        <span className="font-medium text-slate-800 truncate">{scan.name}</span>
                        <span className="font-mono text-[10px] text-slate-500">{scan.code}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0 font-mono">{scan.time}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Barcode Engine Ready</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Done Scanning
          </button>
        </div>
      </div>
    </div>
  );
};
