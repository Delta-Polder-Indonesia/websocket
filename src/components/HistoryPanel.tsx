import { useState } from 'react';
import type { LocationData } from '@/types/location';
import { History, Copy, Check, MapPin, Trash2, Download } from 'lucide-react';

interface HistoryPanelProps {
  history: LocationData[];
  onClear: () => void;
}

export default function HistoryPanel({ history, onClear }: HistoryPanelProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = async (entry: LocationData, index: number) => {
    const text = `${entry.lat.toFixed(6)}, ${entry.lng.toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const handleExport = () => {
    if (history.length === 0) return;
    const data = {
      exportedAt: new Date().toISOString(),
      total: history.length,
      entries: history.map((h, i) => ({
        no: history.length - i,
        lat: h.lat,
        lng: h.lng,
        address: h.address || '',
        timestamp: new Date(h.timestamp || 0).toISOString(),
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `location-history-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '--:--';
    const d = new Date(timestamp);
    return d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <History size={14} className="text-slate-400" />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Riwayat ({history.length})
          </span>
        </div>
        {history.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={handleExport}
              className="p-1.5 rounded-md hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              title="Export JSON"
            >
              <Download size={13} />
            </button>
            <button
              onClick={onClear}
              className="p-1.5 rounded-md hover:bg-red-900/30 text-slate-400 hover:text-red-400 transition-colors"
              title="Hapus semua"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5">
        {history.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-slate-800 flex items-center justify-center">
              <History size={16} className="text-slate-600" />
            </div>
            <p className="text-xs text-slate-500">Belum ada riwayat lokasi</p>
          </div>
        ) : (
          history.map((entry, index) => (
            <div
              key={entry.timestamp}
              className="group flex items-center gap-2 p-2.5 rounded-lg bg-slate-800/40 hover:bg-slate-800/70 border border-transparent hover:border-slate-700/50 transition-all"
            >
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600/20 flex items-center justify-center">
                <span className="text-[10px] font-mono font-bold text-blue-400">
                  {history.length - index}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <MapPin size={10} className="text-slate-500 flex-shrink-0" />
                  <span className="text-xs font-mono text-slate-300 truncate">
                    {entry.lat.toFixed(4)}, {entry.lng.toFixed(4)}
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  {formatTime(entry.timestamp)}
                </div>
              </div>

              <button
                onClick={() => handleCopy(entry, index)}
                className="flex-shrink-0 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all"
              >
                {copiedIndex === index ? (
                  <Check size={12} className="text-green-400" />
                ) : (
                  <Copy size={12} />
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
