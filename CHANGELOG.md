# Changelog

All notable changes to EduPlanner will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project intends to follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0-beta.1] - 2026-07-30

### Added

- Traceable build identity derived from the package version and checked-out Git
  revision, exposed in the About page and generated `release.json` artifact.
- Safe backup restore with structural and relational validation, legacy
  migration, record-count preview, pre-restore recovery snapshot, transactional
  replacement, and final integrity checking.
- Indonesian and English support across the main teacher-facing interface, with
  some fallback and exceptional states not yet translated.
- Embedded Markdown presentation quizzes.
- Installable offline PWA shell with bundle and offline-build checks.
- Manual GitHub Pages deployment and rollback workflow.
- User, backup/restore, roster-import, troubleshooting, privacy, security, and
  contribution documentation.

### Changed

- Clarified that the current default branch is a pre-release public beta, made
  `README.md` the canonical release-status source, separated the known
  attendance-undo defect from intentional limitations, and qualified
  "Complete" as feature completeness within the documented beta scope rather
  than a stable compatibility guarantee.
- Replaced automatic PWA takeover with a bilingual update notice; a waiting
  service worker activates and reloads only after explicit user confirmation.
- Clarified that downloaded JSON backup is the durable backup mechanism, the
  `LocalMockSyncProvider` is for development/demo use only, and remote cloud sync
  is not implemented.
- Documented the local mock provider's five-minute in-app timer, immediate
  manual action, single-copy retention, failure visibility, and safe restore
  workflow.
- Centralized domain mutations in feature APIs and extracted complex view logic
  into hooks.
- Reduced the initial and offline application payload.
- Centralized user-input length limits across domain validation, primary forms,
  Excel roster import, and backup restore.

### Fixed

- Removed the nonexistent `/registerSW.js` path from the deployment cache
  guidance while retaining the prompt-based PWA registration model.
- Corrected the release documentation to show that `release:check` runs the
  tracked-file privacy scan before the complete `verify` chain.
- Aligned the documented Node.js minimum, package engine, local version file,
  and GitHub Actions runtime on the Node.js 22.22.0 baseline.
- Made the Dashboard export use the complete, versioned 11-table backup format
  instead of a partial legacy JSON payload.
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
- Enabled weekly Dependabot updates for npm packages, grouping routine minor and
  patch updates by production or development scope while leaving major and
  security changes independently reviewable.
- Removed unused client-side AI environment scaffolding and reject every tracked
  `.env` file, including `.env.example`.
- Enforced transactional class, student, subject, and note relationships across
  academic records, note writes, and subject assignments, including attendance
  scope and duplicate protection.
- Added critical-service coverage thresholds and CI quality gates.
- Documented that EduPlanner has no application-level encryption,
  authentication, backend, or remote cloud provider.

[Unreleased]: https://github.com/enisdalibra/EduPlanner/compare/v0.1.0-beta.1...HEAD
[0.1.0-beta.1]: https://github.com/enisdalibra/EduPlanner/releases/tag/v0.1.0-beta.1
