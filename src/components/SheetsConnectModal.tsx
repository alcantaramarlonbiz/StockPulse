import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  X,
  Plus,
  ExternalLink,
  Check,
  Search,
  RefreshCw,
  AlertCircle,
  FileText
} from 'lucide-react';
import {
  createInventorySpreadsheet,
  listUserSpreadsheets,
  DriveSpreadsheetFile
} from '../services/sheetsService';
import { sound } from '../services/soundService';

interface SheetsConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string | null;
  currentSpreadsheetId: string | null;
  currentSpreadsheetName: string | null;
  onSelectSpreadsheet: (id: string, name: string, url?: string) => Promise<void>;
  onDisconnectSpreadsheet: () => void;
}

export const SheetsConnectModal: React.FC<SheetsConnectModalProps> = ({
  isOpen,
  onClose,
  accessToken,
  currentSpreadsheetId,
  currentSpreadsheetName,
  onSelectSpreadsheet,
  onDisconnectSpreadsheet
}) => {
  const [spreadsheets, setSpreadsheets] = useState<DriveSpreadsheetFile[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch list of user's spreadsheets from Google Drive
  useEffect(() => {
    if (isOpen && accessToken) {
      loadSpreadsheets();
    }
  }, [isOpen, accessToken]);

  const loadSpreadsheets = async () => {
    if (!accessToken) return;
    setLoadingList(true);
    setErrorMsg(null);
    try {
      const files = await listUserSpreadsheets(accessToken);
      setSpreadsheets(files);
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to list files from Google Drive.');
    } finally {
      setLoadingList(false);
    }
  };

  const handleCreateNew = async () => {
    if (!accessToken) return;
    setCreatingNew(true);
    setErrorMsg(null);
    try {
      const newSheet = await createInventorySpreadsheet(accessToken, 'StockPulse Inventory');
      sound.playSyncSuccess();
      await onSelectSpreadsheet(newSheet.id, newSheet.name, newSheet.url);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not create Google Spreadsheet');
    } finally {
      setCreatingNew(false);
    }
  };

  const handleSelect = async (file: DriveSpreadsheetFile) => {
    try {
      await onSelectSpreadsheet(file.id, file.name, file.webViewLink);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to select spreadsheet');
    }
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    let id = customInput.trim();
    // Parse ID from standard Google Sheets URL if user pasted full URL
    const match = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match && match[1]) {
      id = match[1];
    }

    try {
      await onSelectSpreadsheet(id, `Spreadsheet (${id.substring(0, 8)}...)`);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to connect to spreadsheet ID');
    }
  };

  if (!isOpen) return null;

  const filteredSheets = spreadsheets.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Google Sheets Integration
              </h3>
              <p className="text-xs text-slate-500">
                Select or create a live spreadsheet to synchronize catalog stock levels
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Currently connected card */}
          {currentSpreadsheetId && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Currently Linked Sheet
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {currentSpreadsheetName || 'Active Google Sheet'}
                  </span>
                  <span className="block font-mono text-[11px] text-slate-500">
                    ID: {currentSpreadsheetId}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`https://docs.google.com/spreadsheets/d/${currentSpreadsheetId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in Sheets
                </a>
                <button
                  onClick={onDisconnectSpreadsheet}
                  className="px-3 py-1.5 text-xs font-medium text-rose-600 bg-white border border-rose-200 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}

          {/* Action 1: Create New Sheet with 1 click */}
          <div className="p-4 border-2 border-dashed border-emerald-300 bg-emerald-50/40 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-600" />
                Create New Inventory Spreadsheet
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Instantly generates a pre-formatted Google Sheet in your Drive with stock columns, formatting, and auto-sync headers.
              </p>
            </div>
            <button
              onClick={handleCreateNew}
              disabled={creatingNew}
              className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {creatingNew ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Creating in Drive...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Generate New Sheet
                </>
              )}
            </button>
          </div>

          {/* Action 2: Existing spreadsheets from Google Drive */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Or Select from Google Drive
              </h4>
              <button
                onClick={loadSpreadsheets}
                disabled={loadingList}
                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer font-medium"
              >
                <RefreshCw className={`w-3 h-3 ${loadingList ? 'animate-spin' : ''}`} />
                Refresh List
              </button>
            </div>

            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search spreadsheets in your Drive..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100">
              {loadingList ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-500" />
                  Loading spreadsheets from your Google account...
                </div>
              ) : filteredSheets.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No spreadsheets found matching "{searchQuery}"
                </div>
              ) : (
                filteredSheets.map(file => (
                  <div
                    key={file.id}
                    className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold text-slate-800 block truncate">
                          {file.name}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {file.id}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelect(file)}
                      className={`px-3 py-1 rounded-md font-semibold transition-colors cursor-pointer shrink-0 ${
                        currentSpreadsheetId === file.id
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700'
                      }`}
                    >
                      {currentSpreadsheetId === file.id ? 'Connected' : 'Select'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action 3: Paste Spreadsheet ID or Link */}
          <form onSubmit={handleCustomSubmit} className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Connect via Spreadsheet URL or ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/... or ID"
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Connect
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-300 text-slate-700 font-medium text-xs rounded-lg hover:bg-slate-50 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
