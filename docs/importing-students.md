# Importing Students

EduPlanner can import a student roster from an `.xlsx` workbook into one
existing class.

## Supported format

The importer reads the first worksheet and accepts:

- file extension: `.xlsx`;
- maximum file size: 5 MB;
- maximum data rows: 2,000;
- required name header: `Nama` or `Name`; and
- required identifier header: `NIS`.

Header matching ignores capitalization and surrounding spaces. Other columns
may be present but are ignored. Legacy `.xls`, `.csv`, and `.tsv` files are not
supported.

Each non-empty row must have:

- a name of at most 120 characters; and
- an NIS of at most 50 characters.

Rows where both supported cells are empty are skipped. A partially filled row is
an error.

## Example worksheet

Use synthetic data when testing:

| Nama | NIS |
| --- | --- |
| Siswa Contoh 01 | DEMO-0001 |
| Siswa Contoh 02 | DEMO-0002 |

Keep NIS cells as text when using identifiers with leading zeroes or characters.
Do not use a production roster as a development fixture.

## Download the template

1. Open **Students**.
2. Choose **Import Excel**.
3. Select the target class, such as `Kelas Demo A`.
4. Choose **Download Template**.
5. Replace the sample rows with the intended roster while preserving the `Nama`
   and `NIS` headers.
6. Save the workbook as `.xlsx`.

The target class must already exist.

## Duplicate NIS policy

NIS is treated as a business identifier across the whole EduPlanner database,
not only within the selected class. A duplicate can be:

- an NIS already assigned to any existing student; or
- a repeated NIS in the workbook itself.

Choose one policy before selecting the file:

### Reject all duplicates

This is the default and safest policy. If any duplicate NIS is found, the entire
import is rejected and no students from that workbook are added. The error lists
the affected worksheet rows.

### Skip duplicates

Existing NIS values and later repeated occurrences in the workbook are skipped.
Only the first non-conflicting occurrence is imported. EduPlanner reports how
many rows were skipped.

The import runs in a database transaction. A validation or write failure does
not leave a partially imported roster.

## Import the workbook

1. Download a current JSON backup before a large import.
2. Open **Students** and choose **Import Excel**.
3. Select the destination class.
4. Select **Reject duplicates** or **Skip duplicates**.
5. Choose the prepared `.xlsx` file.
6. Wait for the success or error message.
7. Filter the student list by the destination class.
8. Verify the expected count and inspect several synthetic or authorized
   records.

## Common validation errors

### File must be `.xlsx`

Re-save the workbook in the modern Excel Workbook (`.xlsx`) format. Renaming an
`.xls` or `.csv` extension is not a conversion.

### File type is not recognized

The browser did not identify the file as a supported Excel workbook. Open it in
a trusted spreadsheet application and save a fresh `.xlsx` copy.

### File is empty, damaged, or too large

Confirm that the workbook opens normally, contains a first worksheet, and is no
larger than 5 MB.

### Required headers are missing

Place `Nama` (or `Name`) and `NIS` in the first row of the first worksheet.
Avoid merged header cells.

### Invalid row

Use the row numbers in the error message to find a missing or overlong value.
EduPlanner reports the first five validation details and counts any remaining
errors.

### More than 2,000 rows

Split the roster into smaller workbooks. Review the duplicate policy carefully
when importing the later files.

### Duplicate NIS

Correct unintended duplicates in the workbook. If the duplicate represents a
student already in EduPlanner, either update that student manually or choose
the skip policy after confirming that skipping is appropriate.

## Privacy

Roster workbooks contain sensitive data. Store and transfer them securely,
remove obsolete copies according to school policy, and never attach a real
roster to a public bug report. Reproduce issues with `Siswa Contoh 01`,
`DEMO-0001`, and `Kelas Demo A`.
