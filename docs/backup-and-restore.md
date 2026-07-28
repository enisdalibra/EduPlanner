# Backup and Restore

EduPlanner is local-first. Its normal database is stored in the current browser,
so maintaining a separate file backup is the user's responsibility.

## Understand the three storage mechanisms

| Mechanism | Where it is stored | Appropriate use |
| --- | --- | --- |
| Browser database | IndexedDB for the current profile and origin | Live application data |
| Downloaded JSON backup | A file location chosen by the user/browser | Routine backup and transfer |
| Local mock provider | `localStorage` for the same profile and origin | Development and demonstrations only |

Remote cloud backup is not implemented. The mock provider does not upload data,
does not work across origins or devices, and can disappear when browser data is
cleared.

## What a file backup contains

A current JSON backup covers all 11 database tables, including profile, classes,
students, subjects, attendance, grades, notes, tasks, teaching sessions, student
notes, and schedules.

The file can therefore contain names, NIS values, grades, attendance, and
free-text notes. Store it as sensitive educational data. EduPlanner does not
apply application-level encryption to backup files.

## Create a JSON backup

The **Export Data** action on the Dashboard is a shortcut for the same complete,
versioned backup used by **Download Backup** in Settings. Both actions include
all 11 database tables and produce a file that can be restored through the
workflow below.

1. Open **Settings (Backup)**.
2. Find **Export Data (Backup)**.
3. Choose **Download Backup**.
4. Confirm that a file named similar to
   `eduplanner_backup_YYYYMMDD_HHmm.json` was downloaded.
5. Move or copy it to an access-controlled location outside the browser profile.
6. Keep more than one recent generation according to the school's retention
   policy.

Do not edit the JSON file manually. A syntactically valid edit can still break
relationships between records and cause restore validation to reject it.

## Restore from a JSON file

Restore replaces the entire local database. It is not a merge.

1. Open **Settings (Backup)**.
2. Find **Import Data (Restore)** and choose **Select Backup File**.
3. Select the intended `.json` backup.
4. Review the preview:
   - source format and backup version;
   - database version;
   - export date;
   - total records and counts for each table;
   - integrity status; and
   - legacy migration warnings, if any.
5. If anything is unexpected, choose **Cancel**. No database records are changed.
6. Acknowledge that the current local data will be replaced.
7. Choose the action to download the recovery snapshot.
8. Confirm that the browser saved
   `eduplanner_pre_restore_YYYYMMDD_HHmmss.json` in a safe location.
9. Check the explicit confirmation again, then choose **Restore Now**.
10. After EduPlanner reloads, verify representative class, student, attendance,
    and grade totals.

Browsers do not tell a web application reliably whether the user retained the
downloaded file. EduPlanner can initiate the recovery download, but the user
must personally confirm that it was saved before continuing.

## What validation protects

Before any restore write, EduPlanner checks:

- JSON structure, backup format, supported version, fields, enumerations, and
  size limits;
- required and unknown tables;
- duplicate record IDs and duplicate business identifiers such as NIS;
- references among students, classes, subjects, attendance, grades, notes,
  schedules, tasks, and teaching sessions; and
- consistency between a student's class and class references on attendance or
  grade records.

Invalid backups are rejected before they replace data. The actual replacement
uses one database transaction and is followed by an integrity check, so a
failure does not leave a partially restored database.

## Legacy and newer backups

Supported legacy backups are migrated through explicit rules. The preview lists
tables that the migration will initialize as empty and warns about potential
information loss.

A legacy backup missing a table that should have existed is treated as damaged
and rejected. A backup created by a newer unsupported EduPlanner version is also
rejected; upgrade the destination application before restoring it.

## Restore the recovery snapshot

A recovery snapshot is a normal, restorable EduPlanner JSON backup of the
database as it existed immediately before restore.

To return to that state:

1. Open **Settings (Backup)**.
2. Select the saved `eduplanner_pre_restore_...json` file.
3. Review its version, counts, date, and integrity status.
4. Download and retain the newly offered recovery snapshot.
5. Confirm the restore.
6. Verify the restored data after reload.

Every restore creates another recovery snapshot, including a restore from a
previous recovery snapshot.

## Use the local mock provider

The optional `LocalMockSyncProvider` is a development/demo tool, not durable
backup or cloud sync. It receives the same complete backup payload as a JSON
export, but stores it inside the current browser instead of downloading a file.

### Create and observe a mock backup

1. Open **Settings (Backup)**.
2. Under **Backup Provider**, select **Local Mock (Development Only)**.
3. To schedule backups, turn on **Local mock auto-backup (5 minutes)**. Enabling
   the control only starts the timer; it does not create an immediate backup.
   The first scheduled attempt occurs after five minutes.
4. Keep EduPlanner open. The timer runs every five minutes only while the
   application and its main layout are open. It is not a service-worker,
   background-sync, server, or closed-browser feature.
5. Use the header status indicator to observe whether auto-backup is disabled,
   waiting, creating a copy, or showing the time of the last successful copy.
   Scheduled failures are logged to the developer console and do not show a
   toast.

Choose **Create Mock Backup** to create or replace the mock copy immediately
instead of waiting for the timer. Selecting **Disconnected** as the provider
disables auto-backup; the enabled setting is persisted only for the mock
provider.

### Understand storage and retention

The provider stores one payload and one timestamp in same-origin `localStorage`.
Each successful scheduled or manual backup replaces that single copy. There is
no version history or retention policy.

The mock copy is limited to the same browser profile and origin as the live
IndexedDB database. Clearing site data can remove both the live data and the
mock copy. There is no remote upload, authentication, provider recovery,
cross-device access, or automatic transfer to another browser or EduPlanner
URL.

For durable recovery, use **Download Backup** and store the JSON file outside
the browser profile in a secure location. A downloaded file can be retained in
multiple generations and transferred through an approved secure method; the
mock copy cannot.

### Restore the mock copy

Choose **Restore Mock** in Settings. If a copy exists, EduPlanner shows the same
record-count preview and validation results used for a file restore. Before any
replacement, download the recovery snapshot of the current database and
explicitly confirm the restore. The replacement uses one database transaction
and a final integrity check, so it does not leave a partial database on
failure.

## Move data to another origin or device

1. Download a JSON backup from the source installation.
2. Transfer it using an approved secure method.
3. Open the destination EduPlanner origin.
4. Restore the file using the complete workflow above.
5. Verify the destination data before deleting the transfer copy.

Do not expect data from `localhost`, one GitHub Pages URL, or one browser profile
to appear automatically at another origin.

## Backup routine

A practical routine is:

- back up after important data-entry sessions;
- keep at least one copy outside the device running EduPlanner;
- periodically test a recent backup in a disposable browser profile;
- remove old files according to school retention policy; and
- never place real backups in the source repository or a public issue.

See [Privacy and Data](privacy-and-data.md) for storage and handling guidance.
