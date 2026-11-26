# EduPlanner

Ruang kerja guru *offline-first* untuk mengelola kelas, siswa, jadwal, absensi, nilai, materi ajar, jurnal guru, dan evaluasi.

## Language

### Tampilan Baca & Presentasi

**Content Viewport**:
Area isi dokumen yang menampilkan materi ajar, slide presentasi, catatan jurnal guru, evaluasi, atau soal kuis dan dapat diperbesar atau diperkecil secara independen.
_Avoid_: Halaman penuh, kanvas web, tampilan utama

**UI Chrome**:
Elemen antarmuka di sekitar konten—seperti bilah judul, HUD presentasi, tombol navigasi, header/footer dialog, dan sidebar—yang ukurannya selalu tetap dan tidak ikut berubah saat pengguna memperbesar konten.
_Avoid_: Tombol web, layout luar, frame

**Content Zoom**:
Tingkat perbesaran yang hanya berlaku pada Content Viewport dalam cakupan tampilan tertentu (Presentasi, Baca, atau Kuis) tanpa memengaruhi UI Chrome maupun halaman aplikasi lainnya.
_Avoid_: Browser zoom, zoom halaman, zoom global

### Aset Gambar Offline

**Local Image Asset**:
Berkas gambar biner yang telah dioptimalkan dan disimpan secara lokal di IndexedDB terpisah dari teks Markdown catatan.
_Avoid_: Upload, attachment, lampiran server

**Asset Reference**:
Tautan ringan berformat `asset://<uuid>` di dalam teks Markdown yang merujuk ke satu Local Image Asset tanpa menyematkan data biner di dalam teks.
_Avoid_: Inline base64, link gambar lokal, URL upload
