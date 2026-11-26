# ADR-0003: Penyimpanan Biner Lokal untuk Gambar Catatan (IndexedDB + `asset://<uuid>`)

- **Status:** Accepted
- **Tanggal:** 2026-11-27

## Konteks

EduPlanner adalah aplikasi ruang kerja guru *offline-first* (PWA) berbasis Dexie/IndexedDB tanpa server backend. Sebelumnya, gambar di dalam catatan (`materi`, `guru`, `evaluasi`) bergantung pada URL eksternal internet (`https://...`) yang memerlukan koneksi aktif dan melewati gerbang konfirmasi klik-untuk-muat, atau berisiko membengkakkan teks Markdown bila disematkan langsung sebagai Base64 inline.

## Keputusan

Kita memisahkan data biner gambar dari teks Markdown menggunakan arsitektur **Binary-Separated Local Asset**:

1. **Penyimpanan Biner di IndexedDB**: Setiap **Local Image Asset** disimpan sebagai `Blob` asli (PNG, JPEG, atau WebP; maks `1600px`, batas `2 MB` pasca-optimasi, tervalidasi *magic bytes* di sisi klien) pada tabel Dexie tersendiri (`mediaAssets`).
2. **Referensi Inline Ringan**: Teks Markdown pada `Note.content` hanya menyimpan **Asset Reference** berformat `asset://<uuid>` yang disisipkan langsung di posisi kursor, sehingga tetap kompatibel penuh dengan sintaks layout `MarkdownImage` (`kiri`/`kanan`/`40%`/caption), pemecahan slide presentasi (`## `), dan parser kuis.
3. **Render Lokal Aman**: `MarkdownRenderer` mengizinkan skema `asset:` melalui `urlTransform`, dan `MarkdownImage` menyelesaikan `asset://<uuid>` ke `ObjectURL` (`blob:`) yang sudah diizinkan oleh CSP produksi (`img-src 'self' data: blob: https:`). URL eksternal `https://` tetap didukung sebagai opsi sekunder dengan gerbang keamanan yang ada.
4. **Pembersihan Aset Yatim Otomatis**: Saat `updateNote` / `deleteNote`, aset yang tidak lagi direferensikan catatan mana pun dihapus dari IndexedDB; aset *draft* yatim yang tidak pernah tersimpan dibersihkan otomatis setelah melewati masa tenggang (24 jam).
5. **Backup & Restore JSON v3**: Aset biner disertakan dalam berkas backup tunggal JSON (`BACKUP_VERSION = 3`) terenkode Base64 pada tabel `mediaAssets` dengan kenaikan batas ukuran berkas backup (mis. 100 MB) dan dukungan migrasi mundur dari v1/v2.

## Opsi yang Dipertimbangkan

- **Array galeri terpisah (`images: ImageRef[]`) pada entitas `Note`**: Ditolak karena `Note.content` dipecah per heading `##` menjadi slide presentasi dan soal kuis; galeri terpisah kehilangan penempatan presisi per paragraf/slide/soal dan memutus sintaks layout float yang sudah ada.
- **Konversi paksa WebP → PNG/JPEG**: Ditolak karena EduPlanner tidak memiliki ekspor `.docx`/PDF server; mempertahankan WebP menghemat 30–50% ruang IndexedDB dan ukuran berkas backup.
- **Format Backup arsip `.zip`**: Ditolak untuk tahap ini agar tidak menambah dependensi eksternal baru maupun membebani *bundle budget* PWA (750 KiB Initial JS) serta menjaga satu jalur validasi/migrasi backup `.json`.

## Konsekuensi

- Teks Markdown tetap ringan dan cepat di-parse karena bebas data Base64.
- Berkas backup JSON v3 memiliki overhead ~33% untuk data gambar dibanding biner mentah; apabila di masa depan skala penggunaan gambar jauh melampaui batas JSON, format arsip `.zip` dapat dievaluasi sebagai versi backup berikutnya.
- Pembuatan dan pencabutan `ObjectURL` harus dikelola ketat di siklus hidup komponen/cache agar tidak terjadi kebocoran memori saat membuka banyak slide atau catatan.
