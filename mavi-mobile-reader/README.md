# MAVI Mobile Reader (PWA)

App mobile terpisah (read-only) untuk operator:
- Scan QR/barcode SOP dari mavi-y
- Lihat list SOP yang statusnya **PUBLISHED**
- Buka SOP step-by-step (tanpa fitur edit/admin)

## 1) Setup

```bash
cd c:\Users\ACER\mavi-y\mavi-mobile-reader
copy .env.example .env
```

Isi `.env`:

```env
VITE_SUPABASE_URL=https://kukirrwpdmqvaojhfdng.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1a2lycndwZG1xdmFvamhmZG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMDc0OTIsImV4cCI6MjA4NzY4MzQ5Mn0.sLqsL8Hf_DO7V4UVgih9Xxfp7IDD975e45RGD9bMd6A
```

## 2) Jalankan (dev)

```bash
npm install
npm run dev -- --host
```

Default port: `1430`.

## 3) Akses dari HP

- Pastikan HP dan laptop 1 Wi-Fi
- Buka `http://<IP-LAPTOP>:1430`
- Di browser HP pilih **Add to Home Screen** untuk mode PWA

## 4) Build production

```bash
npm run build
npm run preview -- --host
```

## Catatan data

- Query hanya mengambil SOP dengan status `PUBLISHED`
- Sumber data tabel `manuals` (Supabase yang sama dengan mavi-y)
- App ini tidak menyediakan create/edit/delete SOP
