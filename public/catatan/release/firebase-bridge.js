// ═══════════════════════════════════════════════════════════════════════════
// FIREBASE REALTIME BRIDGE for GeoGuessr A.M.A.S
// By: Bintang Toba Pro Extension
// 
// CARA PENGGUNAAN:
// 1. Salin seluruh kode ini ke dalam file "baru 2.js" (di bagian paling bawah)
// 2. Ganti FIREBASE_DATABASE_URL dengan URL database Firebase milikmu
// 3. Ganti DEVICE_ID dengan ID perangkat unik (bebas, tapi harus sama dengan website)
// 4. Simpan dan reload GeoGuessr
//
// ATAU:
// Copy-paste bagian // ===== CONFIGURATION ===== dan sesuaikan nilainya
// ═══════════════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ===== CONFIGURATION - GANTI SESUAI FIREBASE MILIKMU =====
    const CONFIG = {
        // URL Firebase Realtime Database (format: https://<project-id>-default-rtdb.firebaseio.com)
        // Ganti ini dengan URL database Firebase milikmu
        FIREBASE_URL: 'https://YOUR-PROJECT-ID-default-rtdb.firebaseio.com',
        
        // Device ID unik - harus sama dengan yang di website maps
        // Bisa diganti dengan apa saja, misal: 'laptop-bintang', 'pc-rumah', dsb
        DEVICE_ID: 'geoguessr-device',
        
        // Nama perangkat (tampilan di website)
        DEVICE_NAME: 'GeoGuessr Player',
        
        // Interval pengiriman koordinat (ms)
        // Jangan terlalu sering agar tidak membebani Firebase (free tier = 100GB/bulan)
        SEND_INTERVAL: 3000,
        
        // Enable/disable bridge
        ENABLED: true,
        
        // Debug mode - tampilkan log di console
        DEBUG: false
    };

    // ===== INTERNAL STATE =====
    let lastSentCoords = { lat: null, lng: null };
    let sendInterval = null;
    let isSending = false;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 10;

    // ===== LOGGER =====
    const Logger = {
        info(...args) {
            console.log('[FirebaseBridge]', ...args);
        },
        debug(...args) {
            if (CONFIG.DEBUG) {
                console.log('[FirebaseBridge:DBG]', ...args);
            }
        },
        error(...args) {
            console.error('[FirebaseBridge:ERR]', ...args);
        }
    };

    // ===== VALIDATOR =====
    function isValidCoord(lat, lng) {
        return typeof lat === 'number' && typeof lng === 'number' &&
            !isNaN(lat) && !isNaN(lng) &&
            lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }

    // ===== COORDINATE EXTRACTOR =====
    // Ini akan mencoba membaca koordinat dari berbagai sumber
    function extractCurrentCoords() {
        // Coba 1: Dari interceptedCoords (variabel global dari baru 2.js)
        try {
            if (typeof interceptedCoords !== 'undefined' && 
                isValidCoord(interceptedCoords.lat, interceptedCoords.lng)) {
                return { lat: interceptedCoords.lat, lng: interceptedCoords.lng };
            }
        } catch(e) {}

        // Coba 2: Dari state.coords (jika baru 2.js sudah update state)
        try {
            if (typeof state !== 'undefined' && state.coords &&
                isValidCoord(state.coords.lat, state.coords.lng)) {
                return { lat: state.coords.lat, lng: state.coords.lng };
            }
        } catch(e) {}

        // Coba 3: Dari extractionCache (jika tersedia)
        try {
            if (typeof extractionCache !== 'undefined' && extractionCache.result &&
                isValidCoord(extractionCache.result.lat, extractionCache.result.lng)) {
                return { lat: extractionCache.result.lat, lng: extractionCache.result.lng };
            }
        } catch(e) {}

        // Coba 4: Scan dari DOM (Google Maps iframe)
        try {
            const iframes = document.querySelectorAll('iframe');
            for (const iframe of iframes) {
                const src = iframe.src || '';
                if (src.includes('cbll=')) {
                    const match = src.match(/cbll=(-?\d+\.\d+),(-?\d+\.\d+)/);
                    if (match) {
                        const lat = parseFloat(match[1]);
                        const lng = parseFloat(match[2]);
                        if (isValidCoord(lat, lng)) return { lat, lng };
                    }
                }
            }
        } catch(e) {}

        // Coba 5: Dari React Fiber (sama seperti baru 2.js)
        try {
            const canvases = document.querySelectorAll('.widget-scene-canvas, canvas[class*="scene"]');
            for (const canvas of canvases) {
                let el = canvas;
                for (let i = 0; i < 10 && el; i++) {
                    el = el.parentElement;
                    if (!el) break;
                    const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber'));
                    if (fiberKey) {
                        const fiber = el[fiberKey];
                        // Walk fiber tree
                        let current = fiber;
                        for (let d = 0; d < 15 && current; d++) {
                            const props = current.memoizedProps;
                            if (props) {
                                const sv = props.panorama || props.streetView;
                                if (sv?.location?.latLng) {
                                    const lat = typeof sv.location.latLng.lat === 'function' 
                                        ? sv.location.latLng.lat() : sv.location.latLng.lat;
                                    const lng = typeof sv.location.latLng.lng === 'function'
                                        ? sv.location.latLng.lng() : sv.location.latLng.lng;
                                    if (isValidCoord(lat, lng)) return { lat, lng };
                                }
                            }
                            current = current.return || current.sibling;
                        }
                    }
                }
            }
        } catch(e) {}

        return null;
    }

    // ===== GET ADDRESS =====
    function getCurrentAddress() {
        try {
            if (typeof state !== 'undefined' && state.address) {
                return state.address;
            }
        } catch(e) {}
        return null;
    }

    // ===== GET PLATFORM =====
    function getPlatform() {
        try {
            if (typeof state !== 'undefined' && state.platform) {
                return state.platform;
            }
        } catch(e) {}
        
        const url = window.location.href.toLowerCase();
        if (url.includes('geoguessr')) return 'geoguessr';
        if (url.includes('worldguessr')) return 'worldguessr';
        if (url.includes('openguessr')) return 'openguessr';
        if (url.includes('freeguessr')) return 'freeguessr';
        return 'unknown';
    }

    // ===== SEND TO FIREBASE =====
    function sendToFirebase(coords) {
        if (!coords || !isValidCoord(coords.lat, coords.lng)) {
            Logger.debug('Invalid coords, skipping send');
            return;
        }

        // Skip if same as last sent (with small threshold)
        if (lastSentCoords.lat !== null && 
            Math.abs(lastSentCoords.lat - coords.lat) < 0.00001 &&
            Math.abs(lastSentCoords.lng - coords.lng) < 0.00001) {
            Logger.debug('Coords unchanged, skipping send');
            return;
        }

        const address = getCurrentAddress();
        const platform = getPlatform();

        const payload = {
            lat: coords.lat,
            lng: coords.lng,
            timestamp: Date.now(),
            platform: platform,
        };

        if (address) {
            const formatted = formatAddress(address);
            if (formatted) payload.address = formatted;
        }

        const currentUrl = `${CONFIG.FIREBASE_URL}/locations/${CONFIG.DEVICE_ID}/current.json`;
        const historyUrl = `${CONFIG.FIREBASE_URL}/locations/${CONFIG.DEVICE_ID}/history.json`;

        isSending = true;

        // Send current location
        const sendRequest = (url, data, method) => {
            return new Promise((resolve, reject) => {
                if (typeof GM_xmlhttpRequest !== 'undefined') {
                    GM_xmlhttpRequest({
                        method: method,
                        url: url,
                        headers: { 'Content-Type': 'application/json' },
                        data: JSON.stringify(data),
                        timeout: 10000,
                        onload: (res) => {
                            if (res.status >= 200 && res.status < 300) {
                                resolve(res);
                            } else {
                                reject(new Error(`HTTP ${res.status}`));
                            }
                        },
                        onerror: (err) => reject(err),
                        ontimeout: () => reject(new Error('Timeout'))
                    });
                } else {
                    fetch(url, {
                        method: method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    })
                    .then(res => {
                        if (res.ok) resolve(res);
                        else reject(new Error(`HTTP ${res.status}`));
                    })
                    .catch(reject);
                }
            });
        };

        // Send to /current (overwrite)
        sendRequest(currentUrl, payload, 'PUT')
            .then(() => {
                lastSentCoords = { lat: coords.lat, lng: coords.lng };
                consecutiveErrors = 0;
                Logger.debug('Location sent to Firebase:', coords.lat.toFixed(6), coords.lng.toFixed(6));

                // Also add to history (POST creates unique key)
                return sendRequest(historyUrl, payload, 'POST');
            })
            .then(() => {
                Logger.debug('History entry added');
                isSending = false;
            })
            .catch((err) => {
                consecutiveErrors++;
                Logger.error('Failed to send:', err.message || err);
                
                // Auto-disable if too many consecutive errors
                if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
                    Logger.error('Too many errors, auto-disabling bridge');
                    stopBridge();
                }
                isSending = false;
            });
    }

    // ===== FORMAT ADDRESS =====
    function formatAddress(addr) {
        if (!addr) return null;
        
        // If it's already a string, return it
        if (typeof addr === 'string') return addr;
        
        // If it's an object (Nominatim response)
        if (addr.address) {
            const a = addr.address;
            const parts = [
                a.road || a.street,
                a.city || a.town || a.village,
                a.state || a.province,
                a.country
            ].filter(Boolean);
            return parts.join(', ') || a.country || null;
        }
        
        if (addr.display_name) return addr.display_name;
        
        return null;
    }

    // ===== START/STOP BRIDGE =====
    function startBridge() {
        if (sendInterval) return;
        
        Logger.info('═══════════════════════════════════════');
        Logger.info('Firebase Realtime Bridge STARTED');
        Logger.info('Device ID:', CONFIG.DEVICE_ID);
        Logger.info('Firebase URL:', CONFIG.FIREBASE_URL);
        Logger.info('Send Interval:', CONFIG.SEND_INTERVAL + 'ms');
        Logger.info('═══════════════════════════════════════');

        // Send immediately
        const coords = extractCurrentCoords();
        if (coords) sendToFirebase(coords);

        // Then send periodically
        sendInterval = setInterval(() => {
            if (isSending) return;
            const coords = extractCurrentCoords();
            if (coords) sendToFirebase(coords);
        }, CONFIG.SEND_INTERVAL);
    }

    function stopBridge() {
        if (sendInterval) {
            clearInterval(sendInterval);
            sendInterval = null;
        }
        Logger.info('Firebase Bridge STOPPED');
    }

    // ===== INITIALIZATION =====
    function init() {
        if (!CONFIG.ENABLED) {
            Logger.info('Bridge is disabled in config');
            return;
        }

        // Check if config is still default
        if (CONFIG.FIREBASE_URL.includes('YOUR-PROJECT-ID')) {
            Logger.error('═══════════════════════════════════════════════');
            Logger.error('KONFIGURASI BELUM DIISI!');
            Logger.error('Silakan edit CONFIG.FIREBASE_URL di file ini');
            Logger.error('Lihat README.md untuk panduan lengkap');
            Logger.error('═══════════════════════════════════════════════');
            return;
        }

        // Wait for page to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startBridge);
        } else {
            startBridge();
        }

        // Also start when window loads (fallback)
        window.addEventListener('load', () => {
            if (!sendInterval) startBridge();
        });
    }

    // Run init
    init();

    // Expose API untuk debugging
    window.__firebaseBridge = {
        config: CONFIG,
        start: startBridge,
        stop: stopBridge,
        sendNow: () => {
            const coords = extractCurrentCoords();
            if (coords) sendToFirebase(coords);
            return coords;
        },
        getStatus: () => ({
            running: !!sendInterval,
            lastSent: lastSentCoords,
            errors: consecutiveErrors,
            deviceId: CONFIG.DEVICE_ID
        })
    };

    Logger.info('Firebase Bridge loaded. Call window.__firebaseBridge.start() to begin.');

})();
