import { describe, expect, it } from "vitest";
import writeXlsxFile, { type SheetData } from "write-excel-file/browser";

import {
  MAX_ROSTER_FILE_BYTES,
  RosterValidationError,
  StudentService,
} from "@/services/StudentService";

async function rosterFile(
  rows: SheetData,
  name = "roster.xlsx",
  type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
) {
  const blob = await writeXlsxFile(rows, { sheet: "Siswa" }).toBlob();
  return new File([blob], name, { type });
}

describe("StudentService roster validation", () => {
  it("parses the required schema and preserves source row numbers", async () => {
    const result = await StudentService.parseExcelImport(
      await rosterFile([
        ["Nama", "NIS"],
        ["Budi Santoso", "00101"],
        ["Siti Aminah", "00102"],
      ]),
    );

    expect(result).toEqual([
      { name: "Budi Santoso", nis: "00101", rowNumber: 2 },
      { name: "Siti Aminah", nis: "00102", rowNumber: 3 },
    ]);
  });

  it("reports invalid cells with their spreadsheet row number", async () => {
    await expect(
      StudentService.parseExcelImport(
        await rosterFile([
          ["Nama", "NIS"],
          ["Budi", ""],
          ["", "102"],
        ]),
      ),
    ).rejects.toThrow(/baris 2: NIS wajib diisi.*baris 3: Nama wajib diisi/);
  });

  it("rejects unsupported schemas, file types, and oversized files", async () => {
    await expect(
      StudentService.parseExcelImport(await rosterFile([["Nama"], ["Budi"]])),
    ).rejects.toThrow('Header wajib adalah "Nama" dan "NIS".');

    const wrongType = new File(["not excel"], "roster.csv", { type: "text/csv" });
    await expect(StudentService.parseExcelImport(wrongType)).rejects.toThrow(RosterValidationError);

    const legacyExcel = new File(["legacy"], "roster.xls", { type: "application/vnd.ms-excel" });
    await expect(StudentService.parseExcelImport(legacyExcel)).rejects.toThrow(/\.xlsx/);

    const corruptXlsx = new File(["not a zip"], "roster.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    await expect(StudentService.parseExcelImport(corruptXlsx)).rejects.toThrow(/rusak/);

    const oversized = {
      name: "roster.xlsx",
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: MAX_ROSTER_FILE_BYTES + 1,
    } as File;
    await expect(StudentService.parseExcelImport(oversized)).rejects.toThrow(/5 MB/);
  });

  it("rejects empty files and unexpected MIME types before parsing", async () => {
    const empty = new File([], "roster.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    await expect(StudentService.parseExcelImport(empty)).rejects.toThrow(/kosong/);

    const wrongMime = new File(["content"], "roster.xlsx", { type: "text/plain" });
    await expect(StudentService.parseExcelImport(wrongMime)).rejects.toThrow(/Tipe file/);
  });

  it("accepts English headers and converts date cells to text", async () => {
    const result = await StudentService.parseExcelImport(await rosterFile([
      [null, "Name", "NIS"],
      [null, { value: new Date("2026-07-20T00:00:00.000Z"), format: "yyyy-mm-dd" }, "104"],
    ]));

    expect(result).toEqual([{
      name: "2026-07-20T00:00:00.000Z",
      nis: "104",
      rowNumber: 2,
    }]);
  });

  it("rejects an empty roster and reports truncated cell errors", async () => {
    await expect(
      StudentService.parseExcelImport(await rosterFile([["Nama", "NIS"]])),
    ).rejects.toThrow(/Tidak ada data siswa/);

    await expect(StudentService.parseExcelImport(await rosterFile([
      ["Nama", "NIS"],
      ["A".repeat(121), "1"],
      ["B", "2".repeat(51)],
      ["", ""],
      ["", "4"],
      ["E", ""],
      ["", "6"],
      ["G", ""],
      ["", "8"],
    ]))).rejects.toThrow(/dan \d+ error lain/);
  });

  it("rejects rosters above the configured row limit", async () => {
    const rows: SheetData = [
      ["Nama", "NIS"],
      ...Array.from({ length: 2_001 }, (_, index) => [`Student ${index}`, String(index)]),
    ];

    await expect(StudentService.parseExcelImport(await rosterFile(rows))).rejects.toThrow(
      /2000 baris/,
    );
  });
});
