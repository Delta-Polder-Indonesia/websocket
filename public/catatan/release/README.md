# GeoGuessr Real-Time Location Tracker

Sistem pemetaan real-time yang menampilkan lokasi GeoGuessr secara live di website peta. Koordinat dari game dikirim ke **Firebase Realtime Database** dan ditampilkan di peta interaktif menggunakan **Leaflet.js**.

---

## Daftar Isi

- [Arsitektur Sistem](#arsitektur-sistem)
- [Prasyarat](#prasyarat)
- [Langkah 1: Setup Firebase](#langkah-1-setup-firebase)
- [Langkah 2: Konfigurasi Website Maps](#langkah-2-konfigurasi-website-maps)
- [Langkah 3: Modifikasi baru 2.js](#langkah-3-modifikasi-baru-2js)
- [Langkah 4: Deploy ke GitHub Pages](#langkah-4-deploy-ke-github-pages)
- [Cara Menggunakan](#cara-menggunakan)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Arsitektur Sistem

```
┌─────────────────┐      HTTP POST (REST API)      ┌─────────────────────┐
│   GeoGuessr     │ ───────────────────────────────▶ │  Firebase Realtime  │
│   (baru 2.js)   │  kirim koordinat setiap 3 detik │      Database       │
│                 │                                  │  (free tier)        │
└─────────────────┘                                  └─────────────────────┘
                                                              │
                                                              │ WebSocket (real-time)
                                                              ▼
                                                       ┌─────────────────────┐
                                                       │   Website Maps      │
                                                       │   (GitHub Pages)    │
                                                       │   - Leaflet.js      │
                                                       │   - Firebase SDK    │
                                                       └─────────────────────┘
```

**Alur Kerja:**
1. `baru 2.js` mengekstrak koordinat lokasi dari GeoGuessr (via XHR intercept, React Fiber, dll)
2. Koordinat dikirim ke Firebase Realtime Database menggunakan REST API
3. Website Maps (di GitHub Pages) membaca data dari Firebase secara real-time via WebSocket
4. Lokasi ditampilkan di peta Leaflet dengan marker, jejak (trail), dan info panel

---

## Prasyarat

Sebelum mulai, pastikan kamu punya:

1. **Akun Google** (untuk Firebase)
2. **Akun GitHub** (untuk hosting website)
3. **Tampermonkey / Violentmonkey** (browser extension untuk userscript, sudah terinstall)
4. **File `baru 2.js`** (userscript GeoGuessr A.M.A.S yang sudah berjalan)

---

## Langkah 1: Setup Firebase

### 1.1 Buat Project Firebase

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Klik **"Add project"** atau **"Buat project"**
3. Beri nama project, misal: `geoguessr-tracker`
4. Nonaktifkan Google Analytics (tidak diperlukan) → klik **"Create project"**
5. Tunggu sampai project selesai dibuat

### 1.2 Aktifkan Realtime Database

1. Di sidebar kiri, klik **"Build"** → **"Realtime Database"**
2. Klik **"Create Database"** atau **"Buat Database"**
3. Pilih lokasi server (rekomendasi: **asia-southeast1** untuk Indonesia)
4. Pada "Security rules", pilih **"Start in test mode"** (untuk development)
5. Klik **"Enable"**

### 1.3 Ambil Database URL

1. Setelah database aktif, kamu akan melihat URL seperti ini:
   ```
   https://geoguessr-tracker-default-rtdb.asia-southeast1.firebasedatabase.app/
   ```
2. **Catat URL ini**, nanti akan digunakan di konfigurasi

### 1.4 Atur Security Rules (Penting!)

1. Di tab **"Rules"**, paste rules berikut:

```json
{
  "rules": {
    "locations": {
      "$deviceId": {
        ".read": true,
        ".write": true,
        "current": {
          ".read": true,
          ".write": true
        },
        "history": {
          ".read": true,
          ".write": true
        }
      }
    }
  }
}
```

2. Klik **"Publish"**

> **Catatan Keamanan:** Rules di atas memungkinkan siapa saja membaca dan menulis. Untuk production, sebaiknya tambahkan autentikasi atau batasan IP. Untuk penggunaan pribadi, ini sudah cukup aman asalkan database URL tidak dishare.

---

## Langkah 2: Konfigurasi Website Maps

### 2.1 Clone atau Download Repository

```bash
# Clone repository (atau download ZIP)
git clone https://github.com/USERNAME/geoguessr-tracker.git
cd geoguessr-tracker
```

### 2.2 Konfigurasi Firebase di Website

Edit file `src/hooks/useFirebaseLocation.ts` dan ganti placeholder config:

```typescript
// Sebelum (placeholder):
const firebaseConfig = {
  apiKey: "__FIREBASE_API_KEY__",
  authDomain: "__FIREBASE_AUTH_DOMAIN__",
  databaseURL: "__FIREBASE_DATABASE_URL__",
  projectId: "__FIREBASE_PROJECT_ID__",
  storageBucket: "__FIREBASE_STORAGE_BUCKET__",
  messagingSenderId: "__FIREBASE_MESSAGING_SENDER_ID__",
  appId: "__FIREBASE_APP_ID__",
};

// Sesudah (contoh):
const firebaseConfig = {
  apiKey: "AIzaSyABCDEFG1234567890",  // boleh placeholder untuk RTDB-only
  authDomain: "geoguessr-tracker.firebaseapp.com",
  databaseURL: "https://geoguessr-tracker-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "geoguessr-tracker",
  storageBucket: "geoguessr-tracker.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890",
};
```

**Cara mendapatkan config lengkap:**

1. Di Firebase Console, klik ikon **⚙️ (Settings)** di sebelah "Project Overview"
2. Pilih **"Project settings"**
3. Scroll ke bawah ke bagian **"Your apps"**
4. Klik **"</>"** (icon web) untuk registrasi web app
5. Beri nama app: `tracker-web`
6. Klik **"Register app"**
7. Copy config yang muncul (hanya `databaseURL` yang wajib benar, lainnya boleh placeholder)

### 2.3 Build Website

```bash
# Install dependencies (jika belum)
npm install

# Build untuk production
npm run build
```

File hasil build akan ada di folder `dist/`.

---

## Langkah 3: Modifikasi baru 2.js

### 3.1 Buka File baru 2.js

1. Buka Tampermonkey Dashboard (klik icon Tampermonkey di browser → "Dashboard")
2. Cari script **"GeoGuessr A.M.A.S"** (baru 2.js)
3. Klik script tersebut untuk edit

### 3.2 Copy Firebase Bridge

1. Buka file `firebase-bridge.js` yang sudah disediakan
2. Copy seluruh isinya
3. Paste di **paling bawah** file `baru 2.js` (setelah semua kode yang ada)

### 3.3 Konfigurasi Firebase Bridge

Cari bagian `CONFIG` di `firebase-bridge.js` yang sudah di-paste, lalu ubah:

```javascript
const CONFIG = {
    // GANTI INI dengan URL database Firebase milikmu:
    FIREBASE_URL: 'https://geoguessr-tracker-default-rtdb.asia-southeast1.firebasedatabase.app',
    
    // GANTI INI dengan ID perangkat (bebas, tapi harus sama dengan website):
    DEVICE_ID: 'geoguessr-device',
    
    // Nama perangkat (tampilan):
    DEVICE_NAME: 'GeoGuessr Player',
    
    // Interval pengiriman (ms) - jangan terlalu sering:
    SEND_INTERVAL: 3000,
    
    ENABLED: true,
    DEBUG: false  // ganti ke true untuk melihat log di console
};
```

**PENTING:**
- `FIREBASE_URL` harus persis sama dengan database URL dari Firebase Console
- `DEVICE_ID` harus sama dengan yang di website (default: `geoguessr-device`)
- `SEND_INTERVAL` minimal 2000ms (2 detik) agar tidak terlalu banyak request

### 3.4 Simpan Script

1. Tekan **Ctrl+S** (atau klik "Save" di toolbar)
2. Script akan otomatis reload

### 3.5 Verifikasi Bridge Berjalan

1. Buka GeoGuessr (https://www.geoguessr.com/)
2. Buka Developer Console (tekan **F12** → tab **Console**)
3. Cari log dengan awalan `[FirebaseBridge]`
4. Jika muncul log seperti:
   ```
   [FirebaseBridge] Firebase Realtime Bridge STARTED
   [FirebaseBridge] Device ID: geoguessr-device
   [FirebaseBridge] Firebase URL: https://...
   ```
   → Bridge sudah berjalan dengan benar!

5. Mulai game, dan lihat log:
   ```
   [FirebaseBridge:DBG] Location sent to Firebase: -6.2088 106.8456
   ```

---

## Langkah 4: Deploy ke GitHub Pages

### 4.1 Buat Repository GitHub

1. Buka [GitHub](https://github.com/) dan login
2. Klik tombol **"+"** → **"New repository"**
3. Nama repository: `geoguessr-tracker` (bebas)
4. Pilih **"Public"** (GitHub Pages butuh public untuk free tier)
5. Klik **"Create repository"**

### 4.2 Upload File Build

**Opsi A: Via Git Command Line**

```bash
# Masuk ke folder dist
cd dist

# Inisialisasi git
git init
git add .
git commit -m "Initial deploy"

# Connect ke GitHub (ganti USERNAME dengan username GitHub-mu)
git remote add origin https://github.com/USERNAME/geoguessr-tracker.git
git branch -M main
git push -u origin main
```

**Opsi B: Via Upload Manual**

1. Di halaman repository GitHub, klik **"Add file"** → **"Upload files"**
2. Upload semua file dari folder `dist/`
3. Klik **"Commit changes"**

### 4.3 Aktifkan GitHub Pages

1. Di repository, klik tab **"Settings"**
2. Di sidebar kiri, klik **"Pages"** (di bawah "Code and automation")
3. Di bagian "Source", pilih **"Deploy from a branch"**
4. Pilih branch: **"main"**
5. Folder: **"/(root)"**
6. Klik **"Save"**
7. Tunggu 1-2 menit
8. Website akan live di: `https://USERNAME.github.io/geoguessr-tracker/`

### 4.4 Verifikasi Website

1. Buka URL website (contoh: `https://bintangtoba.github.io/geoguessr-tracker/`)
2. Seharusnya muncul tampilan peta gelap dengan panel sidebar di kanan
3. Jika Firebase belum dikonfigurasi, akan muncul pesan error kuning

---

## Cara Menggunakan

### Skenario Normal (Setelah Semua Setup)

1. **Buka website tracker** di tab/browser:
   ```
   https://USERNAME.github.io/geoguessr-tracker/
   ```

2. **Buka GeoGuessr** di tab lain (atau browser lain, atau bahkan device lain):
   ```
   https://www.geoguessr.com/
   ```

3. **Mulai game** di GeoGuessr

4. **Otomatis tersinkron:**
   - Koordinat lokasi game akan muncul di website tracker dalam waktu ~3 detik
   - Marker biru akan muncul di peta
   - Panel info menampilkan lat, lng, dan alamat

5. **Fitur yang tersedia di website:**
   - **Panel Lokasi**: Koordinat real-time, alamat, waktu update
   - **Panel Riwayat**: History lokasi yang pernah dikirim
   - **Panel Pengaturan**: Ganti Device ID, layer peta, toggle jejak/follow
   - **Tombol Google Maps**: Buka lokasi di Google Maps
   - **Tombol Street View**: Buka lokasi di Google Street View

### Mengganti Device ID

Jika ingin track lebih dari 1 device, atau ganti nama device:

**Di website (panel Pengaturan):**
1. Buka tab "Pengaturan"
2. Ganti "Device ID" (misal: `laptop-bintang`)
3. Klik di luar field untuk menyimpan

**Di script (baru 2.js):**
1. Edit script di Tampermonkey
2. Cari `CONFIG.DEVICE_ID`
3. Ubah ke ID yang sama dengan website
4. Save

> Device ID harus **persis sama** antara website dan script agar data terhubung.

### Layer Peta

Tersedia 4 layer peta:
- **OpenStreetMap** (default)
- **Carto Dark** (mode gelap)
- **ESRI Satellite** (citra satelit)
- **OpenTopoMap** (peta topografi)

---

## Troubleshooting

### Masalah: Website menunjukkan "Firebase belum dikonfigurasi"

**Penyebab:** Konfigurasi Firebase di website masih placeholder.

**Solusi:**
1. Edit `src/hooks/useFirebaseLocation.ts`
2. Ganti `__FIREBASE_DATABASE_URL__` dengan URL database Firebase yang sebenarnya
3. Rebuild: `npm run build`
4. Re-deploy ke GitHub Pages

### Masalah: Bridge tidak mengirim koordinat (tidak ada log FirebaseBridge)

**Penyebab 1:** Bridge belum di-paste ke baru 2.js
- **Solusi:** Ulangi Langkah 3

**Penyebab 2:** `FIREBASE_URL` masih default
- **Solusi:** Edit `CONFIG.FIREBASE_URL` di bridge, ganti `YOUR-PROJECT-ID` dengan ID project Firebase

**Penyebab 3:** Tampermonkey belum reload script
- **Solusi:** Klik icon Tampermonkey → cari script → klik icon refresh (🔄)

**Penyebab 4:** Console filter menyembunyikan log
- **Solusi:** Di DevTools Console, pastikan filter diatur ke "Default levels" atau "Verbose"

### Masalah: Koordinat tidak muncul di website

**Penyebab 1:** Device ID tidak cocok
- **Solusi:** Pastikan `DEVICE_ID` di bridge sama dengan di website

**Penyebab 2:** Firebase Rules belum diatur
- **Solusi:** Ulangi Langkah 1.4 (atur security rules)

**Penyebab 3:** Database URL salah
- **Solusi:** Periksa URL di Firebase Console → Realtime Database → Data

### Masalah: Website blank / putih

**Penyebab:** Build error atau path tidak benar
- **Solusi:** 
  1. Cek console browser (F12) untuk error
  2. Pastikan `npm run build` berhasil tanpa error
  3. Pastikan file `index.html` ada di root `dist/`

### Masalah: Peta tidak muncul (hanya background gelap)

**Penyebab:** Leaflet CSS tidak ter-load
- **Solusi:** Ini biasanya masalah network. Refresh halaman (Ctrl+F5)

---

## FAQ

### Q: Apakah ini gratis?
**A:** Ya. Firebase Realtime Database punya tier gratis (Spark plan) dengan limit:
- 100 GB data download/bulan
- 1 GB database storage
- Untuk penggunaan pribadi tracking GeoGuessr, ini sangat lebih dari cukup.

### Q: Apakah data saya aman?
**A:** Dengan security rules yang diberikan, database bersifat public (siapa pun yang punya URL bisa baca/tulis). Untuk penggunaan pribadi:
- Jangan share database URL ke publik
- Gunakan nama project yang tidak mudah ditebak
- Untuk keamanan lebih, tambahkan autentikasi (lihat dokumentasi Firebase)

### Q: Bisa track dari device berbeda?
**A:** Ya! Asalkan:
- Semua device menggunakan `baru 2.js` dengan bridge
- Masing-masing device punya `DEVICE_ID` yang berbeda
- Website bisa menampilkan semua device dengan mengganti Device ID di panel pengaturan

### Q: Berapa delay/latency?
**A:** Rata-rata 2-5 detik dari lokasi game berubah sampai muncul di website. Ini tergantung:
- Interval pengiriman (default: 3 detik)
- Koneksi internet
- Lokasi server Firebase

### Q: Bisa digunakan untuk game lain selain GeoGuessr?
**A:** Bisa, selama game tersebut bisa diekstrak koordinatnya. Bridge ini dirancang untuk bekerja dengan `baru 2.js` yang sudah punya mekanisme ekstraksi koordinat untuk berbagai platform (GeoGuessr, WorldGuessr, OpenGuessr, dll).

### Q: Bagaimana cara menghentikan tracking?
**A:** Beberapa cara:
1. **Matikan bridge sementara:** Di console browser, ketik `window.__firebaseBridge.stop()`
2. **Matikan userscript:** Klik icon Tampermonkey → toggle OFF script
3. **Disable di config:** Edit `CONFIG.ENABLED = false`

### Q: Koordinat yang muncul tidak akurat?
**A:** Website menampilkan koordinat persis seperti yang dikirim oleh `baru 2.js`. Jika koordinat tidak akurat, itu karena:
- GeoGuessr tidak selalu menunjukkan lokasi persis (ada variasi)
- Mode "Safe" di `baru 2.js` menambahkan offset acak

---

## Struktur File

```
geoguessr-tracker/
├── dist/                          # Hasil build (upload ke GitHub)
│   ├── index.html
│   └── assets/
│       ├── index-xxx.js
│       └── index-xxx.css
├── src/
│   ├── components/
│   │   ├── LiveMap.tsx           # Komponen peta Leaflet
│   │   ├── LocationPanel.tsx     # Panel info lokasi
│   │   ├── HistoryPanel.tsx      # Panel riwayat
│   │   └── SettingsPanel.tsx     # Panel pengaturan
│   ├── hooks/
│   │   └── useFirebaseLocation.ts # Hook Firebase RTDB
│   ├── types/
│   │   └── location.ts           # TypeScript types
│   ├── pages/
│   │   └── Home.tsx              # Halaman utama
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── release/
│   ├── firebase-bridge.js        # Script untuk ditambah ke baru 2.js
│   └── README.md                 # File ini
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## Teknologi yang Digunakan

| Komponen | Teknologi |
|----------|-----------|
| Frontend Framework | React 19 + TypeScript |
| Build Tool | Vite 7 |
| Styling | Tailwind CSS 3.4 |
| Map Library | Leaflet.js 1.9 |
| Realtime Database | Firebase Realtime Database |
| Transport | REST API (dari script) + WebSocket (di website) |
| Hosting | GitHub Pages |
| Userscript Engine | Tampermonkey / Violentmonkey |

---

## Changelog

### v1.0.0
- Rilis awal
- Integrasi Firebase Realtime Database
- Peta Leaflet dengan 4 layer
- Panel lokasi, riwayat, dan pengaturan
- Firebase Bridge untuk baru 2.js

---

## Credits

- **Original Script:** Bintang Toba Pro - GeoGuessr A.M.A.S v2.1.2
- **Firebase:** Google Firebase
- **Leaflet:** Open source mapping library
- **React & Vite:** Frontend toolchain

---

## Lisensi

MIT License - Bebas digunakan untuk keperluan pribadi.

---

**Selamat menggunakan! Jika ada masalah, cek bagian Troubleshooting di atas.**
