# ADR-0002: Scoped Content Viewport Zoom dengan Reflow CSS `zoom` dan Intersepsi Gesture

- **Status:** Accepted
- **Tanggal:** 2026-11-26
- **Issue terkait:** ENI-98

## Konteks

Saat guru membuka mode presentasi (`PresentationView`), tampilan baca penuh materi (`MaterialReadView`), dialog baca catatan jurnal guru (`JournalsSection`), dialog baca evaluasi (`EvaluationsSection`), atau mode kuis layar penuh (`QuizView`), pengguna sering memperbesar atau memperkecil tampilan agar teks lebih nyaman dibaca di proyektor maupun layar laptop.

Sebelumnya, tidak ada mekanisme zoom khusus konten sehingga pengguna mengandalkan *native browser zoom* (`Ctrl`+`+`/`-`, `Ctrl`+scroll, atau *trackpad pinch*). Karena browser zoom berlaku per-origin, seluruh antarmuka web (**UI Chrome** seperti tombol, HUD, header, footer, sidebar, hingga halaman manajemen lain) ikut membesar atau mengecil.

## Opsi yang Dipertimbangkan

### Opsi 1: Mengubah `font-size` pada elemen root (`<html>`)
- **Kelebihan:** Mengubah skala semua utilitas Tailwind berbasis `rem` sekaligus.
- **Kekurangan:** Bersifat global; ikut memperbesar seluruh UI Chrome, modal, tooltip, dan halaman lain.
- **Keputusan:** Ditolak.

### Opsi 2: `transform: scale(...)` pada wadah konten
- **Kelebihan:** Terisolasi dari UI Chrome.
- **Kekurangan:** Tidak melakukan *reflow* teks—konten meluber secara horizontal saat zoom >100% sehingga pengguna harus menggeser kiri-kanan untuk membaca kalimat, tidak cocok untuk presentasi maupun dokumen baca.
- **Keputusan:** Ditolak.

### Opsi 3: Scoped CSS `zoom` (`--content-zoom`) pada Content Viewport + intersepsi `Ctrl/Cmd` zoom + persistensi per cakupan
- **Kelebihan:**
  - **Terisolasi dari UI Chrome:** Properti CSS `zoom` hanya diterapkan pada elemen `.content-zoom-viewport`; header, footer, HUD, tombol navigasi, edge gutter presentasi, dan halaman lain tetap 100% stabil.
  - **Reflow alami:** CSS `zoom` memengaruhi geometri tata letak sehingga teks, daftar, rumus KaTeX, blok kode, dan diagram membesar proporsional sambil tetap membungkus rapi sesuai lebar layar tanpa scroll horizontal untuk kalimat.
  - **Kompatibel dengan utilitas `rem` Tailwind:** Semua kelas Tailwind (`text-4xl`, `prose-xl`, dll.) ikut terskala proporsional tanpa menyentuh `<html>`.
  - **Intersepsi kebiasaan pengguna:** `useContentZoom` mencegat `Ctrl`/`Cmd` + `+`/`-`/`0`, `Ctrl`/`Cmd` + wheel, dan *trackpad pinch* saat tampilan aktif (dengan pengecualian saat `MermaidLightbox` terbuka atau fokus di input), ditambah kontrol tombol `ContentZoomControls` (`-`, `100%`, `+`) di UI Chrome.
  - **Terpisah per cakupan:** Level zoom disimpan terpisah di `useUiStore` (`presentation`, `reader`, `quiz`) dengan rentang 60%–200% (langkah 10%).
- **Kekurangan:**
  - Menu zoom bawaan toolbar browser (`⋮ → Zoom`) secara keamanan browser tidak dapat dicegat oleh aplikasi web.
  - Dialog `<dialog class="mermaid-lightbox">` yang dirender sebagai turunan DOM di dalam `.content-zoom-viewport` akan mewarisi `zoom`; ditangani dengan menetralkan `zoom: calc(1 / var(--content-zoom, 1))` pada `dialog.mermaid-lightbox`.
- **Keputusan:** **Diterima.**

## Konsekuensi

1. Semua tampilan baca/presentasi baru yang ingin mendukung Content Zoom wajib menempatkan kontrol di **UI Chrome** dan menerapkan kelas `.content-zoom-viewport` hanya pada area kontennya.
2. `MermaidLightbox` dan modal lain yang dirender di dalam `.content-zoom-viewport` harus menjaga skala 100% melalui netralisasi `--content-zoom` dan membiarkan `useContentZoom` menonaktifkan intersepsi saat lightbox terbuka.
