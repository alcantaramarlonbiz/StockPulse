import React from 'react';
import {
  X,
  History,
  Barcode,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  PlusCircle,
  Edit,
  Trash2
} from 'lucide-react';
import { ActivityLog } from '../types/inventory';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: ActivityLog[];
  onClearLogs: () => void;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs
}) => {
  if (!isOpen) return null;

  const getIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'scan':
        return <Barcode className="w-4 h-4 text-indigo-500" />;
      case 'restock':
        return <ArrowUpRight className="w-4 h-4 text-emerald-500" />;
      case 'deduct':
        return <ArrowDownRight className="w-4 h-4 text-amber-500" />;
      case 'sheet_sync':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
      case 'add':
        return <PlusCircle className="w-4 h-4 text-blue-500" />;
      case 'edit':
        return <Edit className="w-4 h-4 text-slate-500" />;
      case 'delete':
        return <Trash2 className="w-4 h-4 text-rose-500" />;
      default:
        return <History className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 text-white shadow-xs">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Audit Trail & Scan Activity History
              </h3>
              <p className="text-xs text-slate-500">
                Real-time timestamped log of barcode scans, stock movements, and syncs
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

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-5 divide-y divide-slate-100">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No recent activity recorded yet.
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg mt-0.5 shrink-0">
                    {getIcon(log.type)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 leading-snug">
                      {log.description}
                    </p>
                    {log.sku && (
                      <span className="inline-block mt-0.5 text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        SKU: {log.sku}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] font-mono text-slate-400 block">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="text-xs text-rose-600 hover:text-rose-800 disabled:opacity-40 font-medium cursor-pointer"
          >
            Clear History
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs rounded-lg cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
