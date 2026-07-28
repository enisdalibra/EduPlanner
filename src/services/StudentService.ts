import type { CellValue, SheetData as ReadSheetData } from "read-excel-file/browser";
import type { SheetData } from "write-excel-file/browser";
import { INPUT_LIMITS } from "@/lib/validation";

export const MAX_ROSTER_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_ROSTER_ROWS = 2_000;

const SUPPORTED_EXTENSIONS = new Set(["xlsx"]);
const SUPPORTED_MIME_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
]);

export interface RosterStudentInput {
  name: string;
  nis: string;
  rowNumber: number;
}

export class RosterValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RosterValidationError";
  }
}

function assertValidRosterFile(file: File): void {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new RosterValidationError("File roster harus berformat .xlsx.");
  }
  if (file.type && !SUPPORTED_MIME_TYPES.has(file.type)) {
    throw new RosterValidationError("Tipe file roster tidak dikenali sebagai Excel.");
  }
  if (file.size === 0) {
    throw new RosterValidationError("File roster kosong.");
  }
  if (file.size > MAX_ROSTER_FILE_BYTES) {
    throw new RosterValidationError("Ukuran file roster melebihi batas 5 MB.");
  }
}

function normalizedHeader(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function cellText(value: CellValue<string> | null): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? "").trim();
}

export class StudentService {
  static async parseExcelImport(file: File): Promise<RosterStudentInput[]> {
    assertValidRosterFile(file);

    let rows: ReadSheetData<string>;
    try {
      const { readSheet } = await import("read-excel-file/browser");
      rows = await readSheet<string>(file, 1, {
        // Keeping numeric cells as their source text avoids losing leading zeroes
        // in identifiers such as NIS.
        parseNumber: (value) => value,
        trim: false,
      });
    } catch {
      throw new RosterValidationError("File Excel rusak atau tidak dapat dibaca.");
    }
    if (rows.length === 0) {
      throw new RosterValidationError("File roster tidak memiliki header.");
    }

    const headers = rows[0].map(normalizedHeader);
    const nameIndex = headers.findIndex((header) => header === "nama" || header === "name");
    const nisIndex = headers.findIndex((header) => header === "nis");
    if (nameIndex === -1 || nisIndex === -1) {
      throw new RosterValidationError('Header wajib adalah "Nama" dan "NIS".');
    }

    const dataRows = rows.slice(1);
    if (dataRows.length > MAX_ROSTER_ROWS) {
      throw new RosterValidationError(`Roster melebihi batas ${MAX_ROSTER_ROWS} baris.`);
    }

    const students: RosterStudentInput[] = [];
    const errors: string[] = [];
    dataRows.forEach((row, index) => {
      const rowNumber = index + 2;
      const name = cellText(row[nameIndex] ?? null);
      const nis = cellText(row[nisIndex] ?? null);

      if (!name && !nis) return;
      if (!name) errors.push(`baris ${rowNumber}: Nama wajib diisi`);
      if (!nis) errors.push(`baris ${rowNumber}: NIS wajib diisi`);
      if (name.length > INPUT_LIMITS.personName) {
        errors.push(`baris ${rowNumber}: Nama maksimal ${INPUT_LIMITS.personName} karakter`);
      }
      if (nis.length > INPUT_LIMITS.identifier) {
        errors.push(`baris ${rowNumber}: NIS maksimal ${INPUT_LIMITS.identifier} karakter`);
      }

      if (
        name &&
        nis &&
        name.length <= INPUT_LIMITS.personName &&
        nis.length <= INPUT_LIMITS.identifier
      ) {
        students.push({ name, nis, rowNumber });
      }
    });

    if (errors.length > 0) {
      const visibleErrors = errors.slice(0, 5).join("; ");
      const remainder = errors.length > 5 ? `; dan ${errors.length - 5} error lain` : "";
      throw new RosterValidationError(`Data roster tidak valid: ${visibleErrors}${remainder}.`);
    }
    if (students.length === 0) {
      throw new RosterValidationError("Tidak ada data siswa yang dapat diimpor.");
    }

    return students;
  }

  static async generateImportTemplate(): Promise<void> {
    const { default: writeXlsxFile } = await import("write-excel-file/browser");
    const data: SheetData = [
      [{ value: "Nama", fontWeight: "bold" }, { value: "NIS", fontWeight: "bold" }],
      ["Budi Santoso", "1011"],
      ["Siti Aminah", "1012"],
    ];
    await writeXlsxFile(data, {
      sheet: "Template Siswa",
      columns: [{ width: 28 }, { width: 16 }],
    }).toFile("template_import_siswa.xlsx");
  }
}
