# Test Fixture Policy

EduPlanner may contain educational records, so test fixtures must never be
derived from real students, teachers, classes, schools, or production exports.
This policy applies to fixture files, inline test objects, generated datasets,
snapshots, screenshots, and examples used by automated or manual tests.

## Required rules

Every fixture must:

- be created manually from an invented scenario or produced by a generator that
  starts from synthetic values;
- include the exact label `SYNTHETIC DATA` in the fixture file or, for inline
  data, in a nearby comment or the containing test description;
- use fictional names such as `Siswa Contoh 01`, NIS values such as
  `DEMO-0001`, and classes such as `Kelas Demo A`;
- use newly generated UUIDs that have no relationship to production
  identifiers;
- avoid preserving any real combination of name, NIS, class, date of birth,
  attendance, grade, note, schedule, or other attributes; and
- contain only the minimum fields and records needed to exercise the behavior
  under test.

Never:

- copy, export, transform, sample, redact, mask, or partially anonymize
  production or school data for a fixture;
- hash, encrypt, encode, truncate, shuffle, or replace only selected fields from
  real data;
- reuse real identifiers, even if names and other visible fields have changed;
- use a real EduPlanner backup, recovery snapshot, roster, workbook, database,
  browser profile, storage state, log, HAR, trace, or screenshot as test input;
  or
- commit personal contact details, credentials, secrets, or realistic notes
  about an identifiable person.

Hashing is not anonymization. A hash can remain a stable identifier and can
allow records to be correlated with their source.

## File locations

Fixture files belong under:

```text
__tests__/fixtures/synthetic/
```

Use a feature-specific subdirectory where practical, for example:

```text
__tests__/fixtures/synthetic/backup/current-version.json
__tests__/fixtures/synthetic/integrity/orphaned-student.json
```

The repository ignore rules intentionally allow ignored data formats only in
explicit synthetic directories. Do not add a global exception such as
`!*.json`, `!*.csv`, or `!*.xlsx` to `.gitignore`.
Formats without an existing narrow exception remain prohibited until their
specific synthetic directory is reviewed and allowlisted.

Fixture source code may remain next to its test when that makes the test easier
to understand. The same synthetic-data rules and label requirement still
apply.

## Example

```ts
// SYNTHETIC DATA: manually created for duplicate-NIS validation.
const student = {
  id: "77b22cb4-9e85-4de6-8341-3602c1a71d11",
  name: "Siswa Contoh 01",
  nis: "DEMO-0001",
  classId: "70fd0a8f-9a60-4b13-b224-203d83b1264f",
};
```

Generate new UUIDs for new fixtures instead of copying the example identifiers
into unrelated datasets.

## Review checklist

Before committing a new or changed fixture, confirm that:

1. `SYNTHETIC DATA` is clearly visible in or immediately beside the fixture.
2. The scenario was invented or generated without production input.
3. All people, schools, classes, identifiers, dates, and notes are fictional.
4. UUIDs were generated specifically for the fixture.
5. No combination of fields reproduces a real record.
6. The fixture contains no email address, phone number, secret, or credential
   unless the test explicitly validates a clearly fictional reserved value.
7. The file is stored in the synthetic fixture directory and contains only the
   minimum data required by the test.

If a defect cannot be reproduced without sensitive data, do not add that data
to the repository or a public issue. Follow the private reporting process in
[`SECURITY.md`](../../SECURITY.md) and create a synthetic reproduction.
