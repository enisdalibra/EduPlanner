# Troubleshooting

This guide covers common user-facing problems. Before destructive browser
changes, download a JSON backup if EduPlanner still opens.

## Data is missing

First confirm all of the following:

- the URL has the same scheme, host, port, and base path as before;
- the same browser and browser profile are open;
- private/incognito mode is not being used;
- site data was not recently cleared; and
- a cleanup tool, device policy, or browser reset did not remove storage.

Browser databases are isolated by origin. For example, `http://localhost:3000`
and a GitHub Pages URL have separate data even on the same device.

If the old origin is still accessible, download a JSON backup there and restore
it at the new origin. If site data was deleted and no file backup exists, the
local mock backup is usually deleted with it and recovery may not be possible.

## The install option does not appear

- Confirm the deployed site uses HTTPS. Localhost is the usual development
  exception.
- Let the first page load finish, then reload once.
- Look in the browser menu for **Install app** or **Add to Home Screen**.
- Check whether EduPlanner is already installed.
- Try a normal browsing profile rather than private/incognito mode.

Installation support and menu labels vary by browser and operating system.
EduPlanner can still run in a normal tab when installation is unavailable.

## EduPlanner does not reload offline

1. Reconnect to the internet.
2. Open EduPlanner and allow the page to finish loading.
3. Reload once so the service worker can activate and cache application assets.
4. Close other EduPlanner tabs.
5. Test offline reload again.

The application shell can work offline after caching, but external Markdown
images need network access unless the browser already has them available.

Do not clear site data as an early troubleshooting step: doing so can delete the
IndexedDB database and local mock backup.

## A reminder did not appear

Check that:

- the browser supports notifications;
- notification permission for the EduPlanner origin is granted;
- the schedule has a non-zero early-reminder setting;
- the date, recurrence, start time, and device clock are correct;
- EduPlanner is open near the reminder time; and
- operating-system focus or notification settings are not suppressing it.

EduPlanner checks schedules about every 30 seconds while the application is
open. It does not provide server push or a background OS alarm, so a closed app
cannot be relied upon to notify.

## Excel import fails

Confirm the workbook:

- is a real `.xlsx` file no larger than 5 MB;
- has `Nama` or `Name` and `NIS` headers in the first row of the first sheet;
- contains no more than 2,000 data rows;
- has both values filled for every non-empty row;
- keeps names at 120 characters or fewer and NIS at 50 or fewer; and
- complies with the selected duplicate-NIS policy.

See [Importing Students](importing-students.md) for the complete format and
transaction behavior.

## Duplicate NIS blocks an import

With **Reject duplicates**, one conflict rejects the complete workbook and
nothing is imported. Correct the listed rows or deliberately choose
**Skip duplicates** after reviewing the consequences.

Duplicate checking includes students in every existing class and repeated
values inside the workbook.

## A backup file is rejected

Possible causes include:

- invalid JSON or a file larger than the supported backup limit;
- missing, unknown, or malformed tables;
- duplicate IDs or NIS values;
- orphaned class, student, subject, note, or schedule references;
- a class mismatch on attendance or grade records;
- a damaged legacy backup; or
- a backup version newer than the installed application.

Do not manually remove the failing records from a real backup unless you fully
understand the data model. Keep the original unchanged. Upgrade EduPlanner when
the message says the backup came from a newer version.

## Restore cannot continue

The restore action remains unavailable until:

1. the backup passes validation;
2. the preview is reviewed;
3. the replacement warning is explicitly acknowledged;
4. EduPlanner creates and downloads the pre-restore recovery snapshot; and
5. the user confirms that the snapshot was safely saved.

Allow downloads for the site if the recovery file does not appear. Canceling
the dialog does not change the database.

## Mock backup is missing

The mock provider uses `localStorage` in the same browser profile and origin.
It will not appear on another URL, browser, profile, or device. Clearing site
data can remove it.

Use downloaded JSON files for durable backups. The mock provider is only a
development/demo simulation and is not cloud storage.

## The application shows an older version

Because EduPlanner is a PWA, a new version waits instead of replacing an active
session automatically. When the update notice appears, save current work and
choose **Perbarui sekarang / Update now**. Choosing **Nanti / Later** keeps the
current version active.

1. Save current work.
2. Close other EduPlanner tabs or installed-app windows.
3. Reopen the application online and accept the update notice.
4. If no notice appears, reload once while online.

Do not clear site data unless a verified JSON backup exists and data loss is
explicitly accepted.

## Browser storage is nearly full

Download a current JSON backup first. Review unnecessary records and files, then
check the browser's storage controls for the EduPlanner origin.

Clearing all site data deletes the live database, preferences, mock backup, and
PWA cache. It is not equivalent to clearing only cached application assets.

## External Markdown images do not load

EduPlanner requires explicit approval before loading an external image and
accepts only HTTPS remote image URLs. The image also requires network access and
must still be available from its host.

Loading it sends a request to the external image host. Avoid remote images that
could expose sensitive paths, tokens, or private resources.

## Reporting a problem safely

Never publish a real roster, backup, recovery snapshot, screenshot with student
data, browser profile, or log containing personal information.

Create a reproduction using:

- `Kelas Demo A`;
- `Siswa Contoh 01`; and
- NIS `DEMO-0001`.

For a potential vulnerability, follow the private-reporting guidance in
[Privacy and Data](privacy-and-data.md#reporting-a-security-issue).
