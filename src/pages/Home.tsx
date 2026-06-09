import { useState, useCallback } from 'react';
import LiveMap from '@/components/LiveMap';
import LocationPanel from '@/components/LocationPanel';
import HistoryPanel from '@/components/HistoryPanel';
import SettingsPanel from '@/components/SettingsPanel';
import { useFirebaseLocation } from '@/hooks/useFirebaseLocation';
import type { MapLayerKey } from '@/types/location';
import {
  MapPin,
  Settings,
  History,
  PanelLeftClose,
  PanelLeftOpen,
  AlertTriangle,
  Wifi,
  WifiOff,
} from 'lucide-react';

export default function Home() {
  const [deviceId, setDeviceId] = useState('geoguessr-device');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'location' | 'history' | 'settings'>('location');
  const [mapLayer, setMapLayer] = useState<MapLayerKey>('default');
  const [showTrail, setShowTrail] = useState(true);
  const [followMode, setFollowMode] = useState(true);

  const { location, history, isConnected, error, clearHistory } =
    useFirebaseLocation(deviceId);

  const handleDeviceIdChange = useCallback((id: string) => {
    setDeviceId(id);
  }, []);

  // ── Render Tab Content ──
  const renderTabContent = () => {
    switch (activeTab) {
      case 'location':
        return <LocationPanel location={location} isConnected={isConnected} />;
      case 'history':
        return <HistoryPanel history={history} onClear={clearHistory} />;
      case 'settings':
        return (
          <SettingsPanel
            deviceId={deviceId}
            onDeviceIdChange={handleDeviceIdChange}
            mapLayer={mapLayer}
            onMapLayerChange={setMapLayer}
            showTrail={showTrail}
            onShowTrailChange={setShowTrail}
            followMode={followMode}
            onFollowModeChange={setFollowMode}
          />
        );
    }
  };

  const tabs = [
    { id: 'location' as const, label: 'Lokasi', icon: MapPin },
    { id: 'history' as const, label: 'Riwayat', icon: History },
    { id: 'settings' as const, label: 'Pengaturan', icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden">
      {/* Map Area */}
      <div className="flex-1 relative">
        <LiveMap
          location={location}
          history={history}
          mapLayer={mapLayer}
          showTrail={showTrail}
          followMode={followMode}
        />

        {/* Top Bar Overlay */}
        <div className="absolute top-0 left-0 right-0 z-[500] pointer-events-none">
          <div className="flex items-center justify-between p-3">
            {/* Title */}
            <div className="pointer-events-auto flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800/60">
              <div className="w-7 h-7 rounded-md bg-blue-600/20 flex items-center justify-center">
                <MapPin size={14} className="text-blue-400" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-slate-200 leading-none">
                  GeoGuessr Tracker
                </h1>
                <p className="text-[10px] text-slate-500 mt-0.5">Real-Time Location Map</p>
              </div>
            </div>

            {/* Status */}
            <div className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900/80 backdrop-blur-md border border-slate-800/60">
              {isConnected ? (
                <Wifi size={13} className="text-green-400" />
              ) : (
                <WifiOff size={13} className="text-red-400" />
              )}
              <span
                className={`text-xs font-medium ${
                  isConnected ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div
        className={`relative flex-shrink-0 bg-slate-900 border-l border-slate-800 transition-all duration-300 ease-out ${
          sidebarOpen ? 'w-80' : 'w-0 overflow-hidden opacity-0'
        }`}
      >
        {sidebarOpen && (
          <div className="flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {tabs.find((t) => t.id === activeTab)?.label}
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 rounded-md hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <PanelLeftClose size={14} />
              </button>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="mx-3 mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-300 leading-relaxed">{error}</p>
              </div>
            )}

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
              {renderTabContent()}
            </div>

            {/* Sidebar Tabs */}
            <div className="flex items-center border-t border-slate-800">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'text-blue-400 bg-blue-600/10 border-t-2 border-blue-500 -mt-px'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <tab.icon size={13} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Toggle (when closed) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-[600] p-2.5 rounded-lg bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60 shadow-lg transition-all"
        >
          <PanelLeftOpen size={16} />
        </button>
      )}
    </div>
  );
}
