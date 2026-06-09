import { useState } from 'react';
import type { MapLayerKey } from '@/types/location';
import { MAP_LAYERS } from '@/types/location';
import {
  Settings,
  Layers,
  Eye,
  EyeOff,
  Navigation,
  Monitor,
  Smartphone,
  Hash,
} from 'lucide-react';

interface SettingsPanelProps {
  deviceId: string;
  onDeviceIdChange: (id: string) => void;
  mapLayer: MapLayerKey;
  onMapLayerChange: (layer: MapLayerKey) => void;
  showTrail: boolean;
  onShowTrailChange: (show: boolean) => void;
  followMode: boolean;
  onFollowModeChange: (follow: boolean) => void;
}

export default function SettingsPanel({
  deviceId,
  onDeviceIdChange,
  mapLayer,
  onMapLayerChange,
  showTrail,
  onShowTrailChange,
  followMode,
  onFollowModeChange,
}: SettingsPanelProps) {
  const [localDeviceId, setLocalDeviceId] = useState(deviceId);

  const handleDeviceIdBlur = () => {
    const trimmed = localDeviceId.trim() || 'default';
    setLocalDeviceId(trimmed);
    onDeviceIdChange(trimmed);
  };

  const layerIcons: Record<MapLayerKey, React.ReactNode> = {
    default: <Monitor size={14} />,
    dark: <Layers size={14} />,
    satellite: <Eye size={14} />,
    terrain: <Navigation size={14} />,
  };

  return (
    <div className="space-y-5">
      {/* Device ID */}
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone size={14} className="text-blue-400" />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Device ID</span>
        </div>
        <div className="relative">
          <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={localDeviceId}
            onChange={(e) => setLocalDeviceId(e.target.value)}
            onBlur={handleDeviceIdBlur}
            placeholder="default"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-600/50 focus:ring-1 focus:ring-blue-600/30 transition-all font-mono"
          />
        </div>
        <p className="mt-2 text-[11px] text-slate-500 leading-relaxed">
          Device ID harus sama dengan yang dikirim oleh{' '}
          <code className="px-1 py-0.5 bg-slate-800 rounded text-blue-400 font-mono">
            baru 2.js
          </code>
          . Pastikan ID ini cocok agar lokasi muncul di peta.
        </p>
      </div>

      {/* Map Layer */}
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-3">
          <Layers size={14} className="text-emerald-400" />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Layer Peta</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(MAP_LAYERS) as MapLayerKey[]).map((key) => (
            <button
              key={key}
              onClick={() => onMapLayerChange(key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${
                mapLayer === key
                  ? 'bg-blue-600/20 border-blue-600/40 text-blue-400'
                  : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
              }`}
            >
              {layerIcons[key]}
              <span className="capitalize">{MAP_LAYERS[key].name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Display Options */}
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-3">
          <Settings size={14} className="text-purple-400" />
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Tampilan</span>
        </div>

        <div className="space-y-3">
          {/* Follow Mode */}
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-2">
              <Navigation size={14} className="text-slate-400 group-hover:text-slate-300" />
              <span className="text-sm text-slate-300">Ikuti Lokasi</span>
            </div>
            <div
              className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                followMode ? 'bg-blue-600' : 'bg-slate-700'
              }`}
              onClick={() => onFollowModeChange(!followMode)}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  followMode ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </div>
          </label>

          {/* Show Trail */}
          <label className="flex items-center justify-between cursor-pointer group">
            <div className="flex items-center gap-2">
              {showTrail ? (
                <Eye size={14} className="text-slate-400 group-hover:text-slate-300" />
              ) : (
                <EyeOff size={14} className="text-slate-400 group-hover:text-slate-300" />
              )}
              <span className="text-sm text-slate-300">Jejak Lokasi</span>
            </div>
            <div
              className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                showTrail ? 'bg-blue-600' : 'bg-slate-700'
              }`}
              onClick={() => onShowTrailChange(!showTrail)}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  showTrail ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </div>
          </label>
        </div>
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-xl bg-slate-800/30 border border-slate-700/30">
        <h4 className="text-xs font-medium text-slate-400 mb-2">Cara Kerja</h4>
        <ol className="text-[11px] text-slate-500 space-y-1.5 list-decimal list-inside leading-relaxed">
          <li>
            Pasang userscript{' '}
            <code className="px-1 py-0.5 bg-slate-800 rounded text-blue-400 font-mono">
              baru 2.js
            </code>{' '}
            yang sudah dimodifikasi
          </li>
          <li>Buka GeoGuessr dan mainkan seperti biasa</li>
          <li>Koordinat akan otomatis dikirim ke Firebase Realtime Database</li>
          <li>Website ini membaca data real-time dan menampilkan di peta</li>
        </ol>
      </div>
    </div>
  );
}
