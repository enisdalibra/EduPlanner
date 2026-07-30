# Security Policy

EduPlanner is a local-first browser application that may contain sensitive
educational records. Responsible reporting must protect students and teachers
while a problem is investigated.

## Supported versions

EduPlanner is currently a pre-release public beta. Until the first supported
release is tagged, security fixes are made on the default branch. This support
statement identifies where fixes are published; it is not a service-level or
stability guarantee.

After release, the latest `0.1.x` version will receive security fixes until a
new support policy is published.

| Version | Supported |
| --- | --- |
| Public-beta default branch before `v0.1.0` | Yes |
| Latest `0.1.x` release | Yes, after release |
| Older snapshots and forks | No |

## Report a vulnerability privately

Use GitHub's private vulnerability reporting for this repository:

<https://github.com/enisdalibra/EduPlanner/security/advisories/new>

If private reporting is unavailable, open a minimal public issue asking the
maintainer to provide a private contact method. Do not include vulnerability
details, proof-of-concept code, secrets, or personal data in that issue.

Do not use a public issue for an unpatched vulnerability.

## Protect personal data

Never include:

- student, teacher, parent, or school names;
- NIS values or other identifiers;
- email addresses or phone numbers;
- grades, attendance, notes, schedules, or profile data;
- screenshots from a real user environment;
- JSON backups, recovery snapshots, Excel rosters, databases, browser profiles,
  HAR files, traces, or storage-state files; or
- access tokens, cookies, credentials, API keys, or private keys.

Reproduce the issue with manually created synthetic data such as
`Siswa Contoh 01`, NIS `DEMO-0001`, and `Kelas Demo A`. Do not partially mask,
hash, or transform real production data.

If personal data has already been exposed publicly, remove access where possible
and follow the applicable school incident-response process before continuing.

## What to include

A useful private report contains:

- a concise description of the issue and its impact;
- the affected commit, version, browser, and operating system;
- prerequisites and privacy-safe reproduction steps;
- a minimal proof of concept using synthetic data;
- whether the issue affects confidentiality, integrity, or availability;
- any known workaround that does not destroy user data; and
- whether the issue has been disclosed elsewhere.

Avoid running tests against another person's deployment, browser profile, or
data. Do not perform destructive testing without explicit authorization.

## Response process

The project will aim to:

1. acknowledge a complete report within seven days;
2. confirm the affected scope and agree on a communication channel;
3. investigate and prepare a fix without exposing reporter or user data;
4. coordinate disclosure after supported users can update; and
5. credit the reporter when requested and safe.

These are targets rather than a service-level agreement. Response time may vary
for a volunteer-maintained project.

## Current security boundaries

- EduPlanner has no authentication, backend, remote sync, or multi-user
  isolation.
- The mock backup provider stores data in the same browser's `localStorage`; it
  is not cloud storage.
- Records and exported files are not encrypted at the application layer.
- Device security, browser-profile isolation, and safe backup handling remain
  the user's responsibility.

See [Privacy and Data](docs/privacy-and-data.md) for the complete data-handling
model.
