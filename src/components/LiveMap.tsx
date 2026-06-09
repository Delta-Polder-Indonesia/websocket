import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LocationData, MapLayerKey } from '@/types/location';
import { MAP_LAYERS } from '@/types/location';

// Fix Leaflet default icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

interface LiveMapProps {
  location: LocationData | null;
  history: LocationData[];
  mapLayer: MapLayerKey;
  showTrail: boolean;
  followMode: boolean;
}

export default function LiveMap({
  location,
  history,
  mapLayer,
  showTrail,
  followMode,
}: LiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const trailRef = useRef<L.Polyline | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const isUserInteracting = useRef(false);
  const lastLocationRef = useRef<LocationData | null>(null);

  // ── Initialize Map ──
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: true,
      worldCopyJump: true,
      minZoom: 1,
      maxZoom: 19,
    });

    map.setView([0, 0], 2);

    // Add zoom control to bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Add scale control
    L.control.scale({ position: 'bottomleft', imperial: false }).addTo(map);

    mapRef.current = map;

    // Track user interaction
    map.on('dragstart', () => {
      isUserInteracting.current = true;
    });

    map.on('zoomstart', () => {
      isUserInteracting.current = true;
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Update Tile Layer ──
  useEffect(() => {
    if (!mapRef.current) return;

    const layerConfig = MAP_LAYERS[mapLayer];

    if (tileLayerRef.current) {
      mapRef.current.removeLayer(tileLayerRef.current);
    }

    tileLayerRef.current = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: 19,
      subdomains: 'abc',
    }).addTo(mapRef.current);
  }, [mapLayer]);

  // ── Update Marker & View ──
  useEffect(() => {
    if (!mapRef.current || !location) return;

    const { lat, lng } = location;

    // Update or create marker
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="position:relative;width:24px;height:24px;">
            <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.3);animation:pulse-ring 1.5s infinite;"
                 class="pulse-ring"></div>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:#3b82f6;border:2px solid #fff;box-shadow:0 0 12px rgba(59,130,246,0.6);"></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      markerRef.current = L.marker([lat, lng], { icon: customIcon }).addTo(
        mapRef.current
      );
    }

    // Update accuracy circle
    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lng]);
    } else {
      circleRef.current = L.circle([lat, lng], {
        radius: 500,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.08,
        weight: 1,
        opacity: 0.3,
      }).addTo(mapRef.current);
    }

    // Pan to location if follow mode is on and user is not interacting
    if (followMode && !isUserInteracting.current) {
      const currentCenter = mapRef.current.getCenter();
      const dist = Math.abs(currentCenter.lat - lat) + Math.abs(currentCenter.lng - lng);

      if (dist > 0.0001) {
        mapRef.current.panTo([lat, lng], { animate: true, duration: 0.5 });
      }
    }

    lastLocationRef.current = location;
  }, [location, followMode]);

  // ── Update Trail ──
  useEffect(() => {
    if (!mapRef.current) return;

    if (showTrail && history.length > 1) {
      const points = history
        .slice()
        .reverse()
        .map((h) => [h.lat, h.lng] as [number, number]);

      if (trailRef.current) {
        trailRef.current.setLatLngs(points);
      } else {
        trailRef.current = L.polyline(points, {
          color: '#3b82f6',
          weight: 2,
          opacity: 0.5,
          dashArray: '5, 5',
        }).addTo(mapRef.current);
      }
    } else if (trailRef.current) {
      mapRef.current.removeLayer(trailRef.current);
      trailRef.current = null;
    }
  }, [history, showTrail]);

  // ── Handle follow mode re-enable ──
  const handleFollowClick = useCallback(() => {
    isUserInteracting.current = false;
    if (mapRef.current && lastLocationRef.current) {
      const { lat, lng } = lastLocationRef.current;
      mapRef.current.setView([lat, lng], 15, { animate: true, duration: 0.8 });
    }
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Follow Button */}
      {!followMode && location && (
        <button
          onClick={handleFollowClick}
          className="absolute bottom-24 right-4 z-[500] bg-slate-800/90 hover:bg-slate-700 text-blue-400 p-2.5 rounded-lg border border-slate-700 shadow-lg transition-all"
          title="Follow location"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        </button>
      )}

      {/* No Location Overlay */}
      {!location && (
        <div className="absolute inset-0 z-[450] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
          <div className="text-center p-8 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl max-w-sm mx-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-200 mb-2">Menunggu Lokasi</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Belum ada data lokasi yang diterima. Pastikan{' '}
              <code className="px-1.5 py-0.5 bg-slate-800 rounded text-blue-400 font-mono text-xs">
                baru 2.js
              </code>{' '}
              sudah aktif dan mengirim koordinat ke Firebase.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
