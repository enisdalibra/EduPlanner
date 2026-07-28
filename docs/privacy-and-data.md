# Privacy and Data

EduPlanner is a local-first, client-side application. It does not require an
account or backend for normal use. This document explains where data is stored,
what may contain sensitive information, and what users should consider before
using the application for educational records.

## At a glance

- The main database is stored in IndexedDB for the current browser profile and
  website origin.
- The optional development/demo mock backup is stored in `localStorage` for that
  same browser profile and origin. It is not a cloud backup.
- The service worker caches application assets for offline use; it does not copy
  the IndexedDB student database into the PWA cache.
- EduPlanner has no remote backup provider, authentication service, telemetry,
  or analytics integration.
- EduPlanner does not provide application-level encryption.
- JSON backups and Excel files can contain sensitive educational records.

## What data EduPlanner can store

Depending on how the application is used, local records can include:

- teacher profile details, including an optional email address and avatar;
- class and subject names;
- student names and student identification numbers (NIS);
- attendance and grades;
- teaching materials, journals, evaluations, tasks, and schedules;
- student notes and teaching-session history; and
- application preferences, timer state, and mock-backup metadata.

Treat this information as sensitive even when it remains on the device.

## Where data is stored

### IndexedDB

The primary database, `EduPlannerDB`, is stored in IndexedDB. Browser storage is
isolated by both browser profile and origin. For example, a database created on
`http://localhost:3000` is separate from one created on a GitHub Pages URL, even
on the same device.

The database contains 11 tables: `profile`, `subjects`, `classes`, `students`,
`attendances`, `grades`, `notes`, `tasks`, `teachingSessions`, `studentNotes`,
and `schedules`.

Clearing site data, deleting the browser profile, resetting the browser, or
uninstalling it without retaining site data can remove this database. Private
or incognito profiles may discard it when the session ends. Browsers may also
evict site storage under storage pressure.

### localStorage

EduPlanner uses `localStorage` for selected UI preferences and persisted
application state. When `LocalMockSyncProvider` is enabled, its backup payload
is also stored there.

The mock provider is for development and demonstrations only:

- it does not upload data to the internet;
- it is accessible only from the same browser profile and origin;
- it is not available automatically on another device or deployment URL; and
- clearing site data can remove it together with the primary database.

Do not rely on the mock provider as the only backup.

### Service worker and PWA cache

The service worker caches static application assets such as HTML, JavaScript,
CSS, fonts, and icons so that the installed PWA can reload offline. It does not
cache or upload the IndexedDB student database, JSON backup files, or imported
Excel workbooks.

Removing the PWA icon alone may not clear site data. Conversely, clearing all
site data normally removes the IndexedDB database, `localStorage`, and cached
PWA assets for that origin.

## Data sent over the network

EduPlanner has no backend, remote sync provider, telemetry, or analytics
integration. The repository and a static GitHub Pages deployment publish
application assets; they do not receive or store the IndexedDB database from a
user's browser.

Opening a deployed site still requires ordinary web requests for its static
assets, which may produce standard hosting/network logs outside EduPlanner's
control. Markdown content can also contain external images. EduPlanner blocks
those images until the user explicitly chooses to load them, permits only HTTPS
remote images, and requests them with a no-referrer policy. Loading an external
image exposes a network request to that image host.

## Backups, exports, and imports

A downloaded EduPlanner JSON backup can contain every database table, including
student names, NIS values, grades, attendance, and free-text notes. Excel roster
templates or exports can also contain identifiable student data.

Users should:

- save backups outside the browser profile in an access-controlled location;
- encrypt the storage device or backup container when appropriate;
- avoid sending backup or roster files through unapproved messaging services;
- delete obsolete copies securely according to applicable school policy; and
- verify the destination before sharing or uploading a file.

EduPlanner validates backup structure and relationships before restore. It also
creates a pre-restore recovery snapshot and performs the database replacement
in a transaction. These safeguards protect data integrity; they do not encrypt
the files or prevent an authorized device user from reading them.

## No application-level encryption

EduPlanner does not encrypt individual records, the IndexedDB database, the
mock backup, JSON backups, or Excel files at the application layer. Security
therefore depends on controls such as the device login, browser profile
separation, full-disk encryption, file permissions, and secure backup storage.

Do not use EduPlanner on an untrusted or publicly shared browser profile for
real student data.

## Shared devices, browser features, and extensions

Consider the following risks:

- another person using the same unlocked OS account or browser profile may be
  able to open EduPlanner and view its records;
- browser extensions with broad site permissions may be able to inspect page
  content or browser storage;
- OS backup, device migration, enterprise management, or browser profile
  features may copy local browser data according to vendor settings;
- screen capture, clipboard history, notifications, and downloaded files can
  expose information outside EduPlanner; and
- clearing browsing data may remove both the live database and the local mock
  backup without affecting JSON or Excel files already downloaded elsewhere.

Use a dedicated, protected profile where practical and follow the privacy rules
that apply to the school and jurisdiction.

Schedule notifications use a privacy-safe preview by default: the lock-screen
body does not include the class name, subject, or teaching time. A user may
explicitly enable those details under **Settings → Notification Privacy** on a
protected personal device. Browser and operating-system notification settings
can still expose the generic reminder, so disable reminder permission when even
the existence of a teaching schedule is sensitive.

## Deleting local data

EduPlanner does not currently provide an in-app “delete all data” action. To
remove its local data:

1. Download and securely store a JSON backup first if the records must be kept.
2. Open the browser's site information or site-data settings for the exact
   EduPlanner origin.
3. Clear all stored data for that origin, including IndexedDB, local storage,
   and cache storage.
4. Close and reopen the site, then confirm that EduPlanner starts with an empty
   database.
5. Delete any downloaded JSON backups, recovery snapshots, or Excel files
   separately if they are no longer required.

Browser labels differ, so consult the browser vendor's documentation for the
exact controls. Be careful to select the intended origin rather than clearing
unrelated sites.

## Moving data between origins or devices

Browser storage is not shared automatically between origins. To move data:

1. On the source origin, use **Download Backup** and keep the resulting JSON
   file secure.
2. On the destination origin or device, open the compatible EduPlanner version
   and choose the backup file for restore.
3. Review the backup version, record counts, migration warnings, and integrity
   status without exposing individual student details.
4. Download the destination's pre-restore recovery snapshot and confirm it is
   safely stored.
5. Explicitly confirm the restore.
6. Verify representative totals and records before deleting the transfer file.

A backup created by a newer unsupported EduPlanner version is rejected. The
local mock provider cannot be used to transfer data across origins or devices.

## Repository and deployment boundaries

Building or deploying EduPlanner publishes static application files only.
IndexedDB and `localStorage` belong to the user's browser and are not part of
the source repository or build output.

Never commit real backups, student rosters, database files, browser profiles,
screenshots containing personal information, or logs containing student data.
Use manually created synthetic examples for development and documentation.

## Reporting a security issue

Do not include student names, NIS values, contact details, notes, screenshots,
database exports, backups, access tokens, or other personal data in a public
issue.

Use the repository's private security-reporting channel when one is available.
If only public issues are available, open a minimal issue requesting a private
contact method without including exploit details or personal data. Reproduce
the problem with synthetic records such as `Siswa Contoh 01`, NIS `DEMO-0001`,
and `Kelas Demo A`.

If personal data has already been exposed, remove public access where possible
and follow the applicable school incident-response and notification process.
