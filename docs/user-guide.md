# User Guide

EduPlanner is a local-first teacher workspace for classes, students, subjects,
attendance, grades, materials, journals, evaluations, schedules, tasks, and
teaching sessions. It works without an account or backend.

This guide uses synthetic examples only:

- class: `Kelas Demo A`;
- student: `Siswa Contoh 01`;
- NIS: `DEMO-0001`; and
- subject: `Mata Pelajaran Demo`.

Do not use real student information when following documentation examples,
testing a deployment, or reporting a problem.

## Before entering data

EduPlanner stores its main database in IndexedDB for the current browser profile
and website origin. Data entered on one URL is not automatically available on a
different URL, browser profile, or device.

Before using EduPlanner for important records:

1. Use a protected browser profile on a trusted device.
2. Confirm that site data is allowed and is not automatically cleared.
3. Avoid private/incognito mode.
4. Learn the [backup and restore workflow](backup-and-restore.md).
5. Follow the applicable school privacy and retention rules.

For a detailed explanation of storage and privacy, read
[Privacy and Data](privacy-and-data.md).

## Installing the PWA

EduPlanner can be installed from a supported modern browser after the site has
loaded successfully.

1. Open the deployed EduPlanner URL over HTTPS.
2. Wait for the first page load to finish.
3. Use the browser's **Install app**, **Install EduPlanner**, or
   **Add to Home Screen** action.
4. Confirm the installation.
5. Open the installed app once while online so its static application assets
   can be cached.
6. Test a reload while offline before depending on it in class.

The exact menu name varies by browser and operating system. If no install action
appears, continue using EduPlanner in a normal browser tab and see
[Troubleshooting](troubleshooting.md#the-install-option-does-not-appear).

Installing or removing the PWA icon is separate from clearing browser site data.
Removing the icon may leave the local database behind.

## Initial setup

### Set the teacher profile

Open **Profile**, enter the desired teacher details, and save. Profile data is
stored locally and is included in JSON backups.

### Choose language and appearance

Open **Settings (Backup)** to select Indonesian or English and the preferred
theme. These preferences are stored in the current browser profile.

## Create a class

1. Open **Classes**.
2. Choose the action to add a class.
3. Enter `Kelas Demo A` as the class name.
4. Add an optional synthetic description.
5. Save the class.

Create the class before adding or importing students because every student must
belong to an existing class.

Deleting a class permanently removes the students and class-owned records linked
to it. Download a current JSON backup before destructive changes.

## Create a subject

1. Open **Subjects**.
2. Add a subject named `Mata Pelajaran Demo`.
3. Add an optional description.
4. Save it.
5. Assign students when needed.

Subject assignment is used by class and learning workflows. Deleting a subject
removes its label from linked grades, attendance, tasks, notes, and recurring
schedules in one transaction. Recurring schedules are preserved as general
class schedules; teaching-session history linked to the deleted subject is
removed. Download a current JSON backup before this destructive action.

## Add students

### Add one student

1. Open **Students**.
2. Choose **Add Student**.
3. Select `Kelas Demo A`.
4. Enter `Siswa Contoh 01`.
5. Enter NIS `DEMO-0001`.
6. Save.

### Import a roster

For larger classes, use the `.xlsx` workflow described in
[Importing Students](importing-students.md). The import requires an existing
target class and supports explicit duplicate-NIS policies.

Deleting a student also removes that student's attendance, grades, notes, and
subject-enrollment references. Back up first if those records may be needed.

## Record attendance

1. Open **Attendance**.
2. Select a class, date, and subject as required.
3. Set each student's attendance status.
4. Save the attendance.

Review the saved result before leaving the page. Undo is available for attendance
saves, but the current beta has a known limitation when undoing the first save
on a previously empty date.

## Record grades

1. Open **Grades**.
2. Select the relevant class and subject.
3. Add or select an evaluation column.
4. Enter scores for the students.
5. Review calculated averages.

The gradebook supports keyboard navigation and grade undo/redo. Global undo/redo
does not apply to every action elsewhere in the application. Evaluation names
are limited to 120 characters. Renaming a column is rejected without changing
any grades if the new name would duplicate another evaluation for the same
student, class, and subject.

## Materials, journals, and evaluations

- **Materials** supports Markdown content, reading mode, and presentations.
- **Journals** stores teacher journal entries.
- **Evaluations** supports Markdown quiz questions and answer choices.

These areas may contain sensitive free text. Avoid entering unnecessary personal
details in teaching materials or notes.

Class and subject links are checked when a material, journal, or evaluation is
created or updated. Deleting one of these notes preserves any teaching-session
history that referenced it, but removes the optional note link so the history
does not become orphaned.

## Calendar, tasks, and schedules

Use **Calendar** and the class schedule tools to create:

- dated tasks;
- daily, weekly, or monthly recurring schedules; and
- optional class reminders.

Reminder limitations:

- notification permission must be granted;
- the application must be open;
- schedules are checked approximately every 30 seconds;
- notification previews hide class, subject, and time details by default;
- detailed previews require an explicit opt-in under **Settings → Notification
  Privacy** and should be enabled only on a protected personal device;
- reminders are not server push notifications or OS-level background alarms;
  and
- browser and operating-system notification policies still apply.

Do not rely on EduPlanner reminders as the only notification method for a
critical event.

## Teaching time tracker

Use the time tracker in the application header to start and stop a teaching
session. Active timer state is persisted locally, and completed sessions are
stored in IndexedDB and included in JSON backups.

## Back up regularly

Open **Settings (Backup)** and use **Download Backup**. Store the JSON file
outside the browser profile in a secure location.

Recommended times to back up include:

- after a significant attendance or grade update;
- before importing a large roster;
- before deleting a class, student, or subject;
- before clearing browser data or changing devices;
- before moving to a different EduPlanner URL; and
- before an application upgrade or deployment change.

The local mock provider is a development/demo simulation stored in
`localStorage`. It is not remote cloud storage and is not a replacement for a
downloaded file backup.

## Offline behavior

After a successful online load, the service worker caches the static application
shell so EduPlanner can reload offline. The IndexedDB database is already local.

When a new EduPlanner version is ready, the application displays an update
notice instead of taking over the current session. Save any work in progress,
then choose **Perbarui sekarang / Update now** to activate it and reload. Choose
**Nanti / Later** to keep using the current version until the application is
closed or another update is offered.

While offline:

- normal local data entry can continue;
- no backend synchronization is attempted because no backend exists;
- external Markdown images cannot load unless already available to the browser;
- installing the PWA or receiving a new application version may require a
  connection; and
- notification behavior remains subject to the browser and the app-open
  limitation described above.

When connectivity returns, EduPlanner does not upload the local database.

## Further reading

- [Backup and Restore](backup-and-restore.md)
- [Importing Students](importing-students.md)
- [Troubleshooting](troubleshooting.md)
- [Privacy and Data](privacy-and-data.md)
