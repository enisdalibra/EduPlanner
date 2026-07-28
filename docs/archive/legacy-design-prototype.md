# Archived Legacy Design Prototype

> **HISTORICAL ONLY:** Dokumen ini mempertahankan prototype Vanilla
> JavaScript/CDN awal. Dokumen ini bukan panduan implementasi saat ini. Gunakan
> [`design.md`](../../design.md) di root repository untuk arsitektur dan aturan
> desain React yang otoritatif.

# Design — Panduan Desain untuk AI Coding Tools

> **INSTRUKSI UNTUK AI:** File ini adalah panduan desain wajib. Setiap kali membangun atau memodifikasi halaman web dalam project ini, **ikuti semua aturan di bawah tanpa pengecualian**. Jangan gunakan warna, radius, atau style yang tidak tercantum di sini.

---

## 1. Tech Stack

> **IMPLEMENTASI AKTUAL (OTORITATIF):** Project ini menggunakan React 19 + TypeScript, Vite 6, Tailwind CSS 4 melalui `@tailwindcss/vite`, shadcn/Base UI, Inter dari `@fontsource/inter`, dan Material Symbols Rounded dari package `material-symbols`. Dark mode dikelola oleh `src/hooks/useTheme.tsx`. Gunakan `src/index.css`, `vite.config.ts`, dan komponen di `src/components/ui/` sebagai sumber kebenaran.
>
> Jangan membuat halaman HTML standalone, memakai Tailwind Play CDN, memuat Google Fonts remote, atau membuat `style.css` terpisah. Cuplikan Vanilla JS/CDN di bawah berasal dari prototype awal dan hanya dipertahankan sebagai referensi historis; cuplikan tersebut **bukan** instruksi implementasi untuk repository saat ini.

```
HTML5 + CSS3 + Vanilla JavaScript (tanpa framework JS)
Tailwind CSS via Play CDN: <script src="https://cdn.tailwindcss.com"></script>
Google Fonts Inter: <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
Icon: Material Symbols Rounded — self-hosted font icon (berjalan offline)
Dark mode: class-based (darkMode: "class")
```

---

### 1.1 Legacy HTML Boilerplate (Jangan Digunakan)

> Untuk halaman baru, buat komponen `.tsx`, daftarkan route secara lazy di `src/App.tsx`, gunakan `.page-title`, `.page-description`, `.panel`, dan primitive yang sudah tersedia di `src/components/ui/`.

```html
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nama App</title>

  <!-- Dark mode flash prevention -->
  <script>
    if (localStorage.getItem("darkMode") === "true") {
      document.documentElement.classList.add("dark");
    }
  </script>

  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: "class",
      theme: {
        extend: {
          fontFamily: { sans: ['Inter', 'sans-serif'] },
          colors: {
            primary: "#6246ea", secondary: "#d1d1e9",
            danger: "#e45858", success: "#58e49e",
            warning: "#f59e0b", background: "#fffffe", text: "#2b2c34",
          },
          boxShadow: {
            'primary-glow': '0 10px 25px -3px rgba(98,70,234,0.3)',
            'danger-glow':  '0 10px 25px -3px rgba(228,88,88,0.3)',
            'success-glow': '0 10px 25px -3px rgba(88,228,158,0.4)',
          },
        },
      },
    };
  </script>

  <!-- Google Fonts -->
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

  <!-- App CSS (berisi @font-face icon, scrollbar, keyframes) -->
  <link rel="stylesheet" href="style.css">
</head>
<body class="bg-[#f8f9fa] dark:bg-gray-900 text-text dark:text-white font-sans antialiased">
  <!-- Konten halaman -->
</body>
</html>
```

---

## 2. Legacy Tailwind Config (Jangan Disalin)

> Project menggunakan Tailwind CSS 4 tanpa `tailwind.config.js`. Plugin aktif di `vite.config.ts`; `@theme`, CSS variables, dark variant, font, scrollbar, dan animation berada di `src/index.css`. Token baru harus ditambahkan secara terpusat di sana, bukan melalui inline `<script>`.

```html
<script>
  tailwind.config = {
    darkMode: "class",
    theme: {
      extend: {
        fontFamily: { sans: ['Inter', 'sans-serif'] },
        colors: {
          primary:    "#6246ea",
          secondary:  "#d1d1e9",
          danger:     "#e45858",
          success:    "#58e49e",
          warning:    "#f59e0b",
          background: "#fffffe",
          text:       "#2b2c34",
        },
        boxShadow: {
          'primary-glow': '0 10px 25px -3px rgba(98,70,234,0.3)',
          'danger-glow':  '0 10px 25px -3px rgba(228,88,88,0.3)',
          'success-glow': '0 10px 25px -3px rgba(88,228,158,0.4)',
        },
      },
    },
  };
</script>
```

---

## 3. Dark Mode

> Implementasi aktual menggunakan `ThemeProvider` dan `useTheme` dari `src/hooks/useTheme.tsx`. Provider dipasang di `src/App.tsx` dengan storage key `ais-theme`. Gunakan `setTheme("light" | "dark" | "system")`; jangan membaca atau menulis key `darkMode` secara langsung. Cuplikan script berikut adalah referensi prototype lama.

Letakkan script ini di `<head>` SEBELUM Tailwind untuk mencegah flash:

```html
<script>
  if (localStorage.getItem("darkMode") === "true") {
    document.documentElement.classList.add("dark");
  }
</script>
```

Toggle: `document.documentElement.classList.toggle("dark")`
Simpan: `localStorage.setItem("darkMode", isDark)`

---

## 4. Palet Warna

### Token Warna Utama

| Token        | Hex       | Fungsi                                    |
|--------------|-----------|-------------------------------------------|
| `primary`    | `#6246ea` | CTA, aksen, link, focus, active, logo     |
| `danger`     | `#e45858` | Hapus, error, destruktif, nilai negatif   |
| `success`    | `#58e49e` | Konfirmasi, download, nilai positif       |
| `secondary`  | `#d1d1e9` | Border sidebar, disabled, divider halus   |
| `background` | `#fffffe` | Background halaman (light)                |
| `text`       | `#2b2c34` | Teks utama (light)                        |

### Hover States (Hardcoded yang Diizinkan)

| Base      | Hover Hex  | Tailwind Class         |
|-----------|------------|------------------------|
| primary   | `#5035cc`  | `hover:bg-[#5035cc]`   |
| danger    | `#cc4040`  | `hover:bg-[#cc4040]`   |
| success   | `#3abb7e`  | `hover:bg-[#3abb7e]`   |

### Kontras Teks

| Warna     | Teks di atasnya  | Alasan                    |
|-----------|------------------|---------------------------|
| primary   | `text-white`     | Warna gelap, aman putih   |
| danger    | `text-white`     | Warna gelap, aman putih   |
| success   | `text-gray-800`  | ⚠️ Warna TERANG, pakai gelap |
| warning   | `text-gray-800`  | ⚠️ Warna TERANG, pakai gelap |

### Surface / Background

| Elemen       | Light              | Dark                    |
|--------------|--------------------|-------------------------|
| Page bg      | `bg-[#f8f9fa]`     | `dark:bg-gray-900`      |
| Card / Panel | `bg-white`         | `dark:bg-gray-800`      |
| Input bg     | `bg-gray-50`       | `dark:bg-gray-700`      |
| Header       | `bg-white`         | `dark:bg-gray-800`      |
| Tint surface | `#EBEBFA`          | `dark:bg-gray-700`      |

### Dark Mode Pairs (Referensi Cepat)

| Elemen            | Light                    | Dark                       |
|-------------------|--------------------------|----------------------------|
| Border            | `border-gray-100`        | `dark:border-gray-700`     |
| Border (kuat)     | `border-gray-200`        | `dark:border-gray-600`     |
| Teks utama        | `text-text`              | `dark:text-white`          |
| Teks sekunder     | `text-gray-500`          | `dark:text-gray-400`       |
| Teks label        | `text-text`              | `dark:text-gray-300`       |
| Hover bg (ringan) | `hover:bg-gray-100`      | `dark:hover:bg-gray-700`   |
| Hover bg (kuat)   | `hover:bg-gray-200`      | `dark:hover:bg-gray-600`   |

### Semantic Colors (untuk data/angka)

| Konteks         | Light     | Dark       |
|-----------------|-----------|------------|
| Nilai positif   | `#058a4e` | `#58e49e`  |
| Nilai negatif   | `#e45858` | `#f87171`  |
| Warning/netral  | `#d97706` | `#f59e0b`  |

---

## 5. Tipografi

Font: **Inter** — `font-sans`, `antialiased`

| Elemen                | Class Tailwind                                  |
|-----------------------|-------------------------------------------------|
| Judul halaman (h1)    | `text-xl font-bold tracking-tight`              |
| Judul seksi (h2)      | `text-lg font-semibold`                         |
| Label form            | `text-sm font-medium text-text dark:text-gray-300` |
| Body / paragraf       | `text-base leading-relaxed`                     |
| Teks sekunder         | `text-sm text-gray-500 dark:text-gray-400`      |
| Badge / label kecil   | `text-xs font-medium`                           |
| Tombol                | `font-medium`                                   |
| KPI / angka besar     | `text-2xl font-bold` / `text-3xl font-bold`     |
| Kode / kbd            | `text-sm font-semibold font-mono`               |

Letter spacing: Heading → `tracking-tight` | Tombol/badge → `tracking-wide` | Body → default

---

## 6. Border Radius — HIERARKI WAJIB

> **ATURAN KRITIS:** Tombol SELALU `rounded-full`. Tidak ada pengecualian.

| Level | Class          | px   | Digunakan pada                              |
|-------|----------------|------|---------------------------------------------|
| 1     | `rounded-full` | pill | **Semua tombol**, badge, pill, toggle        |
| 2     | `rounded-3xl`  | 24px | Card utama, modal, empty state              |
| 3     | `rounded-2xl`  | 16px | Panel sekunder, grup radio/checkbox, toast   |
| 4     | `rounded-xl`   | 12px | Input, select, kbd, icon button container    |
| 5     | `rounded-lg`   | 8px  | Gambar/video container, thumbnail            |
| 6     | `rounded-md`   | 6px  | Scrollbar thumb                              |

---

## 7. Z-index Layer Map

> **WAJIB:** Gunakan z-index ini agar elemen tidak saling tumpang tindih.

| Layer | Z-index | Digunakan untuk |
|-------|---------|-----------------|
| Base content | `z-0` | Konten halaman biasa |
| Sticky elements | `z-10` | Tabel sticky header |
| Sidebar | `z-30` | Sidebar navigation |
| Header | `z-40` | App header |
| Dropdown / Popover | `z-50` | Menu dropdown, popover |
| Modal | `z-[60]` | Modal overlay + content |
| Toast | `z-[70]` | Toast notifikasi |
| Tooltip | `z-[80]` | Tooltip (selalu di atas) |

---

## 8. Shadow System

| Elemen               | Default      | Hover                        |
|----------------------|--------------|------------------------------|
| Card                 | `shadow-sm`  | `shadow-lg`                  |
| Modal                | `shadow-2xl` | —                            |
| Toast                | `shadow-xl`  | —                            |
| Tombol primary       | —            | `shadow-lg shadow-primary/30`|
| Tombol danger        | —            | `shadow-lg shadow-danger/30` |
| Tombol success       | —            | `shadow-lg shadow-success/40`|
| Hero / gradient card | `shadow-lg shadow-primary/20` | —           |
| Logo icon            | `shadow-lg shadow-primary/30` | —           |

---

## 9. Komponen

### 9.1 Tombol (Button)

**Semua tombol:** `rounded-full`, `transition-all duration-200`, `active:scale-95` atau `active:scale-[0.98]`, `flex items-center gap-2`

#### Ukuran Tombol

| Size | Padding | Digunakan untuk |
|------|---------|----------------|
| **Large** | `py-3 px-6` | CTA utama, modal action |
| **Medium** (default) | `py-2.5 px-5` | Toolbar, form action |
| **Small** | `py-2 px-4 text-sm` | Tabel action, compact area |
| **Icon only** | `p-2.5` | Toggle, aksi ikon |

```html
<!-- PRIMARY -->
<button class="py-3 px-6 bg-primary text-white font-medium rounded-full
  hover:bg-[#5035cc] hover:shadow-lg hover:shadow-primary/30
  transition-all duration-200 flex items-center gap-2 active:scale-95">
  <span class="material-symbols-rounded text-[20px]">add</span>
  Label
</button>

<!-- DANGER -->
<button class="py-3 px-6 bg-danger text-white font-medium rounded-full
  hover:bg-[#cc4040] hover:shadow-lg hover:shadow-danger/30
  transition-all duration-200 flex items-center gap-2 active:scale-[0.98]">
  <span class="material-symbols-rounded text-[20px]">delete</span>
  Hapus
</button>

<!-- SUCCESS -->
<button class="py-3 px-6 bg-success text-gray-800 font-medium rounded-full
  hover:bg-[#3abb7e] hover:shadow-lg hover:shadow-success/40
  transition-all duration-200 flex items-center gap-2
  disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]">
  <span class="material-symbols-rounded text-[20px]">download</span>
  Unduh
</button>

<!-- GHOST / NETRAL -->
<button class="py-3 px-6 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white
  font-medium rounded-full hover:bg-gray-200 dark:hover:bg-gray-600
  transition-colors active:scale-[0.98]">
  Batal
</button>

<!-- ICON ONLY -->
<button class="p-2.5 rounded-full bg-gray-100 dark:bg-gray-700
  hover:bg-gray-200 dark:hover:bg-gray-600 transition-all shadow-sm">
  <span class="material-symbols-rounded text-[20px] text-gray-600 dark:text-gray-300">more_vert</span>
</button>
```

### 9.2 Card

```html
<div class="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700
  rounded-3xl p-6 shadow-sm transition-shadow duration-200 hover:shadow-lg">
  <!-- konten -->
</div>
```

Active/selected state (CSS):
```css
.card-active {
  border-color: #6246ea;
  box-shadow: 0 0 0 2px rgba(98,70,234,0.3);
  transition: border-color 0.2s, box-shadow 0.2s;
}
```

Hero/gradient card:
```html
<div class="bg-gradient-to-br from-primary to-[#5035cc] text-white
  rounded-3xl p-6 shadow-lg shadow-primary/20">
</div>
```

### 9.3 Form Elements

```html
<!-- INPUT / SELECT -->
<input class="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600
  rounded-xl bg-gray-50 dark:bg-gray-700 text-text dark:text-white text-sm
  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
  transition-all placeholder:text-gray-400" />

<!-- LABEL -->
<label class="block text-sm font-medium text-text dark:text-gray-300 mb-2">
  Nama Field
</label>

<!-- GRUP RADIO/CHECKBOX -->
<div class="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl
  border border-gray-100 dark:border-gray-700 mb-5">
</div>
```

Range slider thumb CSS:
```css
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none;
  width: 18px; height: 18px; border-radius: 50%;
  background: #6246ea; cursor: pointer;
}
input[type="range"]::-webkit-slider-thumb:hover { background: #4d37b8; }
```

### 9.4 Header

```html
<header class="sticky top-0 z-40 bg-white dark:bg-gray-800
  shadow-sm border-b border-gray-100 dark:border-gray-700">
  <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between relative">
    <div class="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
      <div class="w-10 h-10 bg-primary rounded-xl flex items-center justify-center
        shadow-lg shadow-primary/30">
        <span class="material-symbols-rounded text-[24px] text-white">school</span>
      </div>
      <h1 class="text-xl font-bold text-text dark:text-white tracking-tight">
        Nama App
      </h1>
    </div>
    <div></div>
    <div class="flex items-center gap-3"><!-- controls --></div>
  </div>
</header>
```

### 9.5 Modal

```html
<div class="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60]
  flex items-center justify-center modal-overlay">
  <div class="bg-white dark:bg-gray-800 rounded-3xl p-8
    max-w-sm w-full mx-4 shadow-2xl modal-content">
    <!-- ikon opsional -->
    <div class="w-16 h-16 bg-danger/20 dark:bg-danger/30 text-danger
      rounded-full flex items-center justify-center mb-6 mx-auto">
      <span class="material-symbols-rounded text-[32px]">warning</span>
    </div>
    <h3 class="text-xl font-bold text-text dark:text-white mb-3 text-center tracking-tight">Judul</h3>
    <p class="text-gray-500 dark:text-gray-400 mb-8 text-center leading-relaxed">Pesan.</p>
    <div class="flex flex-col gap-3">
      <!-- tombol aksi + batal -->
    </div>
  </div>
</div>
```

Modal besar (form): ganti `max-w-sm` → `max-w-2xl`, tambah `max-h-[92vh] overflow-y-auto`

### 9.6 Toast / Notifikasi

Container: `fixed bottom-6 right-6 z-[70] flex flex-col gap-3 pointer-events-none`

Base toast: `px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 font-medium tracking-wide backdrop-blur-md border pointer-events-auto`

| Tipe    | Background       | Teks             | Border             |
|---------|------------------|------------------|---------------------|
| success | `bg-success`     | `text-gray-800`  | `border-black/10`   |
| error   | `bg-danger`      | `text-white`     | `border-white/10`   |
| warning | `bg-yellow-500`  | `text-gray-800`  | `border-black/10`   |
| info    | `bg-primary`     | `text-white`     | `border-white/10`   |

> ⚠️ Selalu gunakan `.textContent` untuk teks toast (bukan `.innerHTML`) — keamanan XSS.

### 9.7 Empty State

```html
<div class="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700
  rounded-3xl shadow-sm py-20 px-6 text-center">
  <div class="w-24 h-24 bg-[#EBEBFA] dark:bg-gray-700 rounded-full
    flex items-center justify-center mx-auto mb-6">
    <span class="material-symbols-rounded icon-lg text-primary">inbox</span>
  </div>
  <h3 class="text-2xl font-bold text-text dark:text-white tracking-tight mb-3">
    Belum Ada Data
  </h3>
  <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed mb-8">
    Deskripsi.
  </p>
</div>
```

### 9.8 Badge / Pill

```html
<!-- Info badge -->
<div class="flex items-center gap-3 px-5 h-12 bg-white dark:bg-gray-800
  rounded-full shadow-sm border border-gray-100 dark:border-gray-700
  text-sm font-medium text-gray-600 dark:text-gray-300">
  <span>Label: <span class="font-bold text-primary">42</span></span>
</div>

<!-- Counter label -->
<span class="text-sm font-semibold text-gray-600 dark:text-gray-300
  bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
  20 items
</span>
```

### 9.9 Progress Bar

```html
<div class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 shadow-inner overflow-hidden">
  <div class="bg-primary h-full rounded-full transition-all duration-300" style="width: 0%"></div>
</div>
```

### 9.10 Tabel Data

> **ATURAN:** Tabel harus dibungkus dalam container `rounded-2xl overflow-hidden` agar sudut tabel membulat. Gunakan `border-collapse: separate` agar border radius bekerja.

#### Wrapper Tabel

```html
<div class="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700
  rounded-2xl shadow-sm overflow-hidden">
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr class="bg-[#f0eef9] dark:bg-gray-700/80">
          <th class="px-4 py-3.5 text-left text-xs font-semibold text-primary dark:text-[#b4a4f4]
            uppercase tracking-wide">Kolom 1</th>
          <th class="px-4 py-3.5 text-left text-xs font-semibold text-primary dark:text-[#b4a4f4]
            uppercase tracking-wide">Kolom 2</th>
          <th class="px-4 py-3.5 text-left text-xs font-semibold text-primary dark:text-[#b4a4f4]
            uppercase tracking-wide">Kolom 3</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
        <tr class="hover:bg-[#f5f3ff] dark:hover:bg-gray-700/30 transition-colors">
          <td class="px-4 py-3 text-text dark:text-gray-300">Data</td>
          <td class="px-4 py-3 text-text dark:text-gray-300">Data</td>
          <td class="px-4 py-3 text-text dark:text-gray-300">Data</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

#### Aturan Styling Tabel

| Elemen             | Light Mode                       | Dark Mode                          |
|--------------------|----------------------------------|------------------------------------|
| Wrapper            | `bg-white rounded-2xl`           | `dark:bg-gray-800`                 |
| Wrapper border     | `border-gray-100`                | `dark:border-gray-700`             |
| Header bg          | `bg-[#f0eef9]` (ungu sangat muda)| `dark:bg-gray-700/80`              |
| Header teks        | `text-primary` (`#6246ea`)       | `dark:text-[#b4a4f4]` (ungu muda) |
| Header font        | `text-xs font-semibold uppercase tracking-wide` | —             |
| Row divider        | `divide-gray-100`                | `dark:divide-gray-700/60`          |
| Row hover          | `hover:bg-[#f5f3ff]`            | `dark:hover:bg-gray-700/30`        |
| Cell teks          | `text-text` (`#2b2c34`)         | `dark:text-gray-300`               |
| Cell padding       | `px-4 py-3`                      | —                                  |
| Header padding     | `px-4 py-3.5`                    | —                                  |

#### Poin Penting

- **Rounded corners**: Dicapai melalui wrapper `rounded-2xl overflow-hidden`, bukan pada elemen `<table>` langsung
- **Kontras header**: Header menggunakan `bg-[#f0eef9]` (tint ungu) dengan teks `text-primary` — memberikan kontras jelas terhadap baris isi yang `bg-white`
- **Sticky header** (opsional, untuk tabel panjang):
  ```css
  thead th {
    position: sticky;
    top: 0;
    z-index: 5;
  }
  ```
- **Row hover**: Gunakan `hover:bg-[#f5f3ff]` (ungu sangat pucat) agar konsisten dengan aksen primary
- **Teks angka positif/negatif** dalam tabel: gunakan semantic colors (`text-[#058a4e]` / `text-danger`)
- **Aksi per baris** (edit, hapus): gunakan icon button `p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600`

#### CSS Tambahan (Opsional)

```css
/* Striped rows — alternatif dari hover saja */
tbody tr:nth-child(even) {
  background-color: #faf9fe; /* ungu sangat sangat muda */
}
.dark tbody tr:nth-child(even) {
  background-color: rgba(55, 65, 81, 0.25); /* gray-700/25 */
}

/* Border-collapse harus separate agar rounded bekerja */
table {
  border-collapse: separate;
  border-spacing: 0;
}
```

---

### 9.11 Sidebar Navigation (Desktop)

```html
<aside class="w-64 sticky top-16 h-[calc(100vh-4rem)] bg-white dark:bg-gray-800
  border-r border-secondary dark:border-gray-700 overflow-y-auto hidden md:block">
  <nav class="p-4 flex flex-col gap-1">
    <button class="nav-item w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium
      flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <span class="material-symbols-rounded text-[20px] text-gray-400">home</span>
      Dashboard
    </button>
    <!-- nav-item-active: lihat CSS di bawah -->
  </nav>
</aside>
```

Active state (CSS):
```css
.nav-item-active {
  background: rgba(98,70,234,0.08);
  color: #6246ea;
  border-left: 3px solid #6246ea;
}
.dark .nav-item-active {
  background: rgba(98,70,234,0.15);
  color: #9b82f5;
  border-left-color: #9b82f5;
}
.nav-item-active .material-symbols-rounded {
  font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24;
}
```

### 9.12 Bottom Navigation (Mobile)

```html
<nav class="fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-800
  border-t border-gray-100 dark:border-gray-700 md:hidden">
  <div class="flex items-center justify-around h-16 px-2">
    <!-- Nav item biasa -->
    <button class="flex flex-col items-center gap-0.5 text-gray-400">
      <span class="material-symbols-rounded text-[22px]">home</span>
      <span class="text-[10px] font-medium">Home</span>
    </button>
    <!-- FAB center -->
    <button class="w-14 h-14 bg-primary rounded-full shadow-lg shadow-primary/40
      -mt-5 flex items-center justify-center active:scale-95 transition-all">
      <span class="material-symbols-rounded text-[28px] text-white">add</span>
    </button>
    <!-- Active nav item -->
    <button class="flex flex-col items-center gap-0.5 text-primary">
      <span class="material-symbols-rounded text-[22px] icon-filled">settings</span>
      <span class="text-[10px] font-medium">Settings</span>
    </button>
  </div>
</nav>
```

> Mobile pages: tambahkan `pb-24` agar konten tidak tertutup bottom nav.

### 9.13 Tooltip

```html
<div class="tooltip relative group">
  <button><!-- trigger --></button>
  <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2
    px-3 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs
    rounded-lg whitespace-nowrap opacity-0 invisible
    group-hover:opacity-100 group-hover:visible
    transition-all duration-150 pointer-events-none z-[80]">
    Label tooltip
    <div class="absolute top-full left-1/2 -translate-x-1/2
      border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
  </div>
</div>
```

| Property | Nilai |
|----------|-------|
| Background | `bg-gray-900 dark:bg-gray-700` |
| Teks | `text-white text-xs` |
| Padding | `px-3 py-1.5` |
| Radius | `rounded-lg` |
| Z-index | `z-[80]` |

> **Wajib:** Semua icon-only buttons harus punya tooltip atau `aria-label`.

### 9.14 Dropdown / Popover Menu

```html
<div class="relative">
  <button id="dropdownTrigger"><!-- trigger --></button>
  <div class="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800
    border border-gray-100 dark:border-gray-700 rounded-2xl shadow-xl
    py-2 z-50 opacity-0 invisible transition-all duration-150
    origin-top-right scale-95" id="dropdownMenu">
    <button class="w-full text-left px-4 py-2.5 text-sm text-text dark:text-gray-300
      hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-3">
      <span class="material-symbols-rounded text-[18px] text-gray-400">edit</span>
      Edit
    </button>
    <div class="border-t border-gray-100 dark:border-gray-700 my-1"></div>
    <button class="w-full text-left px-4 py-2.5 text-sm text-danger
      hover:bg-danger/10 transition-colors flex items-center gap-3">
      <span class="material-symbols-rounded text-[18px]">delete</span>
      Hapus
    </button>
  </div>
</div>
```

Animasi buka/tutup (JS): toggle class `opacity-100 visible scale-100`.

### 9.15 Loading States

#### Spinner

```html
<!-- Spinner default -->
<div class="w-8 h-8 border-3 border-gray-200 dark:border-gray-600
  border-t-primary rounded-full animate-spin"></div>

<!-- Spinner kecil (dalam tombol) -->
<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
```

#### Button Loading State

```html
<button class="py-3 px-6 bg-primary text-white font-medium rounded-full
  flex items-center gap-2 opacity-80 cursor-not-allowed" disabled>
  <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
  Memproses...
</button>
```

#### Skeleton Screen

```html
<div class="animate-pulse space-y-4">
  <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4"></div>
  <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2"></div>
  <div class="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
</div>
```

#### Loading Overlay (Full Page)

```html
<div class="fixed inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm
  z-[60] flex items-center justify-center">
  <div class="flex flex-col items-center gap-4">
    <div class="w-10 h-10 border-3 border-gray-200 dark:border-gray-600
      border-t-primary rounded-full animate-spin"></div>
    <p class="text-sm font-medium text-gray-500 dark:text-gray-400">Memuat...</p>
  </div>
</div>
```

### 9.16 Footer

```html
<footer class="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 mt-auto">
  <div class="max-w-7xl mx-auto px-6 py-8">
    <div class="flex flex-col md:flex-row items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <span class="material-symbols-rounded text-[18px] text-white">school</span>
        </div>
        <span class="text-sm font-semibold text-text dark:text-white">Nama App</span>
      </div>
      <p class="text-xs text-gray-400 dark:text-gray-500">
        © 2026 Nama App. All rights reserved.
      </p>
    </div>
  </div>
</footer>
```

### 9.17 Link

```
Inline link    : text-primary hover:underline transition-colors
Nav link       : text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-primary transition-colors
Disabled link  : text-gray-400 cursor-not-allowed pointer-events-none
```

### 9.18 Divider / Separator

```html
<!-- Horizontal -->
<hr class="border-t border-gray-100 dark:border-gray-700 my-4">

<!-- Dengan teks -->
<div class="flex items-center gap-4 my-6">
  <hr class="flex-1 border-gray-100 dark:border-gray-700">
  <span class="text-xs text-gray-400 font-medium uppercase tracking-wide">atau</span>
  <hr class="flex-1 border-gray-100 dark:border-gray-700">
</div>
```

### 9.19 Tab / Segmented Control

```html
<div class="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-full w-fit">
  <button class="px-5 py-2 text-sm font-medium rounded-full transition-all duration-200
    bg-white dark:bg-gray-600 text-text dark:text-white shadow-sm">
    Tab Aktif
  </button>
  <button class="px-5 py-2 text-sm font-medium rounded-full transition-all duration-200
    text-gray-500 dark:text-gray-400 hover:text-text dark:hover:text-white">
    Tab Inaktif
  </button>
</div>
```

**Alternatif — Underline tabs:**
```html
<div class="flex border-b border-gray-200 dark:border-gray-700 gap-0">
  <button class="px-5 py-3 text-sm font-semibold text-primary
    border-b-2 border-primary transition-colors">Aktif</button>
  <button class="px-5 py-3 text-sm font-medium text-gray-500 dark:text-gray-400
    border-b-2 border-transparent hover:text-text dark:hover:text-white
    hover:border-gray-300 transition-colors">Inaktif</button>
</div>
```

### 9.20 Pagination

```html
<div class="flex items-center gap-2">
  <!-- Prev -->
  <button class="p-2 rounded-full bg-gray-100 dark:bg-gray-700
    hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors
    disabled:opacity-40 disabled:cursor-not-allowed" disabled>
    <span class="material-symbols-rounded text-[18px]">chevron_left</span>
  </button>
  <!-- Page numbers -->
  <button class="w-9 h-9 rounded-full bg-primary text-white text-sm font-semibold
    shadow-sm">1</button>
  <button class="w-9 h-9 rounded-full text-gray-600 dark:text-gray-300 text-sm font-medium
    hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">2</button>
  <button class="w-9 h-9 rounded-full text-gray-600 dark:text-gray-300 text-sm font-medium
    hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">3</button>
  <!-- Next -->
  <button class="p-2 rounded-full bg-gray-100 dark:bg-gray-700
    hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
    <span class="material-symbols-rounded text-[18px]">chevron_right</span>
  </button>
</div>
```

### 9.21 Dark Mode Toggle

```html
<button id="darkToggle" class="p-2.5 rounded-full bg-gray-100 dark:bg-gray-700
  hover:bg-gray-200 dark:hover:bg-gray-600 transition-all shadow-sm"
  aria-label="Toggle dark mode">
  <!-- Light mode: tampilkan moon -->
  <span class="material-symbols-rounded text-[20px] dark:hidden">dark_mode</span>
  <!-- Dark mode: tampilkan sun -->
  <span class="material-symbols-rounded text-[20px] hidden dark:inline-flex text-yellow-400">light_mode</span>
</button>
```

```javascript
document.getElementById('darkToggle').addEventListener('click', () => {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('darkMode', isDark);
});
```

---

## 10. Animasi & Transisi

### Transisi Default

| Konteks          | Class                             |
|------------------|-----------------------------------|
| Hover umum       | `transition-all duration-200`     |
| Hover warna saja | `transition-colors`               |
| Hover shadow     | `transition-shadow duration-200`  |
| Klik tombol      | `active:scale-95` / `active:scale-[0.98]` |

### Keyframes CSS (Wajib Ada)

```css
/* Modal */
.modal-overlay { animation: overlayFadeIn 0.18s ease-out; }
.modal-content { animation: modalPopIn 0.22s cubic-bezier(0.34, 1.3, 0.64, 1); }

@keyframes overlayFadeIn {
  from { opacity: 0; } to { opacity: 1; }
}
@keyframes modalPopIn {
  from { opacity: 0; transform: scale(0.92) translateY(8px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}

/* Toast */
.toast { animation: slideIn 0.3s ease-out; }
@keyframes slideIn {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}
@keyframes slideOut {
  from { transform: translateX(0); opacity: 1; }
  to   { transform: translateX(100%); opacity: 0; }
}

/* View transition */
@keyframes viewFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.view-enter { animation: viewFadeIn 0.2s ease-out; }
```

---

## 11. Icon

> **Implementasi aktual:** package `material-symbols` hanya menjadi sumber build-time. `npm run icons:subset` memindai pemakaian `<Icon name="..." />`, lalu menghasilkan `src/assets/material-symbols-rounded-subset.woff2` yang direferensikan oleh `src/index.css`. Feature React sebaiknya tetap menggunakan komponen `Icon` dari `src/components/ui/icon.tsx` agar simbol baru otomatis masuk pada build berikutnya.

Library: **Material Symbols Rounded** — Google icon font, self-hosted agar berjalan offline.

> **Pilihan variant Rounded** karena paling sesuai dengan kepribadian visual design system ini yang serba membulat.

### 10.1 Legacy Manual Font Setup (Jangan Digunakan)

**Langkah 1 — Download font:**
- Kunjungi [fonts.google.com/icons](https://fonts.google.com/icons), pilih "Material Symbols Rounded"
- Atau unduh dari GitHub: `google/material-design-icons` → `variablefont/`
- File yang dibutuhkan: `MaterialSymbolsRounded[FILL,GRAD,opsz,wght].woff2`
- Simpan di: `assets/fonts/MaterialSymbolsRounded.woff2`

**Langkah 2 — Tambahkan CSS `@font-face`** (letakkan di paling atas stylesheet):

```css
@font-face {
  font-family: 'Material Symbols Rounded';
  font-style: normal;
  font-weight: 100 700;
  font-display: block;
  src: url('assets/fonts/MaterialSymbolsRounded.woff2') format('woff2');
}

.material-symbols-rounded {
  font-family: 'Material Symbols Rounded';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  user-select: none;
}
```

### 10.2 Penggunaan Dasar

Penggunaan utama di komponen React:

```tsx
import { Icon } from "@/components/ui/icon";

<Icon name="home" className="text-[24px]" />
<Button>
  <Icon name="add" className="text-[20px]" />
  Tambah Data
</Button>
```

Contoh HTML mentah berikut hanya menjelaskan struktur yang dihasilkan font icon; jangan gunakan sebagai pengganti komponen UI React yang sudah tersedia.

```html
<!-- Penulisan dasar: nama ikon sebagai text node -->
<span class="material-symbols-rounded">home</span>
<span class="material-symbols-rounded">settings</span>
<span class="material-symbols-rounded">delete</span>

<!-- Dalam tombol -->
<button class="py-3 px-6 bg-primary text-white font-medium rounded-full
  hover:bg-[#5035cc] hover:shadow-lg hover:shadow-primary/30
  transition-all duration-200 flex items-center gap-2 active:scale-95">
  <span class="material-symbols-rounded text-[20px]">add</span>
  Tambah Data
</button>

<!-- Icon-only button -->
<button class="p-2.5 rounded-full bg-gray-100 dark:bg-gray-700
  hover:bg-gray-200 dark:hover:bg-gray-600 transition-all shadow-sm">
  <span class="material-symbols-rounded text-[20px] text-gray-600 dark:text-gray-300">
    more_vert
  </span>
</button>
```

### 10.3 Ukuran Ikon

Gunakan `font-size` atau class `text-[Npx]` untuk mengontrol ukuran:

| Konteks                     | Class Tailwind     | font-size |
|-----------------------------|--------------------|----------|
| Dalam tombol kecil          | `text-[18px]`      | 18px     |
| Dalam tombol reguler        | `text-[20px]`      | 20px     |
| Sidebar / judul seksi       | `text-[24px]`      | 24px     |
| Ikon aksi tabel             | `text-[18px]`      | 18px     |
| Ikon modal besar / warning  | `text-[32px]`      | 32px     |
| Empty state                 | `text-[48px]`      | 48px     |

> **Atur `opsz` (optical size) sesuai ukuran render** untuk kualitas terbaik:
> - 18–20px → `opsz` 20
> - 24px → `opsz` 24
> - 32–48px → `opsz` 48

### 10.4 Kustomisasi via `font-variation-settings`

Material Symbols adalah variable font dengan 4 axis:

| Axis   | Nama    | Range   | Default | Keterangan                           |
|--------|---------|---------|---------|--------------------------------------|
| `FILL` | Fill    | 0–1     | 0       | 0 = outline, 1 = filled             |
| `wght` | Weight  | 100–700 | 400     | Ketebalan stroke                     |
| `GRAD` | Grade   | -25–200 | 0       | Ketebalan tanpa mengubah spasi       |
| `opsz` | Optical | 20–48   | 24      | Ukuran optis, sesuaikan dengan px    |

**Utility classes yang direkomendasikan** (tambahkan ke CSS):

```css
/* Outline — default, untuk UI umum */
.icon-outline {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

/* Filled — untuk state aktif / selected */
.icon-filled {
  font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}

/* Ukuran kecil (dalam tombol/tabel) */
.icon-sm {
  font-size: 20px;
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20;
}

/* Ukuran besar (empty state, modal) */
.icon-lg {
  font-size: 48px;
  font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 48;
}

/* Bold weight — untuk emphasis */
.icon-bold {
  font-variation-settings: 'FILL' 0, 'wght' 600, 'GRAD' 0, 'opsz' 24;
}
```

**Contoh active/selected state** (nav item aktif):
```css
.nav-item-active .material-symbols-rounded {
  font-variation-settings: 'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24;
}
```

### 10.5 Warna Ikon

Ikon mewarisi warna dari parent via `color`. Gunakan kelas Tailwind:

| Konteks                  | Class Tailwind                              |
|--------------------------|---------------------------------------------|
| Aksi utama / aktif       | `text-primary`                              |
| Tombol putih             | `text-white`                                |
| Error / hapus            | `text-danger`                               |
| Sukses                   | `text-success`                              |
| Netral / secondary       | `text-gray-400 dark:text-gray-500`          |
| Dalam card / sidebar     | `text-gray-600 dark:text-gray-300`          |

### 10.6 Nama Ikon yang Sering Digunakan

| Fungsi                  | Nama Ikon Material Symbols     |
|-------------------------|--------------------------------|
| Tambah                  | `add`                          |
| Hapus                   | `delete`                       |
| Edit / ubah             | `edit`                         |
| Simpan                  | `save`                         |
| Tutup / X               | `close`                        |
| Kembali                 | `arrow_back`                   |
| Unduh                   | `download`                     |
| Unggah                  | `upload`                       |
| Pencarian               | `search`                       |
| Filter                  | `filter_list`                  |
| Pengaturan              | `settings`                     |
| Profil / akun           | `account_circle`               |
| Notifikasi              | `notifications`                |
| Dark mode (bulan)       | `dark_mode`                    |
| Light mode (matahari)   | `light_mode`                   |
| Dashboard / beranda     | `home`                         |
| Lebih banyak (vertikal) | `more_vert`                    |
| Lebih banyak (horizontal)| `more_horiz`                  |
| Centang / sukses        | `check_circle`                 |
| Peringatan              | `warning`                      |
| Informasi               | `info`                         |
| Grafik / chart          | `bar_chart`                    |
| Daftar                  | `list`                         |
| Menu hamburger          | `menu`                         |
| Chevron bawah           | `keyboard_arrow_down`          |
| Chevron kanan           | `chevron_right`                |
| Kalender                | `calendar_today`               |
| Dompet / keuangan       | `account_balance_wallet`       |
| Visibility toggle       | `visibility` / `visibility_off`|
| Salin                   | `content_copy`                 |
| Share / bagikan         | `share`                        |
| Star / favorit          | `star`                         |

---

## 12. Scrollbar Custom (Wajib Ada)

```css
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
::-webkit-scrollbar-thumb:hover { background: #a1a1a1; }

.dark ::-webkit-scrollbar-track { background: #374151; }
.dark ::-webkit-scrollbar-thumb { background: #4b5563; }
.dark ::-webkit-scrollbar-thumb:hover { background: #6b7280; }
```

---

## 13. Focus & Accessibility

> **WAJIB:** Setiap elemen interaktif harus bisa diakses via keyboard.

### Focus Visible Ring

Tambahkan ke CSS global:
```css
/* Hapus default outline, ganti dengan ring saat keyboard navigation */
:focus { outline: none; }
:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(98, 70, 234, 0.4);
  border-radius: inherit;
}
```

Atau gunakan Tailwind per elemen:
```
focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2
```

### Aturan Accessibility

| Aturan | Detail |
|--------|--------|
| Icon-only button | Wajib `aria-label="Deskripsi"` atau tooltip |
| Modal terbuka | `aria-modal="true"`, trap focus di dalam modal |
| Input wajib diisi | Tambah `required` dan `aria-required="true"` |
| Toast notifikasi | `role="alert"` agar screen reader membacakan |
| Loading state | `aria-busy="true"` pada container yang loading |
| Kontras minimum | Rasio ≥ 4.5:1 untuk teks, ≥ 3:1 untuk elemen besar (WCAG AA) |

---

## 14. Responsive Layout

Breakpoint utama: **`md:` = 768px** (mobile-first)

```
Max width konten : max-w-7xl mx-auto (atau max-w-[1400px])
Grid card        : grid-cols-1 md:grid-cols-2 gap-4
Padding konten   : px-6 md:px-8 py-4
```

| Mode | Navigation | Sidebar | Bottom padding |
|------|-----------|---------|----------------|
| Mobile `< 768px` | Bottom nav + FAB | Hidden | `pb-24` |
| Desktop `≥ 768px` | Left sidebar `w-64` | Visible | `pb-6` |

---

## 15. Spacing

| Konteks                   | Nilai              |
|---------------------------|---------------------|
| Card padding              | `p-5` / `p-6`      |
| Card grid gap             | `gap-4`             |
| Antar tombol toolbar      | `gap-3`             |
| Antar elemen form         | `gap-4`             |
| Antar item grup           | `gap-2`             |
| Ikon ↔ teks tombol        | `gap-2`             |
| Label ↔ input             | `mb-2` (pada label) |
| Header ↔ konten utama     | `py-6` / `pt-6`    |
| Antar section/blok konten | `space-y-6`         |
| Modal padding             | `p-8`               |
| Modal header ↔ body       | `mb-3` (judul), `mb-8` (deskripsi) |
| Sidebar nav item gap      | `gap-1`             |
| Footer padding            | `py-8`              |

---

## 16. Keamanan (XSS)

- Gunakan `.textContent` untuk teks dari user/variabel
- Gunakan `.innerHTML` HANYA untuk HTML statis yang kamu kontrol
- Jangan gunakan `onclick` inline — pakai `.addEventListener("click", ...)`

---

## 17. Prinsip Desain — Kepribadian Visual

1. **Rounded-everything** — Pill buttons dan `rounded-3xl` cards mendominasi; tidak ada sudut tajam
2. **Soft purple accent** — Ungu `#6246ea` sebagai satu-satunya aksen interaktif
3. **Tint surface** — Gunakan `#EBEBFA` untuk background chip/badge, bukan warna solid
4. **Spring animation** — Modal muncul dengan efek overshoot `cubic-bezier(0.34, 1.3, 0.64, 1)`
5. **Dark mode consistent** — Semua elemen punya pasangan `dark:` modifier
6. **Icon outline by default** — Material Symbols Rounded `FILL=0` default; `FILL=1` hanya untuk active/selected
7. **Hover shadow elevation** — Card default `shadow-sm`, hover `shadow-lg`, shadow berwarna di tombol
8. **Toast dari kanan** — Notifikasi slide-in dari sudut kanan bawah
9. **Micro-interaction** — Semua tombol punya `active:scale-95` / `active:scale-[0.98]`
10. **Konten lega** — Padding konsisten, gap teratur, tidak sesak
11. **Accessible by default** — Focus ring, aria-label, keyboard navigable

---

## 18. Checklist Konsistensi (Verifikasi Sebelum Selesai)

### Visual & Layout
- [ ] Semua tombol → `rounded-full`
- [ ] Semua card → `rounded-3xl`
- [ ] Semua input/select → `rounded-xl`
- [ ] Tabel wrapper → `rounded-2xl overflow-hidden`
- [ ] Hover tombol: shadow berwarna sesuai variant
- [ ] Active state: `active:scale-95` atau `active:scale-[0.98]`
- [ ] Semua elemen punya pasangan `dark:` modifier
- [ ] Shadow hover menggunakan token warna
- [ ] Transisi default `duration-200`
- [ ] Z-index sesuai layer map (Header z-40, Modal z-[60], Toast z-[70])

### Font & Ikon
- [ ] Font Inter Latin dimuat melalui `@fontsource/inter`
- [ ] Material Symbols Rounded menggunakan subset hasil `npm run icons:subset`
- [ ] Feature React menggunakan komponen `Icon` dari `src/components/ui/icon.tsx`
- [ ] Tidak ada font atau stylesheet eksternal yang ditambahkan per halaman
- [ ] Ukuran ikon: `text-[Npx]` sesuai konteks
- [ ] `font-variation-settings` default: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24`
- [ ] State aktif nav → `FILL=1` via `.icon-filled`

### Interaksi & Keamanan
- [ ] Toast via JS dengan `textContent` (bukan `innerHTML`)
- [ ] Tidak ada `onclick` inline — gunakan `addEventListener`
- [ ] Dark mode diubah melalui `useTheme` dan tersimpan pada key `ais-theme`
- [ ] Scrollbar custom di-style via CSS
- [ ] Warna `success` dan `warning` pakai `text-gray-800` (bukan `text-white`)

### Komponen
- [ ] Loading state: spinner atau skeleton tersedia
- [ ] Button loading: disabled + spinner menggantikan ikon
- [ ] Empty state tersedia untuk halaman tanpa data
- [ ] Sidebar nav ada active state (tint ungu + border-left)
- [ ] Bottom nav mobile tersedia jika ada sidebar desktop

### Accessibility
- [ ] Semua icon-only buttons punya `aria-label`
- [ ] Focus visible ring (`box-shadow` atau `ring`) tersedia
- [ ] Modal: `aria-modal="true"`, focus trapped
- [ ] Toast: `role="alert"`
- [ ] Kontras warna ≥ 4.5:1 (WCAG AA)

---


*Design adalah bagian dari ekosistem **Kelana Code** — agentic coding tool yang dirancang untuk membantu developer Indonesia membangun produk yang lebih baik dan lebih cepat*
