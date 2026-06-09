# Panduan Cepat: GeoGuessr Real-Time Tracker

> Dari 0 sampai berhasil dalam 10 menit!

---

## Ringkasan 3 Langkah

```
[1] Setup Firebase ──▶ [2] Tambah Bridge ke baru 2.js ──▶ [3] Deploy Website
```

---

## Langkah 1: Setup Firebase (3 menit)

1. Buka https://console.firebase.google.com/ → Klik **"Add project"**
2. Nama: `geoguessr-tracker` → **Create project**
3. Sidebar kiri: **Build** → **Realtime Database** → **Create Database**
4. Pilih lokasi: **asia-southeast1** → **Next**
5. Security rules: **Start in test mode** → **Enable**
6. **Catat URL database**, contoh:
   ```
   https://geoguessr-tracker-default-rtdb.asia-southeast1.firebasedatabase.app
   ```
7. Tab **"Rules"**, paste ini → **Publish**:
   ```json
   {
     "rules": {
       "locations": {
         "$deviceId": {
           ".read": true,
           ".write": true
         }
       }
     }
   }
   ```

✅ **Firebase siap!**

---

## Langkah 2: Modifikasi baru 2.js (4 menit)

1. Buka Tampermonkey Dashboard → Edit script **GeoGuessr A.M.A.S**
2. Scroll ke **paling bawah** file
3. Copy isi file `firebase-bridge.js`
4. Paste di paling bawah `baru 2.js`
5. **Edit konfigurasi** di bagian `CONFIG`:
   ```javascript
   FIREBASE_URL: 'https://GANTI-DENGAN-URL-FIREBASE-MILIKMU.firebaseio.com',
   DEVICE_ID: 'geoguessr-device',  // bebas, tapi ingat ini
   ```
6. **Save** (Ctrl+S)

✅ **Script siap mengirim koordinat!**

---

## Langkah 3: Deploy Website ke GitHub Pages (3 menit)

### A. Upload ke GitHub

1. Buka https://github.com/new → Nama: `geoguessr-tracker` → **Create repository**
2. Upload semua file dari folder `release/` (kecuali README.md dan PANDUAN_CEPAT.md jika tidak diperlukan):
   - `index.html`
   - Folder `assets/`
3. **Commit changes**

### B. Aktifkan GitHub Pages

1. Di repository, klik **Settings** → **Pages** (sidebar kiri)
2. Source: **Deploy from a branch** → Branch: **main** → Folder: **/(root)**
3. Klik **Save**
4. Tunggu 1-2 menit
5. Website live di: `https://USERNAME.github.io/geoguessr-tracker/`

### C. Konfigurasi Firebase di Website

**PENTING:** Website perlu tahu URL Firebase milikmu.

1. Download atau clone repository ini
2. Edit file `src/hooks/useFirebaseLocation.ts`
3. Ganti bagian `firebaseConfig`:
   ```typescript
   const firebaseConfig = {
     apiKey: "bebas",
     authDomain: "bebas",
     databaseURL: "https://URL-FIREBASE-MILIKMU.firebaseio.com",  // ← INI WAJIB BENAR
     projectId: "bebas",
     storageBucket: "bebas",
     messagingSenderId: "bebas",
     appId: "bebas",
   };
   ```
   Hanya `databaseURL` yang wajib benar, lainnya boleh placeholder.
4. Rebuild: `npm run build`
5. Upload ulang folder `dist/` ke GitHub

✅ **Website siap menerima koordinat!**

---

## Test & Verifikasi

1. **Buka website tracker** di browser
2. **Buka GeoGuessr** di tab lain
3. **Mulai game**
4. Lihat website → seharusnya marker muncul dalam 3-5 detik!

---

## Perintah Debug

| Perintah | Fungsi |
|----------|--------|
| `window.__firebaseBridge.getStatus()` | Cek status bridge |
| `window.__firebaseBridge.start()` | Mulai bridge |
| `window.__firebaseBridge.stop()` | Hentikan bridge |
| `window.__firebaseBridge.sendNow()` | Kirim koordinat sekarang |

---

## Yang Perlu Diingat

1. **Device ID harus sama** antara website dan script
2. **Firebase URL harus benar** di kedua tempat (bridge + website)
3. **Jangan share URL database** ke orang lain (keamanan)
4. **Interval minimal 2 detik** agar tidak boros kuota Firebase

---

## Struktur Data di Firebase

```json
{
  "locations": {
    "geoguessr-device": {
      "current": {
        "lat": -6.2088,
        "lng": 106.8456,
        "timestamp": 1704067200000,
        "platform": "geoguessr",
        "address": "Jakarta, Indonesia"
      },
      "history": {
        "-randomkey1": { "lat": -6.2, "lng": 106.8, "timestamp": ... },
        "-randomkey2": { "lat": -6.1, "lng": 106.7, "timestamp": ... }
      }
    }
  }
}
```

---

**Selamat! GeoGuessr Real-Time Tracker sudah berjalan! 🎉**
