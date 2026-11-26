# ADR-0001: Bundling Lokal & Lazy-Loading Mermaid.js untuk Render Diagram 100% Offline

- **Status:** Accepted
- **Tanggal:** 2026-11-26
- **Issue terkait:** ENI-96

## Konteks

EduPlanner adalah aplikasi ruang kerja guru *offline-first* (PWA) dengan kebijakan Content Security Policy (CSP) produksi yang ketat (`script-src 'self'`, `connect-src 'self'`, `object-src 'none'`, `frame-src 'none'`).

Guru perlu menulis blok kode `mermaid` di seluruh enam tampilan Markdown EduPlanner (Materi baca, Materi edit/live preview, Presentasi, pertanyaan Quiz, Jurnal Guru, dan Evaluasi) untuk menyajikan diagram alur, peta konsep, siklus, dan struktur visual secara 100% offline.

Selain itu, EduPlanner menerapkan anggaran performa (*bundle budget*) ketat pada `scripts/check-bundle-budget.mjs`:
- Initial JS maksimum **750 KiB** (uncompressed) agar waktu muat awal tetap cepat;
- Seluruh aset produksi di-precache oleh Workbox (`vite-plugin-pwa`) agar aplikasi tetap dapat bekerja penuh tanpa koneksi internet.

## Opsi yang Dipertimbangkan

### Opsi 1: Layanan render eksternal (mermaid.ink / Kroki / CDN)
- **Kelebihan:** Nol dampak pada ukuran bundle dan precache lokal.
- **Kekurangan:**
  - Gagal total saat perangkat guru offline (melanggar prinsip inti *offline-first*).
  - Melanggar CSP produksi (`connect-src 'self'`, `script-src 'self'`) dan kebijakan privasi lokal karena mengirimkan isi materi guru ke server pihak ketiga.
- **Keputusan:** Ditolak.

### Opsi 2: Bundling statis `mermaid` pada initial bundle
- **Kelebihan:** 100% offline, tidak perlu dinamika *async loading*.
- **Kekurangan:**
  - Menggelembungkan Initial JS jauh melampaui batas 750 KiB sehingga memperlambat *startup* semua pengguna, termasuk yang tidak membuka dokumen berisi diagram.
- **Keputusan:** Ditolak.

### Opsi 3: Bundling lokal `mermaid` + on-demand lazy-loading + Workbox precache + `securityLevel: 'strict'`
- **Kelebihan:**
  - **100% offline:** Seluruh chunk `mermaid` dan parser/layout internalnya dibundel lokal oleh Vite dan di-precache oleh Workbox service worker.
  - **Initial JS terjaga:** `mermaid` hanya diimpor secara dinamis (`import('mermaid')`) melalui `src/lib/mermaidRenderer.ts` saat dokumen benar-benar merender blok ```` ```mermaid ````. Dokumen tanpa diagram tidak pernah memuat library Mermaid.
  - **Patuh CSP & aman:** Dikonfigurasi dengan `securityLevel: 'strict'` (sanitasi SVG melalui DOMPurify bawaan Mermaid, tanpa eksekusi script inline), `startOnLoad: false`, dan `suppressErrorRendering: true`.
  - **Konsisten dengan desain EduPlanner:** Menggunakan tema `base` dengan `themeVariables` Light/Dark EduPlanner dan font lokal `Inter`, disinkronkan dengan `ThemeProvider` maupun override tema independen di `PresentationView`.
- **Kekurangan:**
  - Ukuran total precache PWA dan batas *largest lazy chunk* meningkat karena mesin tata letak internal Mermaid (termasuk ELK/Cytoscape) ikut di-precache agar semua jenis diagram berjalan 100% offline.
- **Keputusan:** **Diterima.**

## Konsekuensi & Penyesuaian Bundle Budget

Pengukuran build produksi (`npm run build`) sebelum dan sesudah integrasi `mermaid` v12.3.0:

| Metrik | Sebelum | Sesudah | Batas Baru (`check-bundle-budget.mjs`) |
| --- | --- | --- | --- |
| **Initial JS** | 680.5 KiB | 682.5 KiB (+2.0 KiB) | **750 KiB** (tetap) |
| **Largest lazy chunk** | 334.2 KiB | 1466.5 KiB (`elk-*.js`) | **1600 KiB** (sebelumnya 500 KiB) |
| **Offline precache total** | 2.93 MiB | 7.60 MiB (+4.67 MiB) | **8.50 MiB** (sebelumnya 3.20 MiB) |

Langkah pengamanan tambahan yang diterapkan:
1. `scripts/check-bundle-budget.mjs` menambahkan guard eksplisit bahwa chunk `mermaid` / `@mermaid-js` harus teremit terpisah dan **tidak boleh bocor** ke `initialFiles` (serupa dengan guard chunk Excel).
2. `scripts/check-offline-build.mjs` tetap memverifikasi bahwa seluruh aset yang dihasilkan (termasuk semua chunk lazy Mermaid) masuk dalam daftar precache `dist/sw.js`.
3. `workbox.maximumFileSizeToCacheInBytes` pada `vite.config.ts` tetap di 6 MiB, cukup untuk menampung chunk lazy terbesar (`elk-*.js` ~1.43 MiB) tanpa memotong dukungan offline.
