# AGENTS.md — EduPlanner

Panduan kerja agen untuk **EduPlanner** (PWA ruang kerja guru *offline-first* berbasis React, Vite, dan Dexie/IndexedDB tanpa server backend).

## Context Pointers

- **[GLOSSARY.md](./GLOSSARY.md)** — Baca sebelum menamai simbol, UI copy, atau menulis spesifikasi/tiket; gunakan istilah kanonik dan hindari sinonim terlarang.
- **[docs/adr/](./docs/adr/)** — Baca ADR terkait sebelum mengubah arsitektur rendering offline (`0001`), Content Zoom (`0002`), atau Local Image Asset & Backup v3 (`0003`).
- **[design.md](./design.md)** — Baca sebelum membuat atau mengubah komponen UI/layout.

## Project Invariants

- **100% offline-first & patuh CSP**: Fitur inti berjalan tanpa internet; seluruh aset produksi harus lolos `npm run build` (termasuk `verify:bundle` untuk *bundle budget* dan `test:offline` untuk precache Workbox).
- **Verifikasi sebelum commit**: Jalankan `npm run typecheck` dan test terkait (`npx vitest run <path>`), serta `npm run build` bila mengubah dependensi, CSP, PWA, atau struktur bundle.

## Issue Tracker (Linear)

- **Tracker:** Linear via MCP `linear_linear`
- **Team:** `Enisda` (`ENI`)
- **Project:** `EduPlanner` (`P-ENI-3`)
- **Triage Label:** `ready-for-agent`
- **Active Milestone:** `Offline Local Image Assets` (`40f85bda-da69-4071-9fd2-f9c530ac4eac`)

Saat memulai sesi baru tanpa nomor tiket eksplisit, pilih tiket paling atas berstatus `Backlog` / `Todo` yang seluruh `Blocked by`-nya sudah `Done` (saat ini: **`ENI-99`**), lalu sinkronkan detailnya dari Linear via `get_issue`.

### Active Milestone Queue — Offline Local Image Assets

| Issue | Title | Status | Blocked by |
| --- | --- | --- | --- |
| `ENI-99` | Local Image Asset store, client optimizer, and `asset://<uuid>` Markdown rendering | Backlog *(next)* | — |
| `ENI-100` | Insert Local Image Assets in Material editor via picker, drag-and-drop, and `Ctrl+V` paste | Backlog | `ENI-99` |
| `ENI-101` | Automatic orphan sweep for unused Local Image Assets on save, delete, and expired drafts | Backlog | `ENI-99` |
| `ENI-102` | Insert Local Image Assets in Journal and Evaluation editors | Backlog | `ENI-100` |
| `ENI-103` | Backup & Restore JSON v3 support for Local Image Assets | Backlog | `ENI-99`, `ENI-101` |

## Standard Ticket Workflow

Jalankan alur berikut secara berurutan untuk setiap tiket `<ISSUE_ID>`:

1. **Implementasi `<ISSUE_ID>`**
   - Ambil spesifikasi lengkap tiket dari Linear (`get_issue`), ubah status di Linear ke `In Progress`, lalu implementasikan beserta test hingga seluruh acceptance criteria terpenuhi dan verifikasi (`typecheck`, test, dan `build` bila relevan) hijau.
2. **Commit Implementasi (`/conventional-commit`)**
   - Buat commit atomik berformat Conventional Commit untuk implementasi `<ISSUE_ID>`.
3. **Code Review (`/code-review`)**
   - Lakukan review terhadap commit implementasi `<ISSUE_ID>` pada sumbu Standards & Spec.
4. **Perbaikan Temuan Review**
   - Perbaiki seluruh temuan yang diperlukan dari hasil code review dan pastikan seluruh test serta `typecheck` kembali hijau.
5. **Commit Perbaikan & Sinkronisasi Tracker (`/conventional-commit`)**
   - Buat commit untuk perbaikan hasil code review.
   - Perbarui status `<ISSUE_ID>` menjadi `Done` pada **tabel Active Milestone Queue di `AGENTS.md`** (geser penanda `*(next)*` ke tiket frontier berikutnya) dan perbarui status tiket di **Linear** (`save_issue`) ke `Done`.
