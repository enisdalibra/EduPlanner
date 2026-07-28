import { db, type Attendance } from '@/db/database';
import Dexie from 'dexie';
import {
  assertAcademicRelations,
  createAcademicRelationCache,
} from '@/lib/academicRelations';
import { DomainNotFoundError } from '@/lib/domainErrors';
import { validateAttendance, ValidationError } from '@/lib/validation';

function attendanceScopeKey(record: Pick<Attendance, 'classId' | 'subjectId' | 'date'>): string {
  return JSON.stringify([record.classId, record.subjectId ?? null, record.date]);
}

function attendanceNaturalKey(
  record: Pick<Attendance, 'classId' | 'studentId' | 'subjectId' | 'date'>,
): string {
  return JSON.stringify([
    record.classId,
    record.studentId,
    record.subjectId ?? null,
    record.date,
  ]);
}

async function validateAttendanceBatch(records: Attendance[]): Promise<void> {
  const relationCache = createAcademicRelationCache();
  const seenIds = new Set<string>();
  const seenNaturalKeys = new Set<string>();

  for (const record of records) {
    validateAttendance(record);
    if (seenIds.has(record.id)) {
      throw new ValidationError(`Attendance batch contains duplicate id "${record.id}".`);
    }
    seenIds.add(record.id);

    const naturalKey = attendanceNaturalKey(record);
    if (seenNaturalKeys.has(naturalKey)) {
      throw new ValidationError(
        'Attendance batch contains duplicate records for the same student and schedule scope.',
      );
    }
    seenNaturalKeys.add(naturalKey);

    await assertAcademicRelations(
      db,
      {
        classId: record.classId,
        studentId: record.studentId,
        subjectId: record.subjectId,
      },
      relationCache,
    );
  }

  const existingById = await db.attendances.bulkGet(records.map(({ id }) => id));
  existingById.forEach((existing, index) => {
    if (
      existing &&
      attendanceNaturalKey(existing) !== attendanceNaturalKey(records[index])
    ) {
      throw new ValidationError(
        `Attendance id "${records[index].id}" already belongs to a different record scope.`,
      );
    }
  });

  const recordsByScope = new Map<string, Attendance[]>();
  for (const record of records) {
    const key = attendanceScopeKey(record);
    recordsByScope.set(key, [...(recordsByScope.get(key) ?? []), record]);
  }

  for (const scopedRecords of recordsByScope.values()) {
    const sample = scopedRecords[0];
    const existing = sample.subjectId
      ? await db.attendances
          .where('[classId+subjectId+date]')
          .equals([sample.classId, sample.subjectId, sample.date])
          .toArray()
      : await db.attendances
          .where('[classId+date]')
          .equals([sample.classId, sample.date])
          .filter((record) => !record.subjectId)
          .toArray();
    const incomingByNaturalKey = new Map(
      scopedRecords.map((record) => [attendanceNaturalKey(record), record]),
    );
    for (const stored of existing) {
      const incoming = incomingByNaturalKey.get(attendanceNaturalKey(stored));
      if (incoming && incoming.id !== stored.id) {
        throw new ValidationError(
          'Attendance already exists for the same student and schedule scope.',
        );
      }
    }
  }
}

async function assertAttendanceScopeParents(
  classId: string,
  date: string,
  subjectId?: string,
): Promise<void> {
  if (!classId) throw new ValidationError('Class ID is required for attendance scope.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ValidationError('Attendance scope date must be in YYYY-MM-DD format.');
  }
  if (!(await db.classes.get(classId))) throw new DomainNotFoundError('Class', classId);
  if (subjectId && !(await db.subjects.get(subjectId))) {
    throw new DomainNotFoundError('Subject', subjectId);
  }
}

/**
 * Retrieves attendance records for a specific class and date
 * @param classId - The ID of the class
 * @param date - The date in YYYY-MM-DD format
 * @param subjectId - Optional subject ID to filter by subject
 * @returns Promise resolving to array of attendance records
 * 
 * @example
 * ```ts
 * const records = await getAttendanceRecord('class-123', '2024-01-15');
 * // Returns all attendance records for class 123 on Jan 15, 2024
 * 
 * const mathRecords = await getAttendanceRecord('class-123', '2024-01-15', 'math-456');
 * // Returns only math subject attendance records
 * ```
 */
export async function getAttendanceRecord(classId: string, date: string, subjectId?: string) {
  if (subjectId && subjectId !== 'none') {
    return await db.attendances.where('[classId+subjectId+date]').equals([classId, subjectId, date]).toArray();
  }
    
  const allForDate = await db.attendances.where('[classId+date]').equals([classId, date]).toArray();
  return allForDate.filter(a => !a.subjectId);
}

/**
 * Retrieves attendance records for a specific student, with optional date range filter
 * @param studentId - The ID of the student
 * @param fromDate - Optional start date in YYYY-MM-DD format
 * @param toDate - Optional end date in YYYY-MM-DD format
 * @returns Promise resolving to array of attendance records
 * 
 * @example
 * ```ts
 * const records = await getAttendanceByStudent('stud-456', '2024-01-01', '2024-12-31');
 * ```
 */
export async function getAttendanceByStudent(studentId: string, fromDate?: string, toDate?: string) {
  let query = db.attendances.where('studentId').equals(studentId);
  if (fromDate && toDate) {
    return await query.and(a => a.date >= fromDate && a.date <= toDate).toArray();
  }
  return await query.toArray();
}

/**
 * Saves attendance records to the database
 * @param records - Array of attendance records to save
 * @returns Promise that resolves when records are saved
 * 
 * @example
 * ```ts
 * await saveAttendance([
 *   { id: 'att-1', classId: 'class-123', studentId: 'stud-456', date: '2024-01-15', status: 'hadir' }
 * ]);
 * ```
 */
export async function saveAttendance(records: Attendance[]) {
  // Ensure IDs exist
  const processedRecords = records.map(r => ({
    ...r,
    id: r.id || crypto.randomUUID()
  }));

  await db.transaction(
    'rw',
    [db.attendances, db.classes, db.students, db.subjects],
    async () => {
      await validateAttendanceBatch(processedRecords);
      // bulkPut may update an existing record only after its immutable scope
      // and parent relationships have been validated.
      await db.attendances.bulkPut(processedRecords);
    },
  );
}

export async function replaceAttendanceSnapshot(
  classId: string,
  date: string,
  subjectId: string | undefined,
  records: Attendance[],
): Promise<void> {
  await db.transaction(
    'rw',
    [db.attendances, db.classes, db.students, db.subjects],
    async () => {
      await assertAttendanceScopeParents(classId, date, subjectId);
      await validateAttendanceBatch(records);
      for (const record of records) {
        if (
          record.classId !== classId ||
          record.date !== date ||
          (record.subjectId || undefined) !== (subjectId || undefined)
        ) {
          throw new ValidationError(
            'Attendance snapshot contains records outside its requested scope.',
          );
        }
      }

      if (subjectId) {
        await db.attendances
          .where('[classId+subjectId+date]')
          .equals([classId, subjectId, date])
          .delete();
      } else {
        const recordsWithoutSubject = await db.attendances
          .where('[classId+date]')
          .equals([classId, date])
          .filter((record) => !record.subjectId)
          .primaryKeys();
        await db.attendances.bulkDelete(recordsWithoutSubject);
      }
      if (records.length) await db.attendances.bulkPut(records);
    },
  );
}
