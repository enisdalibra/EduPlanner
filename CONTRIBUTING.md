# Contributing to EduPlanner

Thank you for helping improve EduPlanner. Contributions are welcome for code,
tests, documentation, accessibility, translations, design, and security.

EduPlanner handles educational records in the browser. Protecting students and
teachers is a condition of contribution, not an optional review preference.

## Code of conduct

Participation in this project is governed by the
[Code of Conduct](CODE_OF_CONDUCT.md). Be respectful, constructive, and mindful
that contributors may have different levels of experience.

## Privacy rules

Never commit, upload, paste, or attach:

- a real EduPlanner database, JSON backup, or recovery snapshot;
- a real school roster, spreadsheet, CSV, or exported report;
- real student, teacher, parent, or school records;
- a screenshot of a user's normal browser profile or desktop;
- a screenshot containing names, NIS values, avatars, notes, notifications,
  local filenames, bookmarks, internal URLs, or other identifying context;
- `.env` files, credentials, access tokens, API keys, private keys, cookies,
  browser storage state, or authenticated browser profiles;
- logs, stack traces, videos, or HAR/trace files containing student names or
  other personal data; or
- a production fixture that has only been partially masked or pseudonymized.

Do not create fixtures by hashing real identifiers. A hash can remain a stable
identifier and does not make production data synthetic.

All examples and fixtures must be created manually or by a generator, clearly
identified as synthetic, and unrelated to real records. Use examples such as:

- `Siswa Contoh 01`;
- NIS `DEMO-0001`; and
- `Kelas Demo A`.

If a problem can only be reproduced with sensitive data, stop and follow
[SECURITY.md](SECURITY.md). Do not open a public issue containing that data.

## Before starting

1. Search existing issues and pull requests.
2. For a substantial behavior or architecture change, open a privacy-safe issue
   describing the goal and tradeoffs before investing in implementation.
3. For a vulnerability, use the private security-reporting process instead of a
   public issue.
4. Keep each change focused enough to review and revert independently.

## Development setup

Requirements:

- Node.js `22.22.0` or newer (use the CI baseline recorded in `.nvmrc`);
- npm; and
- a modern browser with IndexedDB support.

Install and start the application:

```bash
git clone https://github.com/enisdalibra/EduPlanner.git
cd EduPlanner
npm ci
npm run dev
```

The development server runs at `http://localhost:3000`.

EduPlanner does not use `.env` files, and the repository privacy check rejects
all tracked `.env*` paths, including `.env.example`. Do not place secrets in
client-side environment variables: values bundled by Vite can be visible to
anyone who downloads the application. A future feature that needs a private
credential must first introduce and document a trusted server boundary.

## Project conventions

- Keep the application functional without a backend.
- Preserve the local-first storage model unless an accepted design explicitly
  changes it.
- Route data mutations through feature APIs or services rather than adding new
  direct database writes.
- Reuse `INPUT_LIMITS` from `src/lib/validation.ts` for form controls, imports,
  and validators. Do not introduce a separate limit for the same field.
- Pin third-party GitHub Actions to a full 40-character commit SHA and retain
  the release version as an inline comment. Let Dependabot propose reviewed SHA
  updates instead of replacing pins with mutable tags.
- Use database transactions for multi-table or destructive changes.
- Add Indonesian and English strings for every new user-facing message.
- Keep examples and test data synthetic.
- Do not describe the local mock provider as cloud backup or remote sync.
- Update user documentation when behavior, limitations, storage, backup, or
  privacy expectations change.

### Dependency updates

Dependabot checks npm packages and pinned GitHub Actions weekly. Routine npm
minor and patch updates are grouped separately for production and development
dependencies; major upgrades and security fixes remain independently reviewable.

Do not merge dependency PRs based only on the version number. Review upstream
release notes, lockfile changes, licenses, browser/runtime compatibility, and
the complete CI result. Major upgrades should document any migration or rollback
implications. Dependency PRs are never assumed safe for automatic merge.

## Tests

Add focused tests for changed behavior, especially:

- database transactions and rollback;
- migrations and relational integrity;
- backup validation and restore;
- class or student cascade deletion;
- roster import and duplicate NIS handling;
- bilingual user-facing strings; and
- offline/PWA behavior, including explicit update consent.

Before opening a pull request, run:

```bash
npm run verify
```

`verify` runs type-checking, the coverage suite, the production/PWA build, and
the full dependency audit. Do not suppress a failing check without documenting
and obtaining agreement on the reason.

## Documentation

Documentation must reflect implemented behavior rather than planned behavior.
Use the feature status terms consistently:

- **Complete** for implemented behavior available in the UI within the
  documented beta scope, not as a claim of stable compatibility;
- **Partial** for usable behavior with a stated limitation;
- **Mock** for development/demo simulations; and
- **Not implemented** when no usable implementation exists.

The release-status statement in `README.md` is authoritative. A change that
adds or resolves a known defect, changes a documented limitation, or affects
compatibility must update the release-status, feature-status, or limitations
sections in the same pull request. Do not describe the project or an individual
feature as stable unless the repository has adopted and documented that support
commitment.

Use only synthetic data in prose, screenshots, workbooks, and fixtures. Review
documentation links and avoid exposing local filesystem paths or browser-profile
details.

## Commit messages

Use concise English Conventional Commits:

```text
feat(backup): validate restore relationships
fix(import): reject duplicate NIS atomically
docs(users): explain offline reminders
```

Keep unrelated changes in separate commits.

## Pull requests

A pull request should:

- explain the problem and user-visible result;
- identify privacy, migration, compatibility, and rollback implications;
- include tests proportional to the risk;
- update relevant documentation;
- pass CI; and
- complete the privacy checklist in the pull-request template.

Do not include real user data in screenshots or demonstrations. If a visual is
necessary, create it from a disposable browser profile seeded only with
synthetic data and review the final image before committing it.

## Reporting security problems

Do not disclose vulnerabilities or personal data in public issues. Follow
[SECURITY.md](SECURITY.md) and use synthetic data for reproduction.
