import { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getDatabase,
  ref,
  onValue,
  set,
  push,
  remove,
  query,
  limitToLast,
} from 'firebase/database';
import type { DatabaseReference } from 'firebase/database';
import type { LocationData, LocationUpdate } from '@/types/location';

// ── Firebase Configuration ──
// ⚠️ Ganti dengan konfigurasi Firebase milikmu (lihat README.md)
const firebaseConfig = {
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  databaseURL: "__FIREBASE_DATABASE_URL__",
  projectId: "__FIREBASE_PROJECT_ID__",
  storageBucket: "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__",
};

let app: ReturnType<typeof initializeApp> | null = null;
let db: ReturnType<typeof getDatabase> | null = null;

function getFirebaseApp() {
  if (!app) {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

function getDb() {
  if (!db) {
    db = getDatabase(getFirebaseApp());
  }
  return db;
}

// ── Helper: Check if config is still placeholder ──
function isPlaceholderConfig(): boolean {
  return firebaseConfig.apiKey.includes('__FIREBASE');
}

// ── Hook: Listen to real-time location ──
export function useFirebaseLocation(deviceId: string = 'default') {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [history, setHistory] = useState<LocationData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState(!isPlaceholderConfig());
  const locationRef = useRef<DatabaseReference | null>(null);
  const historyRef = useRef<DatabaseReference | null>(null);

  useEffect(() => {
    if (isPlaceholderConfig()) {
      setIsConfigured(false);
      setError('Firebase belum dikonfigurasi. Lihat README.md bagian "Konfigurasi Firebase".');
      return;
    }

    setIsConfigured(true);
    setError(null);

    try {
      const database = getDb();

      // Reference to current location
      locationRef.current = ref(database, `locations/${deviceId}/current`);

      // Reference to location history
      historyRef.current = ref(database, `locations/${deviceId}/history`);

      // Listen to current location changes
      const unsubscribeCurrent = onValue(
        locationRef.current,
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            setLocation({
              lat: data.lat,
              lng: data.lng,
              address: data.address || undefined,
              platform: data.platform || undefined,
              timestamp: data.timestamp,
            });
            setIsConnected(true);
            setError(null);
          } else {
            setLocation(null);
          }
        },
        (err) => {
          console.error('Firebase location error:', err);
          setError('Gagal membaca data lokasi dari Firebase');
          setIsConnected(false);
        }
      );

      // Listen to history
      const historyQuery = query(historyRef.current, limitToLast(50));
      const unsubscribeHistory = onValue(
        historyQuery,
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const entries = Object.values(data) as LocationData[];
            entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            setHistory(entries);
          } else {
            setHistory([]);
          }
        },
        (err) => {
          console.error('Firebase history error:', err);
        }
      );

      // Connection state
      const connectedRef = ref(database, '.info/connected');
      const unsubscribeConnected = onValue(connectedRef, (snap) => {
        setIsConnected(!!snap.val());
      });

      return () => {
        unsubscribeCurrent();
        unsubscribeHistory();
        unsubscribeConnected();
      };
    } catch (err) {
      console.error('Firebase init error:', err);
      setError('Gagal inisialisasi Firebase');
      setIsConnected(false);
    }
  }, [deviceId]);

  // ── Manual send location (for testing) ──
  const sendLocation = useCallback(
    async (locationData: LocationData) => {
      if (isPlaceholderConfig()) {
        setError('Firebase belum dikonfigurasi');
        return false;
      }

      try {
        const database = getDb();
        const currentRef = ref(database, `locations/${deviceId}/current`);
        const historyRefPath = ref(database, `locations/${deviceId}/history`);

        // Update current location
        await set(currentRef, {
          ...locationData,
          timestamp: Date.now(),
        });

        // Add to history
        const newEntryRef = push(historyRefPath);
        await set(newEntryRef, {
          ...locationData,
          timestamp: Date.now(),
        });

        return true;
      } catch (err) {
        console.error('Send location error:', err);
        setError('Gagal mengirim lokasi');
        return false;
      }
    },
    [deviceId]
  );

  // ── Clear history ──
  const clearHistory = useCallback(async () => {
    if (isPlaceholderConfig()) return false;

    try {
      const database = getDb();
      const historyRef = ref(database, `locations/${deviceId}/history`);
      await remove(historyRef);
      return true;
    } catch (err) {
      console.error('Clear history error:', err);
      return false;
    }
  }, [deviceId]);

  return {
    location,
    history,
    isConnected,
    isConfigured,
    error,
    sendLocation,
    clearHistory,
  };
}

// ── Hook: Multiple devices tracking ──
export function useMultiDeviceTracking() {
  const [devices, setDevices] = useState<Record<string, LocationUpdate>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPlaceholderConfig()) {
      setError('Firebase belum dikonfigurasi');
      return;
    }

    try {
      const database = getDb();
      const locationsRef = ref(database, 'locations');

      const unsubscribe = onValue(
        locationsRef,
        (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const deviceMap: Record<string, LocationUpdate> = {};
            Object.entries(data).forEach(([deviceId, deviceData]: [string, any]) => {
              if (deviceData?.current) {
                deviceMap[deviceId] = {
                  deviceId,
                  deviceName: deviceData.deviceName || deviceId,
                  coords: {
                    lat: deviceData.current.lat,
                    lng: deviceData.current.lng,
                    address: deviceData.current.address,
                    platform: deviceData.current.platform,
                    timestamp: deviceData.current.timestamp,
                  },
                };
              }
            });
            setDevices(deviceMap);
          } else {
            setDevices({});
          }
          setIsConnected(true);
        },
        (err) => {
          console.error('Multi-device error:', err);
          setError('Gagal membaca data perangkat');
          setIsConnected(false);
        }
      );

      const connectedRef = ref(database, '.info/connected');
      const unsubscribeConnected = onValue(connectedRef, (snap) => {
        setIsConnected(!!snap.val());
      });

      return () => {
        unsubscribe();
        unsubscribeConnected();
      };
    } catch (err) {
      console.error('Multi-device init error:', err);
      setError('Gagal inisialisasi multi-device tracking');
    }
  }, []);

  return { devices, isConnected, error };
}

export { isPlaceholderConfig };
