# Changelog

All notable changes to EduPlanner will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project intends to follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Safe backup restore with structural and relational validation, legacy
  migration, record-count preview, pre-restore recovery snapshot, transactional
  replacement, and final integrity checking.
- Complete Indonesian and English teacher-facing interface.
- Embedded Markdown presentation quizzes.
- Installable offline PWA shell with bundle and offline-build checks.
- Manual GitHub Pages deployment and rollback workflow.
- User, backup/restore, roster-import, troubleshooting, privacy, security, and
  contribution documentation.

### Changed

- Replaced automatic PWA takeover with a bilingual update notice; a waiting
  service worker activates and reloads only after explicit user confirmation.
- Clarified that downloaded JSON backup is the durable backup mechanism, the
  `LocalMockSyncProvider` is for development/demo use only, and remote cloud sync
  is not implemented.
- Centralized domain mutations in feature APIs and extracted complex view logic
  into hooks.
- Reduced the initial and offline application payload.
- Centralized user-input length limits across domain validation, primary forms,
  Excel roster import, and backup restore.

### Fixed

- Completed transactional cascade deletion for classes and students.
- Preserved recurring class schedules as general schedules when deleting a
  subject, preventing orphaned schedule references.
- Preserved teaching-session history while clearing its optional note reference
  when a linked note is deleted.
- Preserved numeric teaching-session times during backup restore.
- Displayed entity names instead of internal UUIDs in selectors.
- Hardened remote Markdown image loading and client content security.
- Replaced the previous spreadsheet parser and strengthened roster validation.

### Security

- Added complete Inter and Material Symbols font license notices to both the
  source tree and production artifact, including disclosure of the generated
  Material Symbols subset; the release gate now rejects missing or incomplete
  notices.
- Enforced the centralized evaluation-name length limit in the grade rename API;
  renames now normalize input, reject per-student name collisions, and update
  all matching grades atomically.
- Added database integrity and migration checks.
- Pinned every GitHub Actions dependency to a verified full commit SHA, added a
  regression guard against mutable action references, and enabled weekly
  Dependabot updates for those pins.
- Removed unused client-side AI environment scaffolding and reject every tracked
  `.env` file, including `.env.example`.
- Enforced transactional class, student, subject, and note relationships across
  academic records, note writes, and subject assignments, including attendance
  scope and duplicate protection.
- Added critical-service coverage thresholds and CI quality gates.
- Documented that EduPlanner has no application-level encryption,
  authentication, backend, or remote cloud provider.

[Unreleased]: https://github.com/enisdalibra/EduPlanner/commits/main
