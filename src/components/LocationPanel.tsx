import { useState } from 'react';
import type { LocationData } from '@/types/location';
import { MapPin, Copy, Check, Clock, Globe, Navigation } from 'lucide-react';

interface LocationPanelProps {
  location: LocationData | null;
  isConnected: boolean;
}

export default function LocationPanel({ location, isConnected }: LocationPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyCoords = async () => {
    if (!location) return;
    const text = `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const openGoogleMaps = () => {
    if (!location) return;
    const url = `https://www.google.com/maps?q=${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;
    window.open(url, '_blank');
  };

  const openStreetView = () => {
    if (!location) return;
    const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${location.lat.toFixed(6)},${location.lng.toFixed(6)}`;
    window.open(url, '_blank');
  };

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '--:--:--';
    const d = new Date(timestamp);
    return d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const timeAgo = (timestamp?: number) => {
    if (!timestamp) return 'Belum ada data';
    const now = Date.now();
    const diff = now - timestamp;
    if (diff < 5000) return 'Baru saja';
    if (diff < 60000) return `${Math.floor(diff / 1000)} detik lalu`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)} menit lalu`;
    return `${Math.floor(diff / 3600000)} jam lalu`;
  };

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
        <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
        <span className="text-xs font-medium text-slate-400">
          {isConnected ? 'Terhubung ke Firebase' : 'Tidak terhubung'}
        </span>
      </div>

      {/* Coordinates Card */}
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-blue-400" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Koordinat</span>
          </div>
          <button
            onClick={handleCopyCoords}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors text-xs"
          >
            {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
            {copied ? 'Tersalin' : 'Salin'}
          </button>
        </div>

        {location ? (
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-slate-500 w-12">Lat</span>
              <span className="font-mono text-sm text-blue-300">{location.lat.toFixed(6)}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-slate-500 w-12">Lng</span>
              <span className="font-mono text-sm text-blue-300">{location.lng.toFixed(6)}</span>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500 font-mono">--.------, --.------</div>
        )}
      </div>

      {/* Address */}
      {location?.address && (
        <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={14} className="text-emerald-400" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Alamat</span>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed">{location.address}</p>
        </div>
      )}

      {/* Platform */}
      {location?.platform && (
        <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
          <div className="flex items-center gap-2">
            <Navigation size={14} className="text-amber-400" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Platform</span>
            <span className="ml-auto text-xs text-slate-300 capitalize">{location.platform}</span>
          </div>
        </div>
      )}

      {/* Timestamp */}
      <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={14} className="text-purple-400" />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Update Terakhir</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-300 font-mono">{formatTime(location?.timestamp)}</span>
          <span className="text-xs text-slate-500">{timeAgo(location?.timestamp)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      {location && (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={openGoogleMaps}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30 transition-colors text-xs font-medium"
          >
            <Globe size={14} />
            Google Maps
          </button>
          <button
            onClick={openStreetView}
            className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-600/30 transition-colors text-xs font-medium"
          >
            <MapPin size={14} />
            Street View
          </button>
        </div>
      )}
    </div>
  );
}
